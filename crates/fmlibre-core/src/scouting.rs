//! Scouting: the tactics a human manager plays and the players who would fit one of their slots, with how realistic
//! signing each one would be for his club.
//!
//! A tactic's slots carry a role for when the team has the ball and one for when it has not (see
//! [`crate::TacticLayout`]). The game stores a role as a mask of two bits: one of bits 21 to 23, and one that names
//! the role, numbered apart for the two phases. [`ROLES`] holds the masks read against the game's tactics screen and,
//! for each role, the line it plays in and the attributes it leans on. Those weights are the editor's own reading of
//! what each role asks for; the game's own are not known.
//!
//! Everything here only reads memory.

use std::collections::{HashMap, HashSet};
use std::fmt;

use fmlibre_mem::{Error as MemoryError, is_user_pointer};
use serde::{Deserialize, Serialize};

use crate::clauses::RELEASE_CLAUSE;
use crate::clubs::ClubSummary;
use crate::coded::Coded;
use crate::date::FmDate;
use crate::details::{ATTRIBUTE_GROUPS, Clause, PERSONALITY, read_clauses};
use crate::filter::attribute_keys;
use crate::index::SearchIndex;
use crate::players::{PlayerIndex, PlayerSummary, club_uid_of_team};
use crate::rtti;
use crate::session::Session;
use crate::squad::Loan;
use crate::transfer::PointerList;

/// What a slot holds when nobody fills it.
const EMPTY: u32 = u32::MAX;

/// The transfer value the game gives a player who is not for sale.
pub const NOT_FOR_SALE: i32 = 300_000_000;

/// A transfer value to show as an amount: none where the game keeps none (-1, as for this year's youth intake) or the
/// player is not for sale.
pub(crate) fn known_value(value: Option<i32>) -> Option<i32> {
    value.filter(|&value| value >= 0 && value != NOT_FOR_SALE)
}

/// What a contract's squad status says about a player's place at his club. The codes, as the game's English contract
/// screen names them (Steam build 26340721): 1 Star Player, 2 Important Player, 3 Regular Starter, 4 Squad Player,
/// 5 Impact Sub, 7 Fringe Player, 9 Emergency Backup, 10 Breakthrough Prospect, 11 Future Prospect, 13 Youngster,
/// 14 B Team Regular, 15 First-Choice Goalkeeper, 16 Cup Goalkeeper, 17 Domestic Cup Goalkeeper, 20 Backup,
/// 21 Emergency Backup (goalkeepers), 22 Surplus to Requirements. 6, 8, 12, 18 and 19 were not seen in use.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Standing {
    /// A star, an important player or the first-choice goalkeeper: his club counts on him.
    Key,
    /// A regular starter.
    Regular,
    /// Not a regular: a squad player, an impact sub, a fringe player, a backup, a cup goalkeeper or a B team regular.
    Fringe,
    /// A prospect or a youngster.
    Prospect,
    /// Surplus to requirements: his club has no use for him.
    Surplus,
}

impl Standing {
    /// The standing a squad status code gives; none for a code not seen in use.
    pub(crate) fn of(code: u8) -> Option<Self> {
        Some(match code {
            1 | 2 | 15 => Self::Key,
            3 => Self::Regular,
            4 | 5 | 7 | 9 | 14 | 16 | 17 | 20 | 21 => Self::Fringe,
            10 | 11 | 13 => Self::Prospect,
            22 => Self::Surplus,
            _ => return None,
        })
    }
}

/// When the team has the ball, or when it has not.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    InPossession,
    OutOfPossession,
}

/// The line of the formation a role plays in, which says the positions it takes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Line {
    Goalkeeper,
    CentreBack,
    FullBack,
    WingBack,
    DefensiveMidfield,
    CentralMidfield,
    AttackingMidfield,
    Wide,
    Striker,
}

/// The side of the pitch a wide slot is on.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Side {
    Right,
    Left,
}

// Indexes into the position ratings, in `crate::POSITIONS` order.
const GK: usize = 0;
const DL: usize = 2;
const DC: usize = 3;
const DR: usize = 4;
const DM: usize = 5;
const ML: usize = 6;
const MC: usize = 7;
const MR: usize = 8;
const AML: usize = 9;
const AMC: usize = 10;
const AMR: usize = 11;
const ST: usize = 12;
const WBL: usize = 13;
const WBR: usize = 14;

impl Line {
    /// The positions (indexes into the ratings) a player of this line can take on `side`, or on either side when it
    /// is not known; the first is the line's own.
    pub fn positions(self, side: Option<Side>) -> &'static [usize] {
        match (self, side) {
            (Line::Goalkeeper, _) => &[GK],
            (Line::CentreBack, _) => &[DC],
            (Line::FullBack, Some(Side::Right)) => &[DR, WBR],
            (Line::FullBack, Some(Side::Left)) => &[DL, WBL],
            (Line::FullBack, None) => &[DR, DL, WBR, WBL],
            (Line::WingBack, Some(Side::Right)) => &[WBR, DR],
            (Line::WingBack, Some(Side::Left)) => &[WBL, DL],
            (Line::WingBack, None) => &[WBR, WBL, DR, DL],
            (Line::DefensiveMidfield, _) => &[DM, MC],
            (Line::CentralMidfield, _) => &[MC, DM],
            (Line::AttackingMidfield, _) => &[AMC, MC],
            (Line::Wide, Some(Side::Right)) => &[AMR, MR],
            (Line::Wide, Some(Side::Left)) => &[AML, ML],
            (Line::Wide, None) => &[AMR, AML, MR, ML],
            (Line::Striker, _) => &[ST],
        }
    }

    /// Whether the line has a right and a left side.
    pub fn sided(self) -> bool {
        matches!(self, Line::FullBack | Line::WingBack | Line::Wide)
    }

    /// The positions of the right and the left side.
    fn sides(self) -> Option<(&'static [usize], &'static [usize])> {
        self.sided().then(|| (self.positions(Some(Side::Right)), self.positions(Some(Side::Left))))
    }
}

/// One role of the tactics screen.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Role {
    /// The game's abbreviation in lower case, e.g. `ifb`; the same key in both phases names the same kind of role.
    pub key: &'static str,
    pub phase: Phase,
    pub line: Line,
    /// The mask the game stores.
    #[serde(skip)]
    pub mask: u64,
    /// The attributes it leans on most, and the ones that help.
    pub key_attributes: &'static [&'static str],
    pub other_attributes: &'static [&'static str],
}

const fn bits(role: u32, group: u32) -> u64 {
    (1 << role) | (1 << group)
}

macro_rules! role {
    ($key:literal, $phase:ident, $line:ident, $bit:literal / $group:literal, [$($k:literal),*], [$($o:literal),*]) => {
        Role {
            key: $key,
            phase: Phase::$phase,
            line: Line::$line,
            mask: bits($bit, $group),
            key_attributes: &[$($k),*],
            other_attributes: &[$($o),*],
        }
    };
}

/// The roles whose masks are known: read on Monza's tactic (Steam build 26340721) in three formations and role sets.
pub const ROLES: &[Role] = &[
    // In possession.
    role!(
        "bgk",
        InPossession,
        Goalkeeper,
        12 / 22,
        ["passing", "kicking", "first_touch", "composure", "reflexes", "handling"],
        ["vision", "decisions", "one_on_ones", "throwing", "command_of_area"]
    ),
    role!(
        "ngk",
        InPossession,
        Goalkeeper,
        53 / 21,
        ["handling", "reflexes", "kicking", "aerial_reach", "command_of_area", "concentration"],
        ["positioning", "one_on_ones", "strength", "communication"]
    ),
    role!(
        "cb",
        InPossession,
        CentreBack,
        1 / 21,
        ["marking", "tackling", "heading", "positioning", "jumping_reach", "strength"],
        ["concentration", "anticipation", "composure", "decisions", "bravery", "pace"]
    ),
    role!(
        "bcb",
        InPossession,
        CentreBack,
        24 / 21,
        ["passing", "composure", "marking", "tackling", "positioning", "first_touch"],
        ["vision", "technique", "decisions", "heading", "anticipation"]
    ),
    role!(
        "ncb",
        InPossession,
        CentreBack,
        29 / 21,
        ["heading", "marking", "tackling", "strength", "jumping_reach", "positioning"],
        ["bravery", "aggression", "concentration"]
    ),
    role!(
        "acb",
        InPossession,
        CentreBack,
        14 / 21,
        ["passing", "first_touch", "composure", "decisions", "tackling", "technique"],
        ["dribbling", "vision", "anticipation", "positioning", "marking"]
    ),
    role!(
        "ocb",
        InPossession,
        CentreBack,
        54 / 23,
        ["crossing", "dribbling", "pace", "stamina", "tackling", "marking"],
        ["work_rate", "off_the_ball", "acceleration", "positioning"]
    ),
    role!(
        "fb",
        InPossession,
        FullBack,
        2 / 22,
        ["tackling", "marking", "positioning", "anticipation", "crossing"],
        ["concentration", "pace", "stamina", "teamwork", "work_rate"]
    ),
    role!(
        "ifb",
        InPossession,
        FullBack,
        52 / 21,
        ["passing", "first_touch", "composure", "decisions", "tackling", "positioning"],
        ["technique", "anticipation", "marking", "vision"]
    ),
    role!(
        "wb",
        InPossession,
        WingBack,
        3 / 22,
        ["crossing", "stamina", "work_rate", "pace", "acceleration", "tackling"],
        ["off_the_ball", "teamwork", "dribbling", "marking", "positioning"]
    ),
    role!(
        "iwb",
        InPossession,
        WingBack,
        44 / 21,
        ["passing", "first_touch", "decisions", "composure", "technique", "tackling"],
        ["teamwork", "stamina", "work_rate", "vision", "anticipation"]
    ),
    role!(
        "pwb",
        InPossession,
        WingBack,
        55 / 22,
        ["passing", "vision", "technique", "first_touch", "crossing", "decisions"],
        ["stamina", "dribbling", "flair", "composure"]
    ),
    role!(
        "awb",
        InPossession,
        WingBack,
        38 / 23,
        ["crossing", "dribbling", "pace", "acceleration", "stamina", "off_the_ball"],
        ["technique", "flair", "first_touch", "work_rate", "agility"]
    ),
    role!(
        "dm",
        InPossession,
        DefensiveMidfield,
        4 / 21,
        ["tackling", "positioning", "anticipation", "concentration", "passing", "teamwork"],
        ["marking", "decisions", "composure", "stamina", "work_rate"]
    ),
    role!(
        "hb",
        InPossession,
        DefensiveMidfield,
        35 / 21,
        ["positioning", "marking", "tackling", "anticipation", "composure", "passing"],
        ["decisions", "concentration", "heading", "strength", "teamwork"]
    ),
    role!(
        "bbm",
        InPossession,
        DefensiveMidfield,
        16 / 22,
        ["stamina", "work_rate", "passing", "tackling", "off_the_ball", "teamwork"],
        ["finishing", "long_shots", "dribbling", "first_touch", "pace", "strength"]
    ),
    role!(
        "bbp",
        InPossession,
        DefensiveMidfield,
        46 / 22,
        ["passing", "vision", "first_touch", "technique", "stamina", "decisions"],
        ["work_rate", "off_the_ball", "long_shots", "composure"]
    ),
    role!(
        "chm",
        InPossession,
        CentralMidfield,
        56 / 23,
        ["off_the_ball", "dribbling", "stamina", "work_rate", "passing", "acceleration"],
        ["first_touch", "technique", "finishing", "pace"]
    ),
    role!(
        "wcm",
        InPossession,
        CentralMidfield,
        48 / 22,
        ["crossing", "stamina", "work_rate", "passing", "teamwork", "off_the_ball"],
        ["dribbling", "pace", "decisions", "first_touch"]
    ),
    role!(
        "ap",
        InPossession,
        CentralMidfield,
        17 / 23,
        ["passing", "vision", "technique", "first_touch", "decisions", "composure"],
        ["flair", "dribbling", "off_the_ball", "anticipation", "agility"]
    ),
    role!(
        "am",
        InPossession,
        AttackingMidfield,
        9 / 23,
        ["off_the_ball", "first_touch", "technique", "passing", "long_shots", "dribbling"],
        ["composure", "finishing", "flair", "vision", "anticipation", "decisions"]
    ),
    role!(
        "w",
        InPossession,
        Wide,
        7 / 22,
        ["crossing", "dribbling", "pace", "acceleration", "technique", "agility"],
        ["first_touch", "off_the_ball", "flair", "stamina", "work_rate"]
    ),
    role!(
        "if",
        InPossession,
        Wide,
        27 / 23,
        ["dribbling", "finishing", "off_the_ball", "acceleration", "pace", "technique"],
        ["first_touch", "composure", "agility", "flair", "long_shots", "anticipation"]
    ),
    role!(
        "pw",
        InPossession,
        Wide,
        43 / 22,
        ["passing", "vision", "technique", "first_touch", "dribbling", "decisions"],
        ["flair", "crossing", "agility", "composure"]
    ),
    role!(
        "wfd",
        InPossession,
        Wide,
        45 / 23,
        ["finishing", "off_the_ball", "dribbling", "pace", "acceleration", "first_touch"],
        ["composure", "heading", "strength", "anticipation"]
    ),
    role!(
        "cfd",
        InPossession,
        Striker,
        11 / 23,
        ["finishing", "off_the_ball", "first_touch", "composure", "heading", "anticipation"],
        ["strength", "dribbling", "technique", "pace", "acceleration", "passing"]
    ),
    role!(
        "dlf",
        InPossession,
        Striker,
        10 / 23,
        ["first_touch", "passing", "technique", "composure", "decisions", "vision"],
        ["strength", "finishing", "off_the_ball", "teamwork", "anticipation"]
    ),
    role!(
        "p",
        InPossession,
        Striker,
        19 / 23,
        ["finishing", "off_the_ball", "anticipation", "composure", "acceleration"],
        ["first_touch", "heading", "pace", "agility"]
    ),
    // Out of possession.
    role!(
        "sk",
        OutOfPossession,
        Goalkeeper,
        1 / 23,
        ["rushing_out", "one_on_ones", "reflexes", "handling", "command_of_area", "anticipation"],
        ["acceleration", "composure", "decisions", "positioning"]
    ),
    role!(
        "lhk",
        OutOfPossession,
        Goalkeeper,
        2 / 21,
        ["positioning", "reflexes", "handling", "concentration", "aerial_reach", "command_of_area"],
        ["communication", "decisions"]
    ),
    role!(
        "cb",
        OutOfPossession,
        CentreBack,
        3 / 21,
        ["marking", "tackling", "positioning", "heading", "jumping_reach", "concentration"],
        ["strength", "anticipation", "bravery", "decisions"]
    ),
    role!(
        "scb",
        OutOfPossession,
        CentreBack,
        4 / 21,
        ["tackling", "aggression", "anticipation", "bravery", "decisions", "strength"],
        ["marking", "positioning", "acceleration", "pace"]
    ),
    role!(
        "ccb",
        OutOfPossession,
        CentreBack,
        5 / 21,
        ["positioning", "anticipation", "concentration", "pace", "acceleration", "decisions"],
        ["marking", "tackling", "composure"]
    ),
    role!(
        "wcb",
        OutOfPossession,
        CentreBack,
        6 / 21,
        ["tackling", "marking", "pace", "positioning", "stamina", "work_rate"],
        ["acceleration", "anticipation"]
    ),
    role!(
        "fb",
        OutOfPossession,
        FullBack,
        9 / 21,
        ["tackling", "marking", "positioning", "concentration", "anticipation"],
        ["pace", "teamwork", "work_rate"]
    ),
    role!(
        "pfb",
        OutOfPossession,
        FullBack,
        10 / 22,
        ["work_rate", "stamina", "tackling", "aggression", "acceleration", "anticipation"],
        ["pace", "teamwork", "bravery"]
    ),
    role!(
        "hfb",
        OutOfPossession,
        FullBack,
        11 / 21,
        ["positioning", "marking", "tackling", "concentration", "decisions", "strength"],
        ["heading", "anticipation"]
    ),
    role!(
        "wb",
        OutOfPossession,
        WingBack,
        12 / 21,
        ["tackling", "work_rate", "stamina", "pace", "marking", "positioning"],
        ["teamwork", "acceleration"]
    ),
    role!(
        "hwb",
        OutOfPossession,
        WingBack,
        14 / 21,
        ["positioning", "tackling", "marking", "concentration", "stamina", "work_rate"],
        ["anticipation", "teamwork"]
    ),
    role!(
        "dm",
        OutOfPossession,
        DefensiveMidfield,
        15 / 21,
        ["tackling", "positioning", "anticipation", "marking", "concentration", "teamwork"],
        ["work_rate", "strength", "decisions"]
    ),
    role!(
        "ddm",
        OutOfPossession,
        DefensiveMidfield,
        16 / 21,
        ["positioning", "marking", "tackling", "heading", "strength", "concentration"],
        ["anticipation", "jumping_reach", "bravery", "decisions"]
    ),
    role!(
        "pdm",
        OutOfPossession,
        DefensiveMidfield,
        17 / 22,
        ["work_rate", "stamina", "tackling", "aggression", "acceleration", "anticipation"],
        ["teamwork", "bravery", "pace", "strength"]
    ),
    role!(
        "cm",
        OutOfPossession,
        CentralMidfield,
        20 / 22,
        ["tackling", "work_rate", "stamina", "positioning", "teamwork", "anticipation"],
        ["marking", "decisions"]
    ),
    role!(
        "pcm",
        OutOfPossession,
        CentralMidfield,
        27 / 23,
        ["work_rate", "stamina", "aggression", "tackling", "acceleration", "teamwork"],
        ["anticipation", "pace", "bravery"]
    ),
    role!(
        "scm",
        OutOfPossession,
        CentralMidfield,
        28 / 21,
        ["positioning", "tackling", "marking", "anticipation", "concentration", "teamwork"],
        ["decisions", "strength", "work_rate"]
    ),
    role!(
        "oam",
        OutOfPossession,
        AttackingMidfield,
        32 / 23,
        ["off_the_ball", "anticipation", "acceleration", "pace", "first_touch", "composure"],
        ["decisions", "finishing"]
    ),
    role!(
        "w",
        OutOfPossession,
        Wide,
        38 / 22,
        ["work_rate", "stamina", "teamwork", "positioning", "tackling"],
        ["pace", "acceleration", "anticipation"]
    ),
    role!(
        "tw",
        OutOfPossession,
        Wide,
        39 / 21,
        ["work_rate", "stamina", "tackling", "teamwork", "marking", "positioning"],
        ["pace", "acceleration", "anticipation", "aggression"]
    ),
    role!(
        "iow",
        OutOfPossession,
        Wide,
        40 / 23,
        ["off_the_ball", "acceleration", "pace", "anticipation", "composure", "first_touch"],
        ["decisions", "dribbling"]
    ),
    role!(
        "cfd",
        OutOfPossession,
        Striker,
        42 / 22,
        ["work_rate", "teamwork", "stamina", "aggression", "anticipation"],
        ["acceleration", "decisions"]
    ),
    role!(
        "tcf",
        OutOfPossession,
        Striker,
        43 / 21,
        ["work_rate", "stamina", "teamwork", "tackling", "aggression", "positioning"],
        ["anticipation", "pace", "acceleration"]
    ),
    role!(
        "ocf",
        OutOfPossession,
        Striker,
        44 / 23,
        ["off_the_ball", "anticipation", "acceleration", "pace", "strength", "first_touch"],
        ["composure", "finishing"]
    ),
];

/// The role with this mask in `phase`.
pub fn role_of_mask(phase: Phase, mask: u64) -> Option<&'static Role> {
    ROLES.iter().find(|role| role.phase == phase && role.mask == mask)
}

/// The role with this key in `phase`.
pub fn role(phase: Phase, key: &str) -> Option<&'static Role> {
    ROLES.iter().find(|role| role.phase == phase && role.key == key)
}

/// Whether `mask` looks like a role's: two bits, one of them among bits 21 to 23.
fn looks_like_role(mask: u64) -> bool {
    mask.count_ones() == 2 && mask & (0b111 << 21) != 0
}

/// Something scouting could not do.
#[derive(Debug)]
pub enum ScoutError {
    /// The layout does not place the selections or the tactics of this version, or the game does not name their
    /// class.
    NotPlaced,
    /// No selection of the club was found: its manager has not picked a team, or it is not run by a human.
    NoTactic {
        club: u32,
    },
    /// A role key that is not known for that phase.
    UnknownRole {
        key: String,
    },
    Memory(MemoryError),
}

impl fmt::Display for ScoutError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ScoutError::NotPlaced => {
                write!(f, "this version of the game keeps its tactics where the editor cannot read them")
            }
            ScoutError::NoTactic { club } => {
                write!(f, "no tactic of club {club} was found; pick a team in the game first")
            }
            ScoutError::UnknownRole { key } => write!(f, "unknown role {key}"),
            ScoutError::Memory(err) => write!(f, "{err}"),
        }
    }
}

impl std::error::Error for ScoutError {}

impl Coded for ScoutError {
    fn code(&self) -> &'static str {
        match self {
            ScoutError::NotPlaced => "scout.notPlaced",
            ScoutError::NoTactic { .. } => "scout.noTactic",
            ScoutError::UnknownRole { .. } => "scout.unknownRole",
            ScoutError::Memory(err) => err.code(),
        }
    }

    fn params(&self) -> Vec<(&'static str, String)> {
        match self {
            ScoutError::NoTactic { club } => vec![("club", club.to_string())],
            ScoutError::UnknownRole { key } => vec![("role", key.clone())],
            ScoutError::Memory(err) => err.params(),
            ScoutError::NotPlaced => Vec::new(),
        }
    }
}

impl From<MemoryError> for ScoutError {
    fn from(err: MemoryError) -> Self {
        ScoutError::Memory(err)
    }
}

impl From<crate::transfer::MoveError> for ScoutError {
    fn from(err: crate::transfer::MoveError) -> Self {
        match err {
            crate::transfer::MoveError::Memory(err) => ScoutError::Memory(err),
            _ => ScoutError::NotPlaced,
        }
    }
}

/// One slot of a tactic.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticSlot {
    /// Its place in the formation, goalkeeper first.
    pub index: usize,
    /// Its roles' keys, when the editor knows their masks.
    pub in_possession: Option<&'static str>,
    pub out_of_possession: Option<&'static str>,
    /// The masks as stored, in hex, for roles the editor does not know yet.
    pub in_possession_mask: String,
    pub out_of_possession_mask: String,
    /// The line it plays in, from its roles.
    pub line: Option<Line>,
    /// Its side, for a wide line: the side the player who fills it plays best.
    pub side: Option<Side>,
    /// The position it most likely is (a key of `crate::POSITIONS`), from its line and side.
    pub position: Option<&'static str>,
    /// The UID of the player who fills it, when he is one of the club's.
    pub player: Option<u32>,
}

/// A tactic the club's manager plays, as its selections hold it.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClubTactic {
    /// The style it was made from, as the game codes it (`CONT`, `TIKI`, `DIRE`...).
    pub style: Option<String>,
    pub slots: Vec<TacticSlot>,
    /// How many of the game's copies hold it: the one most copies hold is the tactic in use.
    pub copies: usize,
}

impl Session {
    /// The tactics the manager of `club` has picked a team for, the one most of the game's copies hold first. Finds
    /// the selections by their class, in one pass over the game's memory (a few seconds).
    pub fn club_tactics(&self, club: &ClubSummary, players: &PlayerIndex) -> Result<Vec<ClubTactic>, ScoutError> {
        let (Some(selection), Some(tactic)) = (&self.layout.selection, &self.layout.tactic) else {
            return Err(ScoutError::NotPlaced);
        };
        let vtables = self.selection_vtables();
        if vtables.is_empty() {
            return Err(ScoutError::NotPlaced);
        }
        let p = &self.layout.player;
        // The club's players by the id the game gives people.
        let mut people: HashMap<u32, &PlayerSummary> = HashMap::new();
        for player in players.iter().filter(|player| player.club_uid == Some(club.uid)) {
            if let Ok(id) = self.process.read_u32(player.address + p.at(selection.player_person, player.shift)) {
                people.insert(id, player);
            }
        }
        if people.is_empty() {
            return Err(ScoutError::NoTactic { club: club.uid });
        }

        let mut tactics: Vec<(Vec<u8>, Vec<u32>, ClubTactic)> = Vec::new();
        for object in rtti::objects(&self.process, &self.plugin, vtables)?.into_values().flatten() {
            let Some(list) = PointerList::read(&self.process, object + selection.list)? else {
                continue;
            };
            let Some(&block) = list.elements(&self.process)?.first() else {
                continue;
            };
            let Ok(raw) = self.process.read_bytes(object + selection.slots, 11 * 4) else {
                continue;
            };
            let eleven: Vec<u32> = raw.as_chunks::<4>().0.iter().map(|slot| u32::from_le_bytes(*slot)).collect();
            let filled = eleven.iter().filter(|&&slot| slot != EMPTY).count();
            let ours = eleven.iter().filter(|slot| people.contains_key(slot)).count();
            if filled == 0 || 2 * ours <= filled || !is_user_pointer(block) {
                continue;
            }
            let span = tactic.out_of_possession + 10 * tactic.slot_size + tactic.role + 8;
            let Ok(bytes) = self.process.read_bytes(block, span as usize) else {
                continue;
            };
            let mask = |first: u64, k: u64| {
                let at = (first + k * tactic.slot_size + tactic.role) as usize;
                u64::from_le_bytes(bytes[at..at + 8].try_into().expect("8 bytes"))
            };
            let ip: Vec<u64> = (0..11).map(|k| mask(tactic.in_possession, k)).collect();
            let oop: Vec<u64> = (0..11).map(|k| mask(tactic.out_of_possession, k)).collect();
            // A block the game has given up holds something else.
            if ip.iter().chain(&oop).filter(|&&mask| looks_like_role(mask)).count() < 18 {
                continue;
            }
            let key: Vec<u8> = ip.iter().chain(&oop).flat_map(|mask| mask.to_le_bytes()).collect();
            if let Some((_, _, known)) = tactics.iter_mut().find(|(k, slots, _)| *k == key && *slots == eleven) {
                known.copies += 1;
                continue;
            }
            let style = bytes
                .get(tactic.style as usize..tactic.style as usize + 4)
                .map(|code| code.iter().rev().map(|&b| b as char).collect::<String>())
                .filter(|code| code.chars().all(|c| c.is_ascii_uppercase()));
            let slots = (0..11)
                .map(|k| {
                    let in_possession = role_of_mask(Phase::InPossession, ip[k]);
                    let out_of_possession = role_of_mask(Phase::OutOfPossession, oop[k]);
                    let line = in_possession.or(out_of_possession).map(|role| role.line);
                    let player = people.get(&eleven[k]).copied();
                    let side = line.zip(player).and_then(|(line, player)| side_of(line, &player.position_ratings));
                    TacticSlot {
                        index: k,
                        in_possession: in_possession.map(|role| role.key),
                        out_of_possession: out_of_possession.map(|role| role.key),
                        in_possession_mask: format!("{:x}", ip[k]),
                        out_of_possession_mask: format!("{:x}", oop[k]),
                        line,
                        side,
                        position: line.and_then(|line| position_of(line, side)),
                        player: player.map(|player| player.uid),
                    }
                })
                .collect();
            tactics.push((key, eleven, ClubTactic { style, slots, copies: 1 }));
        }
        if tactics.is_empty() {
            return Err(ScoutError::NoTactic { club: club.uid });
        }
        let mut out: Vec<ClubTactic> = tactics.into_iter().map(|(_, _, tactic)| tactic).collect();
        out.sort_by_key(|tactic| std::cmp::Reverse(tactic.copies));
        Ok(out)
    }
}

/// The side a player of a sided line plays best, from his ratings; none for a central line or a tie.
fn side_of(line: Line, ratings: &[u8; 15]) -> Option<Side> {
    let (right, left) = line.sides()?;
    let best = |positions: &[usize]| positions.iter().map(|&i| ratings[i]).max().unwrap_or(0);
    match best(right).cmp(&best(left)) {
        std::cmp::Ordering::Greater => Some(Side::Right),
        std::cmp::Ordering::Less => Some(Side::Left),
        std::cmp::Ordering::Equal => None,
    }
}

/// The position a tactic slot most likely is, from its line and side: a key of `crate::POSITIONS`. A sided line
/// whose side is not known gives none.
fn position_of(line: Line, side: Option<Side>) -> Option<&'static str> {
    Some(match (line, side) {
        (Line::Goalkeeper, _) => "gk",
        (Line::CentreBack, _) => "dc",
        (Line::FullBack, Some(Side::Right)) => "dr",
        (Line::FullBack, Some(Side::Left)) => "dl",
        (Line::WingBack, Some(Side::Right)) => "wbr",
        (Line::WingBack, Some(Side::Left)) => "wbl",
        (Line::DefensiveMidfield, _) => "dm",
        (Line::CentralMidfield, _) => "mc",
        (Line::AttackingMidfield, _) => "amc",
        (Line::Wide, Some(Side::Right)) => "amr",
        (Line::Wide, Some(Side::Left)) => "aml",
        (Line::Striker, _) => "st",
        (Line::FullBack | Line::WingBack | Line::Wide, None) => return None,
    })
}

/// A position a recommendation can be for, and the lines whose roles are played there, its own line first.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoutPosition {
    /// A key of `crate::POSITIONS`, e.g. `dr`.
    pub key: &'static str,
    pub lines: &'static [Line],
}

/// The positions of the tactics screen, from the goalkeeper up. The game offers wing-back roles in the full-back
/// positions too, and attacking midfielders' roles in central midfield (both seen on Monza's tactic).
pub const SCOUT_POSITIONS: &[ScoutPosition] = &[
    ScoutPosition { key: "gk", lines: &[Line::Goalkeeper] },
    ScoutPosition { key: "dr", lines: &[Line::FullBack, Line::WingBack] },
    ScoutPosition { key: "dc", lines: &[Line::CentreBack] },
    ScoutPosition { key: "dl", lines: &[Line::FullBack, Line::WingBack] },
    ScoutPosition { key: "wbr", lines: &[Line::WingBack, Line::FullBack] },
    ScoutPosition { key: "dm", lines: &[Line::DefensiveMidfield, Line::CentralMidfield] },
    ScoutPosition { key: "wbl", lines: &[Line::WingBack, Line::FullBack] },
    ScoutPosition { key: "mr", lines: &[Line::Wide] },
    ScoutPosition { key: "mc", lines: &[Line::CentralMidfield, Line::AttackingMidfield, Line::DefensiveMidfield] },
    ScoutPosition { key: "ml", lines: &[Line::Wide] },
    ScoutPosition { key: "amr", lines: &[Line::Wide] },
    ScoutPosition { key: "amc", lines: &[Line::AttackingMidfield, Line::CentralMidfield] },
    ScoutPosition { key: "aml", lines: &[Line::Wide] },
    ScoutPosition { key: "st", lines: &[Line::Striker] },
];

/// The position with this key.
pub fn scout_position(key: &str) -> Option<&'static ScoutPosition> {
    SCOUT_POSITIONS.iter().find(|position| position.key == key)
}

/// What a recommendation is for.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Purpose {
    /// Better than the club's best player there now.
    #[default]
    FirstTeam,
    /// At least as good as its second best: depth, at a price that makes sense.
    Rotation,
    /// 21 or younger, with room to grow.
    Future,
    /// Anyone who fits.
    Any,
}

/// How recommendations are ordered.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ScoutOrder {
    /// Fit and probability together, as the purpose weighs them: the default.
    #[default]
    Score,
    Fit,
    Probability,
    /// Cheapest first.
    Fee,
}

/// What a recommendation is asked for.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ScoutRequest {
    /// The position, a key of `crate::POSITIONS` among [`SCOUT_POSITIONS`].
    pub position: String,
    /// The roles, by key; none means the role of the position that suits each player best.
    pub in_possession: Option<String>,
    pub out_of_possession: Option<String>,
    pub purpose: Purpose,
    pub min_age: Option<u16>,
    pub max_age: Option<u16>,
    /// The most the club would pay, pounds.
    pub max_fee: Option<i64>,
    /// Only players at least this likely (0–100) to join.
    pub min_probability: Option<u8>,
    /// Leave out players without a club.
    pub no_free_agents: bool,
    pub order: ScoutOrder,
    /// How many to return; 50 when none.
    pub limit: Option<usize>,
}

/// Why a player looks more or less likely to join, with the value it is about.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Reason {
    /// `listed`, `freeAgent`, `expiring`, `releaseClause`, `fringe`, `keyPlayer`, `unwanted`, `overBudget`,
    /// `stretch`, `wageHigh`, `biggerClub`, `smallerClub`, `reputationGap`, `ambitious`, `notForSale`.
    pub code: &'static str,
    /// Its effect on the probability, in points.
    pub points: i32,
    /// The amount or count it names: pounds, days, a reputation.
    pub value: Option<i64>,
}

/// How a player measures up to a position and its roles.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Fitting {
    pub player: PlayerSummary,
    /// 0–100: his attributes for the roles, held back where the position is new to him.
    pub fit: u8,
    /// His attributes for each role, 1–20, and the roles they were measured for: the ones asked for, or the best of
    /// the position's.
    pub in_possession: Option<f32>,
    pub out_of_possession: Option<f32>,
    pub in_possession_role: Option<&'static str>,
    pub out_of_possession_role: Option<&'static str>,
    /// His rating (1–20) in the position.
    pub position_rating: u8,
}

/// A player recommended for the position.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Suggestion {
    #[serde(flatten)]
    pub fitting: Fitting,
    /// How likely he is to join the club, 0–100, and why: an estimate, not the game's own.
    pub probability: u8,
    pub reasons: Vec<Reason>,
    /// What a transfer would likely cost and what he would likely earn, pounds (a week for the wage); none when the
    /// editor cannot tell (not for sale, no value known).
    pub fee: Option<i64>,
    pub wage: Option<i64>,
    /// His transfer value, pounds; none when the game keeps none or he is not for sale (a reason says so).
    pub value: Option<i32>,
    /// Fit and probability together, as the purpose weighs them, for the default order.
    pub score: u8,
    /// The club his contract is with, when it is not the one he plays for: the club that lent him out (or whose
    /// second team he plays in), which would sell him.
    pub owner_club: Option<String>,
    pub owner_club_uid: Option<u32>,
}

/// The recommendations and what they were measured against.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Scouted {
    pub suggestions: Vec<Suggestion>,
    /// The club's own players for the position, best first (at most five).
    pub squad: Vec<Fitting>,
    /// The club's transfer budget and the wages it can still add, pounds (a week), when its finances are known.
    pub transfer_budget: Option<i64>,
    pub wage_room: Option<i64>,
    /// Players looked at, those who can play the position, and those of them who meet the purpose.
    pub examined: usize,
    pub candidates: usize,
    pub eligible: usize,
}

/// What scouting needs to know about the buying club.
#[derive(Debug, Clone)]
pub struct Buyer<'a> {
    pub club: &'a ClubSummary,
    /// Pounds; a week for the wages.
    pub transfer_budget: Option<i64>,
    pub wage_budget: Option<i64>,
}

/// The attribute weights of a role, by place in [`PlayerSummary::attributes`].
fn weights(role: &Role, places: &HashMap<&str, usize>) -> Vec<(usize, f32)> {
    let key = role.key_attributes.iter().map(|key| (key, 3.0));
    let other = role.other_attributes.iter().map(|key| (key, 1.0));
    key.chain(other).filter_map(|(key, weight)| places.get(*key).map(|&i| (i, weight))).collect()
}

/// A player's attributes for a role, 1–20.
fn role_rating(attributes: &[u8], weights: &[(usize, f32)]) -> Option<f32> {
    let (mut sum, mut total) = (0.0, 0.0);
    for &(i, weight) in weights {
        let value = *attributes.get(i)?;
        sum += weight * f32::from(value);
        total += weight;
    }
    (total > 0.0).then(|| sum / total)
}

/// How much of his attributes a player brings to a position rated `rating` (1–20): all of them from 15, where the
/// game calls him accomplished there, less below.
pub(crate) fn position_factor(rating: u8) -> f32 {
    match rating {
        18.. => 1.0,
        15..=17 => 0.97,
        13..=14 => 0.88,
        10..=12 => 0.75,
        _ => 0.0,
    }
}

/// The lowest position rating a recommendation may have.
pub(crate) const LOWEST_RATING: u8 = 10;

/// What a player's measure for a position came to.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Measured {
    pub(crate) fit: u8,
    ip: Option<(f32, &'static str)>,
    oop: Option<(f32, &'static str)>,
    pub(crate) rating: u8,
}

/// Roles by key with their attribute weights.
type Weighted = Vec<(&'static str, Vec<(usize, f32)>)>;

/// A position and the roles a player is measured for there.
pub(crate) struct Measure {
    position: usize,
    ip: Weighted,
    oop: Weighted,
}

impl Measure {
    /// The measure for a position (a key of [`SCOUT_POSITIONS`]) and the roles of it that suit each player best.
    pub(crate) fn for_position(key: &str) -> Result<Self, ScoutError> {
        Self::new(&ScoutRequest { position: key.to_owned(), ..ScoutRequest::default() })
    }

    pub(crate) fn new(request: &ScoutRequest) -> Result<Self, ScoutError> {
        let unknown = |key: &str| ScoutError::UnknownRole { key: key.to_owned() };
        let position = scout_position(&request.position).ok_or_else(|| unknown(&request.position))?;
        let index =
            crate::POSITIONS.iter().position(|&key| key == position.key).ok_or_else(|| unknown(position.key))?;
        let places: HashMap<&str, usize> =
            attribute_keys(ATTRIBUTE_GROUPS).enumerate().map(|(i, key)| (key, i)).collect();
        let roles = |phase: Phase, asked: &Option<String>| -> Result<Weighted, ScoutError> {
            let chosen: Vec<&'static Role> = match asked.as_deref() {
                Some(key) => vec![role(phase, key).ok_or_else(|| unknown(key))?],
                None => ROLES.iter().filter(|r| r.phase == phase && position.lines.contains(&r.line)).collect(),
            };
            Ok(chosen.into_iter().map(|role| (role.key, weights(role, &places))).collect())
        };
        Ok(Self {
            position: index,
            ip: roles(Phase::InPossession, &request.in_possession)?,
            oop: roles(Phase::OutOfPossession, &request.out_of_possession)?,
        })
    }

    pub(crate) fn of(&self, player: &PlayerSummary) -> Option<Measured> {
        let rating = player.position_ratings[self.position];
        let best = |roles: &[(&'static str, Vec<(usize, f32)>)]| {
            roles
                .iter()
                .filter_map(|(key, w)| role_rating(&player.attributes, w).map(|r| (r, *key)))
                .max_by(|a, b| a.0.total_cmp(&b.0))
        };
        let ip = best(&self.ip);
        let oop = best(&self.oop);
        let both = match (ip, oop) {
            (Some((ip, _)), Some((oop, _))) => 0.6 * ip + 0.4 * oop,
            (Some((one, _)), None) | (None, Some((one, _))) => one,
            (None, None) => return None,
        };
        // A role rating of 5 is no fit at all and 17 a full one; the game shows few players above that.
        let fit = ((both - 5.0) / 12.0 * 100.0 * position_factor(rating)).round().clamp(0.0, 100.0) as u8;
        Some(Measured { fit, ip, oop, rating })
    }
}

pub(crate) fn fitting(player: &PlayerSummary, m: Measured) -> Fitting {
    Fitting {
        player: player.clone(),
        fit: m.fit,
        in_possession: m.ip.map(|(r, _)| r),
        out_of_possession: m.oop.map(|(r, _)| r),
        in_possession_role: m.ip.map(|(_, key)| key),
        out_of_possession_role: m.oop.map(|(_, key)| key),
        position_rating: m.rating,
    }
}

/// How much room to grow a player has, 0–100, from his potential ability: none below 100, all of it at 200.
fn potential(player: &PlayerSummary) -> f32 {
    f32::from((player.potential_ability.max(0) - 100).clamp(0, 100) as u8)
}

/// Fit and probability together for the default order, as the purpose weighs them: past his best years a player
/// counts for less, and a young one with room to grow for a little more.
pub(crate) fn score(purpose: Purpose, fit: u8, probability: u8, player: &PlayerSummary) -> u8 {
    let (fit, probability) = (f32::from(fit), f32::from(probability));
    let age = player.age.unwrap_or(27);
    let years = match age {
        ..=29 => 1.0,
        30..=31 => 0.95,
        32..=33 => 0.88,
        _ => 0.8,
    };
    let room = i32::from(player.potential_ability) - i32::from(player.current_ability);
    let growth = if age <= 23 && room >= 15 { (room / 5).min(6) as f32 } else { 0.0 };
    let score = match purpose {
        Purpose::FirstTeam | Purpose::Any => (0.7 * fit + 0.3 * probability) * years + growth,
        Purpose::Rotation => (0.5 * fit + 0.5 * probability) * years,
        Purpose::Future => 0.35 * fit + 0.35 * potential(player) + 0.3 * probability,
    };
    score.round().clamp(0.0, 100.0) as u8
}

/// How many fitting players to look at closely before the probability of a move is worked out.
pub(crate) const SHORTLIST: usize = 400;

/// The youngest a future prospect may be past.
const PROSPECT_AGE: u16 = 21;

impl Session {
    /// Players to recommend for the position `request` describes, best first, for `buyer`, with the club's own
    /// players there to compare. Reads the shortlisted players' reputation, ambition and contract from memory.
    pub fn scout(
        &self,
        request: &ScoutRequest,
        buyer: &Buyer<'_>,
        players: &PlayerIndex,
        clubs: &SearchIndex<ClubSummary>,
        human_clubs: &[u32],
    ) -> Result<Scouted, ScoutError> {
        let measure = Measure::new(request)?;
        let today = self.game_date();

        // The club's own players there, best first.
        let mut own: Vec<(&PlayerSummary, Measured)> = players
            .iter()
            .filter(|player| player.club_uid == Some(buyer.club.uid))
            .filter_map(|player| measure.of(player).map(|m| (player, m)))
            .filter(|(_, m)| m.rating >= LOWEST_RATING)
            .collect();
        own.sort_by(|a, b| b.1.fit.cmp(&a.1.fit).then(b.0.current_ability.cmp(&a.0.current_ability)));
        let best_own = own.first().map_or(0, |(_, m)| m.fit);
        let second_own = own.get(1).map_or(0, |(_, m)| m.fit);
        let squad: Vec<Fitting> = own.iter().take(5).map(|&(player, m)| fitting(player, m)).collect();

        let mut examined = 0;
        let mut fitting_players: Vec<(&PlayerSummary, Measured, Option<u32>)> = Vec::new();
        for player in players.iter() {
            examined += 1;
            let own = player.club_uid == Some(buyer.club.uid);
            let human = player.club_uid.is_some_and(|club| human_clubs.contains(&club));
            let free = player.club_uid.is_none();
            if own || human || (free && request.no_free_agents) {
                continue;
            }
            if player.woman.is_some_and(|woman| woman != buyer.club.women) {
                continue;
            }
            if let Some(age) = player.age {
                if request.min_age.is_some_and(|min| age < min) || request.max_age.is_some_and(|max| age > max) {
                    continue;
                }
                // Players without a club past this age are mostly retired.
                if free && age > 35 {
                    continue;
                }
                if request.purpose == Purpose::Future && age > PROSPECT_AGE {
                    continue;
                }
            }
            if player.position_ratings[measure.position] < LOWEST_RATING {
                continue;
            }
            let Some(m) = measure.of(player) else {
                continue;
            };
            // A player the club, or another human manager's, has lent out or plays in its second team is its own.
            let owner = self.contract_club(player);
            if owner == Some(buyer.club.uid) || owner.is_some_and(|club| human_clubs.contains(&club)) {
                continue;
            }
            fitting_players.push((player, m, owner));
        }
        let candidates = fitting_players.len();
        let purpose_fits = |player: &PlayerSummary, m: &Measured| match request.purpose {
            Purpose::FirstTeam => m.fit > best_own,
            Purpose::Rotation => m.fit >= second_own.max(best_own.saturating_sub(10)),
            Purpose::Future => i32::from(player.potential_ability) - i32::from(player.current_ability) >= 15,
            Purpose::Any => true,
        };
        fitting_players.retain(|(player, m, _)| purpose_fits(player, m));
        let eligible = fitting_players.len();
        let rank = |player: &PlayerSummary, m: &Measured| match request.purpose {
            Purpose::Future => f32::from(m.fit) + potential(player),
            _ => f32::from(m.fit),
        };
        fitting_players.sort_by(|a, b| rank(b.0, &b.1).total_cmp(&rank(a.0, &a.1)));
        fitting_players.truncate(SHORTLIST);

        let wage_room = self.wage_room(buyer, players);
        let looking = Looking { buyer, clubs, today, wage_room };
        let mut suggestions: Vec<Suggestion> = fitting_players
            .into_iter()
            .map(|(player, m, owner)| self.suggestion(player, m, owner, request.purpose, &looking))
            .filter(|s| request.max_fee.is_none_or(|max| s.fee.is_some_and(|fee| fee <= max)))
            .filter(|s| request.min_probability.is_none_or(|min| s.probability >= min))
            .collect();
        match request.order {
            ScoutOrder::Score => {
                suggestions.sort_by(|a, b| b.score.cmp(&a.score).then(b.fitting.fit.cmp(&a.fitting.fit)))
            }
            ScoutOrder::Fit => {
                suggestions.sort_by(|a, b| b.fitting.fit.cmp(&a.fitting.fit).then(b.score.cmp(&a.score)))
            }
            ScoutOrder::Probability => {
                suggestions.sort_by(|a, b| b.probability.cmp(&a.probability).then(b.fitting.fit.cmp(&a.fitting.fit)))
            }
            ScoutOrder::Fee => suggestions.sort_by(|a, b| {
                a.fee.unwrap_or(i64::MAX).cmp(&b.fee.unwrap_or(i64::MAX)).then(b.fitting.fit.cmp(&a.fitting.fit))
            }),
        }
        suggestions.truncate(request.limit.unwrap_or(50).clamp(1, 200));
        Ok(Scouted {
            suggestions,
            squad,
            transfer_budget: buyer.transfer_budget,
            wage_room,
            examined,
            candidates,
            eligible,
        })
    }

    /// The UID of the club a player's contract is with: the club he plays for, or the one that lent him out.
    pub(crate) fn contract_club(&self, player: &PlayerSummary) -> Option<u32> {
        let p = &self.layout.player;
        let contract = self.process.read_u64(player.address + p.at(p.contract, player.shift)).ok()?;
        if !is_user_pointer(contract) {
            return None;
        }
        let team = self.process.read_u64(contract + self.layout.contract.team).ok()?;
        club_uid_of_team(&self.process, &self.layout, team)
    }

    /// The wages the club can still add a week: its wage budget less what its players earn now, pounds.
    pub fn wage_room(&self, buyer: &Buyer<'_>, players: &PlayerIndex) -> Option<i64> {
        buyer.wage_budget.zip(self.wage_bill(buyer.club, players)).map(|(budget, bill)| budget - bill)
    }

    /// The weekly wages of the players under contract with the club, pounds: those in its teams' lists, the ones it
    /// has lent out too, but not those it has on loan.
    fn wage_bill(&self, club: &ClubSummary, players: &PlayerIndex) -> Option<i64> {
        let p = &self.layout.player;
        let c = &self.layout.contract;
        let teams = self.club_teams(club, players).ok()?;
        let mut counted = HashSet::new();
        let mut bill = 0i64;
        for member in teams.iter().flat_map(|team| &team.players) {
            if member.loan == Some(Loan::In) || !counted.insert(member.uid) {
                continue;
            }
            let Some(player) = players.get(member.uid) else {
                continue;
            };
            let contract = self.process.read_u64(player.address + p.at(p.contract, player.shift)).ok()?;
            if is_user_pointer(contract) {
                bill += i64::from(self.process.read_u32(contract + c.wage).ok()? as i32);
            }
        }
        Some(bill)
    }

    pub(crate) fn suggestion(
        &self,
        player: &PlayerSummary,
        m: Measured,
        owner: Option<u32>,
        purpose: Purpose,
        looking: &Looking<'_>,
    ) -> Suggestion {
        // The club that would sell him: the one his contract is with.
        let seller = owner.or(player.club_uid).and_then(|uid| looking.clubs.get(uid));
        let lent = owner.filter(|&uid| Some(uid) != player.club_uid);
        let facts = self.facts(player, looking.today);
        let (probability, reasons, fee, wage) = probability(player, &facts, seller, looking);
        Suggestion {
            fitting: fitting(player, m),
            probability,
            reasons,
            fee,
            wage,
            value: known_value(player.transfer_value),
            score: score(purpose, m.fit, probability, player),
            owner_club: lent.and_then(|uid| looking.clubs.get(uid)).map(|club| club.name.clone()),
            owner_club_uid: lent,
        }
    }

    /// What decides a move that the player list does not hold, on the game's date `today`.
    fn facts(&self, player: &PlayerSummary, today: Option<FmDate>) -> Facts {
        let p = &self.layout.player;
        let c = &self.layout.contract;
        let at = |offset: u64| player.address + p.at(offset, player.shift);
        let reputation =
            self.process.read_bytes(at(p.current_reputation), 2).ok().map(|b| u16::from_le_bytes([b[0], b[1]]));
        let ambition_place = PERSONALITY.iter().position(|&key| key == "ambition").unwrap_or(1) as u64;
        let ambition = self.process.read_bytes(at(p.personality) + ambition_place, 1).ok().map(|b| b[0]);
        let contract = self.process.read_u64(at(p.contract)).ok().filter(|&contract| is_user_pointer(contract));
        let (wage, squad_status, release_clause) = match contract {
            Some(contract) => {
                let wage = self.process.read_u32(contract + c.wage).ok().map(|wage| wage as i32);
                let status = self.process.read_bytes(contract + c.squad_status, 1).ok().map(|b| b[0]);
                // The day of the year in the low half, the year in the high half.
                let signed = self.process.read_u32(contract + c.signed).ok();
                let signed = signed.and_then(|raw| FmDate::from_raw(raw as u16, (raw >> 16) as u16));
                let clause = release_fee(&read_clauses(&self.process, &self.layout, contract), signed, today);
                (wage, status, clause)
            }
            None => (None, None, None),
        };
        Facts { reputation, ambition, wage, squad_status, release_clause }
    }
}

/// From this, a move counts as likely.
pub const LIKELY: u8 = 50;

pub(crate) struct Looking<'a> {
    pub(crate) buyer: &'a Buyer<'a>,
    pub(crate) clubs: &'a SearchIndex<ClubSummary>,
    pub(crate) today: Option<FmDate>,
    pub(crate) wage_room: Option<i64>,
}

struct Facts {
    /// 0–10000.
    reputation: Option<u16>,
    /// 1–20.
    ambition: Option<u8>,
    /// Pounds a week.
    wage: Option<i32>,
    /// The contract's squad status code (see [`Standing`]).
    squad_status: Option<u8>,
    /// The fee a release clause lets a club pay, pounds (see [`release_fee`]).
    release_clause: Option<u32>,
}

/// How likely a transfer looks, why, and what it would likely cost and pay.
fn probability(
    player: &PlayerSummary,
    facts: &Facts,
    seller: Option<&ClubSummary>,
    looking: &Looking<'_>,
) -> (u8, Vec<Reason>, Option<i64>, Option<i64>) {
    let mut reasons = Vec::new();
    let mut add = |code: &'static str, points: i32, value: Option<i64>| reasons.push(Reason { code, points, value });
    let free = player.club_uid.is_none();
    let value = player.transfer_value.filter(|&value| value >= 0).map(i64::from);
    let not_for_sale = player.transfer_value == Some(NOT_FOR_SALE);
    let days_left = looking.today.zip(player.contract_expires).map(|(today, expires)| days_between(today, expires));

    // The fee: his value, more for a player his club counts on, less for one it lists or whose contract runs out.
    let mut fee = if free { Some(0) } else { value.filter(|_| !not_for_sale) };
    if free {
        add("freeAgent", 25, None);
    } else if not_for_sale {
        add("notForSale", -45, None);
    }
    if !free {
        if player.transfer_listed {
            add("listed", 15, None);
            fee = fee.map(|fee| fee * 4 / 5);
        }
        match facts.squad_status.and_then(Standing::of) {
            Some(Standing::Key) => {
                add("keyPlayer", -15, facts.squad_status.map(i64::from));
                fee = fee.map(|fee| fee * 7 / 5);
            }
            Some(Standing::Fringe) => add("fringe", 10, facts.squad_status.map(i64::from)),
            Some(Standing::Surplus) => add("unwanted", 15, facts.squad_status.map(i64::from)),
            _ => fee = fee.map(|fee| fee * 23 / 20),
        }
        match days_left {
            Some(days) if days <= 183 => {
                add("expiring", 15, Some(days));
                fee = fee.map(|fee| fee * 7 / 20);
            }
            Some(days) if days <= 365 => {
                add("expiring", 8, Some(days));
                fee = fee.map(|fee| fee * 7 / 10);
            }
            _ => {}
        }
        if let Some(clause) = facts.release_clause.map(i64::from)
            && fee.is_none_or(|fee| clause < fee)
        {
            add("releaseClause", 5, Some(clause));
            fee = Some(clause);
        }
    }
    if let (Some(fee), Some(budget)) = (fee, looking.buyer.transfer_budget) {
        if fee > budget * 13 / 10 {
            add("overBudget", -40, Some(fee - budget));
        } else if fee > budget {
            add("stretch", -15, Some(fee - budget));
        }
    }

    // The wage: what he earns now and a rise to move, or the going rate for his ability without a contract.
    let wage = match facts.wage {
        Some(wage) if wage > 0 => Some(i64::from(wage) * 5 / 4),
        _ => Some(going_wage(player.current_ability)),
    };
    if let (Some(wage), Some(room)) = (wage, looking.wage_room)
        && wage > room.max(0)
    {
        add("wageHigh", -20, Some(wage - room.max(0)));
    }

    // The clubs and the player's standing.
    let ours = i64::from(looking.buyer.club.reputation.unwrap_or(0));
    if let Some(theirs) = seller.and_then(|club| club.reputation).map(i64::from) {
        if theirs > ours + 1000 {
            add("biggerClub", -20, Some(theirs));
        } else if theirs + 1000 < ours {
            add("smallerClub", 10, Some(theirs));
        }
    }
    if let Some(reputation) = facts.reputation.map(i64::from) {
        let gap = reputation - ours;
        if gap > 1500 {
            let ambition = i64::from(facts.ambition.unwrap_or(10));
            let points = -((gap / 250).min(30) as i32) - ((ambition - 12).max(0) * 2) as i32;
            add("reputationGap", points, Some(reputation));
        } else if gap < -1500 && facts.ambition.is_some_and(|ambition| ambition >= 15) {
            add("ambitious", 5, facts.ambition.map(i64::from));
        }
    }

    let points: i32 = 55 + reasons.iter().map(|reason| reason.points).sum::<i32>();
    (points.clamp(0, 100) as u8, reasons, fee, wage)
}

/// The fee a release clause of the contract lets a club pay, if one holds: the lowest minimum fee release clause above
/// nothing whose time has not run out. A release clause's condition, when it has one, is the days from the contract's
/// start (`signed`) until it expires: one signed on 3 July 2027 with 791 runs out on 1 September 2029, as the game's
/// contract screen says. A release clause of 0 is left out: the game shows it, but whether it takes a bid of nothing is
/// not known.
pub(crate) fn release_fee(clauses: &[Clause], signed: Option<FmDate>, today: Option<FmDate>) -> Option<u32> {
    let holds = |clause: &&Clause| match (clause.condition, signed, today) {
        (Some(days), Some(signed), Some(today)) => today < signed.plus_days(i64::from(days)),
        _ => true,
    };
    clauses
        .iter()
        .filter(|clause| clause.kind == RELEASE_CLAUSE)
        .filter(holds)
        .filter_map(|clause| clause.amount)
        .filter(|&amount| amount > 0)
        .min()
}

/// Days from `from` to `to`, by the calendar.
pub(crate) fn days_between(from: FmDate, to: FmDate) -> i64 {
    let ordinal = |date: FmDate| {
        let year = i64::from(date.year);
        let leap = |y: i64| (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
        let days_before_year: i64 = (1900..year).map(|y| if leap(y) { 366 } else { 365 }).sum();
        days_before_year + i64::from(date.day_of_year())
    };
    ordinal(to) - ordinal(from)
}

/// A rough weekly wage for a player without a contract, from his current ability (1–200), pounds.
fn going_wage(ability: u16) -> i64 {
    let ability = i64::from(ability.min(200));
    // From a few hundred pounds at 60 to about 100,000 at 170.
    let base = (ability - 50).max(0);
    (base * base * base / 17).max(250)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_mask_is_two_bits_with_one_of_21_to_23() {
        for role in ROLES {
            assert!(looks_like_role(role.mask), "{} {:?} {:x}", role.key, role.phase, role.mask);
        }
    }

    #[test]
    fn masks_are_unique_within_a_phase() {
        for (i, a) in ROLES.iter().enumerate() {
            for b in &ROLES[i + 1..] {
                assert!(!(a.phase == b.phase && a.mask == b.mask), "{} and {}", a.key, b.key);
                assert!(!(a.phase == b.phase && a.key == b.key), "{} twice", a.key);
            }
        }
    }

    #[test]
    fn masks_read_on_the_tactics_screen() {
        assert_eq!(role_of_mask(Phase::InPossession, 0x0010_0000_0020_0000).map(|r| r.key), Some("ifb"));
        assert_eq!(role_of_mask(Phase::InPossession, 0x40_0004).map(|r| r.key), Some("fb"));
        assert_eq!(role_of_mask(Phase::OutOfPossession, 0x40_0400).map(|r| r.key), Some("pfb"));
        assert_eq!(role_of_mask(Phase::OutOfPossession, 0x80_0000_0000 | 0x20_0000).map(|r| r.key), Some("tw"));
        assert_eq!(role_of_mask(Phase::OutOfPossession, 0x1_0080_0000).map(|r| r.key), Some("oam"));
    }

    #[test]
    fn every_attribute_named_exists() {
        let keys: Vec<&str> = attribute_keys(ATTRIBUTE_GROUPS).collect();
        for role in ROLES {
            for key in role.key_attributes.iter().chain(role.other_attributes) {
                assert!(keys.contains(key), "{}: {key}", role.key);
            }
        }
    }

    #[test]
    fn every_position_has_roles_in_both_phases() {
        for position in SCOUT_POSITIONS {
            assert!(crate::POSITIONS.contains(&position.key), "{}", position.key);
            for phase in [Phase::InPossession, Phase::OutOfPossession] {
                assert!(
                    ROLES.iter().any(|r| r.phase == phase && position.lines.contains(&r.line)),
                    "{} {phase:?}",
                    position.key
                );
            }
        }
    }

    #[test]
    fn sides_follow_the_ratings() {
        let mut ratings = [1u8; 15];
        ratings[DR] = 20;
        ratings[DL] = 12;
        assert_eq!(side_of(Line::FullBack, &ratings), Some(Side::Right));
        assert_eq!(side_of(Line::CentreBack, &ratings), None);
        ratings[WBL] = 20;
        assert_eq!(side_of(Line::FullBack, &ratings), None);
    }

    #[test]
    fn slots_name_their_position() {
        assert_eq!(position_of(Line::FullBack, Some(Side::Right)), Some("dr"));
        assert_eq!(position_of(Line::Wide, Some(Side::Left)), Some("aml"));
        assert_eq!(position_of(Line::Wide, None), None);
        assert_eq!(position_of(Line::Striker, None), Some("st"));
    }

    #[test]
    fn days_count_across_years() {
        let from = FmDate { year: 2027, month: 8, day: 15 };
        let to = FmDate { year: 2028, month: 6, day: 30 };
        assert_eq!(days_between(from, to), 320);
    }

    #[test]
    fn only_real_values_are_amounts() {
        assert_eq!(known_value(Some(144_244_816)), Some(144_244_816));
        assert_eq!(known_value(Some(0)), Some(0));
        // This year's youth intake has none yet; a player the game keeps as not for sale has no amount either.
        assert_eq!(known_value(Some(-1)), None);
        assert_eq!(known_value(Some(NOT_FOR_SALE)), None);
        assert_eq!(known_value(None), None);
    }

    #[test]
    fn squad_statuses_by_their_codes() {
        for (codes, standing) in [
            (&[1, 2, 15][..], Standing::Key),
            (&[3], Standing::Regular),
            (&[4, 5, 7, 9, 14, 16, 17, 20, 21], Standing::Fringe),
            (&[10, 11, 13], Standing::Prospect),
            (&[22], Standing::Surplus),
        ] {
            for &code in codes {
                assert_eq!(Standing::of(code), Some(standing), "{code}");
            }
        }
        // Not seen in use.
        for code in [0, 6, 8, 12, 18, 19, 255] {
            assert_eq!(Standing::of(code), None, "{code}");
        }
    }

    #[test]
    fn release_clauses_that_hold() {
        let clause = |kind, amount, condition| Clause { index: 0, kind, amount, condition };
        let on = |year, month, day| Some(FmDate { year, month, day });
        let signed = on(2027, 7, 3);
        // Signed on 3 July 2027 with 791 days: the game says it expires on 1 September 2029.
        let expiring = [clause(RELEASE_CLAUSE, Some(20_000_000), Some(791))];
        assert_eq!(release_fee(&expiring, signed, on(2029, 8, 31)), Some(20_000_000));
        assert_eq!(release_fee(&expiring, signed, on(2029, 9, 1)), None);
        // Without the dates it is taken to hold.
        assert_eq!(release_fee(&expiring, None, on(2030, 1, 1)), Some(20_000_000));
        assert_eq!(release_fee(&expiring, signed, None), Some(20_000_000));
        // Without a condition it never expires; one of 0 and other kinds are left out; the lowest counts.
        let list = [
            clause(RELEASE_CLAUSE, Some(0), None),
            clause(27, Some(5_000_000), None),
            clause(RELEASE_CLAUSE, Some(30_000_000), None),
            clause(RELEASE_CLAUSE, Some(25_000_000), None),
        ];
        assert_eq!(release_fee(&list, signed, on(2040, 1, 1)), Some(25_000_000));
        assert_eq!(release_fee(&list[..2], signed, on(2028, 1, 1)), None);
    }

    #[test]
    fn fit_holds_back_new_positions() {
        assert!(position_factor(20) > position_factor(14));
        assert_eq!(position_factor(9), 0.0);
    }

    #[test]
    fn any_role_takes_the_best_of_the_position() {
        let request = ScoutRequest { position: "dr".to_owned(), ..ScoutRequest::default() };
        let measure = Measure::new(&request).expect("dr");
        assert!(measure.ip.iter().any(|(key, _)| *key == "ifb") && measure.ip.iter().any(|(key, _)| *key == "wb"));
        assert!(measure.ip.iter().all(|(key, _)| *key != "cb"));
        let asked = ScoutRequest { position: "dr".to_owned(), in_possession: Some("ifb".to_owned()), ..request };
        assert_eq!(Measure::new(&asked).expect("ifb").ip.len(), 1);
        assert!(Measure::new(&ScoutRequest { position: "xx".to_owned(), ..ScoutRequest::default() }).is_err());
    }
}
