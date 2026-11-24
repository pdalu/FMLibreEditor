//! How well a player suits each role of the tactics screen, and what he would best train to suit one better.
//!
//! A role's fit is the scout's measure (see [`crate::scouting`]): his attributes for the role, weighted as [`ROLES`]
//! weighs them, on a scale where a role rating of 5 is no fit at all and 17 a full one, held back where the role's
//! positions are new to him. It is the editor's own reading of what each role asks for; the game's own is not known.
//! Everything here works on what the player list holds, and reads nothing from the game.

use serde::Serialize;

use crate::filter::player_attribute;
use crate::players::PlayerSummary;
use crate::scouting::{Line, Phase, ROLES, Role, Side, position_factor, role_rating};

/// The weight of an attribute a role leans on most, against 1 for one that helps.
pub(crate) const KEY_WEIGHT: f32 = 3.0;

/// A role rating that is no fit at all, and the span above it to a full one.
const NO_FIT: f32 = 5.0;
const FIT_SPAN: f32 = 12.0;

/// The attribute weights of `role`, by place in [`PlayerSummary::attributes`].
pub(crate) fn role_weights(role: &Role) -> Vec<(usize, f32)> {
    let key = role.key_attributes.iter().map(|key| (key, KEY_WEIGHT));
    let other = role.other_attributes.iter().map(|key| (key, 1.0));
    key.chain(other).filter_map(|(key, weight)| player_attribute(key).map(|i| (i, weight))).collect()
}

/// A fit (0–100) from a role rating (1–20) and a position rating (1–20).
pub(crate) fn fit_of(rating: f32, position_rating: u8) -> u8 {
    ((rating - NO_FIT) / FIT_SPAN * 100.0 * position_factor(position_rating)).round().clamp(0.0, 100.0) as u8
}

/// How a player suits one role.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleFit {
    /// The role's key and phase, as in [`ROLES`].
    pub key: &'static str,
    pub phase: Phase,
    pub line: Line,
    /// 0–100.
    pub fit: u8,
    /// His attributes for the role, 1–20.
    pub rating: f32,
    /// The position he would play it in (a key of `crate::POSITIONS`), the best of the role's for him, and his rating
    /// there (1–20).
    pub position: &'static str,
    pub position_rating: u8,
}

/// How `player` suits `role` on `side` (either side when none): in the role's position that suits him best.
pub fn role_fit(player: &PlayerSummary, role: &'static Role, side: Option<Side>) -> Option<RoleFit> {
    let rating = role_rating(&player.attributes, &role_weights(role))?;
    let (position, position_rating) = role
        .line
        .positions(side)
        .iter()
        .map(|&i| (i, player.position_ratings[i]))
        .max_by_key(|&(i, rating)| (rating, std::cmp::Reverse(i)))?;
    Some(RoleFit {
        key: role.key,
        phase: role.phase,
        line: role.line,
        fit: fit_of(rating, position_rating),
        rating,
        position: crate::POSITIONS[position],
        position_rating,
    })
}

/// How `player` suits every role, the best first.
pub fn role_fits(player: &PlayerSummary) -> Vec<RoleFit> {
    let mut fits: Vec<RoleFit> = ROLES.iter().filter_map(|role| role_fit(player, role, None)).collect();
    fits.sort_by(|a, b| b.fit.cmp(&a.fit).then(b.rating.total_cmp(&a.rating)));
    fits
}

/// The role in `phase` that suits `player` best.
pub fn best_role(player: &PlayerSummary, phase: Phase) -> Option<RoleFit> {
    ROLES
        .iter()
        .filter(|role| role.phase == phase)
        .filter_map(|role| role_fit(player, role, None))
        .max_by(|a, b| a.fit.cmp(&b.fit).then(a.rating.total_cmp(&b.rating)))
}

/// An attribute worth training for a role.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrainingFocus {
    /// An attribute key, e.g. `passing`.
    pub attribute: &'static str,
    /// His value now, 1–20.
    pub value: u8,
    /// What one more point of it adds to his fit for the role, in points of fit.
    pub gain: f32,
    /// Whether the role leans on it most.
    pub key: bool,
}

/// What an attribute group gives to training at `age`, 0 to 1: a young player's body still grows, technique is learnt
/// best before the late twenties, and the mind keeps learning longest.
fn trainability(group: &str, age: Option<u16>) -> f32 {
    let age = age.unwrap_or(24);
    match group {
        "physical" => match age {
            ..=21 => 1.0,
            22..=24 => 0.8,
            25..=27 => 0.5,
            28..=30 => 0.25,
            _ => 0.1,
        },
        "technical" | "goalkeeping" => match age {
            ..=23 => 1.0,
            24..=27 => 0.75,
            28..=30 => 0.5,
            _ => 0.3,
        },
        _ => match age {
            ..=27 => 1.0,
            28..=31 => 0.8,
            _ => 0.6,
        },
    }
}

/// The attribute group `key` belongs to.
fn group_of(key: &str) -> &'static str {
    crate::ATTRIBUTE_GROUPS.iter().find(|(_, keys)| keys.contains(&key)).map_or("", |(group, _)| group)
}

/// How many attributes training advice names.
const FOCUS: usize = 5;

/// The attributes `player` would best train to suit `role` better, the most worthwhile first: those that add most to
/// his fit for each point, where his age still lets them grow and they are not near the top already.
pub fn training_focus(player: &PlayerSummary, role: &'static Role) -> Vec<TrainingFocus> {
    let weights = role_weights(role);
    let total: f32 = weights.iter().map(|&(_, w)| w).sum();
    let Some(fit) = role_fit(player, role, None) else {
        return Vec::new();
    };
    if total <= 0.0 {
        return Vec::new();
    }
    let keys: Vec<&'static str> = crate::filter::attribute_keys(crate::ATTRIBUTE_GROUPS).collect();
    // One point of role rating is this much fit, in the position he would play the role in.
    let per_point = 100.0 / FIT_SPAN * position_factor(fit.position_rating);
    let mut focus: Vec<(f32, TrainingFocus)> = weights
        .iter()
        .filter_map(|&(i, weight)| {
            let value = *player.attributes.get(i)?;
            let attribute = *keys.get(i)?;
            if value == 0 || value >= 20 {
                return None;
            }
            let gain = weight / total * per_point;
            // The nearer the top, the slower an attribute grows.
            let room = f32::from(20 - value) / 19.0;
            let worth = gain * trainability(group_of(attribute), player.age) * (0.4 + 0.6 * room);
            let key = role.key_attributes.contains(&attribute);
            Some((worth, TrainingFocus { attribute, value, gain: (gain * 10.0).round() / 10.0, key }))
        })
        .collect();
    focus.sort_by(|a, b| b.0.total_cmp(&a.0));
    focus.into_iter().take(FOCUS).map(|(_, focus)| focus).collect()
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::scouting::role;

    /// A player with every attribute at `value` and the rating `rating` in the positions `at`.
    pub(crate) fn player(uid: u32, value: u8, at: &[&str], rating: u8) -> PlayerSummary {
        let count = crate::filter::attribute_keys(crate::ATTRIBUTE_GROUPS).count();
        let mut ratings = [1u8; 15];
        for key in at {
            let i = crate::POSITIONS.iter().position(|p| p == key).expect("a position");
            ratings[i] = rating;
        }
        PlayerSummary {
            uid,
            name: format!("Player {uid}"),
            full_name: None,
            date_of_birth: None,
            age: Some(24),
            nation: None,
            nation_uid: None,
            nation_address: 0,
            club: None,
            club_uid: None,
            positions: Vec::new(),
            contract_expires: None,
            current_ability: 120,
            potential_ability: 140,
            position_ratings: ratings,
            attributes: vec![value; count],
            transfer_listed: false,
            loan_listed: false,
            transfer_value: None,
            woman: None,
            address: 0,
            shift: 0,
        }
    }

    pub(crate) fn set(player: &mut PlayerSummary, key: &str, value: u8) {
        player.attributes[player_attribute(key).expect("an attribute")] = value;
    }

    #[test]
    fn every_role_weighs_attributes_the_list_holds() {
        for role in ROLES {
            assert_eq!(
                role_weights(role).len(),
                role.key_attributes.len() + role.other_attributes.len(),
                "{} {:?}",
                role.key,
                role.phase
            );
        }
    }

    #[test]
    fn fit_spans_no_fit_to_a_full_one() {
        assert_eq!(fit_of(5.0, 20), 0);
        assert_eq!(fit_of(17.0, 20), 100);
        assert_eq!(fit_of(20.0, 20), 100);
        assert_eq!(fit_of(11.0, 20), 50);
        assert_eq!(fit_of(17.0, 9), 0);
    }

    #[test]
    fn a_role_is_played_in_its_best_position() {
        let p = player(1, 15, &["dl"], 20);
        let fit = role_fit(&p, role(Phase::InPossession, "fb").unwrap(), None).unwrap();
        assert_eq!(fit.position, "dl");
        assert_eq!(fit.position_rating, 20);
        assert_eq!(fit.fit, 83);
        let right = role_fit(&p, role(Phase::InPossession, "fb").unwrap(), Some(Side::Right)).unwrap();
        assert_eq!(right.fit, 0);
    }

    #[test]
    fn a_striker_suits_striker_roles_best() {
        let mut p = player(1, 8, &["st"], 20);
        for key in ["finishing", "off_the_ball", "anticipation", "composure", "acceleration", "first_touch"] {
            set(&mut p, key, 18);
        }
        let best = best_role(&p, Phase::InPossession).unwrap();
        assert_eq!(best.line, Line::Striker);
        assert_eq!(best.key, "p");
        assert_eq!(role_fits(&p).len(), ROLES.len());
    }

    #[test]
    fn training_names_key_attributes_first_and_skips_the_top() {
        let mut p = player(1, 10, &["dc"], 20);
        set(&mut p, "marking", 20);
        let focus = training_focus(&p, role(Phase::InPossession, "cb").unwrap());
        assert_eq!(focus.len(), FOCUS);
        assert!(focus.iter().all(|f| f.attribute != "marking"));
        assert!(focus[0].key);
        assert!(focus[0].gain > 0.0);
    }

    #[test]
    fn older_players_train_their_mind_before_their_body() {
        let mut p = player(1, 10, &["dc"], 20);
        p.age = Some(32);
        let focus = training_focus(&p, role(Phase::InPossession, "cb").unwrap());
        assert!(["marking", "tackling", "heading", "positioning"].contains(&focus[0].attribute), "{:?}", focus[0]);
        p.age = Some(18);
        let young = training_focus(&p, role(Phase::InPossession, "cb").unwrap());
        assert!(young.iter().any(|f| f.attribute == "jumping_reach" || f.attribute == "strength"));
    }
}
