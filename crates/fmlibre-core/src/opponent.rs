//! A club's next match, and its squad against the eleven the opponent is likely to field.
//!
//! The calendar is the game's own ([`crate::FixtureLayout`]): the matches still to play, found by their class. The
//! opponent's eleven is the one the match engine holds for it (see `selection.rs`), with the roles of its tactic,
//! when the game has prepared one; the editor has not checked that the club then fields it. Without one, the editor
//! picks the eleven of the opponent's squad that fits one of its formations best, as it does for any squad (see
//! `lineup.rs`).
//!
//! The roles say the line of a place, not its position, which the game keeps elsewhere, and the game offers some
//! roles in two lines (a wing-back's at full-back, an attacking midfielder's in central midfield). A place is taken
//! to be its line's own position when the player who fills it plays that well, or else the position of the line he
//! plays best; with no role known, the position he plays best of all.
//!
//! The two sides are compared in five zones ([`ZONES`]): the two flanks, each side's left against the other's right,
//! the centre-backs against the other's strikers, the central midfields, and the strikers against the other's
//! centre-backs. For each, how many players each side has there and what their places' scores add up to. It says
//! where a formation puts more players, or better ones, than the opponent has, not how the match will go.
//!
//! The club's own side is measured twice: for each tactic its manager keeps for the team (a human manager's up to
//! three, read where the game keeps them), and for each of the editor's formations. A tactic the manager plays also
//! has the eleven he has picked; every tactic and formation has the best eleven the squad has for it.
//!
//! Everything here only reads memory.

use serde::Serialize;

use crate::clubs::{ClubIndex, ClubSummary};
use crate::date::FmDate;
use crate::details::POSITIONS;
use crate::lineup::{
    ABILITY_WEIGHT, Candidate, FORMATIONS, Formation, LeftOut, Lineup, LineupSlot, Squad, empty, lineups, placed,
};
use crate::players::{PlayerIndex, PlayerSummary};
use crate::rtti;
use crate::scouting::{ClubTactic, Line, Phase, ScoutError, role};
use crate::session::Session;

/// A match still to play.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Fixture {
    pub date: FmDate,
    /// The UIDs of the two clubs.
    pub home: u32,
    pub away: u32,
}

/// The zones two elevens are compared in, as a club sees its own: its left flank (full-back, wing-back, wide
/// midfielder and winger), its right, its centre-backs, its central midfield (defensive, central and attacking) and
/// its strikers.
pub const ZONES: [&str; 5] = ["left", "right", "back", "midfield", "front"];

/// One of the [`ZONES`] as an eleven fills it.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Zone {
    /// How many players of the eleven play there.
    pub men: usize,
    /// What their places' scores add up to.
    pub strength: f32,
}

/// One place of an eleven.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ElevenSlot {
    #[serde(flatten)]
    pub place: LineupSlot,
    /// The roles the game holds for the place, where the editor knows their masks.
    pub in_possession: Option<&'static str>,
    pub out_of_possession: Option<&'static str>,
    /// The player's current injuries and bans: with either, he is unlikely to play.
    pub injuries: usize,
    pub bans: usize,
}

/// The eleven a club is likely to field.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Eleven {
    /// How many of the game's copies hold it; 0 for an eleven the editor picked, the game holding none.
    pub copies: usize,
    /// The style the tactic was made from, as the game codes it; none for a club the game runs.
    pub style: Option<String>,
    /// The formation: one of [`FORMATIONS`] when the positions are its own, or else the players in each of the five
    /// lines from the back (defence, defensive midfield, midfield, attacking midfield, attack), e.g. `4-1-3-0-2`.
    pub shape: String,
    pub slots: Vec<ElevenSlot>,
    /// The mean of its places' scores, 0–100.
    pub score: f32,
    /// How it fills each of the [`ZONES`].
    pub zones: [Zone; 5],
}

/// One of the editor's formations against the opponent's eleven.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Matchup {
    pub lineup: Lineup,
    /// How its eleven fills each of the [`ZONES`]; each meets the same entry of [`NextMatch::facing`].
    pub zones: [Zone; 5],
}

/// One of the tactics the club's manager keeps for the team, against the opponent's eleven.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeptTactic {
    /// Whether it is the one he plays.
    pub in_use: bool,
    /// The style it was made from, as the game codes it.
    pub style: Option<String>,
    /// Its formation, as [`Eleven::shape`].
    pub shape: String,
    /// The eleven he has picked, in its places: for the tactic he plays. The game keeps one eleven for all his
    /// tactics, and the editor has not seen where it puts each player when he changes to another.
    pub picked: Option<Eleven>,
    /// The club's best eleven for its positions, the cover behind it, and how the eleven fills the zones.
    pub best: Matchup,
}

/// A club's next match and how its squad meets the opponent's eleven.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NextMatch {
    /// The club's matches still to play, the next first.
    pub fixtures: Vec<Fixture>,
    pub opponent: ClubSummary,
    /// Whether the club plays at home.
    pub home: bool,
    /// The opponent's eleven, and how many other elevens the game holds for it.
    pub eleven: Eleven,
    pub other_elevens: usize,
    /// How many players of the opponent's squad can play, and its injured and banned ones. A club of a league the
    /// save does not run has few players in it, or none.
    pub opponent_available: usize,
    pub absent: Vec<LeftOut>,
    /// The opponent's zones in the order the club's meet them: its right, its left, its front, its midfield and its
    /// back.
    pub facing: [Zone; 5],
    /// The tactics the club's manager keeps for the team, in the game's order: up to three for a human manager, the
    /// one the game holds for a club it runs, none when it holds none.
    pub tactics: Vec<KeptTactic>,
    /// How many players the club's elevens were picked from, and those left out.
    pub available: usize,
    pub left_out: Vec<LeftOut>,
    /// The editor's formations with the club's best eleven for each, the one that suits the squad most first.
    pub matchups: Vec<Matchup>,
}

/// What the elevens picked for a manager's tactics are called, in the game's order.
const KEPT: [&str; 4] = ["tactic 1", "tactic 2", "tactic 3", "tactic"];

/// The positions a place can be when its roles say nothing, in the order ties go: from the back, the middle first.
const ORDER: [&str; 14] = ["gk", "dc", "dr", "dl", "wbr", "wbl", "dm", "mc", "mr", "ml", "amc", "amr", "aml", "st"];

/// The positions of a line that has a right and a left.
const SIDES: [(&str, &str); 4] = [("dr", "dl"), ("wbr", "wbl"), ("mr", "ml"), ("amr", "aml")];

/// The lines of a formation from the back, as the game's tactics screen stacks them.
const LINES: [&[&str]; 5] =
    [&["dr", "dc", "dl"], &["wbr", "dm", "wbl"], &["mr", "mc", "ml"], &["amr", "amc", "aml"], &["st"]];

fn rating(player: &PlayerSummary, position: &str) -> u8 {
    POSITIONS.iter().position(|&key| key == position).map_or(0, |index| player.position_ratings[index])
}

/// The zone a position is in, as an index into [`ZONES`]; none for the goalkeeper.
fn zone_of(position: &str) -> Option<usize> {
    match position {
        "dl" | "wbl" | "ml" | "aml" => Some(0),
        "dr" | "wbr" | "mr" | "amr" => Some(1),
        "dc" | "sw" => Some(2),
        "dm" | "mc" | "amc" => Some(3),
        "st" => Some(4),
        _ => None,
    }
}

/// How an eleven fills each of the [`ZONES`].
fn zones<'a>(slots: impl IntoIterator<Item = &'a LineupSlot>) -> [Zone; 5] {
    let mut out = [Zone::default(); 5];
    for slot in slots.into_iter().filter(|slot| slot.fitting.is_some()) {
        if let Some(zone) = zone_of(slot.position) {
            out[zone].men += 1;
            out[zone].strength += f32::from(slot.score);
        }
    }
    out
}

/// A player plays a position well enough to be taken to play it when a role says he may.
const PLAYS_IT: u8 = 15;

/// The position each place of a tactic most likely is. With a role known: its line's own position on the side its
/// player plays best, when he plays that well, or else the position of the line he plays best. With none: the
/// position he plays best of all.
///
/// Three things the roles leave open are settled as formations usually are. A wing-back's role with the ball behind
/// fewer than three centre-backs is a full-back's place, unless the role without the ball is a wing-back's too. Two
/// places on one side of a line with nobody on the other are a right and a left: the player who plays the other
/// side better takes it. And a wide midfielder or winger with nobody on the other side is matched by the central
/// place without a role whose player plays that side.
fn positions(tactic: &ClubTactic, players: &PlayerIndex) -> [&'static str; 11] {
    let player = |slot: usize| tactic.slots.get(slot).and_then(|place| place.player).and_then(|uid| players.get(uid));
    let centre_backs = tactic.slots.iter().filter(|place| place.line == Some(Line::CentreBack)).count();
    let mut out = ["mc"; 11];
    for (slot, place) in tactic.slots.iter().enumerate().take(11) {
        let without = place.out_of_possession.and_then(|key| role(Phase::OutOfPossession, key)).map(|role| role.line);
        let line = match place.line {
            Some(Line::WingBack) if centre_backs < 3 && without != Some(Line::WingBack) => Some(Line::FullBack),
            line => line,
        };
        let among: Vec<&'static str> = match line {
            Some(line) => line.positions(place.side).iter().map(|&index| POSITIONS[index]).collect(),
            // The first place is the goalkeeper's.
            None if slot == 0 => ORDER.to_vec(),
            None => ORDER[1..].to_vec(),
        };
        out[slot] = match player(slot) {
            Some(player) if line.is_some() && rating(player, among[0]) >= PLAYS_IT => among[0],
            Some(player) => {
                let mut best = among[0];
                for position in among {
                    if rating(player, position) > rating(player, best) {
                        best = position;
                    }
                }
                best
            }
            None => place.position.unwrap_or(among[0]),
        };
    }
    for (right, left) in SIDES {
        for (crowded, free) in [(right, left), (left, right)] {
            let there: Vec<usize> = (0..11).filter(|&slot| out[slot] == crowded).collect();
            if there.len() < 2 || out.contains(&free) {
                continue;
            }
            let other_side = |&slot: &usize| player(slot).map_or(0, |player| rating(player, free));
            // Of two who play it as well, the later place moves.
            if let Some(&slot) = there.iter().max_by_key(|slot| other_side(slot)) {
                out[slot] = free;
            }
        }
    }
    for (right, left) in [("mr", "ml"), ("amr", "aml")] {
        for (taken, free) in [(right, left), (left, right)] {
            if !out.contains(&taken) || out.contains(&free) {
                continue;
            }
            let plays = |slot: usize| player(slot).map_or(0, |player| rating(player, free));
            let central = |&slot: &usize| {
                tactic.slots.get(slot).is_some_and(|place| place.line.is_none()) && matches!(out[slot], "mc" | "amc")
            };
            let best = (1..11).filter(central).filter(|&slot| plays(slot) >= PLAYS_IT).max_by_key(|&slot| plays(slot));
            if let Some(slot) = best {
                out[slot] = free;
            }
        }
    }
    out
}

/// The name of the formation with these positions: one of [`FORMATIONS`] when it has the same, or else the players
/// in each of the five [`LINES`] from the back, none left out, so that it is not taken for one of them.
fn shape(positions: &[&'static str]) -> String {
    let sorted = |positions: &[&'static str]| {
        let mut sorted = positions.to_vec();
        sorted.sort_unstable();
        sorted
    };
    let ours = sorted(positions);
    if let Some(formation) = FORMATIONS.iter().find(|formation| sorted(&formation.positions) == ours) {
        return formation.key.to_owned();
    }
    let lines = LINES.map(|line| positions.iter().filter(|position| line.contains(position)).count());
    lines.iter().map(usize::to_string).collect::<Vec<_>>().join("-")
}

/// The eleven of `tactic` as the game holds it, each player scored in his place as the squad's state makes him.
fn held(tactic: &ClubTactic, squad: &Squad<'_>, players: &PlayerIndex) -> Result<Eleven, ScoutError> {
    let positions = positions(tactic, players);
    let mut slots = Vec::with_capacity(11);
    for (place, position) in tactic.slots.iter().zip(positions) {
        let out = squad.left_out.iter().find(|out| Some(out.player.uid) == place.player);
        let ready = squad.candidates.iter().find(|c| Some(c.player.uid) == place.player).map(|c| c.readiness);
        let slot = match place.player.and_then(|uid| players.get(uid)) {
            // A player who is out is scored as if fit: what the club misses without him.
            Some(player) => placed(position, &Candidate { player, readiness: ready.unwrap_or(1.0) })?,
            None => empty(position),
        };
        slots.push(ElevenSlot {
            place: slot,
            in_possession: place.in_possession,
            out_of_possession: place.out_of_possession,
            injuries: out.map_or(0, |out| out.injuries),
            bans: out.map_or(0, |out| out.bans),
        });
    }
    Ok(eleven(tactic.copies, tactic.style.clone(), shape(&positions), slots))
}

fn eleven(copies: usize, style: Option<String>, shape: String, slots: Vec<ElevenSlot>) -> Eleven {
    let score = slots.iter().map(|slot| f32::from(slot.place.score)).sum::<f32>() / 11.0;
    let zones = zones(slots.iter().map(|slot| &slot.place));
    Eleven { copies, style, shape, slots, score, zones }
}

/// The eleven the editor picks for a squad the game holds none for: the one of the formation that suits it most.
fn picked(squad: &Squad<'_>) -> Result<Eleven, ScoutError> {
    let lineup = lineups(&squad.candidates, FORMATIONS, ABILITY_WEIGHT)?.into_iter().next();
    let (shape, slots) = lineup.map_or_else(|| (String::new(), Vec::new()), |l| (l.formation.to_owned(), l.slots));
    let slots = slots
        .into_iter()
        .map(|place| ElevenSlot { place, in_possession: None, out_of_possession: None, injuries: 0, bans: 0 })
        .collect();
    Ok(eleven(0, None, shape, slots))
}

impl Session {
    /// The matches the senior team of `club` has still to play, the next first. Finds them by their class, in one
    /// pass over the game's memory (a few seconds).
    pub fn fixtures(&self, club: &ClubSummary, clubs: &ClubIndex) -> Result<Vec<Fixture>, ScoutError> {
        let vtables = self.fixture_vtables()?;
        let found: Vec<u64> = rtti::objects(&self.process, &self.plugin, &vtables)?.into_values().flatten().collect();
        self.fixtures_among(&found, club, clubs)
    }

    /// The next match of `club` and how its squad meets the opponent's eleven; `None` when the calendar holds no
    /// match of the club's. One pass over the game's memory (a few seconds).
    pub fn next_match(
        &self,
        club: &ClubSummary,
        clubs: &ClubIndex,
        players: &PlayerIndex,
    ) -> Result<Option<NextMatch>, ScoutError> {
        let fixture_vtables = self.fixture_vtables()?;
        let selection_vtables = self.selection_vtables();
        let all: Vec<u64> = fixture_vtables.iter().chain(selection_vtables).copied().collect();
        let mut found = rtti::objects(&self.process, &self.plugin, &all)?;
        let mut of = |vtables: &[u64]| -> Vec<u64> {
            vtables.iter().filter_map(|vtable| found.remove(vtable)).flatten().collect()
        };
        let (matches, selections) = (of(&fixture_vtables), of(selection_vtables));

        let fixtures = self.fixtures_among(&matches, club, clubs)?;
        let Some(next) = fixtures.first() else {
            return Ok(None);
        };
        let home = next.home == club.uid;
        let Some(opponent) = clubs.get(if home { next.away } else { next.home }) else {
            return Ok(None);
        };
        // The elevens the game holds, where it holds any: a club it has prepared no match for has none.
        let tactics = |club: &ClubSummary| match self.club_tactics_among(&selections, club, players) {
            Ok(tactics) => Ok(tactics),
            Err(ScoutError::NoTactic { .. } | ScoutError::NotPlaced) => Ok(Vec::new()),
            Err(err) => Err(err),
        };

        let theirs = self.squad(opponent, players, false)?;
        let their_tactics = tactics(opponent)?;
        let eleven = match their_tactics.first() {
            Some(tactic) => held(tactic, &theirs, players)?,
            None => picked(&theirs)?,
        };
        let [left, right, back, midfield, front] = eleven.zones;

        let ours = self.squad(club, players, false)?;
        // A human manager's tactics where the game keeps them; or else the one its selections hold.
        let kept: Vec<(ClubTactic, bool)> = match self.kept_tactics(club, players) {
            Ok(Some((kept, current))) => {
                kept.into_iter().enumerate().map(|(i, tactic)| (tactic, i == current)).collect()
            }
            Ok(None) | Err(ScoutError::NoTactic { .. } | ScoutError::NotPlaced) => {
                tactics(club)?.into_iter().take(1).map(|tactic| (tactic, true)).collect()
            }
            Err(err) => return Err(err),
        };
        let mut ours_kept = Vec::with_capacity(kept.len());
        for (index, (tactic, in_use)) in kept.iter().enumerate() {
            let positions = positions(tactic, players);
            let formation = Formation { key: KEPT[index.min(KEPT.len() - 1)], positions };
            let Some(lineup) = lineups(&ours.candidates, &[formation], ABILITY_WEIGHT)?.into_iter().next() else {
                continue;
            };
            ours_kept.push(KeptTactic {
                in_use: *in_use,
                style: tactic.style.clone(),
                shape: shape(&positions),
                picked: in_use.then(|| held(tactic, &ours, players)).transpose()?,
                best: Matchup { zones: zones(&lineup.slots), lineup },
            });
        }
        let matchups = lineups(&ours.candidates, FORMATIONS, ABILITY_WEIGHT)?
            .into_iter()
            .map(|lineup| Matchup { zones: zones(&lineup.slots), lineup })
            .collect();
        Ok(Some(NextMatch {
            opponent: opponent.clone(),
            home,
            eleven,
            other_elevens: their_tactics.len().saturating_sub(1),
            opponent_available: theirs.candidates.len(),
            absent: theirs.left_out,
            facing: [right, left, front, midfield, back],
            tactics: ours_kept,
            available: ours.candidates.len(),
            left_out: ours.left_out,
            matchups,
            fixtures,
        }))
    }

    /// The vtables of the calendar's matches.
    fn fixture_vtables(&self) -> Result<Vec<u64>, ScoutError> {
        let layout = self.layout.fixture.as_ref().ok_or(ScoutError::NotPlaced)?;
        let vtables = rtti::vtables(&self.process, &self.plugin, &layout.class);
        if vtables.is_empty() { Err(ScoutError::NotPlaced) } else { Ok(vtables) }
    }

    /// The matches of the senior team of `club` among the calendar's at `matches`, from today on, each once.
    fn fixtures_among(
        &self,
        matches: &[u64],
        club: &ClubSummary,
        clubs: &ClubIndex,
    ) -> Result<Vec<Fixture>, ScoutError> {
        let layout = self.layout.fixture.as_ref().ok_or(ScoutError::NotPlaced)?;
        let Some(&team) = self.team_objects(club)?.first() else {
            return Ok(Vec::new());
        };
        let today = self.game_date();
        let len = (layout.home.max(layout.away) + 8).max(layout.date + 4) as usize;
        // The club a team object belongs to, by the UID read at the club it points at.
        let club_of = |team: u64| {
            let address = self.process.read_u64(team + self.layout.team.club).ok()?;
            let uid = self.process.read_u32(address + self.layout.club.uid).ok()?;
            clubs.get(uid).filter(|club| club.address == address).map(|club| club.uid)
        };
        let mut out = Vec::new();
        for &object in matches {
            let Ok(bytes) = self.process.read_bytes(object, len) else {
                continue;
            };
            let u64_at = |at: u64| u64::from_le_bytes(bytes[at as usize..at as usize + 8].try_into().expect("8 bytes"));
            let u16_at = |at: u64| u16::from_le_bytes([bytes[at as usize], bytes[at as usize + 1]]);
            let (home, away) = (u64_at(layout.home), u64_at(layout.away));
            if home != team && away != team {
                continue;
            }
            let Some(date) = FmDate::from_raw(u16_at(layout.date), u16_at(layout.date + 2)) else {
                continue;
            };
            if today.is_some_and(|today| date < today) {
                continue;
            }
            if let (Some(home), Some(away)) = (club_of(home), club_of(away)) {
                out.push(Fixture { date, home, away });
            }
        }
        out.sort_unstable();
        out.dedup();
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::details::ATTRIBUTE_GROUPS;
    use crate::filter::attribute_keys;
    use crate::scouting::TacticSlot;

    /// A player rated as `ratings` say and 1 elsewhere.
    fn player(uid: u32, ratings: &[(&str, u8)]) -> PlayerSummary {
        let mut position_ratings = [1u8; 15];
        for &(key, rating) in ratings {
            position_ratings[POSITIONS.iter().position(|&p| p == key).expect("position")] = rating;
        }
        PlayerSummary {
            uid,
            name: format!("player {uid}"),
            full_name: None,
            date_of_birth: None,
            age: Some(25),
            nation: None,
            nation_uid: None,
            nation_address: 0,
            club: None,
            club_uid: None,
            positions: Vec::new(),
            contract_expires: None,
            current_ability: 120,
            potential_ability: 130,
            position_ratings,
            attributes: vec![12; attribute_keys(ATTRIBUTE_GROUPS).count()],
            transfer_listed: false,
            loan_listed: false,
            transfer_value: None,
            woman: Some(false),
            address: 0,
            shift: 0,
        }
    }

    fn place(index: usize, line: Option<Line>, position: Option<&'static str>) -> TacticSlot {
        TacticSlot {
            index,
            in_possession: None,
            out_of_possession: None,
            in_possession_mask: String::new(),
            out_of_possession_mask: String::new(),
            line,
            side: None,
            position,
            player: Some(index as u32 + 1),
        }
    }

    /// A back three with wing-backs, as Carrarese's read: the third centre-back's and two midfielders' roles are not
    /// known, and the wing-backs' sides are.
    fn three_at_the_back() -> (ClubTactic, PlayerIndex) {
        let squad = vec![
            player(1, &[("gk", 20)]),
            player(2, &[("dc", 20)]),
            player(3, &[("dc", 20)]),
            player(4, &[("dl", 20), ("dc", 18)]),
            player(5, &[("wbr", 20)]),
            player(6, &[("dm", 20), ("mc", 15)]),
            player(7, &[("wbl", 20)]),
            player(8, &[("mc", 20)]),
            player(9, &[("mc", 20)]),
            player(10, &[("st", 20)]),
            player(11, &[("st", 20)]),
        ];
        let slots = vec![
            place(0, None, None),
            place(1, Some(Line::CentreBack), Some("dc")),
            place(2, Some(Line::CentreBack), Some("dc")),
            place(3, Some(Line::CentreBack), Some("dc")),
            place(4, Some(Line::WingBack), Some("wbr")),
            place(5, Some(Line::DefensiveMidfield), Some("dm")),
            place(6, Some(Line::WingBack), Some("wbl")),
            place(7, None, None),
            place(8, None, None),
            place(9, Some(Line::Striker), Some("st")),
            place(10, Some(Line::Striker), Some("st")),
        ];
        (ClubTactic { style: None, slots, copies: 4 }, PlayerIndex::new(squad))
    }

    #[test]
    fn a_place_without_a_role_is_where_its_player_plays_best() {
        let (tactic, players) = three_at_the_back();
        let positions = positions(&tactic, &players);
        assert_eq!(positions, ["gk", "dc", "dc", "dc", "wbr", "dm", "wbl", "mc", "mc", "st", "st"]);
        assert_eq!(shape(&positions), "3-5-2 DM");
    }

    #[test]
    fn a_role_offered_in_two_lines_follows_the_player() {
        let (mut tactic, players) = three_at_the_back();
        // An attacking midfielder's role for a central midfielder who does not play behind the strikers.
        tactic.slots[7].line = Some(Line::AttackingMidfield);
        // A wing-back's role for a full-back who plays wing-back nearly as well.
        let squad: Vec<PlayerSummary> = players
            .iter()
            .map(|p| if p.uid == 5 { player(5, &[("dr", 20), ("wbr", 16)]) } else { p.clone() })
            .collect();
        let positions = positions(&tactic, &PlayerIndex::new(squad));
        assert_eq!((positions[7], positions[4]), ("mc", "wbr"));
    }

    #[test]
    fn a_wing_backs_role_behind_two_centre_backs_is_a_full_backs_place() {
        let (mut tactic, players) = three_at_the_back();
        // The third centre-back's place becomes a midfielder's: a back four whose wide men play as wing-backs.
        tactic.slots[3].line = Some(Line::CentralMidfield);
        tactic.slots[3].position = Some("mc");
        let squad: Vec<PlayerSummary> = players
            .iter()
            .map(|p| match p.uid {
                4 => player(4, &[("mc", 20)]),
                5 => player(5, &[("dr", 20), ("wbr", 18)]),
                7 => player(7, &[("dl", 20), ("wbl", 18)]),
                _ => p.clone(),
            })
            .collect();
        let players = PlayerIndex::new(squad);
        tactic.slots[4].side = Some(crate::scouting::Side::Right);
        tactic.slots[6].side = Some(crate::scouting::Side::Left);
        let found = positions(&tactic, &players);
        assert_eq!((found[4], found[6]), ("dr", "dl"));
        // Unless they are wing-backs without the ball too.
        tactic.slots[4].out_of_possession = Some("wb");
        tactic.slots[6].out_of_possession = Some("hwb");
        let found = positions(&tactic, &players);
        assert_eq!((found[4], found[6]), ("wbr", "wbl"));
    }

    #[test]
    fn a_lone_winger_is_matched_on_the_other_side() {
        let (mut tactic, players) = three_at_the_back();
        // A winger on the right, and a place without a role whose player plays on the left as well as in the middle.
        tactic.slots[9].line = Some(Line::Wide);
        tactic.slots[9].side = Some(crate::scouting::Side::Right);
        let squad: Vec<PlayerSummary> = players
            .iter()
            .map(|p| match p.uid {
                10 => player(10, &[("amr", 20)]),
                9 => player(9, &[("amc", 20), ("aml", 17)]),
                _ => p.clone(),
            })
            .collect();
        let found = positions(&tactic, &PlayerIndex::new(squad));
        assert_eq!((found[9], found[8], found[7]), ("amr", "aml", "mc"));
    }

    #[test]
    fn two_on_one_side_are_a_right_and_a_left() {
        let (mut tactic, players) = three_at_the_back();
        // Wing-backs whose sides the ratings do not tell: both come out on the right at first.
        let squad: Vec<PlayerSummary> = players
            .iter()
            .map(|p| match p.uid {
                5 => player(5, &[("wbr", 20), ("wbl", 20)]),
                7 => player(7, &[("wbr", 20), ("wbl", 20), ("dl", 15)]),
                _ => p.clone(),
            })
            .collect();
        let players = PlayerIndex::new(squad);
        for slot in [4, 6] {
            tactic.slots[slot].position = None;
        }
        let positions = positions(&tactic, &players);
        assert_eq!((positions[4], positions[6]), ("wbr", "wbl"));
    }

    #[test]
    fn a_shape_the_editor_has_no_name_for_counts_its_lines() {
        let positions = ["gk", "dr", "dc", "dc", "dl", "dm", "mr", "mc", "ml", "st", "st"];
        assert_eq!(shape(&positions), "4-1-3-0-2");
        // Two holding midfielders are not the editor's 4-2-2-2, which has none.
        assert_eq!(shape(&["gk", "dr", "dc", "dc", "dl", "dm", "dm", "mc", "mc", "st", "st"]), "4-2-2-0-2");
        assert_eq!(shape(&["gk", "dl", "dc", "dc", "dr", "mc", "mc", "ml", "mr", "st", "st"]), "4-4-2");
    }

    #[test]
    fn zones_count_the_outfield_players() {
        let (tactic, players) = three_at_the_back();
        let squad = Squad {
            candidates: players.iter().map(|player| Candidate { player, readiness: 1.0 }).collect(),
            left_out: Vec::new(),
        };
        let eleven = held(&tactic, &squad, &players).expect("an eleven");
        assert_eq!(eleven.zones.map(|zone| zone.men), [1, 1, 3, 3, 2]);
        let total: f32 = eleven.slots.iter().skip(1).map(|slot| f32::from(slot.place.score)).sum();
        assert!((eleven.zones.iter().map(|zone| zone.strength).sum::<f32>() - total).abs() < 0.01);
        assert_eq!((eleven.copies, eleven.shape.as_str()), (4, "3-5-2 DM"));
    }

    #[test]
    fn an_absent_player_is_marked_and_scored_as_if_fit() {
        let (tactic, players) = three_at_the_back();
        let striker = players.get(11).expect("the striker");
        let squad = Squad {
            candidates: players
                .iter()
                .filter(|player| player.uid != 11)
                .map(|player| Candidate { player, readiness: 0.8 })
                .collect(),
            left_out: vec![LeftOut { player: striker.clone(), injuries: 1, bans: 0 }],
        };
        let eleven = held(&tactic, &squad, &players).expect("an eleven");
        let (fit, out) = (&eleven.slots[9], &eleven.slots[10]);
        assert_eq!((out.injuries, out.place.readiness), (1, 100));
        assert_eq!((fit.injuries, fit.place.readiness), (0, 80));
        assert!(out.place.score > fit.place.score);
    }

    #[test]
    fn a_squad_the_game_holds_no_eleven_for_gets_the_editors() {
        let (_, players) = three_at_the_back();
        let squad = Squad {
            candidates: players.iter().map(|player| Candidate { player, readiness: 1.0 }).collect(),
            left_out: Vec::new(),
        };
        let eleven = picked(&squad).expect("an eleven");
        assert_eq!(eleven.copies, 0);
        assert!(eleven.shape.starts_with("3-"), "{}", eleven.shape);
        assert_eq!(eleven.slots.iter().filter(|slot| slot.place.fitting.is_some()).count(), 11);
    }
}
