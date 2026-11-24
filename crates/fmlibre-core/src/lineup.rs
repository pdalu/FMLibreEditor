//! The best eleven a club can field in a tactic, its second eleven, and how well its squad fills other tactics.
//!
//! Each slot of a tactic has a role for when the team has the ball and one for when it has not, and the same player
//! plays both. A player's value in a slot is his fit for its two roles (see [`crate::roles`]), weighed as the caller
//! asks (60% in possession by default), on the slot's side. The eleven is the assignment of players to slots with the
//! highest total: no other choice of players and places gives the slots more together. It is solved exactly with the
//! Hungarian method (Kuhn 1955, Munkres 1957), not slot by slot, which goes wrong as soon as one player is the best
//! choice for two slots. The second eleven is the best assignment of the players the first leaves out.
//!
//! What is here works on the player list and a tactic's roles; reading the club's own tactics and squad is the only
//! part that reads the game, and it only reads.

use serde::{Deserialize, Serialize};

use crate::clubs::ClubSummary;
use crate::players::{PlayerIndex, PlayerSummary};
use crate::roles::{fit_of, role_weights};
use crate::scouting::{ClubTactic, Line, Phase, Role, ScoutError, Side, position_of, role, role_rating};
use crate::session::Session;
use crate::squad::Loan;

/// What a slot of a tactic asks for: its roles by key, and its side for a wide line.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SlotRoles {
    pub in_possession: Option<String>,
    pub out_of_possession: Option<String>,
    pub side: Option<Side>,
}

impl SlotRoles {
    fn new(in_possession: &str, out_of_possession: &str, side: Option<Side>) -> Self {
        SlotRoles {
            in_possession: Some(in_possession.to_owned()),
            out_of_possession: Some(out_of_possession.to_owned()),
            side,
        }
    }
}

/// The share of a slot's value its role in possession has, by default.
pub const IN_POSSESSION_WEIGHT: f32 = 0.6;

/// A slot with what measuring a player for it takes.
struct Measure {
    roles: SlotRoles,
    ip: Option<(&'static Role, Vec<(usize, f32)>)>,
    oop: Option<(&'static Role, Vec<(usize, f32)>)>,
    line: Option<Line>,
}

/// How a player measures up to one slot.
#[derive(Debug, Clone, Copy, PartialEq)]
struct SlotFit {
    fit: u8,
    ip: Option<u8>,
    oop: Option<u8>,
    position: Option<usize>,
}

impl Measure {
    fn new(roles: &SlotRoles) -> Self {
        let resolve = |phase: Phase, key: &Option<String>| {
            key.as_deref().and_then(|key| role(phase, key)).map(|role| (role, role_weights(role)))
        };
        let ip = resolve(Phase::InPossession, &roles.in_possession);
        let oop = resolve(Phase::OutOfPossession, &roles.out_of_possession);
        let line = ip.as_ref().or(oop.as_ref()).map(|(role, _)| role.line);
        Measure { roles: roles.clone(), ip, oop, line }
    }

    /// His fit for one of the slot's roles, and the position he would play it in.
    fn one(
        &self,
        player: &PlayerSummary,
        measured: &Option<(&'static Role, Vec<(usize, f32)>)>,
    ) -> Option<(u8, usize)> {
        let (role, weights) = measured.as_ref()?;
        let rating = role_rating(&player.attributes, weights)?;
        let (position, position_rating) = role
            .line
            .positions(self.roles.side)
            .iter()
            .map(|&i| (i, player.position_ratings[i]))
            .max_by_key(|&(i, rating)| (rating, std::cmp::Reverse(i)))?;
        Some((fit_of(rating, position_rating), position))
    }

    fn of(&self, player: &PlayerSummary, weight: f32) -> SlotFit {
        let ip = self.one(player, &self.ip);
        let oop = self.one(player, &self.oop);
        let fit = match (ip, oop) {
            (Some((ip, _)), Some((oop, _))) => (weight * f32::from(ip) + (1.0 - weight) * f32::from(oop)).round() as u8,
            (Some((one, _)), None) | (None, Some((one, _))) => one,
            (None, None) => 0,
        };
        SlotFit { fit, ip: ip.map(|(fit, _)| fit), oop: oop.map(|(fit, _)| fit), position: ip.or(oop).map(|(_, p)| p) }
    }
}

/// The assignment of rows to columns with the highest total `value`, each row to a column of its own: for each row,
/// its column. Needs at least as many columns as rows. The Hungarian method with potentials, in O(rows² × columns).
fn assign(rows: usize, columns: usize, value: impl Fn(usize, usize) -> f64) -> Vec<usize> {
    assert!(rows <= columns, "{rows} rows for {columns} columns");
    if rows == 0 {
        return Vec::new();
    }
    // Minimises cost = -value; index 0 of rows and columns is a sentinel.
    let cost = |i: usize, j: usize| -value(i - 1, j - 1);
    let (mut u, mut v) = (vec![0.0f64; rows + 1], vec![0.0f64; columns + 1]);
    let mut row_of = vec![0usize; columns + 1];
    let mut way = vec![0usize; columns + 1];
    for i in 1..=rows {
        row_of[0] = i;
        let mut j0 = 0;
        let mut min = vec![f64::INFINITY; columns + 1];
        let mut used = vec![false; columns + 1];
        loop {
            used[j0] = true;
            let i0 = row_of[j0];
            let (mut delta, mut j1) = (f64::INFINITY, 0);
            for j in 1..=columns {
                if !used[j] {
                    let reduced = cost(i0, j) - u[i0] - v[j];
                    if reduced < min[j] {
                        min[j] = reduced;
                        way[j] = j0;
                    }
                    if min[j] < delta {
                        delta = min[j];
                        j1 = j;
                    }
                }
            }
            for j in 0..=columns {
                if used[j] {
                    u[row_of[j]] += delta;
                    v[j] -= delta;
                } else {
                    min[j] -= delta;
                }
            }
            j0 = j1;
            if row_of[j0] == 0 {
                break;
            }
        }
        loop {
            let j1 = way[j0];
            row_of[j0] = row_of[j1];
            j0 = j1;
            if j0 == 0 {
                break;
            }
        }
    }
    let mut column_of = vec![0usize; rows];
    for j in 1..=columns {
        if row_of[j] != 0 {
            column_of[row_of[j] - 1] = j - 1;
        }
    }
    column_of
}

/// A player in a slot.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Placed {
    pub player: PlayerSummary,
    /// 0–100: his fit for the slot's two roles together, and for each.
    pub fit: u8,
    pub in_possession: Option<u8>,
    pub out_of_possession: Option<u8>,
    /// The position he plays there, a key of `crate::POSITIONS`.
    pub position: Option<&'static str>,
}

/// One slot of the line-up.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LineupSlot {
    pub index: usize,
    #[serde(flatten)]
    pub roles: SlotRoles,
    pub line: Option<Line>,
    /// The position it most likely is, from its line and side.
    pub position: Option<&'static str>,
    /// Who plays it in the first eleven and in the second; none where nobody fits it at all.
    pub first: Option<Placed>,
    pub second: Option<Placed>,
    /// The players left out of the first eleven who fit it best, best first.
    pub cover: Vec<Placed>,
}

/// A tactic's best eleven and second eleven.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Lineup {
    pub slots: Vec<LineupSlot>,
    /// The average fit of each eleven, over all eleven slots, 0–100.
    pub first_average: f32,
    pub second_average: f32,
    /// The squad the elevens were picked from.
    pub squad_size: usize,
}

/// How many players a slot's cover names.
const COVER: usize = 3;

/// Gives each sided slot whose side is not known the side the other slot of its pair is not on: of two full-backs,
/// one is on the right and one on the left.
fn complete_sides(slots: &mut [SlotRoles], lines: &[Option<Line>]) {
    let group = |line: Option<Line>| match line {
        Some(Line::FullBack | Line::WingBack) => Some(0),
        Some(Line::Wide) => Some(1),
        _ => None,
    };
    for g in [0, 1] {
        let members: Vec<usize> = (0..slots.len()).filter(|&i| group(lines[i]) == Some(g)).collect();
        if let [a, b] = members[..] {
            let opposite = |side: Side| match side {
                Side::Right => Side::Left,
                Side::Left => Side::Right,
            };
            match (slots[a].side, slots[b].side) {
                (Some(side), None) => slots[b].side = Some(opposite(side)),
                (None, Some(side)) => slots[a].side = Some(opposite(side)),
                _ => {}
            }
        }
    }
}

/// The value of a fit in an assignment: each point of fit, and a little for a player who fits at all, so that an
/// empty slot is filled when anyone can play it.
fn value_of(fit: &SlotFit) -> f64 {
    if fit.fit == 0 { 0.0 } else { f64::from(fit.fit) + 0.01 }
}

/// The best assignment of `players` to the slots `measures` names: for each slot, the index of its player and his
/// fit, none where nobody fits it.
fn best_assignment(measures: &[Measure], players: &[&PlayerSummary], weight: f32) -> Vec<Option<(usize, SlotFit)>> {
    let fits: Vec<Vec<SlotFit>> = measures.iter().map(|m| players.iter().map(|p| m.of(p, weight)).collect()).collect();
    // Placeholders stand in for missing players, so there are never fewer columns than slots.
    let columns = players.len().max(measures.len());
    let picked = assign(measures.len(), columns, |slot, column| fits[slot].get(column).map_or(0.0, value_of));
    picked
        .into_iter()
        .enumerate()
        .map(|(slot, column)| fits[slot].get(column).filter(|fit| fit.fit > 0).map(|&fit| (column, fit)))
        .collect()
}

fn placed(player: &PlayerSummary, fit: SlotFit) -> Placed {
    Placed {
        player: player.clone(),
        fit: fit.fit,
        in_possession: fit.ip,
        out_of_possession: fit.oop,
        position: fit.position.map(|i| crate::POSITIONS[i]),
    }
}

fn average(assignment: &[Option<(usize, SlotFit)>]) -> f32 {
    if assignment.is_empty() {
        return 0.0;
    }
    assignment.iter().map(|a| a.map_or(0.0, |(_, fit)| f32::from(fit.fit))).sum::<f32>() / assignment.len() as f32
}

/// The best eleven and second eleven of `players` in the slots `roles` names, with `weight` the share of the role in
/// possession (0 to 1).
pub fn best_lineup(roles: &[SlotRoles], players: &[&PlayerSummary], weight: f32) -> Lineup {
    let weight = weight.clamp(0.0, 1.0);
    let lines: Vec<Option<Line>> = roles.iter().map(|r| Measure::new(r).line).collect();
    let mut roles = roles.to_vec();
    complete_sides(&mut roles, &lines);
    let measures: Vec<Measure> = roles.iter().map(Measure::new).collect();

    let first = best_assignment(&measures, players, weight);
    let starting: Vec<usize> = first.iter().flatten().map(|&(i, _)| i).collect();
    let rest: Vec<&PlayerSummary> =
        players.iter().enumerate().filter(|(i, _)| !starting.contains(i)).map(|(_, &p)| p).collect();
    let second = best_assignment(&measures, &rest, weight);

    let slots = measures
        .iter()
        .enumerate()
        .map(|(k, m)| {
            let mut cover: Vec<Placed> = rest
                .iter()
                .map(|p| (p, m.of(p, weight)))
                .filter(|(_, fit)| fit.fit > 0)
                .map(|(p, fit)| placed(p, fit))
                .collect();
            cover.sort_by(|a, b| b.fit.cmp(&a.fit).then(b.player.current_ability.cmp(&a.player.current_ability)));
            cover.truncate(COVER);
            LineupSlot {
                index: k,
                roles: m.roles.clone(),
                line: m.line,
                position: m.line.and_then(|line| position_of(line, m.roles.side)),
                first: first[k].map(|(i, fit)| placed(players[i], fit)),
                second: second[k].map(|(i, fit)| placed(rest[i], fit)),
                cover,
            }
        })
        .collect();
    Lineup { slots, first_average: average(&first), second_average: average(&second), squad_size: players.len() }
}

/// How much `candidate` would raise the average fit of the best eleven of `squad` in the slots `roles` names, in
/// points of fit (0–100); 0 when he would not get in.
pub fn eleven_gain(roles: &[SlotRoles], squad: &[&PlayerSummary], candidate: &PlayerSummary, weight: f32) -> f32 {
    let base = best_lineup(roles, squad, weight).first_average;
    let mut with: Vec<&PlayerSummary> = squad.to_vec();
    with.push(candidate);
    (best_lineup(roles, &with, weight).first_average - base).max(0.0)
}

/// A tactic the editor knows its own way: a formation with a role for each slot, to measure a squad against.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceTactic {
    /// Its formation, e.g. `4-2-3-1`.
    pub name: &'static str,
    pub slots: Vec<SlotRoles>,
}

/// The formations the squad is compared in, besides the manager's own tactics.
pub fn reference_tactics() -> Vec<ReferenceTactic> {
    use Side::{Left as L, Right as R};
    let s = SlotRoles::new;
    vec![
        ReferenceTactic {
            name: "4-2-3-1",
            slots: vec![
                s("gk", "gk", None),
                s("fb", "fb", Some(R)),
                s("cb", "cb", None),
                s("bcb", "cb", None),
                s("fb", "fb", Some(L)),
                s("dm", "dm", None),
                s("bbm", "cm", None),
                s("w", "w", Some(R)),
                s("am", "am", None),
                s("if", "w", Some(L)),
                s("cfd", "cfd", None),
            ],
        },
        ReferenceTactic {
            name: "4-3-3",
            slots: vec![
                s("gk", "gk", None),
                s("fb", "fb", Some(R)),
                s("cb", "cb", None),
                s("bcb", "cb", None),
                s("fb", "fb", Some(L)),
                s("dm", "dm", None),
                s("cm", "cm", None),
                s("bbm", "pcm", None),
                s("if", "tw", Some(R)),
                s("w", "tw", Some(L)),
                s("cfd", "cfd", None),
            ],
        },
        ReferenceTactic {
            name: "4-4-2",
            slots: vec![
                s("gk", "gk", None),
                s("fb", "fb", Some(R)),
                s("cb", "cb", None),
                s("ncb", "cb", None),
                s("fb", "fb", Some(L)),
                s("wm", "wm", Some(R)),
                s("cm", "cm", None),
                s("bbm", "pcm", None),
                s("wm", "wm", Some(L)),
                s("dlf", "cfd", None),
                s("p", "ocf", None),
            ],
        },
        ReferenceTactic {
            name: "3-5-2",
            slots: vec![
                s("gk", "gk", None),
                s("wcb", "wcb", None),
                s("cb", "cb", None),
                s("wcb", "wcb", None),
                s("wb", "wb", Some(R)),
                s("dm", "dm", None),
                s("cm", "cm", None),
                s("ap", "cm", None),
                s("wb", "wb", Some(L)),
                s("cfd", "cfd", None),
                s("p", "ocf", None),
            ],
        },
        ReferenceTactic {
            name: "3-4-2-1",
            slots: vec![
                s("gk", "gk", None),
                s("wcb", "wcb", None),
                s("cb", "cb", None),
                s("wcb", "wcb", None),
                s("wb", "wb", Some(R)),
                s("dm", "dm", None),
                s("bbm", "pcm", None),
                s("wb", "wb", Some(L)),
                s("am", "am", None),
                s("ss", "sam", None),
                s("cfd", "cfd", None),
            ],
        },
    ]
}

/// The parts of the team a slot's line belongs to, for the comparison of tactics.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Unit {
    Goalkeeper,
    Defence,
    Midfield,
    Attack,
}

impl Unit {
    fn of(line: Line) -> Self {
        match line {
            Line::Goalkeeper => Unit::Goalkeeper,
            Line::CentreBack | Line::FullBack | Line::WingBack => Unit::Defence,
            Line::DefensiveMidfield | Line::CentralMidfield => Unit::Midfield,
            Line::AttackingMidfield | Line::Wide | Line::Striker => Unit::Attack,
        }
    }
}

/// A fit from which a slot counts as covered: a player who suits its roles well.
pub const COVERED_FIT: u8 = 60;

/// How well the squad fills one tactic.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TacticRank {
    /// The formation's name for a reference tactic; none for one of the manager's own.
    pub name: Option<&'static str>,
    /// Which of the manager's tactics it is (0 the one in use), for one of his own.
    pub own: Option<usize>,
    pub style: Option<String>,
    pub slots: Vec<SlotRoles>,
    /// Slots whose first-eleven player fits them from [`COVERED_FIT`], of how many.
    pub covered: usize,
    pub size: usize,
    pub first_average: f32,
    pub second_average: f32,
    /// The average fit of the first eleven by part of the team, in [`Unit`] order where the tactic has that part.
    pub units: Vec<(Unit, f32)>,
}

fn rank(roles: &[SlotRoles], players: &[&PlayerSummary], weight: f32) -> (Lineup, usize, Vec<(Unit, f32)>) {
    let lineup = best_lineup(roles, players, weight);
    let covered = lineup.slots.iter().filter(|s| s.first.as_ref().is_some_and(|p| p.fit >= COVERED_FIT)).count();
    let mut units = Vec::new();
    for unit in [Unit::Goalkeeper, Unit::Defence, Unit::Midfield, Unit::Attack] {
        let fits: Vec<f32> = lineup
            .slots
            .iter()
            .filter(|s| s.line.map(Unit::of) == Some(unit))
            .map(|s| s.first.as_ref().map_or(0.0, |p| f32::from(p.fit)))
            .collect();
        if !fits.is_empty() {
            units.push((unit, fits.iter().sum::<f32>() / fits.len() as f32));
        }
    }
    (lineup, covered, units)
}

/// How well `players` fill each of `own` (the manager's tactics) and the reference tactics: the most covered first,
/// then by the first eleven's average fit.
pub fn compare_tactics(
    own: &[(Option<String>, Vec<SlotRoles>)],
    players: &[&PlayerSummary],
    weight: f32,
) -> Vec<TacticRank> {
    let mut ranks: Vec<TacticRank> = Vec::new();
    for (i, (style, roles)) in own.iter().enumerate() {
        let (lineup, covered, units) = rank(roles, players, weight);
        ranks.push(TacticRank {
            name: None,
            own: Some(i),
            style: style.clone(),
            slots: lineup.slots.iter().map(|s| s.roles.clone()).collect(),
            covered,
            size: roles.len(),
            first_average: lineup.first_average,
            second_average: lineup.second_average,
            units,
        });
    }
    for tactic in reference_tactics() {
        let (lineup, covered, units) = rank(&tactic.slots, players, weight);
        ranks.push(TacticRank {
            name: Some(tactic.name),
            own: None,
            style: None,
            slots: tactic.slots,
            covered,
            size: lineup.slots.len(),
            first_average: lineup.first_average,
            second_average: lineup.second_average,
            units,
        });
    }
    ranks.sort_by(|a, b| b.covered.cmp(&a.covered).then(b.first_average.total_cmp(&a.first_average)));
    ranks
}

/// The roles of a slot of one of the manager's tactics, with the side the player in it plays best when it has one.
pub fn slot_roles(tactic: &ClubTactic) -> Vec<SlotRoles> {
    tactic
        .slots
        .iter()
        .map(|slot| SlotRoles {
            in_possession: slot.in_possession.map(str::to_owned),
            out_of_possession: slot.out_of_possession.map(str::to_owned),
            side: slot.side,
        })
        .collect()
}

/// Which players a line-up is picked from.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SquadChoice {
    /// Leave out the injured and the banned.
    pub available_only: bool,
}

impl Session {
    /// The players of `club`'s senior squad a line-up is picked from: those who play for it, on loan there too, but
    /// not those it has lent out; with `choice.available_only`, none who is injured or banned.
    pub fn lineup_squad<'a>(
        &self,
        club: &ClubSummary,
        players: &'a PlayerIndex,
        choice: SquadChoice,
    ) -> Result<Vec<&'a PlayerSummary>, ScoutError> {
        let teams = self.club_teams(club, players)?;
        let Some(senior) = teams.iter().find(|team| team.index == 0) else {
            return Ok(Vec::new());
        };
        Ok(senior
            .players
            .iter()
            .filter(|member| member.plays_here && member.loan != Some(Loan::Out))
            .filter(|member| !choice.available_only || (member.injuries == 0 && member.bans == 0))
            .filter_map(|member| players.get(member.uid))
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::roles::tests::{player, set};

    #[test]
    fn assignment_beats_slot_by_slot() {
        // Row 0 takes column 0 slot by slot (9 > 8), leaving row 1 with 1; the best total puts row 0 in column 1.
        let values = [[9.0, 8.0], [7.0, 1.0]];
        assert_eq!(assign(2, 2, |i, j| values[i][j]), vec![1, 0]);
        // More columns than rows: the unused one is left out.
        let values = [[1.0, 5.0, 2.0], [4.0, 6.0, 3.0]];
        assert_eq!(assign(2, 3, |i, j| values[i][j]), vec![1, 0]);
    }

    #[test]
    fn assignment_is_optimal_on_random_tables() {
        // Every permutation of 5 columns for 4 rows, against the Hungarian method.
        let mut seed = 7u64;
        let mut next = || {
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            (seed >> 33) as f64 % 100.0
        };
        for _ in 0..50 {
            let table: Vec<Vec<f64>> = (0..4).map(|_| (0..5).map(|_| next()).collect()).collect();
            let picked = assign(4, 5, |i, j| table[i][j]);
            let total: f64 = picked.iter().enumerate().map(|(i, &j)| table[i][j]).sum();
            let mut best = 0.0f64;
            for a in 0..5 {
                for b in (0..5).filter(|&b| b != a) {
                    for c in (0..5).filter(|&c| c != a && c != b) {
                        for d in (0..5).filter(|&d| d != a && d != b && d != c) {
                            best = best.max(table[0][a] + table[1][b] + table[2][c] + table[3][d]);
                        }
                    }
                }
            }
            assert!((total - best).abs() < 1e-9, "{total} against {best}");
        }
    }

    fn defenders() -> Vec<SlotRoles> {
        vec![SlotRoles::new("cb", "cb", None), SlotRoles::new("dm", "dm", None)]
    }

    #[test]
    fn a_versatile_player_goes_where_he_is_missed_least() {
        // A plays both lines well; B only centre-back; C only defensive midfield, and badly.
        let mut a = player(1, 15, &["dc", "dm"], 20);
        set(&mut a, "passing", 15);
        let b = player(2, 14, &["dc"], 20);
        let c = player(3, 8, &["dm"], 20);
        let lineup = best_lineup(&defenders(), &[&a, &b, &c], IN_POSSESSION_WEIGHT);
        let uid = |slot: usize| lineup.slots[slot].first.as_ref().map(|p| p.player.uid);
        assert_eq!(uid(0), Some(2));
        assert_eq!(uid(1), Some(1));
        assert!(lineup.slots[1].second.as_ref().is_some_and(|p| p.player.uid == 3));
    }

    #[test]
    fn nobody_is_placed_where_he_cannot_play() {
        let keeper = player(1, 15, &["gk"], 20);
        let lineup = best_lineup(&defenders(), &[&keeper], IN_POSSESSION_WEIGHT);
        assert!(lineup.slots.iter().all(|slot| slot.first.is_none()));
        assert_eq!(lineup.first_average, 0.0);
    }

    #[test]
    fn the_other_full_back_is_on_the_other_side() {
        let mut slots = vec![SlotRoles::new("fb", "fb", Some(Side::Right)), SlotRoles::new("fb", "fb", None)];
        complete_sides(&mut slots, &[Some(Line::FullBack), Some(Line::FullBack)]);
        assert_eq!(slots[1].side, Some(Side::Left));
    }

    #[test]
    fn a_signing_counts_only_if_he_gets_in() {
        let squad_a = player(1, 12, &["dc"], 20);
        let squad_b = player(2, 12, &["dm"], 20);
        let better = player(3, 17, &["dc"], 20);
        let worse = player(4, 6, &["dc"], 20);
        let squad = [&squad_a, &squad_b];
        assert!(eleven_gain(&defenders(), &squad, &better, IN_POSSESSION_WEIGHT) > 10.0);
        assert_eq!(eleven_gain(&defenders(), &squad, &worse, IN_POSSESSION_WEIGHT), 0.0);
    }

    #[test]
    fn reference_tactics_name_known_roles_for_eleven() {
        for tactic in reference_tactics() {
            assert_eq!(tactic.slots.len(), 11, "{}", tactic.name);
            for slot in &tactic.slots {
                let ip = slot.in_possession.as_deref().unwrap();
                let oop = slot.out_of_possession.as_deref().unwrap();
                assert!(role(Phase::InPossession, ip).is_some(), "{} {ip}", tactic.name);
                assert!(role(Phase::OutOfPossession, oop).is_some(), "{} {oop}", tactic.name);
            }
        }
    }

    #[test]
    fn tactics_are_ranked_by_how_much_the_squad_covers() {
        let squad: Vec<PlayerSummary> = (0..11)
            .map(|i| {
                let at: &[&str] = match i {
                    0 => &["gk"],
                    1 => &["dr"],
                    2 | 3 => &["dc"],
                    4 => &["dl"],
                    5 | 6 => &["dm", "mc"],
                    7 => &["amr", "mr"],
                    8 => &["amc"],
                    9 => &["aml", "ml"],
                    _ => &["st"],
                };
                player(i, 16, at, 20)
            })
            .collect();
        let refs: Vec<&PlayerSummary> = squad.iter().collect();
        let ranks = compare_tactics(&[], &refs, IN_POSSESSION_WEIGHT);
        assert_eq!(ranks.len(), reference_tactics().len());
        assert_eq!(ranks[0].name, Some("4-2-3-1"));
        assert!(ranks.windows(2).all(|w| w[0].covered >= w[1].covered));
    }
}
