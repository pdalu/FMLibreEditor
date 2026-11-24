//! Football Manager specific logic shared by the probe and the app: recognising a
//! running game, locating its entity arrays, decoding what they hold and changing it.

#![cfg(any(windows, target_os = "macos"))]

#[cfg(target_os = "macos")]
pub mod bridge_setup;
mod calibrate;
mod clauses;
mod clubs;
mod coded;
mod date;
mod details;
mod edit;
mod export;
mod filter;
mod game;
mod graphics;
mod health;
mod index;
mod lineup;
mod loans;
mod locate;
mod mass;
mod medical;
mod object_pool;
mod own_memory;
mod players;
mod profile;
mod relations;
mod retirement;
mod roles;
pub mod rtti;
mod scan;
mod scouting;
mod selection;
mod session;
mod signing;
mod squad;
mod squad_report;
mod stadium_name;
mod staff;
mod staff_move;
mod text;
mod transfer;

pub use calibrate::{ArrayRef, EntityArrays, calibrate};
pub use clauses::{
    ClausePlan, ClauseSet, MOST_CLAUSE_AMOUNT, MOST_CLAUSE_CONDITION, RELEASE_CLAUSE, RELEASE_CLAUSES,
    release_clause_expiry, release_clause_never_expires,
};
pub use clubs::{
    ClubDetails, ClubIndex, ClubSummary, Finances, SUPPORTER_MIX, SUPPORTER_TRAITS, read_club_details, read_clubs,
};
pub use coded::Coded;
pub use date::FmDate;
pub use details::{
    ATTRIBUTE_GROUPS, Attribute, Clause, Contract, International, PERSONALITY, POSITIONS, PlayerDetails, Reputation,
    read_player_details,
};
pub use edit::{Change, EditError, Entity, Field, Kind, LOAN_EXPIRES, LOAN_OPTION_FEE, Scale, Target, fields};
pub use export::{ExportFormat, ExportHeader, Exported};
pub use filter::{
    AttributeBound, ClubFilter, PlayerFilter, PlayerOrder, PlayerSort, StaffFilter, StaffOrder, StaffSort,
    sort_players, sort_staff,
};
pub use game::{GAME_EXE, GAME_PLUGIN, GameInfo, Storefront};
pub use graphics::{GraphicsCounts, GraphicsIndex, Picture};
pub use health::{Check, CheckResult, DateEvidence, DateFit, Health, Lock, STRUCTURE};
pub use index::{Listed, SearchIndex};
pub use lineup::{
    COVERED_FIT, IN_POSSESSION_WEIGHT, Lineup, LineupSlot, Placed, ReferenceTactic, SlotRoles, SquadChoice, TacticRank,
    Unit, best_lineup, compare_tactics, eleven_gain, reference_tactics, slot_roles,
};
pub use loans::{LoanDetails, LoanEnd, LoanTerms};
pub use locate::{
    DatePlace, Found, Place, date_candidates, holds_retirement_manager, retirement_guesses, search_retirement_manager,
};
pub use mass::{Operation, Plan, Planned, Skipped};
pub use medical::{Ban, HealPlan, Healed, Injury, LiftPlan, Lifted};
pub use object_pool::ObjectPool;
pub use players::{Nation, PLAYABLE_RATING, PlayerIndex, PlayerSummary, is_woman, nations, read_players};
pub use profile::{
    ArrayRvas, BuildProfile, ContractLayout, Layout, PlayerLayout, PluginFingerprint, ProfileNotes, SelectionLayout,
    StaffLayout, TacticLayout, built_in_profiles, layout_for, profile_for, profile_text,
};
pub use relations::{HOMEGROWN_RULES, Relation, RelationPlan, RelationSet, Tie, TieTarget};
pub use retirement::{PlannedRetirement, RetirementPlan, RetirementSet};
pub use roles::{RoleFit, TrainingFocus, best_role, role_fit, role_fits, training_focus};
pub use scan::{ArrayCandidate, ScanOptions, VtableCount, scan_object_arrays};
pub use scouting::{
    Buyer, ClubTactic, Fitting, LIKELY, Line, NOT_FOR_SALE, Phase, Purpose, ROLES, Reason, Role, SCOUT_POSITIONS,
    ScoutError, ScoutOrder, ScoutPosition, ScoutRequest, Scouted, Side, Suggestion, TacticSlot, role, role_of_mask,
    scout_position,
};
pub use session::{ArraySource, IGNORE_PROFILES, Session, SessionError, find_game, profiles_ignored};
pub use signing::NewContract;
pub use squad::{CaptainPlan, CaptainRole, CaptainSet, ClubTeam, Loan, SquadMember};
pub use squad_report::{Departure, DepartureAction, DepartureReason, DepthLine, DepthPlayer, DepthStatus, SquadReport};
pub use stadium_name::{StadiumName, StadiumRename};
pub use staff::{
    STAFF_ATTRIBUTE_GROUPS, StaffContract, StaffDetails, StaffIndex, StaffSummary, job_name, read_staff,
    read_staff_details,
};
pub use staff_move::{
    DIRECTOR_OF_FOOTBALL, Department, MANAGER, NewStaffContract, Post, STAFF_JOBS, StaffChange, StaffPlan, post_of,
};
pub use text::{fold, is_name_like, read_fm_string, read_name_entry};
pub use transfer::{Amounts, ClubMoney, ClubMove, FeePlan, MAX_FEE, MoveError, MovePlan, MoveTerms, Paid, RoomMaker};
