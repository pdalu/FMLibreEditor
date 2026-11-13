//! The eleven of a club's senior squad that fits a formation best, and the formations that suit the squad most.
//!
//! A formation is eleven positions ([`FORMATIONS`]). Each player is measured for each of them as scouting measures a
//! signing (see `scouting.rs`): his attributes for the roles of the position that suit him best, held back where the
//! position is new to him. Most of a place's score is the player's current ability, though: by their fit alone the
//! editor picks fewer of the players the game's managers pick (see [`ABILITY_WEIGHT`]). For the next match, how ready
//! he is scales the score, and an injured or banned player is left out; at full strength, everyone counts as fit.
//! The eleven is the one whose scores add up to the most, and a formation's score is their mean.
//!
//! A squad with players for every line scores much the same in every formation: on the save the weight was measured
//! on, five squads' eighteen formations lay within a point and a half. So each formation also gets the eleven of the
//! players its first leaves out, which tells the formations apart: how well the squad covers it.
//!
//! The roles' weights, the weight of ability and the readiness are the editor's own reading, not the match engine's:
//! the score says how well the squad fits a formation, not how its matches will go.
//!
//! Everything here only reads memory.

use std::collections::HashMap;

use serde::Serialize;

use crate::clubs::ClubSummary;
use crate::players::{PlayerIndex, PlayerSummary};
use crate::scouting::{Fitting, Measure, Measured, ScoutError, fitting, position_factor};
use crate::session::Session;

/// A formation: its name and its eleven positions (keys of [`crate::SCOUT_POSITIONS`]), goalkeeper first.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Formation {
    pub key: &'static str,
    pub positions: [&'static str; 11],
}

/// The formations a squad is measured against.
pub const FORMATIONS: &[Formation] = &[
    Formation { key: "4-4-2", positions: ["gk", "dr", "dc", "dc", "dl", "mr", "mc", "mc", "ml", "st", "st"] },
    Formation { key: "4-4-1-1", positions: ["gk", "dr", "dc", "dc", "dl", "mr", "mc", "mc", "ml", "amc", "st"] },
    Formation { key: "4-2-4", positions: ["gk", "dr", "dc", "dc", "dl", "mc", "mc", "amr", "aml", "st", "st"] },
    Formation { key: "4-3-3 DM Wide", positions: ["gk", "dr", "dc", "dc", "dl", "dm", "mc", "mc", "amr", "aml", "st"] },
    Formation { key: "4-1-4-1 DM", positions: ["gk", "dr", "dc", "dc", "dl", "dm", "mr", "mc", "mc", "ml", "st"] },
    Formation { key: "4-2-3-1", positions: ["gk", "dr", "dc", "dc", "dl", "mc", "mc", "amr", "amc", "aml", "st"] },
    Formation { key: "4-2-3-1 DM", positions: ["gk", "dr", "dc", "dc", "dl", "dm", "dm", "amr", "amc", "aml", "st"] },
    Formation { key: "4-3-1-2", positions: ["gk", "dr", "dc", "dc", "dl", "mc", "mc", "mc", "amc", "st", "st"] },
    Formation { key: "4-1-2-1-2 DM", positions: ["gk", "dr", "dc", "dc", "dl", "dm", "mc", "mc", "amc", "st", "st"] },
    Formation { key: "4-3-2-1", positions: ["gk", "dr", "dc", "dc", "dl", "mc", "mc", "mc", "amc", "amc", "st"] },
    Formation { key: "4-2-2-2", positions: ["gk", "dr", "dc", "dc", "dl", "mc", "mc", "amc", "amc", "st", "st"] },
    Formation { key: "3-5-2", positions: ["gk", "dc", "dc", "dc", "wbr", "wbl", "mc", "mc", "mc", "st", "st"] },
    Formation { key: "3-5-2 DM", positions: ["gk", "dc", "dc", "dc", "wbr", "wbl", "dm", "mc", "mc", "st", "st"] },
    Formation { key: "3-4-1-2", positions: ["gk", "dc", "dc", "dc", "wbr", "wbl", "mc", "mc", "amc", "st", "st"] },
    Formation { key: "3-4-2-1", positions: ["gk", "dc", "dc", "dc", "wbr", "wbl", "mc", "mc", "amc", "amc", "st"] },
    Formation { key: "3-4-3", positions: ["gk", "dc", "dc", "dc", "wbr", "wbl", "mc", "mc", "amr", "aml", "st"] },
    Formation { key: "5-3-2", positions: ["gk", "dr", "dc", "dc", "dc", "dl", "mc", "mc", "mc", "st", "st"] },
    Formation { key: "5-4-1", positions: ["gk", "dr", "dc", "dc", "dc", "dl", "mr", "mc", "mc", "ml", "st"] },
];

/// What an eleven is picked for.
#[derive(Debug, Clone, Copy)]
pub struct LineupOptions {
    /// The whole squad at its best: injured and banned players too, each as if fully fit. Without it, the eleven
    /// for the next match: those who can play, as ready as they are now.
    pub full_strength: bool,
    /// How much of a place's score is the player's current ability, 0–1; the rest is his fit for the roles.
    pub ability_weight: f32,
}

impl Default for LineupOptions {
    fn default() -> Self {
        Self { full_strength: false, ability_weight: ABILITY_WEIGHT }
    }
}

/// How much of a place's score is the player's current ability when nothing else is asked. Measured on a save of
/// September 2026 (Steam 27.0.1, macOS) against the twelve elevens the game held for five clubs, in their own
/// formations: the fit alone picked 77 of their 132 players at full strength, 0.6 of ability 97, 0.8 of it 101 and
/// ability alone 92.
pub const ABILITY_WEIGHT: f32 = 0.8;

/// One place of an eleven.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LineupSlot {
    /// The position, a key of [`crate::POSITIONS`].
    pub position: &'static str,
    /// The player picked and how he fits the position; none when the squad has nobody left for it.
    pub fitting: Option<Fitting>,
    /// His current ability on the fit's scale, 0–100 (half of it), held back as his fit is where the position is
    /// new to him.
    pub ability: u8,
    /// How ready he is, 0–100, from his energy and match sharpness; 100 at full strength.
    pub readiness: u8,
    /// His fit and his ability, as the options weigh them, scaled by his readiness, 0–100: what the eleven adds up.
    pub score: u8,
}

/// The eleven that fits a formation best.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Lineup {
    pub formation: &'static str,
    /// The mean of its places' scores, 0–100.
    pub score: f32,
    /// In the order of the formation's positions.
    pub slots: Vec<LineupSlot>,
    /// The same for the eleven picked from the players the first leaves out: how well the squad covers the
    /// formation when its first choices are missing.
    pub cover_score: f32,
    pub cover: Vec<LineupSlot>,
}

/// A player left out of the elevens, and why.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeftOut {
    pub player: PlayerSummary,
    pub injuries: usize,
    pub bans: usize,
}

/// The elevens of a squad, the formation that suits it most first.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LineupReport {
    pub lineups: Vec<Lineup>,
    /// How many players the elevens were picked from.
    pub available: usize,
    pub left_out: Vec<LeftOut>,
}

/// A player an eleven can pick, and how much of his fit he brings (0–1).
pub(crate) struct Candidate<'a> {
    pub(crate) player: &'a PlayerSummary,
    pub(crate) readiness: f32,
}

/// The players of a senior squad an eleven is picked from, and those left out of it.
pub(crate) struct Squad<'a> {
    pub(crate) candidates: Vec<Candidate<'a>>,
    pub(crate) left_out: Vec<LeftOut>,
}

/// How much of his fit a player brings to the next match, from his energy and match sharpness as stored (0–10000):
/// all of it when both are full, 0.6 of it with neither. An estimate of the editor's.
fn readiness(condition: u16, match_sharpness: u16) -> f32 {
    let part = |value: u16| f32::from(value.min(10_000)) / 10_000.0;
    (0.7 + 0.3 * part(condition)) * (0.85 + 0.15 * part(match_sharpness))
}

/// For each row, the column it takes so that the scores taken add up to the most, no column taken twice: the
/// Hungarian algorithm, for no more rows than columns.
fn assign(scores: &[Vec<f64>]) -> Vec<usize> {
    let (rows, columns) = (scores.len(), scores.first().map_or(0, Vec::len));
    // Numbered from 1, as the algorithm is usually written: the potentials of the rows and the columns, the row
    // each column is taken by (0 for none) and the column the search reached it from.
    let mut row_potential = vec![0.0; rows + 1];
    let mut column_potential = vec![0.0; columns + 1];
    let mut taken_by = vec![0usize; columns + 1];
    let mut from = vec![0usize; columns + 1];
    for row in 1..=rows {
        taken_by[0] = row;
        let mut column = 0;
        let mut least = vec![f64::INFINITY; columns + 1];
        let mut used = vec![false; columns + 1];
        loop {
            used[column] = true;
            let current = taken_by[column];
            let (mut delta, mut next) = (f64::INFINITY, 0);
            for j in (1..=columns).filter(|&j| !used[j]) {
                // The cost is the score turned around: the least cost is the most score.
                let cost = -scores[current - 1][j - 1] - row_potential[current] - column_potential[j];
                if cost < least[j] {
                    least[j] = cost;
                    from[j] = column;
                }
                if least[j] < delta {
                    delta = least[j];
                    next = j;
                }
            }
            for j in 0..=columns {
                if used[j] {
                    row_potential[taken_by[j]] += delta;
                    column_potential[j] -= delta;
                } else {
                    least[j] -= delta;
                }
            }
            column = next;
            if taken_by[column] == 0 {
                break;
            }
        }
        while column != 0 {
            let previous = from[column];
            taken_by[column] = taken_by[previous];
            column = previous;
        }
    }
    let mut out = vec![0; rows];
    for (column, &row) in taken_by.iter().enumerate().skip(1) {
        if row != 0 {
            out[row - 1] = column - 1;
        }
    }
    out
}

/// A player's current ability (0–200) on the fit's scale, held back as the fit is in a position rated `rating`.
fn ability(player: &PlayerSummary, rating: u8) -> f32 {
    f32::from(player.current_ability.min(200)) / 2.0 * position_factor(rating)
}

/// What a candidate measured `m` in a position brings to an eleven: his fit and his ability, `weight` of it the
/// ability, scaled by how ready he is.
fn worth(candidate: &Candidate<'_>, m: Measured, weight: f32) -> f64 {
    let both = (1.0 - weight) * f32::from(m.fit) + weight * ability(candidate.player, m.rating);
    f64::from(both * candidate.readiness)
}

/// The place of a candidate measured `m` in `position`.
fn filled(position: &'static str, candidate: &Candidate<'_>, m: Measured, weight: f32) -> LineupSlot {
    LineupSlot {
        position,
        ability: ability(candidate.player, m.rating).round() as u8,
        readiness: (candidate.readiness * 100.0).round() as u8,
        score: worth(candidate, m, weight).round() as u8,
        fitting: Some(fitting(candidate.player, m)),
    }
}

/// A place nobody fills.
pub(crate) fn empty(position: &'static str) -> LineupSlot {
    LineupSlot { position, fitting: None, ability: 0, readiness: 0, score: 0 }
}

/// The place of a player who is given: `candidate` in `position`, scored as a picked one is with [`ABILITY_WEIGHT`].
/// Empty when he cannot play there at all.
pub(crate) fn placed(position: &'static str, candidate: &Candidate<'_>) -> Result<LineupSlot, ScoutError> {
    let measured = Measure::for_position(position)?.of(candidate.player);
    Ok(measured.map_or_else(|| empty(position), |m| filled(position, candidate, m, ABILITY_WEIGHT)))
}

/// The eleven of `candidates` that fits `formation` best, in the order of its positions, and the mean of its
/// places' scores.
fn pick(
    formation: &Formation,
    candidates: &[&Candidate<'_>],
    measures: &HashMap<&'static str, Measure>,
    weight: f32,
) -> (f32, Vec<LineupSlot>) {
    // Fewer than eleven candidates leave places empty: columns past them stand for nobody.
    let columns = candidates.len().max(11);
    let measured: Vec<Vec<_>> = formation
        .positions
        .iter()
        .map(|position| candidates.iter().map(|c| measures[position].of(c.player)).collect())
        .collect();
    let scores: Vec<Vec<f64>> = measured
        .iter()
        .map(|row| {
            let score = |k: usize| match (candidates.get(k), row.get(k).copied().flatten()) {
                (Some(c), Some(m)) => worth(c, m, weight),
                _ => 0.0,
            };
            (0..columns).map(score).collect()
        })
        .collect();
    let picked = assign(&scores);
    let slots = formation
        .positions
        .iter()
        .enumerate()
        .map(|(slot, &position)| {
            let k = picked[slot];
            // A player who cannot play the position at all fills no place.
            let taken =
                candidates.get(k).zip(measured[slot].get(k).copied().flatten()).filter(|_| scores[slot][k] > 0.0);
            match taken {
                Some((c, m)) => filled(position, c, m, weight),
                None => empty(position),
            }
        })
        .collect();
    let total: f64 = (0..11).map(|slot| scores[slot][picked[slot]]).sum();
    ((total / 11.0) as f32, slots)
}

/// The eleven of `candidates` that fits each of `formations` best and the eleven of the others behind it, the
/// formation that suits them most first, with `ability_weight` of each place's score taken from the player's
/// current ability.
pub(crate) fn lineups(
    candidates: &[Candidate<'_>],
    formations: &[Formation],
    ability_weight: f32,
) -> Result<Vec<Lineup>, ScoutError> {
    let weight = ability_weight.clamp(0.0, 1.0);
    let mut measures: HashMap<&'static str, Measure> = HashMap::new();
    for position in formations.iter().flat_map(|formation| formation.positions) {
        if !measures.contains_key(position) {
            measures.insert(position, Measure::for_position(position)?);
        }
    }
    let everyone: Vec<&Candidate<'_>> = candidates.iter().collect();
    let mut out: Vec<Lineup> = formations
        .iter()
        .map(|formation| {
            let (score, slots) = pick(formation, &everyone, &measures, weight);
            let first: Vec<u32> = slots.iter().filter_map(|slot| slot.fitting.as_ref().map(|f| f.player.uid)).collect();
            let others: Vec<&Candidate<'_>> = candidates.iter().filter(|c| !first.contains(&c.player.uid)).collect();
            let (cover_score, cover) = pick(formation, &others, &measures, weight);
            Lineup { formation: formation.key, score, slots, cover_score, cover }
        })
        .collect();
    out.sort_by(|a, b| b.score.total_cmp(&a.score).then(b.cover_score.total_cmp(&a.cover_score)));
    Ok(out)
}

impl Session {
    /// The elevens of the senior squad of `club`, one for each of [`FORMATIONS`], the formation that suits the squad
    /// most first. The squad is the senior team's list as the game keeps it: the players who play for it, on loan
    /// there too, and not those it has lent out.
    pub fn lineups(
        &self,
        club: &ClubSummary,
        players: &PlayerIndex,
        options: LineupOptions,
    ) -> Result<LineupReport, ScoutError> {
        self.lineups_in(club, players, options, FORMATIONS)
    }

    /// As [`Session::lineups`], for the formations given.
    pub fn lineups_in(
        &self,
        club: &ClubSummary,
        players: &PlayerIndex,
        options: LineupOptions,
        formations: &[Formation],
    ) -> Result<LineupReport, ScoutError> {
        let Squad { candidates, left_out } = self.squad(club, players, options.full_strength)?;
        let lineups = lineups(&candidates, formations, options.ability_weight)?;
        Ok(LineupReport { lineups, available: candidates.len(), left_out })
    }

    /// The players of the senior squad of `club` an eleven is picked from: for the next match, those who can play,
    /// as ready as they are now; at full strength, everyone as if fully fit.
    pub(crate) fn squad<'a>(
        &self,
        club: &ClubSummary,
        players: &'a PlayerIndex,
        full_strength: bool,
    ) -> Result<Squad<'a>, ScoutError> {
        let teams = self.club_teams(club, players)?;
        let mut squad = Squad { candidates: Vec::new(), left_out: Vec::new() };
        for member in teams.iter().filter(|team| team.index == 0).flat_map(|team| &team.players) {
            let Some(player) = players.get(member.uid).filter(|_| member.plays_here) else {
                continue;
            };
            if full_strength {
                squad.candidates.push(Candidate { player, readiness: 1.0 });
            } else if member.injuries > 0 || member.bans > 0 {
                squad.left_out.push(LeftOut { player: player.clone(), injuries: member.injuries, bans: member.bans });
            } else {
                let readiness = readiness(member.condition, member.match_sharpness);
                squad.candidates.push(Candidate { player, readiness });
            }
        }
        Ok(squad)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::details::{ATTRIBUTE_GROUPS, POSITIONS};
    use crate::filter::attribute_keys;

    /// A player rated 20 in `natural` and `rating` in each of `others`, with every attribute at `attributes`.
    fn player(uid: u32, natural: &str, others: &[(&str, u8)], attributes: u8) -> PlayerSummary {
        let mut position_ratings = [1u8; 15];
        for &(key, rating) in others.iter().chain(&[(natural, 20)]) {
            position_ratings[POSITIONS.iter().position(|&p| p == key).expect("position")] = rating;
        }
        PlayerSummary {
            uid,
            name: format!("{natural} {uid}"),
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
            attributes: vec![attributes; attribute_keys(ATTRIBUTE_GROUPS).count()],
            transfer_listed: false,
            loan_listed: false,
            transfer_value: None,
            woman: Some(false),
            address: 0,
            shift: 0,
        }
    }

    fn fit(candidates: &[PlayerSummary]) -> Vec<Candidate<'_>> {
        candidates.iter().map(|player| Candidate { player, readiness: 1.0 }).collect()
    }

    /// The most a choice of one column for each row, none twice, adds up to: every choice tried.
    fn most(scores: &[Vec<f64>], row: usize, used: &mut Vec<bool>) -> f64 {
        if row == scores.len() {
            return 0.0;
        }
        let mut best = f64::NEG_INFINITY;
        for column in 0..used.len() {
            if !used[column] {
                used[column] = true;
                best = best.max(scores[row][column] + most(scores, row + 1, used));
                used[column] = false;
            }
        }
        best
    }

    #[test]
    fn the_assignment_adds_up_to_the_most() {
        // Made-up scores, the same on every run.
        let mut seed = 0x2545_F491u32;
        let mut next = || {
            seed ^= seed << 13;
            seed ^= seed >> 17;
            seed ^= seed << 5;
            f64::from(seed % 101)
        };
        for (rows, columns) in [(1, 1), (3, 3), (4, 6), (5, 8), (6, 6)] {
            for _ in 0..40 {
                let scores: Vec<Vec<f64>> = (0..rows).map(|_| (0..columns).map(|_| next()).collect()).collect();
                let picked = assign(&scores);
                let mut once = picked.clone();
                once.sort_unstable();
                once.dedup();
                assert_eq!(once.len(), rows, "a column taken twice: {picked:?}");
                let total: f64 = picked.iter().enumerate().map(|(row, &column)| scores[row][column]).sum();
                assert_eq!(total, most(&scores, 0, &mut vec![false; columns]), "{scores:?}");
            }
        }
    }

    #[test]
    fn every_formation_has_a_goalkeeper_and_ten_real_positions() {
        for formation in FORMATIONS {
            assert_eq!(formation.positions[0], "gk", "{}", formation.key);
            assert_eq!(formation.positions.iter().filter(|&&p| p == "gk").count(), 1, "{}", formation.key);
            for position in formation.positions {
                assert!(crate::scout_position(position).is_some(), "{}: {position}", formation.key);
            }
        }
        for (i, a) in FORMATIONS.iter().enumerate() {
            for b in &FORMATIONS[i + 1..] {
                assert_ne!(a.key, b.key);
                let sorted = |formation: &Formation| {
                    let mut positions = formation.positions;
                    positions.sort_unstable();
                    positions
                };
                assert_ne!(sorted(a), sorted(b), "{} and {} are the same eleven", a.key, b.key);
            }
        }
    }

    #[test]
    fn a_squad_built_for_a_formation_fits_it_best() {
        let squad: Vec<PlayerSummary> = ["gk", "dc", "dc", "dc", "wbr", "wbl", "mc", "mc", "mc", "st", "st"]
            .iter()
            .enumerate()
            .map(|(i, position)| player(i as u32, position, &[], 14))
            .collect();
        let out = lineups(&fit(&squad), FORMATIONS, 0.0).expect("lineups");
        assert_eq!(out[0].formation, "3-5-2");
        // Every attribute at 14: (14 - 5) / 12 of a full fit, in his own position.
        assert_eq!(out[0].score, 75.0);
        for (slot, position) in out[0].slots.iter().zip(FORMATIONS.iter().find(|f| f.key == "3-5-2").unwrap().positions)
        {
            let fitting = slot.fitting.as_ref().expect("a player");
            assert_eq!(slot.position, position);
            assert!(fitting.player.name.starts_with(position), "{} at {position}", fitting.player.name);
            assert_eq!((slot.readiness, slot.score), (100, 75));
        }
        // A flat back four and midfield have no full-backs and no wide men to pick from: four places stay empty.
        let back_four = out.iter().find(|lineup| lineup.formation == "4-4-2").expect("4-4-2");
        assert_eq!(back_four.slots.iter().filter(|slot| slot.fitting.is_none()).count(), 4);
        assert!(back_four.score < out[0].score);
    }

    #[test]
    fn the_better_player_takes_the_place_and_the_other_moves() {
        let mut squad = vec![
            player(1, "gk", &[], 12),
            player(2, "st", &[], 16),
            // He plays up front as well as the striker, and on the right too.
            player(3, "st", &[("amr", 18)], 16),
            player(4, "amr", &[], 10),
        ];
        squad.extend((5..12).map(|uid| player(uid, "dc", &[], 12)));
        let formation =
            Formation { key: "test", positions: ["gk", "dc", "dc", "dc", "dc", "dc", "dc", "dc", "amr", "st", "st"] };
        let out = lineups(&fit(&squad), &[formation], 0.0).expect("lineups");
        let uid = |slot: usize| out[0].slots[slot].fitting.as_ref().map(|f| f.player.uid);
        // Both strikers up front, and the winger on the right: moving striker 3 there would cost more than it gains.
        assert_eq!(uid(8), Some(4));
        let mut front = [uid(9), uid(10)];
        front.sort_unstable();
        assert_eq!(front, [Some(2), Some(3)]);
        // Without the winger, striker 3 covers the right and a place up front stays empty.
        squad.retain(|player| player.uid != 4);
        let out = lineups(&fit(&squad), &[formation], 0.0).expect("lineups");
        let picked: Vec<Option<u32>> =
            out[0].slots.iter().map(|slot| slot.fitting.as_ref().map(|f| f.player.uid)).collect();
        assert_eq!(picked.iter().filter(|uid| uid.is_none()).count(), 1);
        assert!(picked.contains(&Some(2)) && picked.contains(&Some(3)));
    }

    #[test]
    fn a_tired_player_gives_way_to_a_fresh_one() {
        let mut squad: Vec<PlayerSummary> = ["gk", "dr", "dc", "dc", "dl", "mr", "mc", "mc", "ml", "st", "st"]
            .iter()
            .enumerate()
            .map(|(i, position)| player(i as u32, position, &[], 13))
            .collect();
        // A better striker than the two picked.
        squad.push(player(99, "st", &[], 15));
        let formations = [FORMATIONS[0]];
        let rested: Vec<Candidate<'_>> = fit(&squad);
        let out = lineups(&rested, &formations, 0.0).expect("lineups");
        assert!(out[0].slots.iter().any(|slot| slot.fitting.as_ref().is_some_and(|f| f.player.uid == 99)));
        // Worn out and out of sharpness, he brings less than they do.
        let tired: Vec<Candidate<'_>> = squad
            .iter()
            .map(|player| Candidate { player, readiness: if player.uid == 99 { readiness(4_000, 3_000) } else { 1.0 } })
            .collect();
        let out = lineups(&tired, &formations, 0.0).expect("lineups");
        assert!(out[0].slots.iter().all(|slot| slot.fitting.as_ref().is_some_and(|f| f.player.uid != 99)));
    }

    #[test]
    fn ability_counts_for_as_much_as_asked() {
        // One fits the roles better; the other is the better player.
        let fitter = player(2, "st", &[], 16);
        let mut abler = player(3, "st", &[], 12);
        (abler.current_ability, abler.potential_ability) = (150, 150);
        let squad = [player(1, "gk", &[], 12), fitter, abler];
        let lone_striker = [*FORMATIONS.iter().find(|f| f.key == "4-4-1-1").expect("4-4-1-1")];
        let striker = |weight: f32| {
            let out = lineups(&fit(&squad), &lone_striker, weight).expect("lineups");
            let slot = out[0].slots.iter().find(|slot| slot.position == "st").expect("st").clone();
            (slot.fitting.expect("a striker").player.uid, slot.ability, slot.score)
        };
        // By fit alone: (16 - 5) / 12 of a full one.
        assert_eq!(striker(0.0), (2, 60, 92));
        // Mostly by ability: 0.2 × 58 + 0.8 × 75 against 0.2 × 92 + 0.8 × 60.
        assert_eq!(striker(0.8), (3, 75, 72));
        assert_eq!(striker(1.0), (3, 75, 75));
        // A weight out of range is taken as the nearest in it.
        assert_eq!(striker(7.0), striker(1.0));
        assert_eq!(striker(-1.0), striker(0.0));
    }

    #[test]
    fn the_cover_is_the_eleven_of_those_left_out() {
        let four_four_two = [FORMATIONS[0]];
        let positions = four_four_two[0].positions;
        // Two for every place, the second of each the lesser player.
        let mut squad: Vec<PlayerSummary> =
            positions.iter().enumerate().map(|(i, position)| player(i as u32, position, &[], 14)).collect();
        squad.extend(positions.iter().enumerate().map(|(i, position)| player(100 + i as u32, position, &[], 11)));
        let out = lineups(&fit(&squad), &four_four_two, 0.0).expect("lineups");
        let uids = |slots: &[LineupSlot]| -> Vec<u32> {
            slots.iter().map(|slot| slot.fitting.as_ref().expect("a player").player.uid).collect()
        };
        assert!(uids(&out[0].slots).iter().all(|&uid| uid < 100));
        assert!(uids(&out[0].cover).iter().all(|&uid| uid >= 100));
        assert_eq!((out[0].score, out[0].cover_score), (75.0, 50.0));
        // One short at left-back: the cover has nobody there.
        squad.retain(|player| player.uid != 104);
        let out = lineups(&fit(&squad), &four_four_two, 0.0).expect("lineups");
        let empty: Vec<&str> =
            out[0].cover.iter().filter(|slot| slot.fitting.is_none()).map(|slot| slot.position).collect();
        assert_eq!(empty, ["dl"]);
        assert!(out[0].cover_score < 50.0);
        // A squad of eleven has no cover at all.
        squad.retain(|player| player.uid < 100);
        let out = lineups(&fit(&squad), &four_four_two, 0.0).expect("lineups");
        assert_eq!(out[0].cover_score, 0.0);
        assert!(out[0].cover.iter().all(|slot| slot.fitting.is_none()));
    }

    #[test]
    fn readiness_runs_from_six_tenths_to_one() {
        assert_eq!(readiness(10_000, 10_000), 1.0);
        assert!((readiness(0, 0) - 0.595).abs() < 1e-6);
        // More than full reads as full.
        assert_eq!(readiness(12_000, 10_000), 1.0);
        assert!(readiness(8_000, 10_000) < readiness(9_000, 10_000));
        assert!(readiness(10_000, 6_000) < readiness(10_000, 9_000));
    }

    #[test]
    fn a_squad_of_fewer_than_eleven_leaves_places_empty() {
        let squad = vec![player(1, "gk", &[], 12), player(2, "st", &[], 12)];
        let out = lineups(&fit(&squad), FORMATIONS, 0.0).expect("lineups");
        for lineup in &out {
            assert_eq!(lineup.slots.len(), 11);
            assert_eq!(lineup.slots.iter().filter(|slot| slot.fitting.is_some()).count(), 2, "{}", lineup.formation);
        }
        assert!(lineups(&[], FORMATIONS, 0.0).expect("lineups").iter().all(|lineup| lineup.score == 0.0));
    }
}
