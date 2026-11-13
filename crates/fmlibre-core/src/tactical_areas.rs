//! The tactical areas of FM27's Tactical Effectiveness screen.
//!
//! The game tracks how well players know a tactic in eight areas. Six of them take an option, a small number the game
//! works out from the tactic's team instructions; the other two, the shapes in and out of possession, follow the
//! formation. A player's familiarity with an area is highest for the option the tactic plays and falls off with the
//! distance from it.

use fmlibre_mem::is_user_pointer;

use crate::clubs::ClubSummary;
use crate::session::Session;
use crate::transfer::MoveError;

/// More human managers than a save holds.
const MOST_MANAGERS: u64 = 64;
/// Deeper than the map of a manager's teams goes.
const MOST_DEPTH: usize = 64;
/// More tactics than a manager keeps for a team.
const MOST_TACTICS: u64 = 8;

/// The tactics a human manager keeps for one of his teams.
#[derive(Debug, Clone)]
pub struct TeamTactics {
    /// Where the game keeps them: the value of the team's node in the manager's map.
    pub at: u64,
    /// The addresses of the tactics' blocks as the game lists them; one it has not built is not a pointer.
    pub blocks: Vec<u64>,
    /// The index of the one he plays.
    pub current: usize,
}

impl Session {
    /// The address of the tactic the human manager plays with the team at `team`, one of a club's teams, as the build
    /// keeps the managers' tactics ([`crate::TacticsLayout`]). `None` when the build or the layout does not place them,
    /// or when no human manager picks the team's tactics.
    pub fn tactic_in_use(&self, team: u64) -> Result<Option<u64>, MoveError> {
        let block = self.team_tactics(team)?.and_then(|tactics| tactics.blocks.get(tactics.current).copied());
        Ok(block.filter(|&block| is_user_pointer(block)))
    }

    /// The tactics the human manager keeps for the team at `team`, and which he plays. `None` as
    /// [`Session::tactic_in_use`].
    pub fn team_tactics(&self, team: u64) -> Result<Option<TeamTactics>, MoveError> {
        let (Some(rva), Some(t)) = (self.profile.as_ref().and_then(|p| p.tactics_manager), &self.layout.tactics) else {
            return Ok(None);
        };
        let process = &self.process;
        let id = process.read_u32(team + t.team_id)? as i32;
        let root = process.read_u64(self.plugin.base + rva)?;
        if !is_user_pointer(root) {
            return Ok(None);
        }
        let (first, last) = (process.read_u64(root + t.managers)?, process.read_u64(root + t.managers + 8)?);
        if !is_user_pointer(first) || last < first || last - first > 8 * MOST_MANAGERS {
            return Ok(None);
        }
        for at in (first..last).step_by(8) {
            let manager = process.read_u64(at)?;
            if !is_user_pointer(manager) {
                continue;
            }
            // Down the map, by the ids as the game compares them.
            let (walk, mut node) = t.tree.root(process, manager + t.teams)?;
            for _ in 0..MOST_DEPTH {
                if !walk.is_node(process, node)? {
                    break;
                }
                let key = process.read_u32(node + t.key)? as i32;
                if key == id {
                    let value = node + t.value;
                    let (begin, end) = (process.read_u64(value + t.tactics)?, process.read_u64(value + t.tactics + 8)?);
                    let current = process.read_bytes(value + t.current, 1)?[0] as i8;
                    let count = if is_user_pointer(begin) && end >= begin { (end - begin) / 8 } else { 0 };
                    if current < 0 || current as u64 >= count.min(MOST_TACTICS) {
                        return Ok(None);
                    }
                    let mut blocks = Vec::new();
                    for index in 0..count.min(MOST_TACTICS) {
                        blocks.push(process.read_u64(begin + 8 * index)?);
                    }
                    return Ok(Some(TeamTactics { at: value, blocks, current: current as usize }));
                }
                node = walk.children(process, node)?[usize::from(key < id)];
            }
        }
        Ok(None)
    }

    /// The options of the tactic the human manager plays with the senior team of `club` in the six areas that take
    /// one ([`area_options`]); `None` where [`Session::tactic_in_use`] finds none.
    pub fn senior_area_options(&self, club: &ClubSummary) -> Result<Option<[i8; 6]>, MoveError> {
        let Some(at) = self.layout.tactics.as_ref().map(|t| t.instructions) else {
            return Ok(None);
        };
        let Some(&team) = self.team_objects(club)?.first() else {
            return Ok(None);
        };
        let Some(block) = self.tactic_in_use(team)? else {
            return Ok(None);
        };
        Ok(Some(area_options([self.process.read_u64(block + at)?, self.process.read_u64(block + at + 8)?])))
    }
}

/// The option the tactic plays in each of the six areas that take one, from the two words of its team instructions
/// ([`crate::TacticsLayout::instructions`]), as the game works them out when it builds the tactic's record
/// (game_plugin+0x4845f0c, macOS 26340721). Area 0 is the line of engagement and area 1 the pressing intensity.
pub fn area_options([first, second]: [u64; 2]) -> [i8; 6] {
    let bit = |word: u64, n: u32| word >> n & 1 == 1;
    // The first of the shifts whose bit is set, in the order given.
    let shift = |word: u64, shifts: &[(u32, i32)]| shifts.iter().find(|&&(n, _)| bit(word, n)).map_or(0, |s| s.1);
    // The game keeps an option of at least 1.
    let at_least_one = |option: i32| option.max(1) as i8;

    let line = if bit(first, 61) {
        17
    } else if bit(first, 63) {
        3
    } else {
        10
    };
    let line = line + shift(first, &[(56, 3), (57, 2), (58, -2), (59, -3)]);

    let intensity = match () {
        _ if bit(second, 1) => 17,
        _ if bit(second, 2) => 14,
        _ if bit(second, 3) => 6,
        _ if bit(second, 4) => 3,
        _ => 10,
    } + shift(second, &[(6, 3), (7, -3)]);

    let area2 = if bit(second, 16) {
        20
    } else if bit(second, 17) {
        1
    } else {
        10
    };

    let area3 = match () {
        _ if bit(first, 1) => 17,
        _ if bit(first, 2) => 14,
        _ if bit(first, 3) => 6,
        _ if bit(first, 4) => 3,
        _ => 10,
    } + shift(first, &[(46, 3), (47, 2), (48, -2), (49, -3)]);

    let area4 = match () {
        _ if bit(first, 7) => 17,
        _ if bit(first, 8) => 3,
        _ => 10,
    } + shift(first, &[(44, 3), (45, -3)]);

    let area5 = if bit(first, 9) {
        13
    } else if bit(first, 17) {
        7
    } else {
        10
    } + shift(first, &[(15, 2), (16, -2)])
        + shift(first, &[(5, 2), (6, -2)])
        + shift(first, &[(54, 3), (55, -3)]);

    [at_least_one(line), at_least_one(intensity), area2, at_least_one(area3), at_least_one(area4), at_least_one(area5)]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn line_of_engagement_follows_the_instruction() {
        // Benevento's Tiki-Taka, as read on the Mac (24 August 2026): a low block, then a high press.
        let low_block = 0x82 << 56;
        let high_press = 0x22 << 56;
        assert_eq!(area_options([low_block, 0])[0], 5);
        assert_eq!(area_options([high_press, 0])[0], 19);
        assert_eq!(area_options([0, 0]), [10, 10, 10, 10, 10, 10]);
    }

    #[test]
    fn options_of_a_tactic_read_in_the_game() {
        // Benevento's Tiki-Taka (Mac, 24 August 2026): the options the game wrote into the players' training history.
        let tiki_taka = [0x8261_100A_108A_1088, 0x8064];
        assert_eq!(area_options(tiki_taka), [5, 17, 10, 4, 20, 10]);
        // The same with a high press.
        assert_eq!(area_options([0x2261_100A_108A_1088, 0x8064]), [19, 17, 10, 4, 20, 10]);
    }

    #[test]
    fn options_never_fall_below_one() {
        // A low block pushed down further: 3 - 3.
        assert_eq!(area_options([1 << 63 | 1 << 59, 0])[0], 1);
        // Low intensity, lowered again: 3 - 3.
        assert_eq!(area_options([0, 1 << 4 | 1 << 7])[1], 1);
    }

    #[test]
    fn area_two_takes_one_of_three_options() {
        assert_eq!(area_options([0, 1 << 16])[2], 20);
        assert_eq!(area_options([0, 1 << 17])[2], 1);
        assert_eq!(area_options([0, 1 << 16 | 1 << 17])[2], 20);
    }
}
