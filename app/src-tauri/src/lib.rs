mod bridge;

use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use fmlibre_core::{
    ArraySource, Buyer, CaptainRole, CaptainSet, Change, Clause, ClauseSet, ClubDetails, ClubFilter, ClubIndex,
    ClubMove, ClubSummary, Coded, EditError, Entity, EntityArrays, ExportFormat, ExportHeader, FeePlan, Field, FmDate,
    GAME_EXE, GAME_PLUGIN, GameInfo, GraphicsCounts, GraphicsIndex, HOMEGROWN_RULES, Healed, Health, Kind,
    LOAN_EXPIRES, LOAN_OPTION_FEE, Lifted, Lineup, Listed, Loan, MoveError, MovePlan, MoveTerms, Nation, NewContract,
    NewStaffContract, Operation, Paid, Phase, Picture, Planned, PlayerDetails, PlayerFilter, PlayerIndex, PlayerOrder,
    PlayerSummary, ROLES, RelationSet, RetirementSet, Role, RoleFit, SCOUT_POSITIONS, ScoutError, ScoutPosition,
    ScoutRequest, Scouted, SearchIndex, Session, SessionError, Skipped, SlotRoles, SquadChoice, SquadReport,
    StadiumName, StadiumRename, StaffChange, StaffDetails, StaffFilter, StaffIndex, StaffOrder, StaffPlan, TacticRank,
    Target, Tie, TieTarget, TrainingFocus, find_game, nations, sort_players, sort_staff,
};
use fmlibre_mem::{Process, find_processes, is_current_process_elevated, list_modules};
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

/// The environment variable that names the graphics folder to read packs from, instead of
/// `Documents\Sports Interactive\Football Manager 27\graphics` on Windows and
/// `~/Library/Application Support/Sports Interactive/Football Manager 27/graphics` on macOS.
const GRAPHICS_FOLDER: &str = "FMLIBRE_GRAPHICS";

/// The environment variable that names the folder the app keeps its own files in, instead of its data folder
/// (`%APPDATA%\io.github.tozmoz.fmlibreeditor` on Windows): for now, what was frozen in each save.
const DATA_FOLDER: &str = "FMLIBRE_DATA";

/// The file in that folder that remembers what was frozen in each save (see `Remembered`).
const FROZEN_FILE: &str = "frozen.json";

/// The environment variable that names the folder exports are written to, instead of `FMLibreEditor\Exports` in the
/// documents folder.
const EXPORTS_FOLDER: &str = "FMLIBRE_EXPORTS";

/// The connected game, the people read from it and the changes written this session.
struct Connection {
    session: Session,
    players: PlayerIndex,
    staff: StaffIndex,
    clubs: ClubIndex,
    /// The clubs human managers run: a player who leaves one leaves its team selections too.
    human_clubs: Vec<u32>,
    log: Vec<LoggedChange>,
    /// The mass edit last previewed, until it is applied or replaced.
    mass: Option<PendingMass>,
    /// The next id for a mass-edit preview or batch.
    next_id: u32,
    frozen: Frozen,
    /// Which save the game has loaded (see `save_of`); none when the lists name no human manager.
    save: Option<String>,
    /// What the hold last found of the game's clubs, for the stadiums renamed in the editor.
    clubs_seen: ClubsSeen,
}

/// How often the balances of frozen clubs, the attributes, energy and sharpness of frozen players, the attributes of
/// frozen members of staff and the names of renamed stadiums are looked at.
const FREEZE_EVERY: Duration = Duration::from_secs(2);

/// How long after the game's clubs moved (a save loaded) the hold looks often whether the game has the save the lists
/// were read from, while it may still be loading it, how often, and how often after that.
const SAVE_SETTLES: Duration = Duration::from_secs(180);
const SAVE_RECHECK: Duration = Duration::from_secs(5);
const SAVE_RECHECK_LATER: Duration = Duration::from_secs(60);

/// What the hold last found of the game's clubs (see `Connection::hold_stadiums`): a save loaded again, this one or
/// another, gives them a new array, of new objects.
struct ClubsSeen {
    /// Where the array of clubs began.
    begin: u64,
    /// Whether a club whose stadium was renamed was missing, or not where the lists found it.
    lost: bool,
    /// Whether the game had given a stadium renamed in the editor another name.
    off: bool,
    /// Since when the game had what it has: when one of these last came about.
    since: Instant,
    /// Whether the game has the save the lists were read from; none until it is known.
    same_save: Option<bool>,
    /// When that was last worked out.
    checked: Option<Instant>,
}

impl ClubsSeen {
    fn unknown(begin: u64) -> Self {
        Self { begin, lost: false, off: false, since: Instant::now(), same_save: None, checked: None }
    }
}

/// The attributes of a player that are at their best at 1, not at 20.
const LOWER_IS_BETTER: [&str; 2] = ["attribute.injury_proneness", "attribute.dirtiness"];

/// The fields of a player that freezing his fitness holds: his energy and his match sharpness.
const FITNESS: [&str; 2] = ["condition", "match_sharpness"];

/// What the app keeps from getting worse while it is connected (see `Connection::hold_frozen`).
#[derive(Default)]
struct Frozen {
    /// The clubs whose money is frozen, with the least their balance may be: what it was when it was frozen, or more
    /// once the club earned more.
    money: BTreeMap<u32, i64>,
    /// The players whose attributes are frozen, with the worst each attribute may be, as stored: what it was when it
    /// was frozen, or better once he improved. Worse is lower, or higher where lower is better.
    attributes: BTreeMap<u32, BTreeMap<String, i64>>,
    /// The members of staff whose attributes are frozen, with the worst each attribute may be, as stored: what it was
    /// when it was frozen, or better once it improved. None of them is better lower.
    staff: BTreeMap<u32, BTreeMap<String, i64>>,
    /// The players whose energy and match sharpness are frozen, with the least each may be, as stored: what it was
    /// when it was frozen, or more once he was fitter. A player frozen at full energy stays at it.
    fitness: BTreeMap<u32, BTreeMap<String, i64>>,
    /// The players whose positions are frozen at their exact ratings: neither lower nor higher.
    positions: BTreeMap<u32, BTreeMap<String, i64>>,
    /// The stadiums renamed in the editor, by the UID of a club that plays there: the game gives a stadium its own
    /// name back whenever it loads the save, as it keeps no stadium names in it, and the app gives it the new one again.
    stadiums: BTreeMap<u32, HeldName>,
}

/// A stadium's name as the editor gave it, and the game's own, which an undo back to it lets go of.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct HeldName {
    name: String,
    original: String,
}

impl HeldName {
    /// What is held once the editor has given a stadium `name`, by a rename or an undo, after `held` was: `before` is
    /// the name it had, which is the game's own when nothing was held. Nothing, once it has the game's own name back.
    fn after(held: Option<&HeldName>, name: &str, before: &str) -> Option<HeldName> {
        let original = held.map_or(before, |held| held.original.as_str());
        (name != original).then(|| HeldName { name: name.to_owned(), original: original.to_owned() })
    }
}

impl Frozen {
    fn is_empty(&self) -> bool {
        self.money.is_empty()
            && self.attributes.is_empty()
            && self.staff.is_empty()
            && self.fitness.is_empty()
            && self.positions.is_empty()
            && self.stadiums.is_empty()
    }

    /// The players frozen in the way `kind` names, with what they are held at.
    fn of(&mut self, kind: FreezeKind) -> &mut BTreeMap<u32, BTreeMap<String, i64>> {
        match kind {
            FreezeKind::Attributes => &mut self.attributes,
            FreezeKind::Fitness => &mut self.fitness,
            FreezeKind::Positions => &mut self.positions,
        }
    }

    /// A value the editor just wrote to a frozen field becomes what it is held at, so it is not taken back as if the
    /// game had changed it.
    fn note(&mut self, change: &Change, value: i64) {
        let held = match change.entity {
            Entity::Club if change.field == "finance.balance" => self.money.get_mut(&change.uid),
            Entity::Player if change.field.starts_with("position.") => {
                self.positions.get_mut(&change.uid).and_then(|held| held.get_mut(&change.field))
            }
            Entity::Player if change.field.starts_with("attribute.") => {
                self.attributes.get_mut(&change.uid).and_then(|held| held.get_mut(&change.field))
            }
            Entity::Player => self.fitness.get_mut(&change.uid).and_then(|held| held.get_mut(&change.field)),
            Entity::Staff => self.staff.get_mut(&change.uid).and_then(|held| held.get_mut(&change.field)),
            _ => None,
        };
        if let Some(held) = held {
            *held = value;
        }
    }
}

/// What was frozen in each save, kept in a file so that it is frozen again when the app connects to that save another
/// time: after the app, the game or the computer was restarted.
#[derive(Default, Serialize, Deserialize)]
struct Remembered {
    /// By save (see `save_of`).
    saves: BTreeMap<String, RememberedSave>,
}

#[derive(Default, Serialize, Deserialize)]
struct RememberedSave {
    /// The players whose attributes are frozen.
    players: BTreeSet<u32>,
    /// The members of staff whose attributes are frozen; not in the files of versions before it.
    #[serde(default)]
    staff: BTreeSet<u32>,
    /// The clubs whose money is frozen.
    clubs: BTreeSet<u32>,
    /// The players whose energy and match sharpness are frozen; not in the files of versions before it.
    #[serde(default)]
    fitness: BTreeSet<u32>,
    /// The players whose position ratings are frozen; not in the files of versions before it.
    #[serde(default)]
    positions: BTreeSet<u32>,
    /// The stadiums renamed in the editor, by the UID of a club that plays there; not in the files of versions before
    /// it.
    #[serde(default)]
    stadiums: BTreeMap<u32, HeldName>,
}

impl RememberedSave {
    fn is_empty(&self) -> bool {
        self.players.is_empty()
            && self.staff.is_empty()
            && self.clubs.is_empty()
            && self.fitness.is_empty()
            && self.positions.is_empty()
            && self.stadiums.is_empty()
    }

    /// The players frozen in the way `kind` names.
    fn of(&mut self, kind: FreezeKind) -> &mut BTreeSet<u32> {
        match kind {
            FreezeKind::Attributes => &mut self.players,
            FreezeKind::Fitness => &mut self.fitness,
            FreezeKind::Positions => &mut self.positions,
        }
    }
}

impl Remembered {
    /// What the file at `path` holds: nothing when there is none, or it cannot be read.
    fn read(path: &Path) -> Self {
        std::fs::read(path).ok().and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default()
    }

    /// Writes it whole to `path`, through a file beside it, so that a write cut short never leaves half a file.
    fn write(&self, path: &Path) -> std::io::Result<()> {
        if let Some(folder) = path.parent() {
            std::fs::create_dir_all(folder)?;
        }
        let part = path.with_extension("json.part");
        std::fs::write(&part, serde_json::to_vec_pretty(self)?)?;
        std::fs::rename(&part, path)
    }
}

/// Where the app remembers what was frozen in each save; none when it has no data folder.
struct FrozenFile(Option<PathBuf>);

/// The folder exports are written to; none when there is no documents folder.
struct ExportsFolder(Option<PathBuf>);

/// What an export wrote, and where.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportReport {
    /// The file, and its name and folder apart.
    path: PathBuf,
    file: String,
    folder: PathBuf,
    players: usize,
    /// Players whose objects changed while they were read: left out.
    skipped: usize,
}

/// What connecting froze again of what was frozen in the save before (see `Connection::restore_frozen`).
#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct Refrozen {
    /// The players whose attributes are frozen again, by name.
    players: Vec<String>,
    /// The members of staff whose attributes are frozen again, by name.
    staff: Vec<String>,
    /// The clubs whose money is frozen again, by name.
    clubs: Vec<String>,
    /// The players whose energy and match sharpness are frozen again, by name.
    fitness: Vec<String>,
    /// The players whose positions are frozen again, by name.
    positions: Vec<String>,
    /// The stadiums given the names the editor gave them again, by their new names.
    stadiums: Vec<String>,
    /// How many are left for later, still remembered: the editor has no profile for this version of the game, or a
    /// check did not pass.
    waiting: usize,
}

impl Refrozen {
    fn is_empty(&self) -> bool {
        self.players.is_empty()
            && self.staff.is_empty()
            && self.clubs.is_empty()
            && self.fitness.is_empty()
            && self.positions.is_empty()
            && self.stadiums.is_empty()
            && self.waiting == 0
    }
}

/// Where the game's array of clubs begins now; none when it cannot be read.
fn clubs_begin(session: &Session) -> Option<u64> {
    let array = session.arrays.clubs.as_ref()?;
    array.locate(&session.process, &session.plugin).ok().map(|(begin, _)| begin)
}

/// What tells one save from another: the storefront, and the managers that human players control in it, whom each
/// new save makes afresh. None when the lists name no human manager.
fn save_of(session: &Session, humans: &[u32]) -> Option<String> {
    if humans.is_empty() {
        return None;
    }
    let managers: Vec<String> = humans.iter().map(u32::to_string).collect();
    Some(format!("{:?}:{}", session.game.storefront, managers.join("+")))
}

/// Keeps the fields `fields` of each person in `held` (players, or members of staff: `target_of` finds where one is)
/// from getting worse than they are held at (see `Connection::hold_frozen`): worse is lower, or higher where lower is
/// better.
fn hold_people(
    session: &Session,
    target_of: impl Fn(u32) -> Option<Target>,
    held: &mut BTreeMap<u32, BTreeMap<String, i64>>,
    fields: &[Field],
) {
    for (&uid, limits) in held.iter_mut() {
        let Some(target) = target_of(uid) else {
            continue;
        };
        let Ok(values) = session.read_fields(&target, fields) else {
            continue;
        };
        for (field, now) in fields.iter().zip(values) {
            let (Some(now), Some(limit)) = (now, limits.get_mut(&field.key)) else {
                continue;
            };
            let worse = if LOWER_IS_BETTER.contains(&field.key.as_str()) { now > *limit } else { now < *limit };
            if worse {
                // Only while the game still holds what was read: a day it is working out is left to it.
                let _ = session.write_field_if(&target, field, now, *limit);
            } else {
                *limit = now;
            }
        }
    }
}

/// Keeps the position ratings of each player in `held` exactly at what they are held at:
/// if the game's simulation engine tries to raise or lower them, what the user set is put back.
fn hold_positions(
    session: &Session,
    target_of: impl Fn(u32) -> Option<Target>,
    held: &mut BTreeMap<u32, BTreeMap<String, i64>>,
    fields: &[Field],
) {
    for (&uid, targets) in held.iter_mut() {
        let Some(target) = target_of(uid) else {
            continue;
        };
        let Ok(values) = session.read_fields(&target, fields) else {
            continue;
        };
        for (field, now) in fields.iter().zip(values) {
            let (Some(now), Some(target_val)) = (now, targets.get_mut(&field.key)) else {
                continue;
            };
            if now != *target_val {
                let _ = session.write_field_if(&target, field, now, *target_val);
            }
        }
    }
}

/// A mass edit that was worked out and shown, waiting to be applied as it was shown.
struct PendingMass {
    id: u32,
    entity: Entity,
    planned: Vec<Planned>,
}

impl Connection {
    /// Reads every list. A reload keeps the change log; a mass edit previewed before is dropped,
    /// since its people may have moved. Nothing is frozen yet.
    fn load(session: Session, log: Vec<LoggedChange>) -> Result<Self, Failure> {
        // The game may have loaded a save or moved on since the checks last ran; the date the lists' ages are worked
        // out from is one of them.
        session.recheck();
        let players = PlayerIndex::new(session.players()?);
        let staff = session.staff()?;
        let human_clubs = staff.iter().filter(|member| member.is_human).filter_map(|member| member.club_uid).collect();
        let mut humans: Vec<u32> = staff.iter().filter(|member| member.is_human).map(|member| member.uid).collect();
        humans.sort_unstable();
        let save = save_of(&session, &humans);
        let staff = StaffIndex::new(staff);
        let clubs = ClubIndex::new(session.clubs()?);
        let next_id = log.iter().filter_map(|logged| logged.batch).max().unwrap_or(0) + 1;
        let frozen = Frozen::default();
        // The clubs were just read, from this save.
        let begin = clubs_begin(&session).unwrap_or(0);
        let clubs_seen =
            ClubsSeen { same_save: Some(true), checked: Some(Instant::now()), ..ClubsSeen::unknown(begin) };
        Ok(Self { session, players, staff, clubs, human_clubs, log, mass: None, next_id, frozen, save, clubs_seen })
    }

    /// Freezes again what was frozen in this save before, as the file at `path` remembers it: the attributes, energy,
    /// match sharpness and positions of its players and the money of its clubs, each held from what it is now. Only on
    /// a build the editor has a profile for and only where its checks let it write: on any other, after an update of
    /// the game say, nothing is frozen, and the file keeps them for later. What is no longer in the lists (a player who
    /// retired) is forgotten.
    fn restore_frozen(&mut self, path: Option<&Path>) -> Refrozen {
        let mut refrozen = Refrozen::default();
        let (Some(path), Some(save)) = (path, self.save.clone()) else {
            return refrozen;
        };
        let mut remembered = Remembered::read(path);
        let Some(entry) = remembered.saves.get_mut(&save) else {
            return refrozen;
        };
        let count = entry.players.len()
            + entry.staff.len()
            + entry.clubs.len()
            + entry.fitness.len()
            + entry.positions.len()
            + entry.stadiums.len();
        entry.players.retain(|&uid| self.players.get(uid).is_some());
        entry.staff.retain(|&uid| self.staff.get(uid).is_some());
        entry.clubs.retain(|&uid| self.clubs.get(uid).is_some());
        entry.fitness.retain(|&uid| self.players.get(uid).is_some());
        entry.positions.retain(|&uid| self.players.get(uid).is_some());
        entry.stadiums.retain(|&uid, _| self.clubs.get(uid).is_some());
        let (players, staff) = (entry.players.clone(), entry.staff.clone());
        let (clubs, fitness, positions) = (entry.clubs.clone(), entry.fitness.clone(), entry.positions.clone());
        let stadiums = entry.stadiums.clone();
        if players.len() + staff.len() + clubs.len() + fitness.len() + positions.len() + stadiums.len() < count {
            remembered.saves.retain(|_, save| !save.is_empty());
            let _ = remembered.write(path);
        }
        let safe = self.session.known_build() && self.session.process.can_write();
        for uid in players {
            match safe.then(|| self.freeze_player(uid)) {
                Some(Ok(())) => refrozen.players.push(self.player_name(uid)),
                _ => refrozen.waiting += 1,
            }
        }
        for uid in staff {
            match safe.then(|| self.freeze_member(uid)) {
                Some(Ok(())) => refrozen.staff.push(self.staff_name(uid)),
                _ => refrozen.waiting += 1,
            }
        }
        for uid in fitness {
            match safe.then(|| self.freeze_fitness(uid)) {
                Some(Ok(())) => refrozen.fitness.push(self.player_name(uid)),
                _ => refrozen.waiting += 1,
            }
        }
        for uid in clubs {
            match safe.then(|| self.freeze_club(uid)) {
                Some(Ok(())) => refrozen.clubs.push(self.club_name(uid)),
                _ => refrozen.waiting += 1,
            }
        }
        for uid in positions {
            match safe.then(|| self.freeze_positions(uid)) {
                Some(Ok(())) => refrozen.positions.push(self.player_name(uid)),
                _ => refrozen.waiting += 1,
            }
        }
        for (uid, held) in stadiums {
            if safe && self.give_stadium_name(uid, &held.name) {
                refrozen.stadiums.push(held.name.clone());
                self.frozen.stadiums.insert(uid, held);
            } else {
                refrozen.waiting += 1;
            }
        }
        refrozen
    }

    /// Gives the stadium of the club `uid` the name `name`, unless it has it already: whether it has it now. Not
    /// logged: the rename that chose the name was.
    fn give_stadium_name(&mut self, uid: u32, name: &str) -> bool {
        let Some(club) = self.clubs.get(uid) else {
            return false;
        };
        match self.session.stadium_name(club) {
            Ok(now) if now.name == name => true,
            Ok(_) => self
                .session
                .plan_stadium_rename(club, name)
                .and_then(|plan| self.session.apply_stadium_rename(&plan))
                .is_ok(),
            Err(_) => false,
        }
    }

    /// Gives each stadium renamed in the editor its name again where the game has given it back its own, as it does
    /// whenever it loads the save. Before that, the game is checked to have this save: a save loaded (this one again or
    /// another) moves the clubs' array or objects, or gives the stadiums the names in the game's database. Once it is
    /// this one, clubs that moved are read again; while it is another, or none, nothing is written, and it is looked at
    /// again every little while.
    fn hold_stadiums(&mut self) {
        if self.frozen.stadiums.is_empty() {
            return;
        }
        let Some(begin) = clubs_begin(&self.session) else {
            return;
        };
        let lost = self.clubs_lost();
        // Names are read only from clubs where the lists found them.
        let off = !lost && self.stadium_names_off();
        let seen = &self.clubs_seen;
        if begin != seen.begin || (lost && !seen.lost) || (off && !seen.off) {
            self.clubs_seen = ClubsSeen { lost, off, ..ClubsSeen::unknown(begin) };
        }
        self.clubs_seen.off = off;
        let seen = &self.clubs_seen;
        let every = if seen.since.elapsed() < SAVE_SETTLES { SAVE_RECHECK } else { SAVE_RECHECK_LATER };
        if (seen.same_save != Some(true) || lost) && seen.checked.is_none_or(|at| at.elapsed() >= every) {
            if seen.same_save != Some(true) {
                self.clubs_seen.same_save = Some(self.same_save());
            }
            if self.clubs_seen.same_save == Some(true)
                && lost
                && let Ok(clubs) = self.session.clubs()
            {
                self.clubs = ClubIndex::new(clubs);
            }
            self.clubs_seen.lost = self.clubs_lost();
            self.clubs_seen.checked = Some(Instant::now());
        }
        if self.clubs_seen.same_save == Some(true) {
            self.give_stadium_names();
        }
    }

    /// Gives every stadium renamed in the editor the name it was given, where it has another (see
    /// `give_stadium_name`). For the save the lists were read from only.
    fn give_stadium_names(&mut self) {
        let names: Vec<(u32, String)> =
            self.frozen.stadiums.iter().map(|(&uid, held)| (uid, held.name.clone())).collect();
        for (uid, name) in names {
            self.give_stadium_name(uid, &name);
        }
    }

    /// Whether the game has given a stadium renamed in the editor a name other than the one the editor gave it.
    fn stadium_names_off(&self) -> bool {
        self.frozen.stadiums.iter().any(|(&uid, held)| {
            let now = self.clubs.get(uid).and_then(|club| self.session.stadium_name(club).ok());
            now.is_some_and(|now| now.name != held.name)
        })
    }

    /// Whether a club whose stadium was renamed is missing from the lists, or its object is no longer where they found
    /// it.
    fn clubs_lost(&self) -> bool {
        self.frozen.stadiums.keys().any(|&uid| {
            self.clubs.get(uid).is_none_or(|club| {
                self.session.process.read_u32(club.address + self.session.layout.club.uid).ok() != Some(uid)
            })
        })
    }

    /// Whether the game has the save the lists were read from: the same human managers.
    fn same_save(&self) -> bool {
        let Ok(staff) = self.session.staff() else {
            return false;
        };
        let mut humans: Vec<u32> = staff.iter().filter(|member| member.is_human).map(|member| member.uid).collect();
        humans.sort_unstable();
        self.save.is_some() && save_of(&self.session, &humans) == self.save
    }

    /// Holds and remembers `name`, the name the editor just gave the stadium of the club `uid`, by a rename or an undo
    /// (see `HeldName::after`); a stadium given back the game's own name is let go of.
    fn hold_stadium_name(&mut self, path: Option<&Path>, uid: u32, name: &str, before: &str) {
        match HeldName::after(self.frozen.stadiums.get(&uid), name, before) {
            Some(held) => {
                self.frozen.stadiums.insert(uid, held.clone());
                self.remember(path, |save| {
                    save.stadiums.insert(uid, held);
                });
            }
            None => {
                self.frozen.stadiums.remove(&uid);
                self.remember(path, |save| {
                    save.stadiums.remove(&uid);
                });
            }
        }
    }

    /// Gives the stadium the name it had before `renamed`: by putting back what it wrote, or, once the game has given
    /// the stadium its own name again and the app this one after it (the save loaded meanwhile), by renaming it back.
    fn undo_stadium(&self, renamed: &StadiumRename) -> Result<(), Failure> {
        let Err(err) = self.session.undo_stadium_rename(renamed) else {
            return Ok(());
        };
        let Some(club) = self.clubs.get(renamed.club) else {
            return Err(err.into());
        };
        match self.session.stadium_name(club) {
            Ok(now) if now.name == renamed.to => {}
            _ => return Err(err.into()),
        }
        let plan = self.session.plan_stadium_rename(club, &renamed.from)?;
        self.session.apply_stadium_rename(&plan)?;
        Ok(())
    }

    /// Changes, with `change`, what the file at `path` remembers as frozen in this save. Without a file or a known
    /// save nothing is remembered, and a file that cannot be written only means that this is not.
    fn remember(&self, path: Option<&Path>, change: impl FnOnce(&mut RememberedSave)) {
        let (Some(path), Some(save)) = (path, &self.save) else {
            return;
        };
        let mut remembered = Remembered::read(path);
        change(remembered.saves.entry(save.clone()).or_default());
        remembered.saves.retain(|_, save| !save.is_empty());
        let _ = remembered.write(path);
    }

    /// Freezes the attributes of the player `uid` at what they are now (see `hold_frozen`). Refused while the
    /// attributes may not be written.
    fn freeze_player(&mut self, uid: u32) -> Result<(), Failure> {
        let held = self.held_values(Entity::Player, uid, &self.attribute_fields(Entity::Player))?;
        self.frozen.attributes.insert(uid, held);
        Ok(())
    }

    /// Freezes the attributes of the member of staff `uid` at what they are now (see `hold_frozen`). Refused while the
    /// attributes may not be written.
    fn freeze_member(&mut self, uid: u32) -> Result<(), Failure> {
        let held = self.held_values(Entity::Staff, uid, &self.attribute_fields(Entity::Staff))?;
        self.frozen.staff.insert(uid, held);
        Ok(())
    }

    /// Freezes the energy and match sharpness of the player `uid` at what they are now (see `hold_frozen`). Refused
    /// while they may not be written.
    fn freeze_fitness(&mut self, uid: u32) -> Result<(), Failure> {
        let held = self.held_values(Entity::Player, uid, &self.fitness_fields()?)?;
        self.frozen.fitness.insert(uid, held);
        Ok(())
    }

    /// Freezes the position ratings of the player `uid` at what they are now. Refused while they may not be written.
    fn freeze_positions(&mut self, uid: u32) -> Result<(), Failure> {
        let held = self.held_values(Entity::Player, uid, &self.position_fields())?;
        self.frozen.positions.insert(uid, held);
        Ok(())
    }

    /// Freezes what `kind` names for each of the players `uids`, or unfreezes it, and has the file at `path` remember
    /// it for this save. Those frozen already keep what they are held at. Refused at once while those fields may not
    /// be written; a player who cannot be frozen otherwise is said, and the others are frozen all the same.
    fn set_frozen(
        &mut self,
        path: Option<&Path>,
        kind: FreezeKind,
        uids: &[u32],
        frozen: bool,
    ) -> Result<TeamFreeze, Failure> {
        let fields = match kind {
            FreezeKind::Attributes => self.attribute_fields(Entity::Player),
            FreezeKind::Fitness => self.fitness_fields()?,
            FreezeKind::Positions => self.position_fields(),
        };
        // The fields share one check, which is the same for every player.
        if frozen
            && let Some(field) = fields.first()
            && let Some(lock) = self.session.field_lock(field)
        {
            return Err(EditError::Locked { field: field.key.clone(), lock }.into());
        }
        let mut changed = Vec::new();
        let mut failed = Vec::new();
        for &uid in uids {
            if self.frozen.of(kind).contains_key(&uid) == frozen {
                continue;
            }
            if !frozen {
                self.frozen.of(kind).remove(&uid);
                changed.push(uid);
                continue;
            }
            match self.held_values(Entity::Player, uid, &fields) {
                Ok(held) => {
                    self.frozen.of(kind).insert(uid, held);
                    changed.push(uid);
                }
                Err(error) => {
                    failed.push(MassFailure { uid, name: self.player_name(uid), field: kind.key().to_owned(), error })
                }
            }
        }
        self.remember(path, |save| {
            let remembered = save.of(kind);
            for uid in &changed {
                if frozen {
                    remembered.insert(*uid);
                } else {
                    remembered.remove(uid);
                }
            }
        });
        Ok(TeamFreeze { changed: changed.len(), failed })
    }

    /// What the fields `fields` of the player or member of staff `uid` (as `entity` says) hold now, by key: what
    /// freezing them holds them at. Refused while they may not be written; they share one check, so what holds for the
    /// first holds for all.
    fn held_values(&self, entity: Entity, uid: u32, fields: &[Field]) -> Result<BTreeMap<String, i64>, Failure> {
        let (target, _) = self.target(entity, uid)?;
        if let Some(field) = fields.first()
            && let Some(lock) = self.session.field_lock(field)
        {
            return Err(EditError::Locked { field: field.key.clone(), lock }.into());
        }
        let values = self.session.read_fields(&target, fields)?;
        Ok(fields.iter().zip(values).filter_map(|(field, value)| Some((field.key.clone(), value?))).collect())
    }

    /// Freezes the money of the club `uid` at its balance now (see `hold_money`). Refused while the balance may not be
    /// written.
    fn freeze_club(&mut self, uid: u32) -> Result<(), Failure> {
        let target = self.clubs.get(uid).ok_or_else(|| not_found(Entity::Club, uid))?.target();
        let field = self.session.field(Entity::Club, "finance.balance")?;
        if let Some(lock) = self.session.field_lock(&field) {
            return Err(EditError::Locked { field: field.key.clone(), lock }.into());
        }
        let balance = self.session.read_field(&target, &field)?;
        self.frozen.money.insert(uid, balance);
        Ok(())
    }

    /// What the window shows about the connection; `load_ms` is how long reading took.
    fn info(&self, load_ms: u128) -> ConnectionInfo {
        ConnectionInfo {
            game: self.session.game.clone(),
            profile: self.session.profile.as_ref().map(|p| p.name.clone()),
            arrays: self.session.arrays.clone(),
            players: self.players.len(),
            staff: self.staff.len(),
            clubs: self.clubs.len(),
            game_date: self.session.game_date(),
            load_ms,
            editable: self.session.process.can_write() && self.session.writes_allowed(),
            writable: self.session.process.can_write(),
            known_build: self.session.known_build(),
            gender_known: self.session.layout.player.gender.is_some() && self.session.layout.staff.gender.is_some(),
            health: Health::clone(&self.session.health()),
            refrozen: None,
        }
    }

    fn fresh_id(&mut self) -> u32 {
        self.next_id += 1;
        self.next_id - 1
    }

    /// The players, staff or clubs a search and its filter select, as edit targets with names.
    fn select(&self, entity: Entity, query: &str, filters: Filters) -> Vec<(Target, String)> {
        match entity {
            Entity::Player => {
                let filter = filters.player_filter.unwrap_or_default();
                let hits = self.players.search(query).into_iter().filter(|p| filter.matches(p));
                hits.map(|p| (p.target(), p.name.clone())).collect()
            }
            Entity::Staff => {
                let filter = filters.staff_filter.unwrap_or_default();
                let hits = self.staff.search(query).into_iter().filter(|s| filter.matches(s));
                hits.map(|s| (s.target(), s.name.clone())).collect()
            }
            Entity::Club => {
                let filter = filters.club_filter.unwrap_or_default();
                let hits = self.clubs.search(query).into_iter().filter(|c| filter.matches(c));
                hits.map(|c| (c.target(), c.name.clone())).collect()
            }
        }
    }

    /// Logs a change just written; `batch` groups the changes of one mass edit.
    fn log_change(&mut self, change: Change, name: String, batch: Option<u32>) -> LoggedChange {
        self.note_change(&change, change.new);
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name,
            change,
            undone_at: None,
            batch,
            moved: None,
            captaincy: None,
            tie: None,
            clause: None,
            recall: None,
            stadium: None,
            undo: None,
        };
        self.log.push(logged.clone());
        logged
    }

    /// Writes changes a mass edit worked out, each only while the game still holds the value it
    /// was planned from, and logs them as the batch `batch`.
    fn write_planned(&mut self, entity: Entity, planned: Vec<Planned>, batch: u32) -> MassReport {
        let fields: BTreeMap<String, Field> =
            self.session.fields(entity).into_iter().map(|field| (field.key.clone(), field)).collect();
        let mut report = MassReport { batch, applied: 0, failed: Vec::new() };
        for planned in planned {
            let field = &fields[&planned.field];
            match self.session.write_field_if(&planned.target, field, planned.old, planned.new) {
                Ok(change) => {
                    self.log_change(change, planned.name, Some(batch));
                    report.applied += 1;
                }
                Err(err) => report.failed.push(MassFailure {
                    uid: planned.uid,
                    name: planned.name,
                    field: planned.field,
                    error: err.into(),
                }),
            }
        }
        report
    }

    /// Logs a captaincy just written, as a change of the club's `captain` or `vice_captain`
    /// from one player's UID to the other's (0 for nobody).
    fn log_captain(&mut self, done: CaptainSet) -> LoggedChange {
        let field = match done.role {
            CaptainRole::Captain => "captain",
            CaptainRole::ViceCaptain => "vice_captain",
        };
        let change = Change {
            entity: Entity::Club,
            uid: done.club,
            field: field.to_owned(),
            old: i64::from(done.old.unwrap_or(0)),
            new: i64::from(done.new),
        };
        let captaincy = Captaincy {
            team: done.team,
            kind: done.kind,
            age_limit: done.age_limit,
            from: done.old.map(|uid| self.player_name(uid)),
            to: self.player_name(done.new),
            swapped: done.swapped,
        };
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name: self.club_name(done.club),
            change,
            undone_at: None,
            batch: None,
            moved: None,
            captaincy: Some(captaincy),
            tie: None,
            clause: None,
            recall: None,
            stadium: None,
            undo: Some(Undo::Captain(done)),
        };
        self.log.push(logged.clone());
        logged
    }

    /// Logs healing just written, as a change of the player's `injuries` from how many he had to none.
    fn log_heal(&mut self, done: Healed, batch: Option<u32>) -> LoggedChange {
        let change = Change {
            entity: Entity::Player,
            uid: done.player,
            field: "injuries".to_owned(),
            old: done.injuries as i64,
            new: 0,
        };
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name: self.player_name(done.player),
            change,
            undone_at: None,
            batch,
            moved: None,
            captaincy: None,
            tie: None,
            clause: None,
            recall: None,
            stadium: None,
            undo: Some(Undo::Heal(done)),
        };
        self.log.push(logged.clone());
        logged
    }

    /// Logs lifting just written, as a change of the player's `bans` from how many he had to none.
    fn log_lift(&mut self, done: Lifted, batch: Option<u32>) -> LoggedChange {
        let change = Change {
            entity: Entity::Player,
            uid: done.player,
            field: "bans".to_owned(),
            old: done.bans as i64,
            new: 0,
        };
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name: self.player_name(done.player),
            change,
            undone_at: None,
            batch,
            moved: None,
            captaincy: None,
            tie: None,
            clause: None,
            recall: None,
            stadium: None,
            undo: Some(Undo::Lift(done)),
        };
        self.log.push(logged.clone());
        logged
    }

    /// Logs keeping a player from retiring just written, as a change of his `retirement` from the date he was to retire
    /// on (0 when the game had planned none) to 0.
    fn log_retirement(&mut self, done: RetirementSet) -> LoggedChange {
        let change = Change {
            entity: Entity::Player,
            uid: done.player,
            field: "retirement".to_owned(),
            old: done.date.map_or(0, FmDate::to_number),
            new: 0,
        };
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name: self.player_name(done.player),
            change,
            undone_at: None,
            batch: None,
            moved: None,
            captaincy: None,
            tie: None,
            clause: None,
            recall: None,
            stadium: None,
            undo: Some(Undo::Retirement(done)),
        };
        self.log.push(logged.clone());
        logged
    }

    /// Logs a change to a player's ties just written, as a change of his field `tie.nationality`,
    /// `tie.trainedInNation`, `tie.trainedAtClub` or `tie.workPermit` from one nation's or club's UID to the other's
    /// (0 for none).
    fn log_tie(&mut self, done: RelationSet) -> LoggedChange {
        let tie = done.before.as_ref().or(done.after.as_ref()).map_or(Tie::Nationality, |relation| relation.tie);
        let field = match tie {
            Tie::Nationality => "tie.nationality",
            Tie::TrainedInNation => "tie.trainedInNation",
            Tie::TrainedAtClub => "tie.trainedAtClub",
            Tie::WorkPermit => "tie.workPermit",
        };
        let end = |relation: &Option<fmlibre_core::Relation>| {
            relation.as_ref().map(|relation| TieEnd {
                name: relation.name.clone().unwrap_or_else(|| relation.target_uid.to_string()),
                rule: relation.rule,
            })
        };
        let uid = |relation: &Option<fmlibre_core::Relation>| relation.as_ref().map_or(0, |r| i64::from(r.target_uid));
        let change = Change {
            entity: Entity::Player,
            uid: done.player,
            field: field.to_owned(),
            old: uid(&done.before),
            new: uid(&done.after),
        };
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name: self.player_name(done.player),
            change,
            undone_at: None,
            batch: None,
            moved: None,
            captaincy: None,
            tie: Some(TieChange { from: end(&done.before), to: end(&done.after) }),
            clause: None,
            recall: None,
            stadium: None,
            undo: Some(Undo::Tie(done)),
        };
        self.log.push(logged.clone());
        logged
    }

    /// Logs a stadium renamed, as a change of the club's `stadium.name` from one length in bytes to the other, with the
    /// names; its undo writes the old name back.
    fn log_stadium(&mut self, done: StadiumRename) -> LoggedChange {
        let change = Change {
            entity: Entity::Club,
            uid: done.club,
            field: "stadium.name".to_owned(),
            old: done.from.len() as i64,
            new: done.to.len() as i64,
        };
        let name = self.clubs.get(done.club).map_or_else(|| done.club.to_string(), |club| club.name.clone());
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name,
            change,
            undone_at: None,
            batch: None,
            moved: None,
            captaincy: None,
            tie: None,
            clause: None,
            recall: None,
            stadium: Some(StadiumNames { from: done.from.clone(), to: done.to.clone() }),
            undo: Some(Undo::Stadium(done)),
        };
        self.log.push(logged.clone());
        logged
    }

    /// Logs a change to a player's contract clauses just written, as a change of his field `clause` from one amount to
    /// the other (0 for none, or for a clause added or taken out), with the clause before and after.
    fn log_clause(&mut self, done: ClauseSet) -> LoggedChange {
        let amount = |clause: &Option<Clause>| clause.as_ref().and_then(|c| c.amount).map_or(0, i64::from);
        let change = Change {
            entity: Entity::Player,
            uid: done.player,
            field: "clause".to_owned(),
            old: amount(&done.before),
            new: amount(&done.after),
        };
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name: self.player_name(done.player),
            change,
            undone_at: None,
            batch: None,
            moved: None,
            captaincy: None,
            tie: None,
            clause: Some(ClauseChange { from: done.before.clone(), to: done.after.clone() }),
            recall: None,
            stadium: None,
            undo: Some(Undo::Clause(done)),
        };
        self.log.push(logged.clone());
        logged
    }

    /// The nation with the UID `uid`, among the nations of the people in the lists.
    fn nation(&self, uid: u32) -> Result<Nation, Failure> {
        self.nations()
            .into_iter()
            .find(|nation| nation.uid == Some(uid))
            .ok_or_else(|| Failure::new("app.notFound", format!("No nation with UID {uid}")).with("uid", uid))
    }

    /// Works out moving the member of staff `uid` to the club `club`, as `job` if given, or else in his own job; one
    /// who has no club is signed for it, as `job`, on a contract the editor makes on `terms`.
    fn plan_staff_move(&self, uid: u32, club: u32, job: Option<u8>, terms: MoveTerms) -> Result<StaffPlan, Failure> {
        let member = self.staff.get(uid).ok_or_else(|| not_found(Entity::Staff, uid))?;
        let to = self.clubs.get(club).ok_or_else(|| not_found(Entity::Club, club))?;
        let planned = match member.club_uid {
            None => job.ok_or(MoveError::NoJob).and_then(|job| self.session.plan_staff_signing(member, to, job, terms)),
            Some(_) => self.session.plan_staff_move(member, to, job),
        };
        planned.map_err(|err| self.with_names(err.into()))
    }

    /// Works out giving the member of staff `uid` the job `job` at his club.
    fn plan_staff_job(&self, uid: u32, job: u8) -> Result<StaffPlan, Failure> {
        let member = self.staff.get(uid).ok_or_else(|| not_found(Entity::Staff, uid))?;
        self.session.plan_staff_job(member, job).map_err(|err| self.with_names(err.into()))
    }

    /// Logs a member of staff's move or signing, as a change of his `club`, or his new job, as a change of
    /// `contract.job`, and brings his list row up to date: for one signed, with the end of the contract `made`.
    fn log_staff(&mut self, done: StaffChange, made: Option<NewStaffContract>) -> LoggedChange {
        let row = self.staff.get(done.member);
        let (club, club_uid, job, contract_expires) =
            row.map_or((None, None, None, None), |s| (s.club.clone(), s.club_uid, s.job, s.contract_expires));
        let name = row.map_or_else(String::new, |s| s.name.clone());
        let moved = done.from_club != done.to_club;
        // One signed had no club.
        let from = (done.from_club != 0).then(|| self.club_name(done.from_club));
        let to = self.club_name(done.to_club);
        self.staff.update(done.member, |member| {
            if moved {
                member.club = Some(to.clone());
                member.club_uid = Some(done.to_club);
            }
            member.job = Some(done.job.1);
            if let Some(made) = made {
                member.contract_expires = FmDate::from_number(made.expires);
            }
        });
        let (field, old, new) = if moved {
            ("club", i64::from(done.from_club), i64::from(done.to_club))
        } else {
            ("contract.job", i64::from(done.job.0), i64::from(done.job.1))
        };
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name,
            change: Change { entity: Entity::Staff, uid: done.member, field: field.to_owned(), old, new },
            undone_at: None,
            batch: None,
            moved: moved.then_some(MovedClubs { from, to: Some(to), with: None, released: None, fee: None }),
            captaincy: None,
            tie: None,
            clause: None,
            recall: None,
            stadium: None,
            undo: Some(Undo::Staff(LoggedStaff { done, club, club_uid, job, contract_expires })),
        };
        self.log.push(logged.clone());
        logged
    }

    /// Works out what the fee `fee` of moving the player from the club `from` to the club `to` does to their money:
    /// none for no fee.
    fn plan_fee(&self, from: u32, to: u32, fee: Option<i64>) -> Result<Option<FeePlan>, Failure> {
        // A free agent has no club to pay.
        let Some(fee) = fee.filter(|&fee| fee > 0 && from != 0) else {
            return Ok(None);
        };
        let buyer = self.clubs.get(to).ok_or_else(|| not_found(Entity::Club, to))?;
        let seller = self.clubs.get(from).ok_or_else(|| not_found(Entity::Club, from))?;
        Ok(Some(self.session.plan_fee(buyer, seller, fee)?))
    }

    /// Works out moving the player `uid` to the club `club` on the contract `terms`; with `release`, releasing that
    /// player of the club to make room for him.
    fn plan_move(&self, uid: u32, club: u32, terms: MoveTerms, release: Option<u32>) -> Result<MovePlan, Failure> {
        let player = self.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
        let to = self.clubs.get(club).ok_or_else(|| not_found(Entity::Club, club))?;
        Ok(match release {
            Some(leaver) => {
                let leaver = self.players.get(leaver).ok_or_else(|| not_found(Entity::Player, leaver))?;
                self.session.plan_club_move_releasing(player, to, terms, leaver, &self.human_clubs)?
            }
            None => self.session.plan_club_move(player, to, terms, &self.human_clubs)?,
        })
    }

    /// Works out making the loan of the player `uid` permanent on the contract `terms`.
    fn plan_permanent(&self, uid: u32, terms: MoveTerms) -> Result<MovePlan, Failure> {
        let player = self.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
        Ok(self.session.plan_loan_permanent(player, terms, &self.human_clubs)?)
    }

    /// Works out releasing the player `uid` from his club.
    fn plan_release(&self, uid: u32) -> Result<MovePlan, Failure> {
        let player = self.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
        Ok(self.session.plan_release(player, &self.human_clubs)?)
    }

    /// Works out the players `uid` and `other` swapping clubs.
    fn plan_swap(&self, uid: u32, other: u32) -> Result<MovePlan, Failure> {
        let player = self.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
        let partner = self.players.get(other).ok_or_else(|| not_found(Entity::Player, other))?;
        Ok(self.session.plan_club_swap(player, partner, &self.human_clubs)?)
    }

    /// What the list row of the player `uid` says about his club and contract end now.
    fn row_before(&self, uid: u32) -> RowBefore {
        let row = self.players.get(uid);
        RowBefore {
            uid,
            club: row.and_then(|player| player.club.clone()),
            club_uid: row.and_then(|player| player.club_uid),
            contract_expires: row.and_then(|player| player.contract_expires),
        }
    }

    fn player_name(&self, uid: u32) -> String {
        self.players.get(uid).map_or_else(|| uid.to_string(), |player| player.name.clone())
    }

    /// `failure` with the name of the player it names by UID, for the window to say who.
    fn with_names(&self, failure: Failure) -> Failure {
        let holder = failure.params.get("uid").and_then(|uid| uid.parse().ok());
        let name = match failure.code {
            "edit.taken" => holder.and_then(|uid| self.players.get(uid)).map(|player| player.name.clone()),
            // The club's director of football or manager, a member of staff.
            "staff.directorTaken" | "staff.managerTaken" => {
                holder.and_then(|uid| self.staff.get(uid)).map(|member| member.name.clone())
            }
            _ => None,
        };
        match name {
            Some(name) => failure.with("name", name),
            None => failure,
        }
    }

    fn staff_name(&self, uid: u32) -> String {
        self.staff.get(uid).map_or_else(|| uid.to_string(), |member| member.name.clone())
    }

    fn club_name(&self, uid: u32) -> String {
        self.clubs.get(uid).map_or_else(|| uid.to_string(), |club| club.name.clone())
    }

    /// Logs a move just written, as a change of the player's `club` from one club UID to the
    /// other; a swap is one change too, which names the player who went the other way, and so
    /// is a move that released a player of the new club, which names him.
    fn log_move(&mut self, done: ClubMove, terms: MoveTerms, paid: Vec<Paid>, fee: Option<i64>) -> LoggedChange {
        // A free agent signed had no club.
        let from = (done.from_club != 0).then(|| self.club_name(done.from_club));
        let to = self.club_name(done.to_club);
        let name = self.player_name(done.player);
        let mut rows = vec![self.row_before(done.player)];
        self.players.update(done.player, |player| {
            player.club = Some(to.clone());
            player.club_uid = Some(done.to_club);
            if let Some(expires) = terms.expires {
                player.contract_expires = FmDate::from_number(expires);
            }
        });
        let with = done.other.map(|other| {
            rows.push(self.row_before(other));
            self.players.update(other, |player| {
                player.club = from.clone();
                player.club_uid = Some(done.from_club);
            });
            self.player_name(other)
        });
        let released = done.released.map(|leaver| {
            rows.push(self.row_before(leaver));
            self.players.update(leaver, |player| {
                player.club = None;
                player.club_uid = None;
                player.contract_expires = None;
            });
            self.player_name(leaver)
        });
        let before = LoggedMove { done: done.clone(), rows, paid };
        let change = Change {
            entity: Entity::Player,
            uid: done.player,
            field: "club".to_owned(),
            old: i64::from(done.from_club),
            new: i64::from(done.to_club),
        };
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name,
            change,
            undone_at: None,
            batch: None,
            moved: Some(MovedClubs { from, to: Some(to), with, released, fee }),
            captaincy: None,
            tie: None,
            clause: None,
            recall: None,
            stadium: None,
            undo: Some(Undo::Move(before)),
        };
        self.log.push(logged.clone());
        logged
    }

    /// Logs a release just written, as a change of the player's `club` from his club's UID
    /// to 0, and brings his list row up to date: no club and no contract. It is undone like a
    /// move.
    fn log_release(&mut self, done: ClubMove) -> LoggedChange {
        let rows = vec![self.row_before(done.player)];
        self.players.update(done.player, |player| {
            player.club = None;
            player.club_uid = None;
            player.contract_expires = None;
        });
        let change = Change {
            entity: Entity::Player,
            uid: done.player,
            field: "club".to_owned(),
            old: i64::from(done.from_club),
            new: 0,
        };
        let logged = LoggedChange {
            id: self.log.len() + 1,
            at: now_ms(),
            name: self.player_name(done.player),
            change,
            undone_at: None,
            batch: None,
            moved: Some(MovedClubs {
                from: Some(self.club_name(done.from_club)),
                to: None,
                with: None,
                released: None,
                fee: None,
            }),
            captaincy: None,
            tie: None,
            clause: None,
            recall: None,
            stadium: None,
            undo: Some(Undo::Move(LoggedMove { done, rows, paid: Vec::new() })),
        };
        self.log.push(logged.clone());
        logged
    }

    /// Writes back the old value of the logged change `id`, if the game still holds the new
    /// one; a move or healing goes back if the game still holds everything it wrote.
    fn undo(&mut self, id: usize) -> Result<LoggedChange, Failure> {
        let entry = self
            .log
            .iter()
            .find(|logged| logged.id == id)
            .cloned()
            .ok_or_else(|| Failure::new("app.noChange", format!("No change {id}")).with("id", id))?;
        if entry.undone_at.is_some() {
            return Err(Failure::new("app.alreadyUndone", "This change has already been undone."));
        }
        match entry.undo {
            Some(Undo::Recall(option)) => {
                // The loan's end first, which checks that the game still holds the recall's day; then its option.
                let (target, _) = self.target(entry.change.entity, entry.change.uid)?;
                self.session.revert(&target, &entry.change)?;
                if let Err(err) = self.session.revert(&target, &option) {
                    let _ = self.session.write_field(
                        &target,
                        &self.session.field(entry.change.entity, &entry.change.field)?,
                        entry.change.new,
                    );
                    return Err(err.into());
                }
                self.note_change(&entry.change, entry.change.old);
            }
            Some(Undo::Stadium(renamed)) => self.undo_stadium(&renamed)?,
            Some(Undo::Move(moved)) => {
                // The fee goes back first, by what it changed; if the player cannot go back, it is paid again.
                self.session.refund_fee(&moved.paid)?;
                if let Err(err) = self.session.undo_club_move(&moved.done) {
                    let _ = self.session.repay_fee(&moved.paid);
                    return Err(err.into());
                }
                for row in moved.rows {
                    self.players.update(row.uid, |player| {
                        player.club = row.club;
                        player.club_uid = row.club_uid;
                        player.contract_expires = row.contract_expires;
                    });
                }
            }
            Some(Undo::Heal(healed)) => self.session.undo_heal(&healed)?,
            Some(Undo::Lift(lifted)) => self.session.undo_lift_bans(&lifted)?,
            Some(Undo::Retirement(retirement)) => self.session.undo_retirement(&retirement)?,
            Some(Undo::Tie(tie)) => self.session.undo_relation(&tie)?,
            Some(Undo::Clause(clause)) => self.session.undo_clause(&clause)?,
            Some(Undo::Staff(logged)) => {
                self.session.undo_staff_change(&logged.done)?;
                self.staff.update(logged.done.member, |member| {
                    member.club = logged.club;
                    member.club_uid = logged.club_uid;
                    member.job = logged.job;
                    member.contract_expires = logged.contract_expires;
                });
            }
            Some(Undo::Captain(captaincy)) => self.session.undo_captain(&captaincy)?,
            None => {
                let (target, _) = self.target(entry.change.entity, entry.change.uid)?;
                self.session.revert(&target, &entry.change)?;
                self.note_change(&entry.change, entry.change.old);
            }
        }
        let logged = self.log.iter_mut().find(|logged| logged.id == id).expect("found above");
        logged.undone_at = Some(now_ms());
        Ok(logged.clone())
    }

    /// Where the player, member of staff or club with `uid` lives in the game, and its name.
    fn target(&self, entity: Entity, uid: u32) -> Result<(Target, String), Failure> {
        match entity {
            Entity::Player => self.players.get(uid).map(|p| (p.target(), p.name.clone())),
            Entity::Staff => self.staff.get(uid).map(|s| (s.target(), s.name.clone())),
            Entity::Club => self.clubs.get(uid).map(|c| (c.target(), c.name.clone())),
        }
        .ok_or_else(|| not_found(entity, uid))
    }

    /// Keeps the balance of every frozen club, the attributes, energy and match sharpness of every frozen player and
    /// the attributes of every frozen member of staff from getting worse: what the game took is put back, and what it
    /// gave raises what they are held at. The position ratings of a frozen player are held exactly: what the game gave
    /// is put back too. These writes are not logged; unfreezing ends them.
    fn hold_frozen(&mut self) {
        self.hold_money();
        self.hold_stadiums();
        if !self.frozen.attributes.is_empty() {
            let fields = self.attribute_fields(Entity::Player);
            let target_of = |uid| self.players.get(uid).map(|player| player.target());
            hold_people(&self.session, target_of, &mut self.frozen.attributes, &fields);
        }
        if !self.frozen.staff.is_empty() {
            let fields = self.attribute_fields(Entity::Staff);
            let target_of = |uid| self.staff.get(uid).map(|member| member.target());
            hold_people(&self.session, target_of, &mut self.frozen.staff, &fields);
        }
        if !self.frozen.fitness.is_empty()
            && let Ok(fields) = self.fitness_fields()
        {
            let target_of = |uid| self.players.get(uid).map(|player| player.target());
            hold_people(&self.session, target_of, &mut self.frozen.fitness, &fields);
        }
        if !self.frozen.positions.is_empty() {
            let fields = self.position_fields();
            let target_of = |uid| self.players.get(uid).map(|player| player.target());
            hold_positions(&self.session, target_of, &mut self.frozen.positions, &fields);
        }
    }

    fn hold_money(&mut self) {
        let Ok(field) = self.session.field(Entity::Club, "finance.balance") else {
            return;
        };
        for (&uid, floor) in self.frozen.money.iter_mut() {
            let Some(target) = self.clubs.get(uid).map(|club| club.target()) else {
                continue;
            };
            match self.session.read_field(&target, &field) {
                Ok(now) if now < *floor => {
                    // Only while the game still holds what was read: a day it is working out is left to it.
                    let _ = self.session.write_field_if(&target, &field, now, *floor);
                }
                Ok(now) => *floor = now,
                Err(_) => {}
            }
        }
    }

    /// The attributes of players or of staff (as `entity` says) the editor can change.
    fn attribute_fields(&self, entity: Entity) -> Vec<Field> {
        let fields = self.session.fields(entity).into_iter();
        fields.filter(|field| field.key.starts_with("attribute.")).collect()
    }

    /// A player's energy and match sharpness, which freezing his fitness holds.
    fn fitness_fields(&self) -> Result<Vec<Field>, EditError> {
        FITNESS.iter().map(|key| self.session.field(Entity::Player, key)).collect()
    }

    /// A player's position ratings, which freezing his positions holds.
    fn position_fields(&self) -> Vec<Field> {
        let fields = self.session.fields(Entity::Player).into_iter();
        fields.filter(|field| field.key.starts_with("position.")).collect()
    }

    /// Every attribute of a player or of a member of staff (as `entity` says) at its best: 20, or 1 where lower is
    /// better, which no attribute of staff is.
    fn best_attributes(&self, entity: Entity) -> Vec<(Field, Operation)> {
        self.attribute_fields(entity)
            .into_iter()
            .map(|field| {
                let best = if LOWER_IS_BETTER.contains(&field.key.as_str()) { 1 } else { 20 };
                let value = field.scale.stored(best);
                (field, Operation::Set { value })
            })
            .collect()
    }

    /// The nations of the players and staff in the lists.
    fn nations(&self) -> Vec<Nation> {
        let players = self.players.iter().map(|p| (p.nation_address, p.nation.as_deref(), p.nation_uid));
        let staff = self.staff.iter().map(|s| (s.nation_address, s.nation.as_deref(), s.nation_uid));
        nations(players.chain(staff))
    }

    /// Keeps the list rows in step with `value`, just written to the field `change` names.
    fn note_change(&mut self, change: &Change, value: i64) {
        self.frozen.note(change, value);
        // A new nation: its name and flag, as the rows of its other people have them.
        let nation = (change.field == "nation")
            .then(|| self.nations().into_iter().find(|n| n.address == value as u64))
            .flatten();
        // The rows keep attributes as FM shows them (1–20), for the lists' filters.
        let value = if change.field.starts_with("attribute.") {
            self.session.field(change.entity, &change.field).map_or(value, |field| field.scale.shown(value))
        } else {
            value
        };
        let today = self.session.game_date();
        match change.entity {
            Entity::Player => self.players.update(change.uid, |p| {
                p.note_change(&change.field, value);
                if change.field == "date_of_birth" {
                    p.note_birth(today);
                }
                if let Some(nation) = nation {
                    (p.nation, p.nation_uid) = (Some(nation.name), nation.uid);
                }
            }),
            Entity::Staff => self.staff.update(change.uid, |s| {
                s.note_change(&change.field, value);
                if let Some(nation) = nation {
                    (s.nation, s.nation_uid) = (Some(nation.name), nation.uid);
                }
            }),
            Entity::Club => self.clubs.update(change.uid, |c| c.note_change(&change.field, value)),
        };
    }
}

/// A change written to the game this session.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LoggedChange {
    id: usize,
    /// When it was written, in milliseconds since 1970.
    at: u64,
    /// The person's name when it was written.
    name: String,
    #[serde(flatten)]
    change: Change,
    /// When it was undone, if it was.
    undone_at: Option<u64>,
    /// The mass edit it was part of, if any.
    batch: Option<u32>,
    /// For a move to another club, logged as a change of the field `club` from one club UID
    /// to the other: the clubs' names.
    #[serde(skip_serializing_if = "Option::is_none")]
    moved: Option<MovedClubs>,
    /// For a captaincy, logged as a change of the club's `captain` or `vice_captain` from one
    /// player's UID to the other's: the team and the players' names.
    #[serde(skip_serializing_if = "Option::is_none")]
    captaincy: Option<Captaincy>,
    /// For a change to a player's ties: the nations or clubs, and their homegrown rules.
    #[serde(skip_serializing_if = "Option::is_none")]
    tie: Option<TieChange>,
    /// For a change to a player's contract clauses: the clause before and after.
    #[serde(skip_serializing_if = "Option::is_none")]
    clause: Option<ClauseChange>,
    /// For a recall from loan that took the loan's option to buy away too: what the option was.
    #[serde(skip_serializing_if = "Option::is_none")]
    recall: Option<RecallNote>,
    /// For a stadium renamed, logged as a change of the club's field `stadium.name` from one length in bytes to the
    /// other: the names.
    #[serde(skip_serializing_if = "Option::is_none")]
    stadium: Option<StadiumNames>,
    /// For a move, healing, lifting bans, a captaincy, a tie or a clause: what undoing it takes. Other changes write
    /// back `old`.
    #[serde(skip)]
    undo: Option<Undo>,
}

/// A recall from loan that took the loan's option to buy away, so that the game would not sell him to the club he is on
/// loan at when the loan ends.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecallNote {
    /// The option to buy it took away, pounds.
    option_fee: i64,
}

/// A stadium's name before and after a rename.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StadiumNames {
    from: String,
    to: String,
}

/// What undoing a change takes when writing back its old value is not enough.
#[derive(Clone)]
enum Undo {
    /// A recall from loan that took the loan's option to buy away too: the change of the option, written back with the
    /// loan's end.
    Recall(Change),
    /// A stadium renamed: the bytes it wrote, which the undo writes back.
    Stadium(StadiumRename),
    Move(LoggedMove),
    Heal(Healed),
    Lift(Lifted),
    Retirement(RetirementSet),
    Tie(RelationSet),
    Clause(ClauseSet),
    Captain(CaptainSet),
    Staff(LoggedStaff),
}

/// A member of staff's move, new job or signing as the log keeps it: the writes to undo, and what his list row said
/// before.
#[derive(Clone)]
struct LoggedStaff {
    done: StaffChange,
    club: Option<String>,
    club_uid: Option<u32>,
    job: Option<u8>,
    contract_expires: Option<FmDate>,
}

/// A tie before and after a change: none before for one added, none after for one taken out.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TieChange {
    from: Option<TieEnd>,
    to: Option<TieEnd>,
}

/// The nation or club of a tie, and its homegrown rule for a training.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TieEnd {
    name: String,
    rule: Option<u8>,
}

/// A contract clause before and after a change: none before for one added, none after for one taken out.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ClauseChange {
    from: Option<Clause>,
    to: Option<Clause>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Captaincy {
    /// Where the team is in its club's list of teams; 0 is the senior team.
    team: usize,
    /// The team's kind and age limit, to name it by (see `TeamView`).
    kind: u8,
    age_limit: Option<u8>,
    /// Who held the role, and who took it.
    from: Option<String>,
    to: String,
    /// Whether the player who took the role held the other one, which `from` now holds.
    swapped: bool,
}

/// One of a club's teams as its squad screen shows it.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TeamView {
    index: usize,
    /// The game's code for the kind of team: 0 for the first team.
    kind: u8,
    age_limit: Option<u8>,
    captain: Option<u32>,
    vice_captain: Option<u32>,
    players: Vec<SquadRow>,
}

/// A player of a team: his list row and the live values the squad screen shows.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SquadRow {
    #[serde(flatten)]
    player: PlayerSummary,
    plays_here: bool,
    loan: Option<Loan>,
    condition: u16,
    match_sharpness: u16,
    jadedness: i16,
    morale: u8,
    injuries: usize,
    bans: usize,
    /// Whether his attributes are frozen, his energy and match sharpness, or his positions (see `freeze_team`).
    attributes_frozen: bool,
    fitness_frozen: bool,
    positions_frozen: bool,
}

/// A player a move can release to make room: his list row, and what makes him a worse choice.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RoomMakerRow {
    #[serde(flatten)]
    player: PlayerSummary,
    injured: bool,
    captain: bool,
}

/// What a team-wide action does to every player of the team.
#[derive(Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
enum TeamAction {
    /// Heals every current injury.
    Heal,
    /// Lifts every current ban.
    LiftBans,
    /// Morale to the top.
    Inspire,
    /// Energy and match sharpness to 100%.
    Refresh,
    /// Every attribute to its best: 20, or 1 where lower is better.
    MaxAttributes,
}

#[derive(Clone, Serialize)]
struct MovedClubs {
    /// None for a free agent signed, who had no club.
    #[serde(skip_serializing_if = "Option::is_none")]
    from: Option<String>,
    /// None for a release, after which he has no club.
    #[serde(skip_serializing_if = "Option::is_none")]
    to: Option<String>,
    /// In a swap, the player who went the other way.
    #[serde(skip_serializing_if = "Option::is_none")]
    with: Option<String>,
    /// The player of the new club released to make room for him, if any.
    #[serde(skip_serializing_if = "Option::is_none")]
    released: Option<String>,
    /// The fee the buying club paid the selling one, in pounds, if any.
    #[serde(skip_serializing_if = "Option::is_none")]
    fee: Option<i64>,
}

/// A move as the log keeps it: the writes to undo, and what the list rows of the players it
/// moved said before.
#[derive(Clone)]
struct LoggedMove {
    done: ClubMove,
    rows: Vec<RowBefore>,
    /// What the fee changed, if one was paid.
    paid: Vec<Paid>,
}

/// What a player's list row said about his club and contract end.
#[derive(Clone)]
struct RowBefore {
    uid: u32,
    club: Option<String>,
    club_uid: Option<u32>,
    contract_expires: Option<FmDate>,
}

/// The clubs a move is between.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MovePreview {
    /// None for a free agent, who has no club.
    #[serde(skip_serializing_if = "Option::is_none")]
    from: Option<ClubName>,
    to: ClubName,
    /// What the fee does to the two clubs' money, when one is to be paid.
    #[serde(skip_serializing_if = "Option::is_none")]
    fee: Option<FeePlan>,
    /// For a free agent, the contract the editor makes for him.
    #[serde(skip_serializing_if = "Option::is_none")]
    contract: Option<NewContract>,
    /// For a member of staff who has no club, the contract the editor makes for him.
    #[serde(skip_serializing_if = "Option::is_none")]
    staff_contract: Option<NewStaffContract>,
}

#[derive(Serialize)]
struct ClubName {
    uid: u32,
    name: String,
}

/// The filter of the list a mass edit applies to; only the one for its entity is used.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct Filters {
    player_filter: Option<PlayerFilter>,
    staff_filter: Option<StaffFilter>,
    club_filter: Option<ClubFilter>,
}

/// One field of a mass edit and what to do with it.
#[derive(Deserialize)]
struct MassOperation {
    field: String,
    operation: Operation,
}

/// Most players, staff or clubs one mass edit may change.
const MASS_LIMIT: usize = 10_000;

/// Most changes and skipped fields a preview lists; the counts cover all of them.
const PREVIEW_ROWS: usize = 500;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MassPreview {
    /// What `apply_mass_edit` takes to write exactly these changes.
    id: u32,
    /// How many players, staff or clubs the search and filters selected.
    targets: usize,
    /// How many of them already have the values the edit would give them.
    unchanged: usize,
    /// How many values would change, in all.
    changes: usize,
    /// The first changes.
    rows: Vec<Planned>,
    /// How many values are left alone, and the first of them with the reason.
    skipped_count: usize,
    skipped: Vec<Skipped>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MassReport {
    /// Groups the changes in the log; `undo_batch` undoes them together.
    batch: u32,
    applied: usize,
    failed: Vec<MassFailure>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MassFailure {
    uid: u32,
    name: String,
    field: String,
    error: Failure,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BatchUndo {
    undone: usize,
    /// Changes the game has changed since, which were left as they are.
    failed: Vec<BatchUndoFailure>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BatchUndoFailure {
    id: usize,
    error: Failure,
}

/// One value to write, as stored.
#[derive(Deserialize)]
struct FieldEdit {
    field: String,
    value: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FailedEdit {
    field: String,
    value: i64,
    error: Failure,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplyReport {
    applied: Vec<LoggedChange>,
    failed: Vec<FailedEdit>,
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |since| since.as_millis() as u64)
}

#[derive(Default)]
struct AppState(Mutex<Option<Connection>>);

/// The pictures of the user's graphics packs, once the packs have been read.
#[derive(Default)]
struct Graphics(Arc<Mutex<Option<Arc<GraphicsIndex>>>>);

impl Graphics {
    fn index(&self) -> Option<Arc<GraphicsIndex>> {
        self.0.lock().ok()?.clone()
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GraphicsInfo {
    /// Where the packs are looked for.
    root: Option<String>,
    /// False while the packs are still being read.
    ready: bool,
    counts: GraphicsCounts,
}

/// Where the graphics packs are and how many pictures they hold.
#[tauri::command]
fn graphics_info(graphics: State<'_, Graphics>) -> GraphicsInfo {
    match graphics.index() {
        Some(index) => GraphicsInfo {
            root: Some(index.root().display().to_string()).filter(|root| !root.is_empty()),
            ready: true,
            counts: index.counts(),
        },
        None => GraphicsInfo { root: None, ready: false, counts: GraphicsCounts::default() },
    }
}

/// Whether this copy of the app can update itself: download a new version, check its signature and put it in place.
/// On Windows, a copy the installer put in place, which has its uninstaller beside it; on macOS, the app run from its
/// bundle, unless macOS runs it from a read-only copy, as it does an app opened where it was downloaded (App
/// Translocation). A portable copy and a development build open the release's page instead.
#[tauri::command]
fn can_self_update() -> bool {
    let Ok(exe) = std::env::current_exe() else {
        return false;
    };
    if cfg!(windows) {
        exe.parent().is_some_and(|folder| folder.join("uninstall.exe").is_file())
    } else if cfg!(target_os = "macos") {
        app_bundle(&exe).is_some_and(|bundle| !bundle.to_string_lossy().contains("/AppTranslocation/"))
    } else {
        false
    }
}

/// The macOS app bundle the executable `exe` is in (`FMLibreEditor.app/Contents/MacOS/FMLibreEditor`); none for a
/// development build, which runs from the target folder.
fn app_bundle(exe: &Path) -> Option<&Path> {
    let macos = exe.parent()?;
    let contents = macos.parent()?;
    let bundle = contents.parent()?;
    let inside = macos.file_name()? == "MacOS" && contents.file_name()? == "Contents" && bundle.extension()? == "app";
    inside.then_some(bundle)
}

/// Starts the app again: on macOS, once an update has put the new version in place of this one, so that it runs. On
/// Windows the update's installer starts the new version itself (see app/src/update.ts).
#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

/// Serves `fmgfx` requests such as `/club/728`, `/face/7458500` or `/flag/765` from the
/// graphics packs; anything unknown or missing is a 404.
fn picture_response(graphics: &Graphics, path: &str) -> tauri::http::Response<Vec<u8>> {
    // The window's own origin differs from fmgfx's, so let it read the answers, not only show them.
    let not_found = || {
        tauri::http::Response::builder()
            .status(404)
            .header("Access-Control-Allow-Origin", "*")
            .body(Vec::new())
            .expect("a plain response")
    };
    let mut parts = path.trim_matches('/').split('/');
    let picture = match parts.next() {
        Some("club") => Picture::ClubLogo,
        Some("face") => Picture::Face,
        Some("flag") => Picture::Flag,
        Some("competition") => Picture::CompetitionLogo,
        _ => return not_found(),
    };
    let Some(id) = parts.next().and_then(|id| id.parse().ok()) else {
        return not_found();
    };
    let Some(index) = graphics.index() else {
        return not_found();
    };
    let Some(file) = index.file(picture, id) else {
        return not_found();
    };
    let Ok(bytes) = std::fs::read(file) else {
        return not_found();
    };
    let png = file.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("png"));
    tauri::http::Response::builder()
        .header("Content-Type", if png { "image/png" } else { "image/jpeg" })
        .header("Cache-Control", "max-age=3600")
        .header("Access-Control-Allow-Origin", "*")
        .body(bytes)
        .expect("a picture response")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Detection {
    elevated: bool,
    games: Vec<DetectedGame>,
    /// macOS: whether the game loads the bridge, without which the app cannot reach it.
    bridge: Option<bridge::BridgeInfo>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DetectedGame {
    pid: u32,
    info: Option<GameInfo>,
    plugin_loaded: bool,
    error: Option<Failure>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionInfo {
    game: GameInfo,
    profile: Option<String>,
    arrays: EntityArrays,
    players: usize,
    staff: usize,
    clubs: usize,
    game_date: Option<FmDate>,
    load_ms: u128,
    /// Whether edits can be written: the system let the app open the game for writing, and the build is one the
    /// editor knows or editing it was allowed.
    editable: bool,
    /// Whether the system let the app open the game for writing.
    writable: bool,
    /// Whether the editor has a profile for this build of the game: one it was checked with.
    known_build: bool,
    /// Whether the layout tells women from men, players and staff alike: the lists offer that filter only then.
    gender_known: bool,
    /// What the checks the editor makes before it writes found on this game.
    health: Health,
    /// Only from `connect`: what it froze again of what was frozen in this save before, when there was any.
    #[serde(skip_serializing_if = "Option::is_none")]
    refrozen: Option<Refrozen>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReloadInfo {
    players: usize,
    staff: usize,
    clubs: usize,
    game_date: Option<FmDate>,
    /// The checks, run again with the game as it is now.
    health: Health,
    /// Only when the game has loaded another save since: what was frozen in that one before and is frozen again,
    /// when there was any. What was frozen in the save before is not held in this one.
    #[serde(skip_serializing_if = "Option::is_none")]
    refrozen: Option<Refrozen>,
}

/// One page of search results.
#[derive(Serialize)]
struct Page<T> {
    total: usize,
    rows: Vec<T>,
}

/// Searches `index`, keeps the hits `keep` accepts and returns at most `limit` of them.
fn page<T: Listed + Clone>(
    index: &SearchIndex<T>,
    query: &str,
    limit: usize,
    keep: impl Fn(&T) -> bool,
    sort: impl FnOnce(&mut Vec<&T>),
) -> Page<T> {
    let mut hits = index.search(query);
    hits.retain(|item| keep(item));
    sort(&mut hits);
    Page { total: hits.len(), rows: hits.into_iter().take(limit).cloned().collect() }
}

/// What a command reports when it fails: a code the window says in its own language, the
/// values the message names, and the message in English for a code the window does not know.
#[derive(Debug, Clone, Serialize)]
struct Failure {
    code: &'static str,
    params: BTreeMap<&'static str, String>,
    message: String,
}

impl Failure {
    /// A failure of the app's own, rather than of the game or of an edit.
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self { code, params: BTreeMap::new(), message: message.into() }
    }

    fn with(mut self, name: &'static str, value: impl ToString) -> Self {
        self.params.insert(name, value.to_string());
        self
    }

    fn coded(err: &impl Coded) -> Self {
        Self { code: err.code(), params: err.params().into_iter().collect(), message: err.to_string() }
    }
}

macro_rules! coded_failures {
    ($($error:ty),*) => {$(
        impl From<$error> for Failure {
            fn from(err: $error) -> Self {
                Failure::coded(&err)
            }
        }
    )*};
}

coded_failures!(EditError, MoveError, ScoutError, SessionError, fmlibre_mem::Error);

impl<T> From<std::sync::PoisonError<T>> for Failure {
    fn from(err: std::sync::PoisonError<T>) -> Self {
        Failure::new("app.internal", err.to_string())
    }
}

impl From<tauri::Error> for Failure {
    fn from(err: tauri::Error) -> Self {
        Failure::new("app.internal", err.to_string())
    }
}

fn not_connected() -> Failure {
    Failure::new("app.notConnected", "Not connected to the game")
}

/// No player, member of staff or club with `uid` in the lists read from the game.
fn not_found(entity: Entity, uid: u32) -> Failure {
    Failure::new("app.notFound", format!("No {entity} with id {uid}")).with("entity", entity).with("uid", uid)
}

/// A profile could not be read whole, as the game changed it meanwhile.
fn data_changed() -> Failure {
    Failure::new("app.dataChanged", "This data has changed in the game; reload and try again.")
}

/// Lists running Football Manager processes and whether they can be opened for reading.
#[tauri::command]
async fn detect_game(app: tauri::AppHandle) -> Result<Detection, Failure> {
    let running = find_processes(GAME_EXE)?;
    let games = running.into_iter().map(|entry| inspect(entry.pid)).collect();
    Ok(Detection { elevated: is_current_process_elevated(), games, bridge: bridge::status(&app) })
}

fn inspect(pid: u32) -> DetectedGame {
    let result = Process::open_read(pid).and_then(|process| {
        let info = GameInfo::inspect(&process)?;
        let plugin_loaded = list_modules(&process)?.iter().any(|m| m.name.eq_ignore_ascii_case(GAME_PLUGIN));
        Ok((info, plugin_loaded))
    });
    match result {
        Ok((info, plugin_loaded)) => DetectedGame { pid, info: Some(info), plugin_loaded, error: None },
        Err(err) => DetectedGame { pid, info: None, plugin_loaded: false, error: Some(err.into()) },
    }
}

/// Attaches to the running game, locates its data and reads every player, member of
/// staff and club. Only reads memory; the game is opened for writing too when the system
/// allows it, so that edits can be applied later, and so that what was frozen in this
/// save before can be held again (see `Connection::restore_frozen`).
#[tauri::command]
async fn connect(state: State<'_, AppState>, file: State<'_, FrozenFile>) -> Result<ConnectionInfo, Failure> {
    let started = Instant::now();
    let path = file.0.clone();
    let (connection, refrozen) = tauri::async_runtime::spawn_blocking(move || -> Result<_, Failure> {
        let pid = find_game(None)?;
        let process = Process::open_read_write(pid).or_else(|_| Process::open_read(pid))?;
        let mut connection = Connection::load(Session::connect(process, ArraySource::ProfileFirst)?, Vec::new())?;
        let refrozen = connection.restore_frozen(path.as_deref());
        Ok((connection, refrozen))
    })
    .await??;

    let mut info = connection.info(started.elapsed().as_millis());
    info.refrozen = (!refrozen.is_empty()).then_some(refrozen);
    *state.0.lock()? = Some(connection);
    Ok(info)
}

/// The connection made before, if the app is still attached, without reading the game
/// again: lets the window pick it up after a reload (e.g. to change the language) with
/// the lists and the change log as they were.
#[tauri::command]
fn current_connection(state: State<'_, AppState>) -> Result<Option<ConnectionInfo>, Failure> {
    let guard = state.0.lock()?;
    Ok(guard.as_ref().map(|connection| connection.info(0)))
}

/// Lets the editor write to a build of the game it has no profile for, as far as its checks allow, for as long as
/// the app stays connected.
#[tauri::command]
fn allow_editing(state: State<'_, AppState>) -> Result<ConnectionInfo, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    connection.session.allow_unknown_build();
    Ok(connection.info(0))
}

/// Reads everything again, e.g. after the game has moved on. Drops the connection when that fails. What is frozen
/// stays frozen, unless the game has loaded another save: then what was frozen in that one before is frozen instead.
#[tauri::command]
async fn reload(state: State<'_, AppState>, file: State<'_, FrozenFile>) -> Result<ReloadInfo, Failure> {
    let old = state.0.lock()?.take().ok_or_else(not_connected)?;
    let path = file.0.clone();
    let (connection, refrozen) = tauri::async_runtime::spawn_blocking(move || -> Result<_, Failure> {
        let (save, frozen) = (old.save, old.frozen);
        let mut connection = Connection::load(old.session, old.log)?;
        if connection.save == save {
            connection.frozen = frozen;
            // A save loaded again has its stadiums' own names back: the ones the editor gave are given again now.
            connection.give_stadium_names();
            return Ok((connection, None));
        }
        let refrozen = connection.restore_frozen(path.as_deref());
        Ok((connection, (!refrozen.is_empty()).then_some(refrozen)))
    })
    .await??;
    let info = ReloadInfo {
        players: connection.players.len(),
        staff: connection.staff.len(),
        clubs: connection.clubs.len(),
        game_date: connection.session.game_date(),
        health: Health::clone(&connection.session.health()),
        refrozen,
    };
    *state.0.lock()? = Some(connection);
    Ok(info)
}

/// Players matching `query`, highest current ability first; at most `limit` rows.
#[tauri::command]
fn search_players(
    state: State<'_, AppState>,
    query: String,
    limit: usize,
    filter: Option<PlayerFilter>,
    order: Option<PlayerOrder>,
) -> Result<Page<fmlibre_core::PlayerSummary>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let filter = filter.unwrap_or_default();
    Ok(page(
        &connection.players,
        &query,
        limit,
        |p| filter.matches(p),
        |hits| {
            if let Some(order) = order {
                sort_players(hits, order);
            }
        },
    ))
}

/// Staff matching `query`, the human manager first, then by current ability, unless `order` sorts them otherwise; at
/// most `limit` rows.
#[tauri::command]
fn search_staff(
    state: State<'_, AppState>,
    query: String,
    limit: usize,
    filter: Option<StaffFilter>,
    order: Option<StaffOrder>,
) -> Result<Page<fmlibre_core::StaffSummary>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let filter = filter.unwrap_or_default();
    Ok(page(
        &connection.staff,
        &query,
        limit,
        |s| filter.matches(s),
        |hits| {
            if let Some(order) = order {
                sort_staff(hits, order);
            }
        },
    ))
}

/// Clubs matching `query`, highest reputation first; at most `limit` rows. `kind_of` keeps to the clubs of the same kind
/// as the club with that UID, men's or women's: those its players and staff can move to. `kind_of_player` does the same
/// for the player with that UID, for one with no club: the clubs a free agent can sign for; `kind_of_staff` for the
/// member of staff with that id, for one with no club.
#[tauri::command]
fn search_clubs(
    state: State<'_, AppState>,
    query: String,
    limit: usize,
    filter: Option<ClubFilter>,
    kind_of: Option<u32>,
    kind_of_player: Option<u32>,
    kind_of_staff: Option<u32>,
) -> Result<Page<fmlibre_core::ClubSummary>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let mut filter = filter.unwrap_or_default();
    if let Some(club) = kind_of.and_then(|uid| connection.clubs.get(uid)) {
        filter.women = Some(club.women);
    }
    if let Some(woman) = kind_of_player.and_then(|uid| connection.players.get(uid)).and_then(|player| player.woman) {
        filter.women = Some(woman);
    }
    if let Some(woman) = kind_of_staff.and_then(|uid| connection.staff.get(uid)).and_then(|member| member.woman) {
        filter.women = Some(woman);
    }
    Ok(page(&connection.clubs, &query, limit, |c| filter.matches(c), |_| {}))
}

/// Writes the players `query` and `filter` select, in `order`, to a new file in the exports folder as `format`: what
/// their profiles hold, with the in-game date in the file and in its name ("players-2027-01-02.csv"; a second export
/// that day "players-2027-01-02-2.csv"). Only reads memory.
#[tauri::command]
async fn export_players(
    app: tauri::AppHandle,
    query: String,
    filter: Option<PlayerFilter>,
    order: Option<PlayerOrder>,
    format: ExportFormat,
) -> Result<ExportReport, Failure> {
    tauri::async_runtime::spawn_blocking(move || -> Result<ExportReport, Failure> {
        let folder = app.state::<ExportsFolder>().0.clone();
        let folder = folder.ok_or_else(|| Failure::new("export.noFolder", "There is no folder to export to."))?;
        // macOS may ask the user before an app first writes to the Documents folder (see Info.plist): a no is said as
        // such, with where to change it.
        let failed = |err: std::io::Error| {
            if cfg!(target_os = "macos") && err.kind() == std::io::ErrorKind::PermissionDenied {
                Failure::new("export.notAllowed", format!("FMLibreEditor may not write to {}: {err}", folder.display()))
                    .with("folder", folder.display())
            } else {
                Failure::new("export.failed", err.to_string()).with("reason", err)
            }
        };
        let state = app.state::<AppState>();
        let guard = state.0.lock()?;
        let connection = guard.as_ref().ok_or_else(not_connected)?;
        let filter = filter.unwrap_or_default();
        let mut hits = connection.players.search(&query);
        hits.retain(|player| filter.matches(player));
        if let Some(order) = order {
            sort_players(&mut hits, order);
        }
        let header = ExportHeader {
            writer: format!("FMLibreEditor {}", app.package_info().version),
            game: connection.session.game.name(),
            game_date: connection.session.game_date(),
        };
        std::fs::create_dir_all(&folder).map_err(failed)?;
        let (path, file) = new_export_file(&folder, header.game_date, format.extension()).map_err(failed)?;
        let mut out = std::io::BufWriter::new(file);
        let exported = connection.session.export_players(&hits, format, &header, &mut out).map_err(failed)?;
        std::io::Write::flush(&mut out).map_err(failed)?;
        let file = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
        Ok(ExportReport { path, file, folder, players: exported.players, skipped: exported.skipped })
    })
    .await?
}

/// A new file for an export in `folder`, named after the in-game date: the first of "players-2027-01-02.json",
/// "players-2027-01-02-2.json", ... that is not there yet.
fn new_export_file(folder: &Path, date: Option<FmDate>, extension: &str) -> std::io::Result<(PathBuf, std::fs::File)> {
    let stem = date.map_or_else(
        || "players".to_owned(),
        |date| format!("players-{:04}-{:02}-{:02}", date.year, date.month, date.day),
    );
    for n in 1.. {
        let name = if n == 1 { format!("{stem}.{extension}") } else { format!("{stem}-{n}.{extension}") };
        let path = folder.join(name);
        match std::fs::File::create_new(&path) {
            Ok(file) => return Ok((path, file)),
            Err(err) if err.kind() == std::io::ErrorKind::AlreadyExists && n < 1000 => continue,
            Err(err) => return Err(err),
        }
    }
    unreachable!("the loop returns")
}

/// `path`, when it is a file an export wrote: the only files the app opens or shows.
fn exported_file(folder: &ExportsFolder, path: &Path) -> Result<PathBuf, Failure> {
    let inside = folder.0.as_deref().is_some_and(|folder| path.parent() == Some(folder));
    if inside && path.is_file() {
        Ok(path.to_owned())
    } else {
        Err(Failure::new("export.notExported", "That is not a file FMLibreEditor exported."))
    }
}

/// Opens the file `path`, which an export wrote, in the app the system opens such files with (a spreadsheet, say).
#[tauri::command]
fn open_export(folder: State<'_, ExportsFolder>, path: PathBuf) -> Result<(), Failure> {
    let path = exported_file(&folder, &path)?;
    tauri_plugin_opener::open_path(path, None::<&str>)
        .map_err(|err| Failure::new("export.openFailed", err.to_string()).with("reason", err))
}

/// Shows the file `path`, which an export wrote, in its folder: in Explorer, or in Finder on macOS.
#[tauri::command]
fn show_export(folder: State<'_, ExportsFolder>, path: PathBuf) -> Result<(), Failure> {
    let path = exported_file(&folder, &path)?;
    tauri_plugin_opener::reveal_item_in_dir(path)
        .map_err(|err| Failure::new("export.openFailed", err.to_string()).with("reason", err))
}

/// The full profile of the club with `uid`. Only reads memory.
#[tauri::command]
fn club_details(state: State<'_, AppState>, uid: u32) -> Result<ClubDetails, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let club = connection.clubs.get(uid).ok_or_else(|| not_found(Entity::Club, uid))?;
    connection.session.club_details(club)?.ok_or_else(data_changed)
}

/// The full profile of the player with `uid`. Only reads memory.
#[tauri::command]
fn player_details(state: State<'_, AppState>, uid: u32) -> Result<PlayerDetails, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let mut details = connection.session.player_details(player)?.ok_or_else(data_changed)?;
    // A loan that ends on the day this session's recall wrote, not undone, is the editor's doing.
    if let Some(loan) = details.loan.as_mut() {
        let until = loan.until.map(FmDate::to_number);
        loan.recalled = connection.log.iter().any(|logged| {
            let change = &logged.change;
            change.entity == Entity::Player
                && change.uid == uid
                && change.field == LOAN_EXPIRES
                && logged.undone_at.is_none()
                && Some(change.new) == until
        });
    }
    Ok(details)
}

/// The full profile of the member of staff with `uid`. Only reads memory.
#[tauri::command]
fn staff_details(state: State<'_, AppState>, uid: u32) -> Result<StaffDetails, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let member = connection.staff.get(uid).ok_or_else(|| not_found(Entity::Staff, uid))?;
    connection.session.staff_details(member)?.ok_or_else(data_changed)
}

/// The nations of the players and staff in the lists, by name: what a nation field can be set to.
#[tauri::command]
fn list_nations(state: State<'_, AppState>) -> Result<Vec<Nation>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    Ok(connection.nations())
}

/// Freezes the money of the club `club`, or unfreezes it: while the app is connected, a frozen club's balance does not
/// go down. Refused while the balance may not be written. The app remembers it for this save, and freezes it again
/// when it connects to the save another time. Returns the clubs frozen now.
#[tauri::command]
fn freeze_money(
    state: State<'_, AppState>,
    file: State<'_, FrozenFile>,
    club: u32,
    frozen: bool,
) -> Result<Vec<u32>, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    if frozen {
        connection.freeze_club(club)?;
    } else {
        connection.frozen.money.remove(&club);
    }
    connection.remember(file.0.as_deref(), |save| {
        if frozen {
            save.clubs.insert(club);
        } else {
            save.clubs.remove(&club);
        }
    });
    Ok(connection.frozen.money.keys().copied().collect())
}

/// The clubs whose money is frozen.
#[tauri::command]
fn frozen_clubs(state: State<'_, AppState>) -> Result<Vec<u32>, Failure> {
    let guard = state.0.lock()?;
    Ok(guard.as_ref().map(|connection| connection.frozen.money.keys().copied().collect()).unwrap_or_default())
}

/// Freezes the attributes of the player `uid`, or unfreezes them: while the app is connected, a frozen player's
/// attributes do not get worse. Refused while the attributes may not be written. The app remembers it for this save,
/// and freezes them again when it connects to the save another time. Returns the players frozen now.
#[tauri::command]
fn freeze_attributes(
    state: State<'_, AppState>,
    file: State<'_, FrozenFile>,
    uid: u32,
    frozen: bool,
) -> Result<Vec<u32>, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    if frozen {
        connection.freeze_player(uid)?;
    } else {
        connection.frozen.attributes.remove(&uid);
    }
    connection.remember(file.0.as_deref(), |save| {
        if frozen {
            save.players.insert(uid);
        } else {
            save.players.remove(&uid);
        }
    });
    Ok(connection.frozen.attributes.keys().copied().collect())
}

/// The players whose attributes are frozen.
#[tauri::command]
fn frozen_players(state: State<'_, AppState>) -> Result<Vec<u32>, Failure> {
    let guard = state.0.lock()?;
    Ok(guard.as_ref().map(|connection| connection.frozen.attributes.keys().copied().collect()).unwrap_or_default())
}

/// Freezes the attributes of the member of staff `id`, or unfreezes them: while the app is connected, a frozen member
/// of staff's attributes do not get worse. Refused while the attributes may not be written. The app remembers it for
/// this save, and freezes them again when it connects to the save another time. Returns the members of staff frozen
/// now.
#[tauri::command]
fn freeze_staff_attributes(
    state: State<'_, AppState>,
    file: State<'_, FrozenFile>,
    id: u32,
    frozen: bool,
) -> Result<Vec<u32>, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    if frozen {
        connection.freeze_member(id)?;
    } else {
        connection.frozen.staff.remove(&id);
    }
    connection.remember(file.0.as_deref(), |save| {
        if frozen {
            save.staff.insert(id);
        } else {
            save.staff.remove(&id);
        }
    });
    Ok(connection.frozen.staff.keys().copied().collect())
}

/// The members of staff whose attributes are frozen.
#[tauri::command]
fn frozen_staff(state: State<'_, AppState>) -> Result<Vec<u32>, Failure> {
    let guard = state.0.lock()?;
    Ok(guard.as_ref().map(|connection| connection.frozen.staff.keys().copied().collect()).unwrap_or_default())
}

/// Freezes the energy and match sharpness of the player `uid`, or unfreezes them: while the app is connected, they do
/// not go down, and a player frozen at full energy stays at it. Refused while they may not be written. The app
/// remembers it for this save, and freezes them again when it connects to the save another time. Returns the players
/// whose energy and match sharpness are frozen now.
#[tauri::command]
fn freeze_fitness(
    state: State<'_, AppState>,
    file: State<'_, FrozenFile>,
    uid: u32,
    frozen: bool,
) -> Result<Vec<u32>, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    if frozen {
        connection.freeze_fitness(uid)?;
    } else {
        connection.frozen.fitness.remove(&uid);
    }
    connection.remember(file.0.as_deref(), |save| {
        if frozen {
            save.fitness.insert(uid);
        } else {
            save.fitness.remove(&uid);
        }
    });
    Ok(connection.frozen.fitness.keys().copied().collect())
}

/// The players whose energy and match sharpness are frozen.
#[tauri::command]
fn frozen_fitness(state: State<'_, AppState>) -> Result<Vec<u32>, Failure> {
    let guard = state.0.lock()?;
    Ok(guard.as_ref().map(|connection| connection.frozen.fitness.keys().copied().collect()).unwrap_or_default())
}

/// Freezes the position ratings of the player `uid`, or unfreezes them: while the app is connected, they stay as
/// they are. Refused while they may not be written. The app remembers it for this save, and freezes them again when
/// it connects to the save another time. Returns the players whose positions are frozen now.
#[tauri::command]
fn freeze_positions(
    state: State<'_, AppState>,
    file: State<'_, FrozenFile>,
    uid: u32,
    frozen: bool,
) -> Result<Vec<u32>, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    connection.set_frozen(file.0.as_deref(), FreezeKind::Positions, &[uid], frozen)?;
    Ok(connection.frozen.positions.keys().copied().collect())
}

/// The players whose position ratings are frozen.
#[tauri::command]
fn frozen_positions(state: State<'_, AppState>) -> Result<Vec<u32>, Failure> {
    let guard = state.0.lock()?;
    Ok(guard.as_ref().map(|connection| connection.frozen.positions.keys().copied().collect()).unwrap_or_default())
}

/// What freezing a player holds: his attributes, his energy and match sharpness, or his position ratings.
#[derive(Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
enum FreezeKind {
    Attributes,
    Fitness,
    Positions,
}

impl FreezeKind {
    /// What a player who could not be frozen is said to be refused, as the window names it (`MassFailure::field`).
    fn key(self) -> &'static str {
        match self {
            FreezeKind::Attributes => "attributes",
            FreezeKind::Fitness => "fitness",
            FreezeKind::Positions => "positions",
        }
    }
}

/// What freezing or unfreezing a team came to.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TeamFreeze {
    /// How many of its players were frozen, or unfrozen, now: not those that already were.
    changed: usize,
    /// Its players who could not be frozen, and why.
    failed: Vec<MassFailure>,
}

/// Freezes what `kind` names for every player of the team `team` of the club `club`, read now, those out on loan
/// too, or unfreezes it, as `freeze_attributes`, `freeze_fitness` and `freeze_positions` do for one player. Refused at
/// once while those fields may not be written. The app remembers it for this save.
#[tauri::command]
fn freeze_team(
    state: State<'_, AppState>,
    file: State<'_, FrozenFile>,
    club: u32,
    team: usize,
    kind: FreezeKind,
    frozen: bool,
) -> Result<TeamFreeze, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let summary = connection.clubs.get(club).ok_or_else(|| not_found(Entity::Club, club))?;
    let members: Vec<u32> = connection
        .session
        .club_teams(summary, &connection.players)?
        .into_iter()
        .find(|found| found.index == team)
        .ok_or(MoveError::NoTeam { index: team })?
        .players
        .iter()
        .map(|member| member.uid)
        .collect();
    connection.set_frozen(file.0.as_deref(), kind, &members, frozen)
}

/// The fields of players or of staff that the editor can change.
#[tauri::command]
fn edit_fields(state: State<'_, AppState>, entity: Entity) -> Result<Vec<Field>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    Ok(connection.session.fields(entity))
}

/// The value of every field of one player, member of staff or club that can be edited
/// now, as stored, read now. Fields without their record (no contract, a club without
/// full finances), dates the game has not set and fields whose check did not pass are
/// left out.
#[tauri::command]
fn read_values(state: State<'_, AppState>, entity: Entity, uid: u32) -> Result<BTreeMap<String, i64>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let (target, _) = connection.target(entity, uid)?;
    let fields: Vec<Field> = connection
        .session
        .fields(entity)
        .into_iter()
        .filter(|field| connection.session.field_lock(field).is_none())
        .collect();
    let values = connection.session.read_fields(&target, &fields)?;
    Ok(fields
        .into_iter()
        .zip(values)
        .filter_map(|(field, value)| {
            let value = value.filter(|&value| field.is_plausible(value))?;
            (field.kind != Kind::Date || value != 0).then_some((field.key, value))
        })
        .collect())
}

/// Writes `edits` (values as stored) to one player or member of staff. Each edit is
/// checked and written on its own: the ones that fail change nothing and are reported.
#[tauri::command]
fn apply_edits(
    state: State<'_, AppState>,
    entity: Entity,
    uid: u32,
    edits: Vec<FieldEdit>,
) -> Result<ApplyReport, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let (target, name) = connection.target(entity, uid)?;
    let mut report = ApplyReport { applied: Vec::new(), failed: Vec::new() };
    for edit in edits {
        let written = connection
            .session
            .field(entity, &edit.field)
            .and_then(|field| connection.session.write_field(&target, &field, edit.value));
        match written {
            // Already the value asked for: nothing was written.
            Ok(change) if change.old == change.new => {}
            Ok(change) => report.applied.push(connection.log_change(change, name.clone(), None)),
            Err(err) => {
                let error = connection.with_names(err.into());
                report.failed.push(FailedEdit { field: edit.field, value: edit.value, error });
            }
        }
    }
    Ok(report)
}

/// Brings the player `uid` back from his loan: the loan now ends on the day after the game's date, and when the game
/// gets there it ends the loan and brings him back to his club. Logged as a change of the day the loan ends, which an
/// undo puts back while the game has not ended the loan. Nothing is written or logged when it ends then already.
#[tauri::command]
fn recall_loan(state: State<'_, AppState>, uid: u32) -> Result<Option<LoggedChange>, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let (target, name) = connection.target(Entity::Player, uid)?;
    let session = &connection.session;
    let written = session.loan_recall_day().and_then(|day| {
        let field = session.field(Entity::Player, LOAN_EXPIRES)?;
        session.write_field(&target, &field, day.to_number())
    });
    let change = match written {
        Ok(change) if change.old == change.new => return Ok(None),
        Ok(change) => change,
        Err(err) => return Err(connection.with_names(err.into())),
    };
    // The loan's option to buy goes too: when a loan with one ends, the game may let the club he is on loan at sign him
    // for it (Anton Kade, recalled, went to Liverpool for his option). The undo writes it back with the loan's end.
    let option = session.field(Entity::Player, LOAN_OPTION_FEE).ok().and_then(|field| {
        let held = session.read_field(&target, &field).ok()?;
        (held >= 0).then(|| session.write_field_if(&target, &field, held, -1))
    });
    let option = match option {
        None => None,
        Some(Ok(option)) => Some(option),
        Some(Err(err)) => {
            // The end is written but not the option: put the end back, so that the recall is all or nothing.
            let _ = session.revert(&target, &change);
            return Err(connection.with_names(err.into()));
        }
    };
    let mut logged = connection.log_change(change, name, None);
    if let Some(option) = option {
        let entry = connection.log.last_mut().expect("just logged");
        entry.recall = Some(RecallNote { option_fee: option.old });
        entry.undo = Some(Undo::Recall(option));
        logged = entry.clone();
    }
    Ok(Some(logged))
}

/// Every change written this session, newest first.
#[tauri::command]
fn change_log(state: State<'_, AppState>) -> Result<Vec<LoggedChange>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    Ok(connection.log.iter().rev().cloned().collect())
}

/// Writes back the old value of the logged change `id`, provided the game still holds the
/// value that change wrote. A stadium's name is held from then on as the undo left it: back to
/// the game's own, it is let go of.
#[tauri::command]
fn undo_change(state: State<'_, AppState>, file: State<'_, FrozenFile>, id: usize) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let logged = connection.undo(id)?;
    if let Some(names) = &logged.stadium {
        connection.hold_stadium_name(file.0.as_deref(), logged.change.uid, &names.from, &names.to);
    }
    Ok(logged)
}

/// Checks that the player `uid` can move to the club `club` on the contract `terms`, and
/// names the clubs; the error says why he cannot. With `release`, that player of the club is
/// released to make room for him (see `room_makers`). Nothing is written.
#[tauri::command]
fn plan_club_move(
    state: State<'_, AppState>,
    uid: u32,
    club: u32,
    terms: MoveTerms,
    fee: Option<i64>,
    release: Option<u32>,
) -> Result<MovePreview, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let plan = connection.plan_move(uid, club, terms, release)?;
    let fee = connection.plan_fee(plan.from_club, plan.to_club, fee)?;
    let name = |uid: u32| ClubName { uid, name: connection.club_name(uid) };
    let from = (plan.from_club != 0).then(|| name(plan.from_club));
    Ok(MovePreview { from, to: name(plan.to_club), fee, contract: plan.contract, staff_contract: None })
}

/// The players of the senior team of the club `club` that a move to it can release to make room in a full squad list,
/// the one to suggest first: each one's list row, and whether he is injured or a captain. Off the window's thread: it
/// reads the club's teams and checks each player as a release would.
#[tauri::command]
async fn room_makers(app: tauri::AppHandle, club: u32) -> Result<Vec<RoomMakerRow>, Failure> {
    tauri::async_runtime::spawn_blocking(move || -> Result<Vec<RoomMakerRow>, Failure> {
        let state = app.state::<AppState>();
        let guard = state.0.lock()?;
        let connection = guard.as_ref().ok_or_else(not_connected)?;
        let to = connection.clubs.get(club).ok_or_else(|| not_found(Entity::Club, club))?;
        let makers = connection.session.room_makers(to, &connection.players, &connection.human_clubs)?;
        Ok(makers
            .into_iter()
            .filter_map(|maker| {
                let player = connection.players.get(maker.uid)?.clone();
                Some(RoomMakerRow { player, injured: maker.injured, captain: maker.captain })
            })
            .collect())
    })
    .await?
}

/// Moves the player `uid` to the senior team of the club `club` on the contract `terms`, the club paying his old
/// one `fee` pounds if given, worked out again from the game as it is now, and logs the move. With `release`, that
/// player of the club is released in the same move, to make room for him. When the fee cannot be paid, the move is
/// undone. Off the window's thread: leaving a club a human manager runs takes a few seconds.
#[tauri::command]
async fn move_player(
    app: tauri::AppHandle,
    uid: u32,
    club: u32,
    terms: MoveTerms,
    fee: Option<i64>,
    release: Option<u32>,
) -> Result<LoggedChange, Failure> {
    tauri::async_runtime::spawn_blocking(move || -> Result<LoggedChange, Failure> {
        let state = app.state::<AppState>();
        let mut guard = state.0.lock()?;
        let connection = guard.as_mut().ok_or_else(not_connected)?;
        let plan = connection.plan_move(uid, club, terms, release)?;
        let fee_plan = connection.plan_fee(plan.from_club, plan.to_club, fee)?;
        let club = |uid: u32| connection.clubs.get(uid).cloned().ok_or_else(|| not_found(Entity::Club, uid));
        let buyer = club(plan.to_club)?;
        // A free agent signed has no club (and pays no fee: see `plan_fee`).
        let seller = if plan.from_club == 0 { None } else { Some(club(plan.from_club)?) };
        let done = connection.session.apply_club_move(&plan)?;
        let paid = match (fee_plan, &seller) {
            (Some(fee_plan), Some(seller)) => match connection.session.pay_fee(&fee_plan, &buyer, seller) {
                Ok(paid) => paid,
                Err(err) => {
                    let _ = connection.session.undo_club_move(&done);
                    return Err(err.into());
                }
            },
            _ => Vec::new(),
        };
        // The contract made for a free agent ends on the day it says, given or not.
        let terms = MoveTerms { expires: terms.expires.or(plan.contract.map(|made| made.expires)), ..terms };
        Ok(connection.log_move(done, terms, paid, fee_plan.map(|plan| plan.fee)))
    })
    .await?
}

/// Checks that the loan of the player `uid` can be made permanent on the contract `terms`, the club he is on loan to
/// paying his own one `fee` pounds if given, and names the clubs; the error says why it cannot. Nothing is written.
#[tauri::command]
fn plan_loan_permanent(
    state: State<'_, AppState>,
    uid: u32,
    terms: MoveTerms,
    fee: Option<i64>,
) -> Result<MovePreview, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let plan = connection.plan_permanent(uid, terms)?;
    let fee = connection.plan_fee(plan.from_club, plan.to_club, fee)?;
    let name = |uid: u32| ClubName { uid, name: connection.club_name(uid) };
    Ok(MovePreview {
        from: Some(name(plan.from_club)),
        to: name(plan.to_club),
        fee,
        contract: None,
        staff_contract: None,
    })
}

/// Makes the loan of the player `uid` permanent on the contract `terms`, the club he is on loan to paying his own one
/// `fee` pounds if given, worked out again from the game as it is now: he stays where he plays, now under contract
/// with that club, and leaves his own. Logged as a move between the two clubs, which one undo takes back. When the fee
/// cannot be paid, nothing stays changed. Off the window's thread: leaving a club a human manager runs takes a few
/// seconds.
#[tauri::command]
async fn make_loan_permanent(
    app: tauri::AppHandle,
    uid: u32,
    terms: MoveTerms,
    fee: Option<i64>,
) -> Result<LoggedChange, Failure> {
    tauri::async_runtime::spawn_blocking(move || -> Result<LoggedChange, Failure> {
        let state = app.state::<AppState>();
        let mut guard = state.0.lock()?;
        let connection = guard.as_mut().ok_or_else(not_connected)?;
        let plan = connection.plan_permanent(uid, terms)?;
        let fee_plan = connection.plan_fee(plan.from_club, plan.to_club, fee)?;
        let club = |uid: u32| connection.clubs.get(uid).cloned().ok_or_else(|| not_found(Entity::Club, uid));
        let (buyer, seller) = (club(plan.to_club)?, club(plan.from_club)?);
        let done = connection.session.apply_club_move(&plan)?;
        let paid = match fee_plan {
            Some(fee_plan) => match connection.session.pay_fee(&fee_plan, &buyer, &seller) {
                Ok(paid) => paid,
                Err(err) => {
                    let _ = connection.session.undo_club_move(&done);
                    return Err(err.into());
                }
            },
            None => Vec::new(),
        };
        Ok(connection.log_move(done, terms, paid, fee_plan.map(|plan| plan.fee)))
    })
    .await?
}

/// Checks that the player `uid` can be released from his club, and names it; the error says why he cannot. Nothing is
/// written.
#[tauri::command]
fn plan_release(state: State<'_, AppState>, uid: u32) -> Result<ClubName, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let plan = connection.plan_release(uid)?;
    Ok(ClubName { uid: plan.from_club, name: connection.club_name(plan.from_club) })
}

/// Releases the player `uid` from his club, worked out again from the game as it is now, and logs it: he becomes a
/// free agent. Off the window's thread, as a move.
#[tauri::command]
async fn release_player(app: tauri::AppHandle, uid: u32) -> Result<LoggedChange, Failure> {
    tauri::async_runtime::spawn_blocking(move || -> Result<LoggedChange, Failure> {
        let state = app.state::<AppState>();
        let mut guard = state.0.lock()?;
        let connection = guard.as_mut().ok_or_else(not_connected)?;
        let plan = connection.plan_release(uid)?;
        let done = connection.session.apply_club_move(&plan)?;
        Ok(connection.log_release(done))
    })
    .await?
}

/// Checks that the member of staff `uid` can move to the club `club`, as `job` if given (else in his own job), and
/// names the clubs; the error says why he cannot. One who has no club is signed, as `job`, on a contract the editor
/// makes on `terms`, which the answer says. Nothing is written.
#[tauri::command]
fn plan_staff_move(
    state: State<'_, AppState>,
    uid: u32,
    club: u32,
    job: Option<u8>,
    terms: Option<MoveTerms>,
) -> Result<MovePreview, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let plan = connection.plan_staff_move(uid, club, job, terms.unwrap_or_default())?;
    let name = |uid: u32| ClubName { uid, name: connection.club_name(uid) };
    let from = (plan.from_club != 0).then(|| name(plan.from_club));
    Ok(MovePreview { from, to: name(plan.to_club), fee: None, contract: None, staff_contract: plan.contract })
}

/// Moves the member of staff `uid` to the club `club`, as `job` if given (else in the departments he works in), or
/// signs him for it as `job` on `terms` when he has no club, worked out again from the game as it is now, and logs it.
#[tauri::command]
fn move_staff(
    state: State<'_, AppState>,
    uid: u32,
    club: u32,
    job: Option<u8>,
    terms: Option<MoveTerms>,
) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let plan = connection.plan_staff_move(uid, club, job, terms.unwrap_or_default())?;
    let done = connection.session.apply_staff_plan(&plan)?;
    Ok(connection.log_staff(done, plan.contract))
}

/// Gives the member of staff `uid` the job `job` (a contract code) at his club, and logs it.
#[tauri::command]
fn change_staff_job(state: State<'_, AppState>, uid: u32, job: u8) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let plan = connection.plan_staff_job(uid, job)?;
    let done = connection.session.apply_staff_plan(&plan)?;
    Ok(connection.log_staff(done, None))
}

/// The jobs `change_staff_job` gives, and a move or a signing of staff can, by contract code: in the game connected
/// to, those its layout places (see `Session::staff_jobs`).
#[tauri::command]
fn staff_jobs(state: State<'_, AppState>) -> Result<Vec<u8>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    Ok(connection.session.staff_jobs())
}

/// Checks that the players `uid` and `other` can swap clubs, and names the clubs (`from` is
/// the club of `uid`); the error says why they cannot. Nothing is written.
#[tauri::command]
fn plan_club_swap(state: State<'_, AppState>, uid: u32, other: u32) -> Result<MovePreview, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let plan = connection.plan_swap(uid, other)?;
    let name = |uid: u32| ClubName { uid, name: connection.club_name(uid) };
    Ok(MovePreview {
        from: Some(name(plan.from_club)),
        to: name(plan.to_club),
        fee: None,
        contract: None,
        staff_contract: None,
    })
}

/// Swaps the clubs of the players `uid` and `other`, worked out again from the game as it is
/// now; each keeps his contract's terms. Logged as one change of `uid`'s club. Off the
/// window's thread, as a move.
#[tauri::command]
async fn swap_players(app: tauri::AppHandle, uid: u32, other: u32) -> Result<LoggedChange, Failure> {
    tauri::async_runtime::spawn_blocking(move || -> Result<LoggedChange, Failure> {
        let state = app.state::<AppState>();
        let mut guard = state.0.lock()?;
        let connection = guard.as_mut().ok_or_else(not_connected)?;
        let plan = connection.plan_swap(uid, other)?;
        let done = connection.session.apply_club_move(&plan)?;
        Ok(connection.log_move(done, MoveTerms::default(), Vec::new(), None))
    })
    .await?
}

/// Heals every current injury of the player `uid`, as the game does when he gets over them,
/// and logs it as one change of his `injuries` to none.
#[tauri::command]
fn heal_player(state: State<'_, AppState>, uid: u32) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let plan = connection.session.plan_heal(player)?;
    let done = connection.session.apply_heal(&plan)?;
    Ok(connection.log_heal(done, None))
}

/// Lifts every current ban of the player `uid`, as the game does once he has served them, and
/// logs it as one change of his `bans` to none.
#[tauri::command]
fn lift_bans(state: State<'_, AppState>, uid: u32) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let plan = connection.session.plan_lift_bans(player)?;
    let done = connection.session.apply_lift_bans(&plan)?;
    Ok(connection.log_lift(done, None))
}

/// Keeps the player `uid` from retiring: the retirement the game has planned for him is taken out of its plans, and he
/// gets the trait "Will play football as long as possible" in place of "Will retire at top". Logged as one change of
/// his `retirement` to none, and undone as one.
#[tauri::command]
fn keep_playing(state: State<'_, AppState>, uid: u32) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let plan = connection.session.plan_keep_playing(player)?;
    let done = connection.session.apply_retirement(&plan)?;
    Ok(connection.log_retirement(done))
}

/// Points the tie `index` of the player `uid` at the nation `nation` or the club `club` (by UID), and gives a
/// training the homegrown rule `rule`; what is left out stays. Logged and undone like any change.
#[tauri::command]
fn change_tie(
    state: State<'_, AppState>,
    uid: u32,
    index: usize,
    nation: Option<u32>,
    club: Option<u32>,
    rule: Option<u8>,
) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let nation = nation.map(|nation| connection.nation(nation)).transpose()?;
    let club = club.map(|club| connection.clubs.get(club).ok_or_else(|| not_found(Entity::Club, club))).transpose()?;
    let target = nation.as_ref().map(TieTarget::Nation).or(club.map(TieTarget::Club));
    let plan = connection.session.plan_relation_change(player, index, target, rule)?;
    let done = connection.session.apply_relation(&plan)?;
    Ok(connection.log_tie(done))
}

/// Takes the tie `index` of the player `uid` out of his list. Logged and undone like any change.
#[tauri::command]
fn remove_tie(state: State<'_, AppState>, uid: u32, index: usize) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let plan = connection.session.plan_relation_removal(player, index)?;
    let done = connection.session.apply_relation(&plan)?;
    Ok(connection.log_tie(done))
}

/// Gives the player `uid` a tie of `tie` to the nation or club with the UID `target`, under the homegrown rule
/// `rule` for a training: where his list has no room, it is grown (see `relations.rs`). Logged and undone like any
/// change.
#[tauri::command]
fn add_tie(
    state: State<'_, AppState>,
    uid: u32,
    tie: Tie,
    target: u32,
    rule: Option<u8>,
) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let nation;
    let target = if tie == Tie::TrainedAtClub {
        TieTarget::Club(connection.clubs.get(target).ok_or_else(|| not_found(Entity::Club, target))?)
    } else {
        nation = connection.nation(target)?;
        TieTarget::Nation(&nation)
    };
    let plan = connection.session.plan_relation_add(player, tie, target, rule)?;
    let done = connection.session.apply_relation(&plan)?;
    Ok(connection.log_tie(done))
}

/// Gives the clause `index` of the contract of the player `uid` the amount `amount` and the condition `condition`;
/// what is left out stays, and only what the clause has can be changed. Logged and undone like any change.
#[tauri::command]
fn change_clause(
    state: State<'_, AppState>,
    uid: u32,
    index: usize,
    amount: Option<u32>,
    condition: Option<u16>,
) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let plan = connection.session.plan_clause_change(player, index, amount, condition)?;
    let done = connection.session.apply_clause(&plan)?;
    Ok(connection.log_clause(done))
}

/// Takes the clause `index` out of the contract of the player `uid`. Logged and undone like any change.
#[tauri::command]
fn remove_clause(state: State<'_, AppState>, uid: u32, index: usize) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let plan = connection.session.plan_clause_removal(player, index)?;
    let done = connection.session.apply_clause(&plan)?;
    Ok(connection.log_clause(done))
}

/// The name of the stadium the club `club` plays at, with the names it can take in place. Only reads memory.
#[tauri::command]
fn stadium_name(state: State<'_, AppState>, club: u32) -> Result<StadiumName, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let found = connection.clubs.get(club).ok_or_else(|| not_found(Entity::Club, club))?;
    Ok(connection.session.stadium_name(found)?)
}

/// Renames the stadium the club `club` plays at to `name`: over the old name where it fits its block, in a string of the
/// editor's own otherwise (see `stadium_name.rs`). Logged and undone like any change. The game keeps no stadium names in
/// its saves, so the app remembers the name for this save and gives it again whenever the game gives the stadium its
/// own back, for as long as it is open (see `Connection::hold_stadiums`).
#[tauri::command]
fn rename_stadium(
    state: State<'_, AppState>,
    file: State<'_, FrozenFile>,
    club: u32,
    name: String,
) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let found = connection.clubs.get(club).ok_or_else(|| not_found(Entity::Club, club))?;
    let plan = connection.session.plan_stadium_rename(found, &name)?;
    let done = connection.session.apply_stadium_rename(&plan)?;
    let (from, to) = (done.from.clone(), done.to.clone());
    let logged = connection.log_stadium(done);
    connection.hold_stadium_name(file.0.as_deref(), club, &to, &from);
    Ok(logged)
}

/// Gives the contract of the player `uid`, which has none, a release clause of `amount` pounds, where its list has
/// room. Logged and undone like any change.
#[tauri::command]
fn add_release_clause(state: State<'_, AppState>, uid: u32, amount: u32) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let plan = connection.session.plan_release_clause(player, amount)?;
    let done = connection.session.apply_clause(&plan)?;
    Ok(connection.log_clause(done))
}

/// The homegrown rules `change_tie` and `add_tie` write, by the game's code.
#[tauri::command]
fn homegrown_rules() -> Vec<u8> {
    HOMEGROWN_RULES.to_vec()
}

/// What the Scouting tab starts from: the human manager's club, its money, its senior squad line by line with the
/// players a scout would let go, and the positions and roles a recommendation can be asked for.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScoutingOverview {
    club: ClubSummary,
    /// Pounds; a week for the wages.
    transfer_budget: Option<i64>,
    wage_budget: Option<i64>,
    /// What the club can still add to its wage bill a week.
    wage_room: Option<i64>,
    report: SquadReport,
    positions: &'static [ScoutPosition],
    roles: &'static [Role],
}

/// The human manager's club for scouting: the first club a human manager runs.
fn scouting_club(connection: &Connection) -> Result<&ClubSummary, Failure> {
    let uid = connection
        .human_clubs
        .first()
        .copied()
        .ok_or_else(|| Failure::new("scout.noClub", "Your manager has no club to scout for"))?;
    connection.clubs.get(uid).ok_or_else(|| not_found(Entity::Club, uid))
}

/// The club as a buyer: its transfer budget and wage budget, pounds, when its finances can be read.
fn scouting_buyer<'a>(connection: &'a Connection, club: &'a ClubSummary) -> Result<Buyer<'a>, Failure> {
    let finances = connection.session.club_details(club)?.and_then(|details| details.finances);
    Ok(Buyer {
        club,
        transfer_budget: finances.map(|f| i64::from(f.transfer_budget)),
        wage_budget: finances.map(|f| i64::from(f.wage_budget)),
    })
}

/// The Scouting tab's overview, read now. Only reads memory, in well under a second.
#[tauri::command]
fn scouting_overview(state: State<'_, AppState>) -> Result<ScoutingOverview, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let club = scouting_club(connection)?;
    let buyer = scouting_buyer(connection, club)?;
    let report = connection.session.squad_report(club, &connection.players)?;
    Ok(ScoutingOverview {
        club: club.clone(),
        transfer_budget: buyer.transfer_budget,
        wage_budget: buyer.wage_budget,
        wage_room: connection.session.wage_room(&buyer, &connection.players),
        report,
        positions: SCOUT_POSITIONS,
        roles: ROLES,
    })
}

/// Players a scout would recommend for the position `request` describes, for the human manager's club. Only reads
/// memory.
#[tauri::command]
fn scouting_suggest(state: State<'_, AppState>, request: ScoutRequest) -> Result<Scouted, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let club = scouting_club(connection)?;
    let buyer = scouting_buyer(connection, club)?;
    Ok(connection.session.scout(&request, &buyer, &connection.players, &connection.clubs, &connection.human_clubs)?)
}

/// How a player suits every role, and what he would best train for one: the role asked for, or the one in possession
/// that suits him best.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlayerRoles {
    fits: Vec<RoleFit>,
    /// The role the training advice is for, and the advice.
    training_role: Option<RoleKey>,
    training: Vec<TrainingFocus>,
}

/// A role by its key and phase.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RoleKey {
    key: String,
    phase: Phase,
}

/// The roles of the player `uid` and what he would best train for `role`. Works on the player list; reads nothing.
#[tauri::command]
fn player_roles(state: State<'_, AppState>, uid: u32, role: Option<RoleKey>) -> Result<PlayerRoles, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let fits = fmlibre_core::role_fits(player);
    let chosen = match &role {
        Some(asked) => fmlibre_core::role(asked.phase, &asked.key),
        None => fmlibre_core::best_role(player, Phase::InPossession)
            .and_then(|best| fmlibre_core::role(best.phase, best.key)),
    };
    Ok(PlayerRoles {
        fits,
        training_role: chosen.map(|role| RoleKey { key: role.key.to_owned(), phase: role.phase }),
        training: chosen.map(|role| fmlibre_core::training_focus(player, role)).unwrap_or_default(),
    })
}

/// One of the manager's tactics as the Line-up section uses it.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnTactic {
    style: Option<String>,
    copies: usize,
    slots: Vec<SlotRoles>,
    /// Slots with a role whose mask the editor does not know yet, in either phase.
    unknown_roles: usize,
}

/// The tactics the human manager has picked a team for, the one in use first. Searches the game's memory for them,
/// which takes a few seconds; only reads.
#[tauri::command]
async fn scouting_tactics(app: tauri::AppHandle) -> Result<Vec<OwnTactic>, Failure> {
    tauri::async_runtime::spawn_blocking(move || -> Result<Vec<OwnTactic>, Failure> {
        let state = app.state::<AppState>();
        let guard = state.0.lock()?;
        let connection = guard.as_ref().ok_or_else(not_connected)?;
        let club = scouting_club(connection)?;
        let tactics = connection.session.club_tactics(club, &connection.players)?;
        Ok(tactics
            .iter()
            .map(|tactic| OwnTactic {
                style: tactic.style.clone(),
                copies: tactic.copies,
                slots: fmlibre_core::slot_roles(tactic),
                unknown_roles: tactic
                    .slots
                    .iter()
                    .filter(|slot| slot.in_possession.is_none() || slot.out_of_possession.is_none())
                    .count(),
            })
            .collect())
    })
    .await?
}

/// The best eleven and second eleven the human manager's senior squad fields in the slots `slots` names. Works on the
/// player list and the squad's list; only reads.
#[tauri::command]
fn scouting_lineup(
    state: State<'_, AppState>,
    slots: Vec<SlotRoles>,
    weight: Option<f32>,
    choice: Option<SquadChoice>,
) -> Result<Lineup, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let club = scouting_club(connection)?;
    let squad = connection.session.lineup_squad(club, &connection.players, choice.unwrap_or_default())?;
    let weight = weight.unwrap_or(fmlibre_core::IN_POSSESSION_WEIGHT);
    Ok(fmlibre_core::best_lineup(&slots, &squad, weight))
}

/// One of the manager's tactics to compare: its style and slots.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct OwnSlots {
    style: Option<String>,
    slots: Vec<SlotRoles>,
}

/// How well the human manager's senior squad fills each of his tactics `own` and the editor's reference formations,
/// the best covered first. Only reads.
#[tauri::command]
fn scouting_compare(
    state: State<'_, AppState>,
    own: Vec<OwnSlots>,
    weight: Option<f32>,
    choice: Option<SquadChoice>,
) -> Result<Vec<TacticRank>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let club = scouting_club(connection)?;
    let squad = connection.session.lineup_squad(club, &connection.players, choice.unwrap_or_default())?;
    let own: Vec<(Option<String>, Vec<SlotRoles>)> = own.into_iter().map(|t| (t.style, t.slots)).collect();
    let weight = weight.unwrap_or(fmlibre_core::IN_POSSESSION_WEIGHT);
    Ok(fmlibre_core::compare_tactics(&own, &squad, weight))
}

/// The teams of the club `uid`, the senior team first, with their players: each one's list
/// row and the live values a squad screen shows, read now.
#[tauri::command]
fn club_squads(state: State<'_, AppState>, uid: u32) -> Result<Vec<TeamView>, Failure> {
    let guard = state.0.lock()?;
    let connection = guard.as_ref().ok_or_else(not_connected)?;
    let club = connection.clubs.get(uid).ok_or_else(|| not_found(Entity::Club, uid))?;
    let teams = connection.session.club_teams(club, &connection.players)?;
    Ok(teams
        .into_iter()
        .map(|team| TeamView {
            index: team.index,
            kind: team.kind,
            age_limit: team.age_limit,
            captain: team.captain,
            vice_captain: team.vice_captain,
            players: team
                .players
                .into_iter()
                .filter_map(|member| {
                    let player = connection.players.get(member.uid)?.clone();
                    Some(SquadRow {
                        player,
                        plays_here: member.plays_here,
                        loan: member.loan,
                        condition: member.condition,
                        match_sharpness: member.match_sharpness,
                        jadedness: member.jadedness,
                        morale: member.morale,
                        injuries: member.injuries,
                        bans: member.bans,
                        attributes_frozen: connection.frozen.attributes.contains_key(&member.uid),
                        fitness_frozen: connection.frozen.fitness.contains_key(&member.uid),
                        positions_frozen: connection.frozen.positions.contains_key(&member.uid),
                    })
                })
                .collect(),
        })
        .collect())
}

/// Makes the player `uid` the captain or vice-captain of the team `team` of the club `club`;
/// he must play for that team. When he held the other role, the two captains swap.
#[tauri::command]
fn set_captain(
    state: State<'_, AppState>,
    club: u32,
    team: usize,
    role: CaptainRole,
    uid: u32,
) -> Result<LoggedChange, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let summary = connection.clubs.get(club).ok_or_else(|| not_found(Entity::Club, club))?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let plan = connection.session.plan_captain(summary, team, role, player, &connection.players)?;
    if plan.writes() == 0 {
        return Err(Failure::new("captain.unchanged", "The player holds that role already."));
    }
    let done = connection.session.apply_captain(&plan)?;
    Ok(connection.log_captain(done))
}

/// Does `action` to every player of the team `team` of the club `club`, read now: those out
/// on loan too. The changes are logged as one batch, which `undo_batch` undoes.
#[tauri::command]
fn team_action(state: State<'_, AppState>, club: u32, team: usize, action: TeamAction) -> Result<MassReport, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let summary = connection.clubs.get(club).ok_or_else(|| not_found(Entity::Club, club))?;
    let members = connection
        .session
        .club_teams(summary, &connection.players)?
        .into_iter()
        .find(|found| found.index == team)
        .ok_or(MoveError::NoTeam { index: team })?
        .players;
    // Healing and lifting bans change the players' records: refused once, not once for every player.
    if matches!(action, TeamAction::Heal | TeamAction::LiftBans)
        && let Some(lock) = connection.session.structure_lock()
    {
        return Err(MoveError::Locked(lock).into());
    }
    let batch = connection.fresh_id();
    let values: &[(&str, i64)] = match action {
        TeamAction::Heal => {
            let mut report = MassReport { batch, applied: 0, failed: Vec::new() };
            for member in members.iter().filter(|member| member.injuries > 0) {
                let Some(player) = connection.players.get(member.uid) else {
                    continue;
                };
                let name = player.name.clone();
                let healed = connection.session.plan_heal(player).and_then(|plan| connection.session.apply_heal(&plan));
                match healed {
                    Ok(done) => {
                        connection.log_heal(done, Some(batch));
                        report.applied += 1;
                    }
                    Err(err) => report.failed.push(MassFailure {
                        uid: member.uid,
                        name,
                        field: "injuries".to_owned(),
                        error: err.into(),
                    }),
                }
            }
            return Ok(report);
        }
        TeamAction::LiftBans => {
            let mut report = MassReport { batch, applied: 0, failed: Vec::new() };
            for member in members.iter().filter(|member| member.bans > 0) {
                let Some(player) = connection.players.get(member.uid) else {
                    continue;
                };
                let name = player.name.clone();
                let lifted = connection
                    .session
                    .plan_lift_bans(player)
                    .and_then(|plan| connection.session.apply_lift_bans(&plan));
                match lifted {
                    Ok(done) => {
                        connection.log_lift(done, Some(batch));
                        report.applied += 1;
                    }
                    Err(err) => report.failed.push(MassFailure {
                        uid: member.uid,
                        name,
                        field: "bans".to_owned(),
                        error: err.into(),
                    }),
                }
            }
            return Ok(report);
        }
        // Morale at its best, and the reasons to be unhappy gone, as FMRTE's Inspire does.
        TeamAction::Inspire => &[("morale", 20), ("contract.unhappiness", 0)],
        // Rested as the game rests a player: full energy and sharpness, and jadedness at its least.
        TeamAction::Refresh => &[("condition", 10_000), ("match_sharpness", 10_000), ("jadedness", -500)],
        TeamAction::MaxAttributes => &[],
    };
    let targets: Vec<(Target, String)> = members
        .iter()
        .filter_map(|member| connection.players.get(member.uid))
        .map(|player| (player.target(), player.name.clone()))
        .collect();
    let operations = if action == TeamAction::MaxAttributes {
        connection.best_attributes(Entity::Player)
    } else {
        values
            .iter()
            .map(|&(key, value)| Ok((connection.session.field(Entity::Player, key)?, Operation::Set { value })))
            .collect::<Result<Vec<_>, EditError>>()?
    };
    let plan = connection.session.plan_mass_edit(&targets, &operations)?;
    Ok(connection.write_planned(Entity::Player, plan.planned, batch))
}

/// Sets every attribute of the player `uid` to its best, as Max attributes does for a team: 20, and 1 for injury
/// proneness and dirtiness. The changes are logged as one batch, which `undo_batch` undoes.
#[tauri::command]
fn max_attributes(state: State<'_, AppState>, uid: u32) -> Result<MassReport, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let player = connection.players.get(uid).ok_or_else(|| not_found(Entity::Player, uid))?;
    let targets = [(player.target(), player.name.clone())];
    let plan = connection.session.plan_mass_edit(&targets, &connection.best_attributes(Entity::Player))?;
    let batch = connection.fresh_id();
    let mut report = connection.write_planned(Entity::Player, plan.planned, batch);
    // An attribute that could not be read is said, not passed over: it is one player, not a team.
    report.failed.extend(plan.skipped.into_iter().map(|skipped| MassFailure {
        uid: skipped.uid,
        name: skipped.name,
        field: skipped.field,
        error: Failure { code: skipped.code, params: skipped.params, message: skipped.reason },
    }));
    Ok(report)
}

/// Sets every attribute of the member of staff `id` to its best (20), as `max_attributes` does for a player. The
/// changes are logged as one batch, which `undo_batch` undoes.
#[tauri::command]
fn max_staff_attributes(state: State<'_, AppState>, id: u32) -> Result<MassReport, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let member = connection.staff.get(id).ok_or_else(|| not_found(Entity::Staff, id))?;
    let targets = [(member.target(), member.name.clone())];
    let plan = connection.session.plan_mass_edit(&targets, &connection.best_attributes(Entity::Staff))?;
    let batch = connection.fresh_id();
    let mut report = connection.write_planned(Entity::Staff, plan.planned, batch);
    // An attribute that could not be read is said, not passed over: it is one member of staff, not a team.
    report.failed.extend(plan.skipped.into_iter().map(|skipped| MassFailure {
        uid: skipped.uid,
        name: skipped.name,
        field: skipped.field,
        error: Failure { code: skipped.code, params: skipped.params, message: skipped.reason },
    }));
    Ok(report)
}

/// Works out a mass edit: `operations` applied to every player, member of staff or club
/// that `query` and the entity's filter select, from the values the game holds now.
/// Nothing is written; the plan waits for `apply_mass_edit` with the preview's id.
#[tauri::command]
fn plan_mass_edit(
    state: State<'_, AppState>,
    entity: Entity,
    query: String,
    filters: Filters,
    operations: Vec<MassOperation>,
) -> Result<MassPreview, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    if operations.is_empty() {
        return Err(Failure::new("mass.noOperations", "Choose at least one field to change."));
    }
    let targets = connection.select(entity, &query, filters);
    if targets.len() > MASS_LIMIT {
        let message = format!(
            "{} match. Narrow the search or the filters to {MASS_LIMIT} or fewer for a mass edit.",
            targets.len()
        );
        return Err(Failure::new("mass.tooMany", message).with("count", targets.len()).with("limit", MASS_LIMIT));
    }
    let operations = operations
        .into_iter()
        .map(|op| Ok((connection.session.field(entity, &op.field)?, op.operation)))
        .collect::<Result<Vec<_>, EditError>>()?;
    let plan = connection.session.plan_mass_edit(&targets, &operations)?;
    let id = connection.fresh_id();
    let preview = MassPreview {
        id,
        targets: targets.len(),
        unchanged: plan.unchanged,
        changes: plan.planned.len(),
        rows: plan.planned.iter().take(PREVIEW_ROWS).cloned().collect(),
        skipped_count: plan.skipped.len(),
        skipped: plan.skipped.into_iter().take(PREVIEW_ROWS).collect(),
    };
    connection.mass = Some(PendingMass { id, entity, planned: plan.planned });
    Ok(preview)
}

/// Writes the mass edit previewed as `id`, exactly as it was shown: each change only while
/// the game still holds the value it was planned from. The changes are logged as one batch.
#[tauri::command]
fn apply_mass_edit(state: State<'_, AppState>, id: u32) -> Result<MassReport, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let pending = match connection.mass.take() {
        Some(pending) if pending.id == id => pending,
        other => {
            connection.mass = other;
            return Err(Failure::new("mass.outOfDate", "This preview is out of date. Preview the mass edit again."));
        }
    };
    let batch = connection.fresh_id();
    Ok(connection.write_planned(pending.entity, pending.planned, batch))
}

/// Undoes every change of the mass edit `batch` that is not undone yet, newest first.
/// Changes the game has changed since are left as they are and reported.
#[tauri::command]
fn undo_batch(state: State<'_, AppState>, batch: u32) -> Result<BatchUndo, Failure> {
    let mut guard = state.0.lock()?;
    let connection = guard.as_mut().ok_or_else(not_connected)?;
    let ids: Vec<usize> = connection
        .log
        .iter()
        .rev()
        .filter(|logged| logged.batch == Some(batch) && logged.undone_at.is_none())
        .map(|logged| logged.id)
        .collect();
    let mut report = BatchUndo { undone: 0, failed: Vec::new() };
    for id in ids {
        match connection.undo(id) {
            Ok(_) => report.undone += 1,
            Err(error) => report.failed.push(BatchUndoFailure { id, error }),
        }
    }
    Ok(report)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Opens the page of a new release in the browser (see app/src/update.ts).
        .plugin(tauri_plugin_opener::init())
        // Downloads a new version, checks its signature against the key in tauri.conf.json and installs it: the
        // installer on Windows, the app in place of this one on macOS.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState::default())
        .manage(Graphics::default())
        .setup(|app| {
            // Reading the packs' config files takes a moment: do it beside the window. FM keeps its user data
            // in the documents folder on Windows and in Application Support on macOS, or somewhere else, which
            // GRAPHICS_FOLDER can name.
            #[cfg(target_os = "macos")]
            let user_data = app.path().data_dir();
            #[cfg(not(target_os = "macos"))]
            let user_data = app.path().document_dir();
            let root = match std::env::var_os(GRAPHICS_FOLDER) {
                Some(folder) => Some(PathBuf::from(folder)),
                None => user_data.ok().map(|folder| GraphicsIndex::default_root(&folder, 27)),
            };
            let data = std::env::var_os(DATA_FOLDER).map(PathBuf::from).or_else(|| app.path().app_data_dir().ok());
            app.manage(FrozenFile(data.map(|folder| folder.join(FROZEN_FILE))));
            let exports = std::env::var_os(EXPORTS_FOLDER)
                .map(PathBuf::from)
                .or_else(|| app.path().document_dir().ok().map(|folder| folder.join("FMLibreEditor").join("Exports")));
            app.manage(ExportsFolder(exports));
            // macOS: after an update, the game is to load the bridge that came with this version.
            bridge::refresh(app.handle());
            // Frozen money, attributes, energy and sharpness: every little while, what the game took is put back.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(FREEZE_EVERY);
                    let state = handle.state::<AppState>();
                    if let Ok(mut guard) = state.0.lock()
                        && let Some(connection) = guard.as_mut()
                        && !connection.frozen.is_empty()
                    {
                        connection.hold_frozen();
                    }
                }
            });
            let graphics = app.state::<Graphics>().0.clone();
            std::thread::spawn(move || {
                let index = root.map_or_else(GraphicsIndex::default, |root| GraphicsIndex::scan(&root));
                if let Ok(mut slot) = graphics.lock() {
                    *slot = Some(Arc::new(index));
                }
            });
            Ok(())
        })
        .register_uri_scheme_protocol("fmgfx", |ctx, request| {
            let graphics = ctx.app_handle().state::<Graphics>();
            picture_response(&graphics, request.uri().path())
        })
        .invoke_handler(tauri::generate_handler![
            detect_game,
            connect,
            current_connection,
            allow_editing,
            reload,
            search_players,
            search_staff,
            search_clubs,
            export_players,
            open_export,
            show_export,
            player_details,
            staff_details,
            club_details,
            list_nations,
            freeze_money,
            frozen_clubs,
            freeze_attributes,
            frozen_players,
            freeze_staff_attributes,
            frozen_staff,
            max_staff_attributes,
            freeze_fitness,
            frozen_fitness,
            freeze_positions,
            frozen_positions,
            freeze_team,
            edit_fields,
            read_values,
            apply_edits,
            recall_loan,
            change_log,
            undo_change,
            plan_mass_edit,
            apply_mass_edit,
            undo_batch,
            plan_club_move,
            room_makers,
            move_player,
            plan_loan_permanent,
            make_loan_permanent,
            plan_release,
            release_player,
            plan_club_swap,
            swap_players,
            plan_staff_move,
            move_staff,
            change_staff_job,
            staff_jobs,
            heal_player,
            lift_bans,
            keep_playing,
            change_tie,
            remove_tie,
            add_tie,
            change_clause,
            remove_clause,
            add_release_clause,
            stadium_name,
            rename_stadium,
            homegrown_rules,
            club_squads,
            scouting_overview,
            scouting_suggest,
            scouting_tactics,
            scouting_lineup,
            scouting_compare,
            player_roles,
            set_captain,
            team_action,
            max_attributes,
            graphics_info,
            can_self_update,
            restart_app,
            bridge::bridge_status,
            bridge::set_up_bridge,
            bridge::remove_bridge
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frozen_files_of_earlier_versions_are_read() {
        // As 0.4.2 wrote it, before energy and match sharpness could be frozen.
        let file = r#"{ "saves": { "Steam:1000": { "players": [28122642], "clubs": [602] } } }"#;
        let remembered: Remembered = serde_json::from_str(file).expect("an earlier file");
        let save = &remembered.saves["Steam:1000"];
        assert!(save.players.contains(&28122642) && save.clubs.contains(&602) && save.fitness.is_empty());
    }

    #[test]
    fn a_stadium_keeps_the_name_the_editor_gave_it_until_it_has_its_own_back() {
        let held = |name: &str, original: &str| HeldName { name: name.to_owned(), original: original.to_owned() };
        // Renamed, renamed again, then two undos.
        let first = HeldName::after(None, "North Bank", "Emirates Stadium");
        assert_eq!(first, Some(held("North Bank", "Emirates Stadium")));
        let second = HeldName::after(first.as_ref(), "Highbury", "North Bank");
        assert_eq!(second, Some(held("Highbury", "Emirates Stadium")));
        let undone = HeldName::after(second.as_ref(), "North Bank", "Highbury");
        assert_eq!(undone, Some(held("North Bank", "Emirates Stadium")));
        assert_eq!(HeldName::after(undone.as_ref(), "Emirates Stadium", "North Bank"), None);
        // Renamed back by hand, and that undone: the editor's name is held again.
        assert_eq!(HeldName::after(first.as_ref(), "Emirates Stadium", "North Bank"), None);
        assert_eq!(HeldName::after(None, "North Bank", "Emirates Stadium"), first);
    }

    #[test]
    fn stadium_names_are_remembered_beside_what_is_frozen() {
        // As 0.4.4 wrote it, before stadium names were remembered.
        let file = r#"{ "saves": { "Steam:1000": { "players": [], "staff": [], "clubs": [602], "fitness": [] } } }"#;
        let mut remembered: Remembered = serde_json::from_str(file).expect("an earlier file");
        let save = remembered.saves.get_mut("Steam:1000").expect("the save");
        assert!(save.stadiums.is_empty());
        save.clubs.clear();
        assert!(save.is_empty());
        let name = HeldName { name: "North Bank".to_owned(), original: "Emirates Stadium".to_owned() };
        save.stadiums.insert(602, name.clone());
        assert!(!save.is_empty());
        let written = serde_json::to_string(&remembered).expect("written");
        let read: Remembered = serde_json::from_str(&written).expect("read back");
        assert_eq!(read.saves["Steam:1000"].stadiums.get(&602), Some(&name));
    }

    #[test]
    fn frozen_files_without_staff_are_read() {
        // As 0.4.3 wrote it, before the attributes of staff could be frozen.
        let file = r#"{ "saves": { "Steam:1000": { "players": [1], "clubs": [], "fitness": [] } } }"#;
        let remembered: Remembered = serde_json::from_str(file).expect("an earlier file");
        assert!(remembered.saves["Steam:1000"].staff.is_empty());
    }

    #[test]
    fn frozen_files_without_positions_are_read() {
        // As 0.4.3 wrote it, before positions could be frozen.
        let file = r#"{ "saves": { "Steam:1000": { "players": [1], "clubs": [], "fitness": [], "staff": [] } } }"#;
        let remembered: Remembered = serde_json::from_str(file).expect("an earlier file");
        assert!(remembered.saves["Steam:1000"].positions.is_empty());
    }

    #[test]
    fn remembered_staff_keep_a_save_from_being_empty() {
        let mut save = RememberedSave::default();
        assert!(save.is_empty());
        save.staff.insert(5);
        assert!(!save.is_empty());
        let mut frozen = Frozen::default();
        assert!(frozen.is_empty());
        frozen.staff.insert(5, BTreeMap::new());
        assert!(!frozen.is_empty());
    }

    #[test]
    fn each_kind_of_freeze_is_remembered_apart() {
        let mut save = RememberedSave::default();
        save.of(FreezeKind::Fitness).insert(7);
        assert!(save.fitness.contains(&7) && save.players.is_empty() && !save.is_empty());
        save.of(FreezeKind::Attributes).insert(8);
        save.of(FreezeKind::Positions).insert(9);
        let written = serde_json::to_string(&save).expect("written");
        let read: RememberedSave = serde_json::from_str(&written).expect("read back");
        assert!(read.players.contains(&8) && read.fitness.contains(&7) && read.positions.contains(&9));
    }
}
