// Editing: the Rust commands that change the game, and how stored values are shown.

import { call } from "./api";
import { converts, toPounds, toShown } from "./currency";
import type {
  ApplyReport,
  BatchUndo,
  CaptainRole,
  Scouted,
  ScoutingOverview,
  ScoutRequest,
  Lineup,
  OwnTactic,
  Phase,
  PlayerRoles,
  SlotRoles,
  SquadChoice,
  TacticRank,
  ClubName,
  ClubTeam,
  EditField,
  Entity,
  FieldEdit,
  FieldValues,
  FmDate,
  FreezeKind,
  LoggedChange,
  MassFilters,
  MassOperation,
  MassPreview,
  MassReport,
  MovePreview,
  MoveTerms,
  Nation,
  RoomMaker,
  StadiumName,
  TeamAction,
  TeamFreeze,
  TieKind,
} from "./types";

/** The fields of players or of staff the editor can change, in display order. */
export const editFields = (entity: Entity) => call<EditField[]>("edit_fields", { entity });

/**
 * Brings the player `uid` back from his loan: it now ends on the game's date, its last day, and he is back at his club
 * the next day. Logged like a change of `loan.expires`, which Undo in Changes puts back; null when
 * the loan ends then already.
 */
export const recallLoan = (uid: number) => call<LoggedChange | null>("recall_loan", { uid });

/** Freezes the money of the club `club`, or unfreezes it; the clubs whose money is frozen now. */
export const freezeMoney = (club: number, frozen: boolean) => call<number[]>("freeze_money", { club, frozen });

/** The clubs whose money is frozen: while the app is connected, their balance does not go down. */
export const frozenClubs = () => call<number[]>("frozen_clubs");

/** Freezes the attributes of the player `uid`, or unfreezes them; the players whose attributes are frozen now. */
export const freezeAttributes = (uid: number, frozen: boolean) => call<number[]>("freeze_attributes", { uid, frozen });

/** The players whose attributes are frozen: while the app is connected, they do not get worse. */
export const frozenPlayers = () => call<number[]>("frozen_players");

/** Freezes the attributes of the member of staff `id`, or unfreezes them; the staff whose attributes are frozen now. */
export const freezeStaffAttributes = (id: number, frozen: boolean) =>
  call<number[]>("freeze_staff_attributes", { id, frozen });

/** The members of staff whose attributes are frozen: while the app is connected, they do not get worse. */
export const frozenStaff = () => call<number[]>("frozen_staff");

/**
 * Freezes the energy and match sharpness of the player `uid`, or unfreezes them; the players whose energy and match
 * sharpness are frozen now.
 */
export const freezeFitness = (uid: number, frozen: boolean) => call<number[]>("freeze_fitness", { uid, frozen });

/** The players whose energy and match sharpness are frozen: while the app is connected, they do not go down. */
export const frozenFitness = () => call<number[]>("frozen_fitness");

/**
 * Freezes the position ratings of the player `uid`, or unfreezes them; the players whose positions are frozen now.
 */
export const freezePositions = (uid: number, frozen: boolean) =>
  call<number[]>("freeze_positions", { uid, frozen });

/** The players whose position ratings are frozen: while the app is connected, they stay as they are. */
export const frozenPositions = () => call<number[]>("frozen_positions");

/**
 * Freezes what `kind` names for every player of the team `team` of the club `club`, those out on loan too, or
 * unfreezes it. Refused at once while those fields may not be written; a player who cannot be frozen is in `failed`.
 */
export const freezeTeam = (club: number, team: number, kind: FreezeKind, frozen: boolean) =>
  call<TeamFreeze>("freeze_team", { club, team, kind, frozen });

/**
 * Sets every attribute of the player `uid` to its best: 20, and 1 for injury proneness and dirtiness. The changes are
 * logged as one batch, undone with `undoBatch`; `applied` counts them.
 */
export const maxAttributes = (uid: number) => call<MassReport>("max_attributes", { uid });

/**
 * Sets every attribute of the member of staff `id` to its best: 20. The changes are logged as one batch, undone with
 * `undoBatch`; `applied` counts them.
 */
export const maxStaffAttributes = (id: number) => call<MassReport>("max_staff_attributes", { id });

/** The nations of the people in the lists, by name: what a nation field can be set to. */
export const listNations = () => call<Nation[]>("list_nations");

/** Every editable field of one player or member of staff, as stored, read from the game now. */
export const readValues = (entity: Entity, uid: number) => call<FieldValues>("read_values", { entity, uid });

/** Writes `edits` (values as stored). Each one is checked and written on its own; refused ones change nothing. */
export const applyEdits = (entity: Entity, uid: number, edits: FieldEdit[]) =>
  call<ApplyReport>("apply_edits", { entity, uid, edits });

/** Every change written this session, newest first. */
export const changeLog = () => call<LoggedChange[]>("change_log");

/** Writes back the old value of a logged change; fails if the game has changed the value since. */
export const undoChange = (id: number) => call<LoggedChange>("undo_change", { id });

/** The whole percentage the game shows (0–100) for a stored one (0–10000), for a profile that has no field table. */
export const wholePercent = (stored: number): number => Math.floor((stored + 50) / 100);

/**
 * The value the game shows for a stored one: attributes are stored 0–100 and shown 1–20, percentages are stored
 * 0–10000 and shown 0–100, and money is stored in pounds and shown in the chosen currency (see `currency.ts`). A
 * blank, such as an asking price that is not set, is shown as it is stored.
 */
export function shownValue(field: EditField, stored: number): number {
  if (field.kind === "i32") {
    return stored === field.blank ? stored : toShown(stored);
  }
  switch (field.scale) {
    case "attribute":
      return Math.min(20, Math.max(1, Math.floor((stored + 2) / 5)));
    case "percent":
      return wholePercent(stored);
    default:
      return stored;
  }
}

/**
 * Whether `field` is stored otherwise than it is shown, as attributes, percentages and money in another currency than
 * pounds are: what is shown is rounded or converted, so a list of changes has the values as stored in a hover text.
 * False for a field the table lacks.
 */
export const isStoredFiner = (field: EditField | undefined): boolean =>
  field !== undefined && (field.scale !== "plain" || (field.kind === "i32" && converts));

/**
 * The stored value to write for a value typed as shown: the middle of the stored values the game shows as it; for
 * money, the nearest whole pound.
 */
export function storedValue(field: EditField, shown: number): number {
  if (field.kind === "i32") {
    return shown === field.blank ? shown : toPounds(shown);
  }
  switch (field.scale) {
    case "attribute":
      return shown * 5;
    case "percent":
      return shown * 100;
    default:
      return shown;
  }
}

/** The values an input for `field` takes, as shown. */
export function shownRange(field: EditField): { min: number; max: number } {
  return { min: shownValue(field, field.min), max: shownValue(field, field.max) };
}

/**
 * The edit to send when the input of `field` holds `shown`, given the stored value it started from: null when
 * the game would show the same value as before, so an attribute's stored value is not rounded for nothing.
 */
export function editFor(field: EditField, stored: number, shown: number): FieldEdit | null {
  return shownValue(field, stored) === shown ? null : { field: field.key, value: storedValue(field, shown) };
}

/** The date a stored date value (a number like 20290630) stands for; null for 0 or anything that is not a date. */
export function dateFromNumber(value: number): FmDate | null {
  const year = Math.floor(value / 10_000);
  const month = Math.floor(value / 100) % 100;
  const day = value % 100;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate(); // days in that month
  return value > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days ? { year, month, day } : null;
}

/** The stored value of a date: a number like 20290630. */
export const numberFromDate = (date: FmDate): number => date.year * 10_000 + date.month * 100 + date.day;

/** A stored date value as a date input holds it (`YYYY-MM-DD`); "" for 0 or anything that is not a date. */
export function isoFromNumber(value: number): string {
  const date = dateFromNumber(value);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return date ? `${pad(date.year, 4)}-${pad(date.month)}-${pad(date.day)}` : "";
}

/** The stored date value of a date input's `YYYY-MM-DD`; null until it holds a whole, real date. */
export function numberFromIso(text: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const value = Number(match[1]) * 10_000 + Number(match[2]) * 100 + Number(match[3]);
  return dateFromNumber(value) ? value : null;
}

/**
 * Works out a mass edit: `operations` on every player, member of staff or club that `query` and the entity's
 * filter in `filters` select, from the values the game holds now. Nothing is written until `applyMassEdit`.
 */
export const planMassEdit = (entity: Entity, query: string, filters: MassFilters, operations: MassOperation[]) =>
  call<MassPreview>("plan_mass_edit", { entity, query, filters, operations });

/** Writes the mass edit previewed as `id`, exactly as shown; each change only if the value is still the one previewed. */
export const applyMassEdit = (id: number) => call<MassReport>("apply_mass_edit", { id });

/** Undoes every change of a mass edit that is not undone yet. */
export const undoBatch = (batch: number) => call<BatchUndo>("undo_batch", { batch });

/**
 * Checks that the player `uid` can move to the club `club` on `terms`, and names both clubs. Nothing is written;
 * when he cannot move, the error says why (a loan, a club a human manager runs, a squad list with no room, ...).
 * With `release`, that player of the club (one of `roomMakers`) is released to make room for him.
 */
export const planClubMove = (uid: number, club: number, terms: MoveTerms, fee?: number, release?: number) =>
  call<MovePreview>("plan_club_move", { uid, club, terms, fee, release });

/**
 * The players of the club's senior team that a move to it can release to make room in its full squad list, the one
 * to suggest first: neither injured nor a captain, then the weakest.
 */
export const roomMakers = (club: number) => call<RoomMaker[]>("room_makers", { club });

/**
 * Checks that the loan of the player `uid` can be made permanent on `terms`, the club he is on loan to paying his own
 * one `fee` pounds if given, and names the clubs (`from` his own, `to` the one he stays at). Nothing is written.
 */
export const planLoanPermanent = (uid: number, terms: MoveTerms, fee?: number) =>
  call<MovePreview>("plan_loan_permanent", { uid, terms, fee });

/**
 * Makes the loan of the player `uid` permanent: he stays where he plays, now under contract with the club he was on
 * loan to, and leaves his own. Logged as a move between the two clubs, which one undo takes back.
 */
export const makeLoanPermanent = (uid: number, terms: MoveTerms, fee?: number) =>
  call<LoggedChange>("make_loan_permanent", { uid, terms, fee });

/**
 * Checks that the player `uid` can be released from his club, and names it. Nothing is written; when he cannot be
 * released, the error says why (a loan, a club a human manager runs, ...).
 */
export const planRelease = (uid: number) => call<ClubName>("plan_release", { uid });

/**
 * Releases the player from his club, which leaves him a free agent: logged as a change of his `club` to 0, and undone
 * like a move.
 */
export const releasePlayer = (uid: number) => call<LoggedChange>("release_player", { uid });

/**
 * Points the player's tie `index` at another nation or club (by UID), and gives a training another homegrown rule;
 * what is left out stays. Logged and undone like any change.
 */
export const changeTie = (uid: number, index: number, change: { nation?: number; club?: number; rule?: number }) =>
  call<LoggedChange>("change_tie", { uid, index, ...change });

/**
 * Gives the clause `index` of the player's contract another amount (pounds) or condition; what is left out stays, and
 * only what the clause has can be changed. Logged and undone like any change.
 */
export const changeClause = (uid: number, index: number, change: { amount?: number; condition?: number }) =>
  call<LoggedChange>("change_clause", { uid, index, ...change });

/** Takes the clause `index` out of the player's contract. Logged and undone like any change. */
export const removeClause = (uid: number, index: number) => call<LoggedChange>("remove_clause", { uid, index });

/**
 * Gives the player's contract, which has none, a release clause of `amount` pounds, where its list has room (see
 * `PlayerDetails.clauseRoom`). Logged and undone like any change.
 */
export const addReleaseClause = (uid: number, amount: number) =>
  call<LoggedChange>("add_release_clause", { uid, amount });

/** Takes the player's tie `index` out of his list. Logged and undone like any change. */
export const removeTie = (uid: number, index: number) => call<LoggedChange>("remove_tie", { uid, index });

/**
 * Gives the player a tie to the nation or club with the UID `target`, under the homegrown rule `rule` for a training:
 * where his list has no room, the app grows it (see `PlayerDetails.tiesGrow`). Logged and undone like any change.
 */
export const addTie = (uid: number, tie: TieKind, target: number, rule?: number) =>
  call<LoggedChange>("add_tie", { uid, tie, target, rule });

/** The homegrown rules `changeTie` and `addTie` write, by the game's code. */
export const homegrownRules = () => call<number[]>("homegrown_rules");

/**
 * Checks that the member of staff can move to the club, as `job` (a contract code) if given, else in his own job, and
 * names the clubs; the error says why he cannot. One who has no club is signed, as `job`, on a contract the app makes
 * on `terms`, which the answer says (`MovePreview.staffContract`).
 */
export const planStaffMove = (uid: number, club: number, job?: number, terms?: MoveTerms) =>
  call<MovePreview>("plan_staff_move", { uid, club, job, terms });

/**
 * Moves the member of staff to the club, as `job` if given (else in the departments he works in), or signs one who has
 * no club as `job` on `terms`; logged and undone like any change.
 */
export const moveStaff = (uid: number, club: number, job?: number, terms?: MoveTerms) =>
  call<LoggedChange>("move_staff", { uid, club, job, terms });

/** Gives the member of staff another job at his club (a contract code); logged and undone like any change. */
export const changeStaffJob = (uid: number, job: number) => call<LoggedChange>("change_staff_job", { uid, job });

/** The jobs `changeStaffJob` gives, and a move or signing of staff can, by contract code. */
export const staffJobs = () => call<number[]>("staff_jobs");

/** `staffJobs`, asked once: they do not change during a connection. A failure is asked again the next time. */
let offeredJobs: Promise<number[]> | null = null;
export const offeredStaffJobs = (): Promise<number[]> =>
  (offeredJobs ??= staffJobs().catch((e: unknown) => {
    offeredJobs = null;
    throw e;
  }));

/**
 * Moves the player to the senior team of the club on `terms`; the move is logged and undone like any change. With
 * `release`, that player of the club is released in the same move, to make room: one change, undone as one.
 */
export const movePlayer = (uid: number, club: number, terms: MoveTerms, fee?: number, release?: number) =>
  call<LoggedChange>("move_player", { uid, club, terms, fee, release });

/**
 * Checks that the players `uid` and `other` can swap clubs, each joining the other's senior team on his own contract,
 * and names the clubs (`from` is the club of `uid`). Nothing is written; when they cannot, the error says why.
 */
export const planClubSwap = (uid: number, other: number) => call<MovePreview>("plan_club_swap", { uid, other });

/** Swaps the clubs of two players; logged as one change of the first player's club, undone as one. */
export const swapPlayers = (uid: number, other: number) => call<LoggedChange>("swap_players", { uid, other });

/**
 * Heals every current injury of the player, as the game does when he gets over them. Logged as one change of his
 * field `injuries` from how many he had to 0, and undone as one; fails when he has none.
 */
export const healPlayer = (uid: number) => call<LoggedChange>("heal_player", { uid });

/**
 * Lifts every current ban of the player, as the game does once he has served them; his other absences stay. Logged
 * as one change of his field `bans` from how many he had to 0, and undone as one; fails when he has none.
 */
export const liftBans = (uid: number) => call<LoggedChange>("lift_bans", { uid });

/**
 * Keeps the player from retiring: the retirement the game has planned for him is taken out of its plans, and he gets
 * the trait "Will play football as long as possible" in place of "Will retire at top". Logged as one change of his
 * field `retirement` to 0, and undone as one; fails with "retirement.none" when there is nothing to change.
 */
export const keepPlaying = (uid: number) => call<LoggedChange>("keep_playing", { uid });

/** The teams of a club, the senior team first, with their players and the live values a squad screen shows. */
export const clubSquads = (uid: number) => call<ClubTeam[]>("club_squads", { uid });

/**
 * Makes the player `uid` the captain or vice-captain of the club's team `team` (see `ClubTeam.index`); he must play
 * for that team. When he held the other role, the two captains swap. Logged with `captaincy` and undone as one change.
 * Fails with "captain.notInTeam" or "captain.unchanged".
 */
export const setCaptain = (club: number, team: number, role: CaptainRole, uid: number) =>
  call<LoggedChange>("set_captain", { club, team, role, uid });

/**
 * Does `action` to every player of the club's team `team`, those out on loan too. The changes are logged as one
 * batch, undone with `undoBatch`; `applied` counts the changes (an injured player healed counts once).
 */
export const teamAction = (club: number, team: number, action: TeamAction) =>
  call<MassReport>("team_action", { club, team, action });

/** The human manager's club, its money, its squad line by line and the players to let go; fast. */
export const scoutingOverview = () => call<ScoutingOverview>("scouting_overview");

/** Players a scout would recommend for the position `request` describes, for the human manager's club. */
export const scoutingSuggest = (request: ScoutRequest) => call<Scouted>("scouting_suggest", { request });

/** The human manager's tactics, read from the game's memory (a few seconds). */
export const scoutingTactics = () => call<OwnTactic[]>("scouting_tactics");

/** The best eleven and second eleven of the senior squad in `slots`. */
export const scoutingLineup = (slots: SlotRoles[], weight: number, choice: SquadChoice) =>
  call<Lineup>("scouting_lineup", { slots, weight, choice });

/** How well the senior squad fills the manager's tactics `own` and the editor's formations. */
export const scoutingCompare = (own: { style: string | null; slots: SlotRoles[] }[], weight: number, choice: SquadChoice) =>
  call<TacticRank[]>("scouting_compare", { own, weight, choice });

/** How the player suits every role, and what he would best train for `role` (his best one in possession when null). */
export const playerRoles = (uid: number, role: { key: string; phase: Phase } | null = null) =>
  call<PlayerRoles>("player_roles", { uid, role });

/**
 * The name of the stadium the club plays at, with the names it can take in place (see `StadiumName`). Only reads the
 * game.
 */
export const stadiumName = (club: number) => call<StadiumName>("stadium_name", { club });

/**
 * Renames the stadium the club plays at, in the block the game gave its name: `name` must take as many bytes as
 * `stadiumName` allows. Logged and undone like any change.
 */
export const renameStadium = (club: number, name: string) => call<LoggedChange>("rename_stadium", { club, name });
