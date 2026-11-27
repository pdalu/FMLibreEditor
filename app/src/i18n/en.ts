// The English text of the UI, and the shape every language has: `tr.ts`, `es.ts` and `id.ts` are typed `Strings`,
// which is `typeof en`, so a key that one dictionary has and another lacks fails the build. A new language is a new
// file like them, which `index.ts` then offers and `SettingsMenu.tsx` gives a flag.
//
// Keys of the game data map to the names FM uses; every other string of the panels is in `profile` (those only the
// club panel has, in `clubProfile`), and those of the player, staff and club lists in `playerList`, `staffList` and
// `clubList` (the saved player filters are in `playerList.filters.saved`). Editing has `edit` (and `fields` for the
// names of the fields), the Changes view `changes`, mass editing `massEdit`, comparing players `comparison`, moving a
// player to another club or swapping him with one `move`, a club's squad `squad`, the sidebar and the connect panel
// `app`, and the graphics packs the pictures come from `graphics`. The components read them through `labels.ts`.
//
// The text functions (counts, summaries, "was …") are written per language: plurals and word order differ, so a
// language builds its sentences itself.

import type {
  CheckKey,
  Concern,
  EditEntity,
  Entity,
  ExportEntity,
  ExportFormat,
  GraphicsCounts,
  MassOperationKind,
  MassPreview,
  OpportunityKind,
  PlayerSort,
  SessionChoice,
  SquadSort,
  StaffSort,
  Storefront,
} from "../types";
import { fieldName } from "./fieldNames";
import { reasonText } from "./reasons";
import { REASONS_EN } from "./reasons/en";

const numbers = new Intl.NumberFormat("en-GB");
const percents = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** A count or an amount with the thousands separators of the language: "12,345". */
const format = (value: number) => numbers.format(value);

/** "No changes", "1 change", "3 changes", "12,345 changes". */
const changeCount = (count: number) =>
  count === 0 ? "No changes" : count === 1 ? "1 change" : `${format(count)} changes`;

/** "1 player", "12 players". */
const playerCount = (count: number) => (count === 1 ? "1 player" : `${format(count)} players`);

/** "1 value left alone", "12 values left alone". */
const valuesLeftAlone = (count: number) =>
  count === 1 ? "1 value left alone" : `${format(count)} values left alone`;

/** "237 players", "1 player", "237 staff", "1 member of staff", "12 clubs", "1 club". */
const entityCount: Record<Entity, (count: number) => string> = {
  player: (count) => (count === 1 ? "1 player" : `${format(count)} players`),
  staff: (count) => (count === 1 ? "1 member of staff" : `${format(count)} staff`),
  club: (count) => (count === 1 ? "1 club" : `${format(count)} clubs`),
};

/** What each list holds, in the plural. */
const entityNouns: Record<Entity, string> = { player: "players", staff: "staff", club: "clubs" };

/**
 * Squad statuses, by the codes contracts hold them as; named as the game's English contract screen names them. 15, 16,
 * 17, 20 and 21 are goalkeepers' (21 is the game's "Emergency Backup" too).
 */
const SQUAD_STATUSES: Partial<Record<number, string>> = {
  1: "Star player",
  2: "Important player",
  3: "Regular starter",
  4: "Squad player",
  5: "Impact sub",
  7: "Fringe player",
  9: "Emergency backup",
  10: "Breakthrough prospect",
  11: "Future prospect",
  13: "Youngster",
  14: "B team regular",
  15: "First-choice goalkeeper",
  16: "Cup goalkeeper",
  17: "Domestic cup goalkeeper",
  20: "Backup",
  21: "Emergency backup (goalkeeper)",
  22: "Surplus to requirements",
};

/** The kinds of contract, by the codes contracts hold them as; 8, 10 and 11 are the MLS's, and the game
 * shows 8 and 11 under one name. */
const CONTRACT_TYPES: Partial<Record<number, string>> = {
  0: "Part-time contract",
  1: "Full-time contract",
  2: "Amateur contract",
  3: "Youth contract",
  4: "Non-contract",
  8: "Senior contract",
  10: "Senior minimum salary contract",
  11: "Senior contract",
};

/**
 * Sentences for the failures of the Rust commands, by code (see `describeError` in format.ts). Each gets the values
 * the failure names, its amounts and dates already written out; fields come as keys, which `fieldName` names. A code
 * a dictionary leaves out shows the English message the command sent.
 */
export type ErrorTexts = Partial<Record<string, (params: Readonly<Record<string, string>>) => string>>;

/** The name of the field a failure names. */
const field = (key: string | undefined) => fieldName(en, key ?? "");

/** A day the commands name as "20280131", written out: "31 January 2028". */
const dayText = (value: string | undefined) => {
  const [y, m, d] = [Number(value?.slice(0, 4)), Number(value?.slice(4, 6)), Number(value?.slice(6, 8))];
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/** What a check is about, from the key a failure gives, with a capital: "Contracts". */
const checkName = (key: string | undefined) => {
  const name = (en.checks as Partial<Record<string, string>>)[key ?? ""] ?? key ?? "";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

/** The commands' own English is kept where it names no field. */
const errors: ErrorTexts = {
  "team.nobodyInjured": () => "Nobody in this team is injured.",
  "team.noCohesion": () =>
    "The editor cannot read this team's cohesion: this version of the game has not been checked for it, or none of its players has an entry for the club.",
  "team.noTactics": () =>
    "The editor cannot read how well this team knows its tactic: this version of the game has not been checked for it, or the team does not play a tactic you pick.",
  "edit.unknownField": (p) => `There is no editable field “${p.field}” here.`,
  "edit.outOfRange": (p) => `${p.value} is not a valid ${field(p.field)}: it takes ${p.min} to ${p.max}.`,
  "edit.notADate": (p) => `${p.value} is not a date for ${field(p.field)}.`,
  "edit.notAChoice": (p) => `${p.value} is not one of the values ${field(p.field)} takes.`,
  "edit.taken": (p) => `Squad number ${p.value} is taken: ${p.name ?? `the player with UID ${p.uid}`} wears it.`,
  "edit.unsupported": (p) => `${field(p.field)} cannot be changed that way: ${p.reason}.`,
  "edit.noRecord": (p) => `${field(p.field)} cannot be changed here: its record is missing or does not check out.`,
  "edit.unset": (p) => `${field(p.field)} is not set in the game, so it was left alone.`,
  "edit.implausible": (p) => `${field(p.field)} reads ${p.value}, which it cannot hold; it was left alone to be safe.`,
  "edit.notApplied": (p) => `${field(p.field)}: wrote ${p.wrote} but read back ${p.read}.`,
  "edit.conflict": (p) => `${field(p.field)} is now ${p.found}, not ${p.expected}: the game has changed it since.`,
  "move.outOfRange": (p) => `${p.value} is not a valid ${field(p.field)}: it takes ${p.min} to ${p.max}.`,
  "loan.end": (p) => `The loan must end after he joins, and no later than his contract: from ${dayText(p.earliest)} to ${dayText(p.latest)}.`,
  "loan.noModel": () =>
    "The game has no loan of its own under way to model this one on. Try again after a day has passed in the game.",
  "names.unknown": () =>
    "The editor cannot find where the game keeps people's names in this version of the game, so it cannot change them.",
  "names.noRoom": (p) =>
    `The game has no room for another new ${({ first: "first name", last: "last name", common: "common name" } as Record<string, string>)[p.table] ?? "name"} just now. ` +
    "It makes room itself as new players and staff come in; or save the game, load the save again, and try again.",
  "names.same": () => "That is the name already.",
  "names.bad": (p) =>
    `A first or last name cannot be empty, and no name can start or end with a space, hold control characters or take more than ${p.max} bytes.`,
  "export.failed": (p) => `Could not write the file: ${p.reason}`,
  "export.notAllowed": (p) =>
    `FMLibreEditor may not write to ${p.folder}. If macOS asked whether it may use your Documents folder, allow it ` +
    "in System Settings › Privacy & Security › Files & Folders, then export again.",
  "export.openFailed": (p) => `Could not open it: ${p.reason}`,
  "guard.unknownBuild": () =>
    "FMLibreEditor has not been checked with this version of the game, so it does not write to it. Edit anyway, in " +
    "the notice at the top, turns editing on.",
  "guard.failed": (p) =>
    `${checkName(p.check)} did not check out in this version of the game, so FMLibreEditor leaves them unchanged.`,
  "guard.saveChanged": () =>
    "The game has loaded a save, or gone back to its main menu, since FMLibreEditor read it, so it changes nothing " +
    "until you reload the data.",
  "memory.noBridge": () =>
    "macOS does not let FMLibreEditor into the game: the game was started without the FMLibreEditor bridge. Set " +
    "the bridge up, then start the game again from Steam.",
  "staff.directorTaken": (p) =>
    `${p.name ?? "Someone else"} is the club's director of football already. Give this member of staff another job ` +
    `there, or move ${p.name ?? "that one"} first.`,
  "staff.managerTaken": (p) =>
    `${p.name ?? "Someone else"} is the club's manager already. Give this member of staff another job there, or ` +
    `move ${p.name ?? "that one"} first.`,
  "staff.yourClub": () =>
    "You manage this club. Give this member of staff another job there: FMLibreEditor never takes your place.",
  "staff.noJob": () => "Choose the job they take at the club.",
  "staff.noModel": (p) =>
    p.staff === "0"
      ? "This club has no staff at all: the game keeps none at clubs of leagues that are not playable in this save."
      : "None of this club's staff has a full contract of their own to model a new one on.",
  "scout.noClub": () => "You do not manage a club in this save, so there is nobody to scout for.",
  "scout.noTactic": (p) => `Could not read the tactic of ${p.club} from the game.`,
  "scout.notPlaced": () => "The player is not in a slot of the tactic.",
  "scout.unknownRole": (p) => `The editor does not know the role ${p.role}.`,
  "setup.steamRunning": () =>
    "Steam is running, so FM27's launch options were left alone; the bridge itself is installed. Quit Steam and " +
    "try again, or enter the launch option in Steam yourself.",
};

/**
 * The kinds of contract clauses and bonuses, by the codes contracts hold them as; named as the game's English contract
 * screen names them (6, which only the German one was seen in, after what it does). The game shows no 54, 58 or 63.
 */
const CLAUSE_NAMES_EN: Partial<Record<number, string>> = {
  0: "Minimum fee release clause",
  1: "Relegation release clause",
  2: "Non promotion release clause",
  3: "Yearly wage rise",
  4: "Promotion wage rise",
  5: "Relegation wage drop",
  6: "Release clause for a staff role",
  8: "Sell on fee percentage",
  9: "Sell on fee profit percentage",
  10: "Seasonal landmark goal bonus",
  11: "One-year extension after league games (final season)",
  12: "Match highest earner clause",
  13: "Wage after reaching club league games",
  14: "Top division promotion wage rise",
  15: "Top division relegation wage drop",
  16: "Minimum fee release clause (foreign clubs)",
  17: "Minimum fee release clause (domestic clubs in higher division)",
  18: "Minimum fee release clause (domestic clubs)",
  19: "Wage after reaching international appearances",
  20: "Percentage of wages paid by sponsor",
  21: "Percentage of gate receipts paid to player",
  22: "Optional contract extension by club",
  23: "Waive club compensation for managerial role",
  25: "One-year extension after league games (promoted final season)",
  26: "One-year extension after league games (avoid relegation final season)",
  27: "Minimum fee release clause (clubs in UEFA Champions League)",
  28: "MLS guaranteed contract clause",
  29: "Contract extension after promotion",
  30: "Injury release clause",
  31: "Minimum fee release clause (clubs in a continental competition)",
  32: "Appearance fee",
  33: "Goal bonus",
  34: "Clean sheet bonus",
  37: "International cap bonus",
  38: "Unused substitute fee",
  39: "Assist bonus",
  40: "Seasonal landmark assist bonus",
  41: "Seasonal landmark combined goal and assist bonus",
  54: "Not shown in the game (54)",
  55: "Active relegation release clause",
  56: "Active non promotion release clause",
  58: "Not shown in the game (58)",
  63: "Not shown in the game (63)",
};

/** Players' traits (preferred moves), by their bit in the game's mask; named as FMRTE names them. */
const TRAIT_NAMES_EN: readonly string[] = [
  "Runs with ball down left",
  "Runs with ball down right",
  "Runs with ball through centre",
  "Gets into opposition area",
  "Moves into channels",
  "Gets forward whenever possible",
  "Plays short simple passes",
  "Tries killer balls often",
  "Shoots from distance",
  "Shoots with power",
  "Places shots",
  "Curls ball",
  "Likes to round keeper",
  "Likes to try to beat offside trap",
  "Uses outside of foot",
  "Marks opponent tightly",
  "Winds up opponents",
  "Argues with officials",
  "Plays with back to goal",
  "Comes deep to get ball",
  "Plays one-twos",
  "Likes to lob keeper",
  "Dictates tempo",
  "Attempts overhead kicks",
  "Looks for pass rather than attempting to score",
  "Plays no through balls",
  "Stops play",
  "Knocks ball past opponent",
  "Moves ball to right foot before dribble attempt",
  "Moves ball to left foot before dribble attempt",
  "Dwells on ball",
  "Arrives late in opponents' area",
  "Tries to play way out of trouble",
  "Stays back at all times",
  "Avoids using weaker foot",
  "Tries tricks",
  "Tries long range free kicks",
  "Dives into tackles",
  "Does not dive into tackles",
  "Cuts inside",
  "Hugs line",
  "Gets crowd going",
  "Tries first time shots",
  "Tries long range passes",
  "Likes ball played into feet",
  "Hits free kicks with power",
  "Likes to beat man repeatedly",
  "Likes to switch ball to other flank",
  "Will retire at top",
  "Will play football as long as possible",
  "Possesses long flat throw",
  "Runs with ball often",
  "Runs with ball rarely",
  "Attempts to develop weaker foot",
  "Static target man",
  "Uses long throw to start counter attacks",
  "Refrains from taking long shots",
  "Cuts inside from left wing",
  "Cuts inside from right wing",
  "Crosses early",
  "Brings ball out of defence",
  "Plays ball with feet"
];

export const en = {
  attributes: {
    // Technical
    corners: "Corners",
    crossing: "Crossing",
    dribbling: "Dribbling",
    finishing: "Finishing",
    first_touch: "First Touch",
    free_kicks: "Free Kick Taking",
    heading: "Heading",
    long_shots: "Long Shots",
    long_throws: "Long Throws",
    marking: "Marking",
    passing: "Passing",
    penalty_taking: "Penalty Taking",
    tackling: "Tackling",
    technique: "Technique",
    // Mental
    aggression: "Aggression",
    anticipation: "Anticipation",
    bravery: "Bravery",
    composure: "Composure",
    concentration: "Concentration",
    decisions: "Decisions",
    determination: "Determination",
    flair: "Flair",
    leadership: "Leadership",
    off_the_ball: "Off the Ball",
    positioning: "Positioning",
    teamwork: "Teamwork",
    vision: "Vision",
    work_rate: "Work Rate",
    // Physical
    acceleration: "Acceleration",
    agility: "Agility",
    balance: "Balance",
    jumping_reach: "Jumping Reach",
    natural_fitness: "Natural Fitness",
    pace: "Pace",
    stamina: "Stamina",
    strength: "Strength",
    // Goalkeeping (first touch and passing are shared with Technical)
    aerial_reach: "Aerial Reach",
    command_of_area: "Command of Area",
    communication: "Communication",
    eccentricity: "Eccentricity",
    handling: "Handling",
    kicking: "Kicking",
    one_on_ones: "One on Ones",
    punching: "Punching (Tendency)",
    reflexes: "Reflexes",
    rushing_out: "Rushing Out (Tendency)",
    throwing: "Throwing",
    // Hidden
    consistency: "Consistency",
    dirtiness: "Dirtiness",
    important_matches: "Important Matches",
    injury_proneness: "Injury Proneness",
    versatility: "Versatility",
    // Feet
    left_foot: "Left Foot",
    right_foot: "Right Foot",
  },

  staffAttributes: {
    // Coaching
    attacking: "Attacking",
    defending: "Defending",
    fitness: "Fitness",
    goalkeeping: "Goalkeeping",
    possession: "Possession",
    set_pieces: "Set Pieces",
    tactical: "Tactical",
    technical: "Technical",
    working_with_youngsters: "Working with Youngsters",
    // Mental
    authority: "Authority",
    determination: "Determination",
    motivating: "Motivating",
    people_management: "People Management",
    // Knowledge
    data_analysis: "Data Analysis",
    judging_ability: "Judging Player Ability",
    judging_potential: "Judging Player Potential",
    judging_staff: "Judging Staff Ability",
    negotiating: "Negotiating",
    tactical_knowledge: "Tactical Knowledge",
    // Medical
    physiotherapy: "Physiotherapy",
    sports_science: "Sports Science",
  },

  personality: {
    adaptability: "Adaptability",
    ambition: "Ambition",
    loyalty: "Loyalty",
    pressure: "Pressure",
    professionalism: "Professionalism",
    sportsmanship: "Sportsmanship",
    temperament: "Temperament",
    controversy: "Controversy",
  },

  /** The abbreviations of the positions: the same in every language. */
  positions: {
    gk: "GK",
    sw: "SW",
    dl: "DL",
    dc: "DC",
    dr: "DR",
    dm: "DM",
    ml: "ML",
    mc: "MC",
    mr: "MR",
    aml: "AML",
    amc: "AMC",
    amr: "AMR",
    st: "ST",
    wbl: "WBL",
    wbr: "WBR",
  },

  clubFacilities: {
    training: "Training",
    youth_facilities: "Youth Facilities",
    youth_coaching: "Youth Coaching",
    youth_recruitment: "Youth Recruitment",
    /** Only a club with finances has it. */
    corporate: "Corporate",
  },

  supporterTraits: {
    loyalty: "Loyalty",
    passion: "Passion",
    patience: "Patience",
    affluence: "Affluence",
    temperament: "Temperament",
    expectations: "Expectations",
  },

  /** The kinds of supporters, in the order of the supporter-mix bar. */
  supporterMix: {
    hardcore: "Hardcore",
    core: "Core",
    family: "Family",
    fair_weather: "Fair-weather",
    corporate: "Corporate",
    casual: "Casual",
  },

  /** FM's job codes as stored in contracts. */
  jobs: {
    1: "Player",
    2: "Coach",
    4: "Chairperson",
    6: "Director",
    10: "Director of Football",
    12: "Physio",
    14: "Scout",
    16: "Manager",
    20: "Assistant Coach",
    22: "Set Piece Coach",
    26: "Fitness Coach",
    34: "Goalkeeping Coach",
    38: "Chief Doctor",
    40: "Head of Sports Science",
    44: "Chief Scout",
    46: "Doctor",
    48: "Sports Scientist",
    50: "Head Physio",
    58: "Recruitment Analyst",
    60: "Performance Analyst",
    62: "Head Performance Analyst",
    64: "Head of Youth Development",
    66: "Owner",
    70: "President",
    86: "Loan Manager",
    88: "Technical Director",
  },

  /** The names of the fields that are not attributes, personality or positions, by key. */
  fields: {
    current_ability: "Current ability",
    potential_ability: "Potential ability",
    height: "Height (cm)",
    date_of_birth: "Date of birth",
    asking_price: "Asking price",
    nation: "Nationality",
    city_of_birth: "City of birth",
    "reputation.home": "Home reputation",
    "reputation.current": "Current reputation",
    "reputation.world": "World reputation",
    "international.caps": "Caps",
    "international.goals": "International goals",
    "international.u21_caps": "U21 caps",
    "international.u21_goals": "U21 goals",
    // What the game changes every day.
    condition: "Energy",
    match_sharpness: "Match sharpness",
    jadedness: "Jadedness",
    morale: "Morale",
    "contract.wage": "Wage per week",
    wageShare: "share of the wage",
    monthlyFee: "monthly fee",
    optionFee: "option to buy",
    "contract.loyalty_bonus": "Loyalty bonus per week",
    "contract.happiness": "Happiness",
    "contract.playing_time_happiness": "Playing time happiness",
    "contract.unhappiness": "Reasons to be unhappy",
    "contract.expires": "Contract end",
    "contract.squad_number": "Squad number",
    "contract.squad_status": "Squad status",
    "contract.transfer_listed": "Transfer listed",
    "contract.loan_listed": "Loan listed",
    "loan.expires": "Loan end",
    "loan.option_fee": "Option to buy",
    // A member of staff's job, which the change log keeps as a change of its code.
    "contract.job": "Job",
    // A player's ties, which the change log keeps as changes of the nation or club (see `ties`).
    "tie.nationality": "Secondary nationality",
    "tie.trainedInNation": "Trained in nation",
    "tie.trainedAtClub": "Trained at club",
    "tie.workPermit": "No work permit needed in",
    // A move to another club, which the change log keeps as a change of the player's club.
    club: "Club",
    // Healing a player, which the change log keeps as a change of his injuries.
    injuries: "Injuries",
    // Setting a player's cohesion with his club, which the change log keeps as a change of it.
    cohesion: "Cohesion",
    tactics: "Tactical familiarity",
    // Lifting a player's bans, which the change log keeps as a change of his bans.
    bans: "Bans",
    // Keeping a player from retiring, which the change log keeps as a change of the date he was to retire on.
    retirement: "Retirement",
    // A change to a player's contract clauses, which the change log keeps as a change of the clause's amount.
    clause: "Contract clause",
    "clause.amount": "Clause amount",
    "clause.condition": "Clause condition",
    // Making a player the captain or vice-captain of one of a club's teams, which the change log keeps as a change of
    // the club's captain or vice-captain.
    captain: "Captain",
    vice_captain: "Vice-captain",
    // A club's own reputation, which has no home, current or world.
    reputation: "Reputation",
    "facilities.training": "Training facilities",
    "facilities.youth_facilities": "Youth facilities",
    "facilities.youth_coaching": "Youth coaching",
    "facilities.youth_recruitment": "Youth recruitment",
    "facilities.corporate": "Corporate facilities",
    "finance.balance": "Balance",
    "finance.transfer_budget": "Transfer budget",
    "finance.wage_budget": "Wage budget",
    "finance.total_wage_budget": "Total wage budget",
    "stadium.capacity": "Stadium capacity",
    "stadium.name": "Stadium name",
    "name.first": "First name",
    "name.last": "Last name",
    "name.common": "Common name",
    "name.full": "Full name",
    "stadium.seating": "Seated capacity",
    "stadium.used": "Capacity in use",
    "stadium.expansion": "Expansion capacity",
    // Prize money a club's league pays, which the change log keeps as a change of the club (see `leaguePrizes`).
    "prize.win": "League prize money per win",
    "prize.draw": "League prize money per draw",
    "prize.loss": "League prize money per loss",
  },

  profile: {
    close: "Close profile",
    loading: "Loading profile…",
    /** The handle on the left edge of the panel. */
    resize: "Resize the profile panel",
    resizeHint: "Drag to make the panel wider or narrower; double-click to reset it",
    /** Shown where a value is missing. */
    none: "—",

    // Header
    freeAgent: "Free agent",
    born: "Born",
    height: (cm: number) => `${cm} cm`,
    /** After the input of the height, while the player is edited. */
    heightUnit: "cm",
    uid: "UID",
    currentAbility: "Current ability",
    currentAbilityShort: "CA",
    potentialAbility: "Potential ability",
    potentialAbilityShort: "PA",
    /** Hover text of a potential ability that is set as a range (the game stores it as a negative number). */
    potentialRange: "Potential set as a range",

    // Attributes
    technical: "Technical",
    goalkeeping: "Goalkeeping",
    mental: "Mental",
    physical: "Physical",
    hidden: "Hidden",
    feet: "Feet",
    personality: "Personality",
    /** Hover text of an attribute: the value as stored, 0–100 unless the game stores it on another scale. */
    raw: (raw: number, scale = 100) => `raw ${raw} / ${scale}`,
    lowerIsBetter: "lower is better",
    age: (age: number) => `age ${age}`,

    // Positions
    positions: "Positions",
    positionsSummary: (best: string) => `Position ratings: ${best}`,
    /** The group of every position's rating, under the pitch. */
    positionRatings: "Position ratings",
    positionTiers: {
      natural: "Natural",
      accomplished: "Accomplished",
      competent: "Competent",
      unconvincing: "Unconvincing",
      ineffective: "Ineffective",
    },
    positionTooltip: (position: string, rating: number, tier: string) => `${position} · ${rating} · ${tier}`,

    // Contract
    contract: "Contract",
    wage: "Wage per week",
    /** Under the wage: the game keeps money in pounds; `converted` when the app shows another currency. */
    wageNote: (converted: boolean): string =>
      converted
        ? "the game keeps pounds; shown at FM's own exchange rate"
        : "the game keeps pounds; another currency can be chosen in the settings",
    signed: "Signed",
    expires: "Expires",
    joined: "Joined",
    /** Under a contract's dates: the button that makes it run `years` longer, while it does, and its hover text. */
    extendContract: (years: number) => `Extend by ${years} years`,
    extendingContract: "Extending…",
    /** `until` is the day the contract would end then. */
    extendContractTitle: (years: number, until: string) => `Make the contract run ${years} years longer, to ${until}`,
    squadStatus: "Squad status",
    squadStatusName: (status: number) => SQUAD_STATUSES[status] ?? `Status ${status}`,
    contractType: "Contract type",
    contractTypeName: (code: number) => CONTRACT_TYPES[code] ?? `Type ${code}`,
    squadNumber: "Squad number",
    transferListed: "Transfer listed",
    loanListed: "Loan listed",

    // Career
    career: "Career",
    internationalCaps: "International caps",
    internationalGoals: "International goals",
    u21Caps: "U21 caps",
    u21Goals: "U21 goals",
    askingPrice: "Asking price",
    notSet: "Not set",
    reputation: "Reputation",
    reputationHome: "Home",
    reputationCurrent: "Current",
    reputationWorld: "World",
    /** The retirement the game has planned for a player, and the button that keeps him playing. */
    retirement: "Retirement",
    retires: "Plans to retire",
    noRetirement: "The game has not planned his retirement",
    keepPlaying: "Prevent retirement",
    keepingPlaying: "Preventing…",
    keepPlayingTitle: "Cancel his planned retirement and give him the trait “Will play football as long as possible”",

    // Medical (the group's heading is `medical`, below; the names of its values are in `fields`)
    /** A player's morale, 1–20. */
    morale: (value: number) => `${value} / 20`,
    /** Hover text of his morale: the game shows it as his overall happiness. */
    /** A player's traits (preferred moves): the heading, none, and each one's name by its bit. */
    traits: "Traits",
    noTraits: "No traits",
    traitName: (bit: number) => TRAIT_NAMES_EN[bit] ?? `Trait ${bit}`,
    /** A player's reasons to be unhappy, as FMRTE lists them, and the button that removes them all. */
    unhappiness: "Unhappiness",
    noUnhappiness: "Nothing makes him unhappy",
    removeUnhappiness: "Remove all",
    removingUnhappiness: "Removing…",
    removeUnhappinessTitle: "Take every reason to be unhappy off his list",
    /** The second line of Remove all's hover text: what the game then does about his teammates. */
    removeUnhappinessFollows: "His teammates' reasons about him end once the game moves on: press Continue in the game",
    concernSince: (date: string) => `since ${date}`,
    /** After a reason held about a teammate whose sentence does not name him: who he is. */
    concernAbout: (name: string) => `about ${name}`,
    concernKind: (kind: number) => (kind === 1 ? "Concerned" : kind === 2 ? "Internal" : `Type ${kind}`),
    /** A reason by the game's sentence for it (see `reasons.ts`); a motive without one by its number. */
    concernMotive: (concern: Concern) => reasonText(REASONS_EN, concern) ?? `Reason ${concern.motive}`,
    /** A contract's clauses and bonuses: the heading, and what each kind the game has is called. */
    clauses: "Bonuses and clauses",
    noClauses: "No bonuses or clauses",
    loyaltyBonus: "Loyalty bonus",
    happiness: "Happiness",
    playingTimeHappiness: "Playing time happiness",
    moodTitle: "As FMRTE shows it, from -100 to 100; the game shows it in words",
    /** The name of a clause or bonus by its kind; a kind the app does not know yet by its number. */
    clauseName: (kind: number) => CLAUSE_NAMES_EN[kind] ?? `Clause ${kind}`,
    /** A player's loan: where he is on loan, and the button that brings him back. */
    loan: "Loan",
    loanAt: "On loan at",
    loanParent: "Belongs to",
    loanFrom: "From",
    loanUntil: "Until",
    loanNumber: "Number there",
    recall: "Recall from loan",
    recallTitle: "Bring him back to his club today; it asks first",
    recallAgain: "Recall again",
    makePermanent: "Make permanent",
    makePermanentTitle: "Keep him at the club he is on loan to, under contract with it; it asks first",
    /** Where the Recall button was, once the loan ends today: recalled by the editor, or ending today anyway. */
    recalledWaiting: "Recalled · return pending",
    endsTodayWaiting: "Ends today · return pending",
    pendingTitle: (parent: string) => `The loan ends today: continue one day in the game and he is back at ${parent}`,
    endPassed: (date: string) =>
      `The loan was to end on ${date}, but the game has not brought him back. Recall him again, then continue one day.`,
    /** The loan's terms, as the game's Loan Club tab shows them. */
    loanCanRecall: "Can be recalled",
    loanCanRecallTitle: "Whether his club may recall him in the game. Recall from loan here works either way",
    loanCanTerminate: "Can be ended early",
    loanCupMatches: "Plays in cup matches",
    loanAgainstClub: "Plays against his club",
    loanOptionFee: "Option to buy",
    loanOptionFeeTitle: "The fee for which the club he is on loan at may sign him for good",
    loanMonthlyFee: "Monthly fee",
    loanMonthlyFeeTitle: "What the club he is on loan at pays his club for each month he plays",
    loanUnusedFee: "Monthly fee if unused",
    loanUnusedFeeTitle: "What the club he is on loan at pays his club for each month he is not used",
    /** What a clause depends on, by kind: goals, assists, league games, matches, years or a percentage. */
    clauseCondition: (kind: number, value: number) => {
      switch (kind) {
        case 10:
          return value === 1 ? "1 goal" : `${value} goals`;
        case 40:
          return value === 1 ? "1 assist" : `${value} assists`;
        case 41:
          return `${value} goals and assists`;
        case 19:
          return value === 1 ? "1 international appearance" : `${value} international appearances`;
        case 11:
        case 13:
        case 25:
        case 26:
          return value === 1 ? "1 league game" : `${value} league games`;
        case 22:
        case 29:
          return value === 1 ? "1 year" : `${value} years`;
        case 3:
        case 4:
        case 5:
        case 8:
        case 9:
        case 14:
        case 15:
        case 20:
        case 21:
          return `${value}%`;
        default:
          return String(value);
      }
    },
    /** When a release clause expires: on `date`, or, with the contract's start not known, `days` after it. */
    clauseExpires: (date: string) => `expires ${date}`,
    clauseExpiresAfter: (days: number) =>
      days === 1 ? "expires 1 day after signing" : `expires ${format(days)} days after signing`,
    /** A sell-on clause on the profit: its percentage of what the selling club makes over the amount. */
    clauseProfitShare: (percent: string, amount: string) => `${percent} of the profit over ${amount}`,
    /** The wage a clause gives from then on. */
    clauseWage: (amount: string) => `${amount} a week`,
    moraleTitle: "Overall happiness in the game: content at 10, slightly happy at 11, extremely happy at 15 and 20",
    /** Hover text of jadedness, which the profile shows as stored. */
    jadednessTitle:
      "How worn out he is by playing: -500 is fully rested, and the higher it is, the more he needs a rest",
    noInjuries: "No injuries",
    /** The name of an injury the game gave none for. */
    unknownInjury: "Unknown injury",
    /** Under the name of an injury: when it began, and when he is expected back (`dates`: one date, or a range). */
    injuryStarted: (date: string) => `Started ${date}`,
    injuryBack: (dates: string) => `Expected back ${dates}`,
    /** Heals every injury of the player at once. */
    heal: "Heal",
    healTitle: "Heal every injury of this player in the game",
    noBans: "No bans",
    /** A ban: how many matches the player still has to miss, and under it when it began. */
    banMatches: (matches: number) => (matches === 1 ? "1 match" : `${format(matches)} matches`),
    banStarted: (date: string) => `From ${date}`,
    /** Lifts every ban of the player at once. */
    liftBans: "Lift",
    liftBansTitle: "Lift every ban of this player in the game",

    // Above the attributes, while the profile is read
    /** Sets every attribute of the player to its best at once. */
    maxAttributes: "Max attributes",
    maxAttributesTitle: "Set every attribute to its best: 20, and 1 for injury proneness and dirtiness",
    /** What Max attributes wrote, beside the button that takes it back; then what that undid. */
    maxAttributesDone: (count: number) =>
      count === 0 ? "Every attribute is at its best already" : `${changeCount(count)} written`,
    maxAttributesUndone: (count: number) => (count === 0 ? "Nothing was undone" : `Undid ${changeCount(count)}`),
    undoMax: "Undo",
    undoMaxTitle: "Write his old attributes back to the game",
    /** Freezing his attributes, while the game can be written to, and what that does. */
    freezeAttributes: "Freeze attributes",
    freezeAttributesNote:
      "His attributes do not get worse while the app is open and connected; improvements still count",
    /** The same for a member of staff, who has no injury proneness or dirtiness. */
    maxStaffAttributesTitle: "Set every attribute of this member of staff to its best: 20",
    undoMaxStaffTitle: "Write the old attributes back to the game",
    freezeStaffAttributesNote:
      "Their attributes do not get worse while the app is open and connected; improvements still count",
    /** Freezing his energy and match sharpness, under them in the Medical group, and what that does. */
    freezeFitness: "Freeze energy and sharpness",
    freezeFitnessNote:
      "His energy and match sharpness do not go down while the app is open and connected; gains still count",
    /** Freezing his position ratings: the box under the pitch, and the (i) after it, which says what that does. */
    freezePositions: "Freeze",
    freezePositionsInfo: "What does freezing positions do?",
    freezePositionsNote:
      "While the app is open and connected, his position ratings stay as they are: he does not learn a new position, " +
      "and his ratings neither rise nor drop. The app remembers this for this save.",

    // Staff
    /** Badge on the manager the user controls. */
    you: "You",
    youTitle: "The manager you control in this save",
    id: "ID",
    job: "Job",
    /** Giving a member of staff another job at their club, under the job in the contract. */
    changeJob: "Change job",
    changeJobTitle: "Give this member of staff another job at their club in the game",
    newJob: "New job",
    applyJob: "Apply",
    cancelJob: "Cancel",
    unemployed: "Unemployed",
    coaching: "Coaching",
    knowledge: "Knowledge",
    medical: "Medical",
    /** A coaching job held by someone who still plays. */
    playerCoach: (job: string) => `${job} (player-coach)`,
    unknownJob: (code: number) => `Job ${code}`,
  },

  /** The player list: search, filter bar and columns. */
  playerList: {
    /** The entry in the sidebar. */
    nav: "Players",
    /** In the status line, once connected. */
    count: (total: number) => `${format(total)} players`,
    search: "Search players by name or UID",
    /**
     * The line beside the search box. `sorted` is the order a column header was clicked for, or null while the
     * list is in its default order (best current ability first); its `by` is a name from `sortNames`.
     */
    summary: (total: number, shown: number, sorted: { by: string; ascending: boolean } | null) => {
      const count = `${format(total)} players`;
      if (total <= shown) {
        return count;
      }
      return sorted === null
        ? `${count} · showing the top ${shown} by current ability`
        : `${count} · showing the first ${shown} by ${sorted.by}, ${sorted.ascending ? "ascending" : "descending"}`;
    },
    /** The message under an empty table; `filtered` is whether any filter is in effect. */
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "No players match these filters." : "No players found.";
      }
      return filtered ? `No players match “${query}” with these filters.` : `No players match “${query}”.`;
    },
    columns: {
      name: "Name",
      age: "Age",
      positions: "Positions",
      nation: "Nation",
      club: "Club",
      contractExpires: "Contract",
      born: "Born",
      currentAbility: "CA",
      potentialAbility: "PA",
      uid: "UID",
    } satisfies Record<PlayerSort | "positions" | "born" | "uid", string>,
    /** Hover text of a column header that sorts the list; `by` is a name from `sortNames`. */
    sortBy: (by: string) => `Sort by ${by}`,
    /** The name of each sortable column, as the summary line and the hover text of a header say it. */
    sortNames: {
      currentAbility: "current ability",
      potentialAbility: "potential ability",
      age: "age",
      name: "name",
      nation: "nation",
      club: "club",
      contractExpires: "contract end",
    } satisfies Record<PlayerSort, string>,
    /** The filters; the staff list has those that are not about players too (see FilterBar.tsx). */
    filters: {
      /** The button that shows or hides the filters. */
      toggle: "Filters",
      /** Its name for assistive technology while `count` of the filters are in effect. */
      toggleActive: (count: number) => `Filters, ${count} active`,
      clear: "Clear",
      /** The entry of the position select that is no filter. */
      any: "Any",
      position: "Position",
      /** Whom the list shows: the select's name, and its choices after `any`. */
      gender: "Gender",
      men: "Men",
      women: "Women",
      age: "Age",
      minAge: "Minimum age",
      maxAge: "Maximum age",
      /** The hint in an empty age input. */
      minPlaceholder: "Min",
      maxPlaceholder: "Max",
      minCurrentAbility: "Min CA",
      minCurrentAbilityTitle: "Minimum current ability",
      minPotentialAbility: "Min PA",
      minPotentialAbilityTitle: "Minimum potential ability",
      /** The hint in an empty ability input: what it accepts. */
      abilityPlaceholder: "1–200",
      nation: "Nation",
      club: "Club",
      freeAgentsOnly: "Free agents only",
      contractEndsBy: "Contract ends by",
      transferListedOnly: "Transfer listed only",
      loanListedOnly: "Loan listed only",
      /** Bounds on attributes, a row each, under the other filters; the staff list has them too. */
      attributes: {
        heading: "Attributes",
        /** The select of a row, for assistive technology, and its entry before an attribute is picked. */
        attribute: "Attribute",
        pick: "Pick an attribute",
        /** The two inputs of a row, for assistive technology; `name` is the attribute, "" before one is picked. */
        min: (name: string) => (name ? `Least ${name}` : "Least"),
        max: (name: string) => (name ? `Most ${name}` : "Most"),
        add: "Add attribute",
        /** The button that takes a row away, for assistive technology and as its hover text. */
        remove: (name: string) => (name ? `Remove ${name}` : "Remove this row"),
      },
      /** Saving the filters in effect, and the sort, under a name of the user's own; the names stay as typed. */
      saved: {
        /** The button that starts saving, and its hover text. */
        save: "Save",
        saveTitle: "Save the filters and the sort in effect under a name",
        /** The name input, for assistive technology, and the hint in it while it is empty. */
        name: "Name of the saved filter",
        namePlaceholder: "Filter name",
        ok: "OK",
        cancel: "Cancel",
        /** The select of the saved filters: its name, and what it shows while none is the one in effect. */
        select: "Saved filters",
        delete: "Delete",
        /** The name and hover text of Delete; `name` is the saved filter's. */
        deleteTitle: (name: string) => `Delete the saved filter: ${name}`,
        /** The question when the name is taken; `name` is the one typed. */
        replaceQuestion: (name: string) => `A saved filter named “${name}” already exists. Replace it?`,
        replace: "Replace",
        /** When the name is a new one and `max` filters are saved already. */
        full: (max: number) =>
          `Up to ${max} filters can be saved. Delete one first, or use the name of a saved filter to replace it.`,
      },
    },
  },

  /** The staff list. */
  staffList: {
    /** The entry in the sidebar. */
    nav: "Staff",
    /** In the status line, once connected. */
    count: (total: number) => `${format(total)} staff`,
    search: "Search staff by name or ID",
    /**
     * The line beside the search box. `sorted` is the order a column header was clicked for, or null while the
     * list is in its default order (the human manager first, then the best current ability); its `by` is a name from
     * `sortNames`.
     */
    summary: (total: number, shown: number, sorted: { by: string; ascending: boolean } | null) => {
      const count = `${format(total)} staff`;
      if (total <= shown) {
        return count;
      }
      return sorted === null
        ? `${count} · showing the top ${shown} by current ability`
        : `${count} · showing the first ${shown} by ${sorted.by}, ${sorted.ascending ? "ascending" : "descending"}`;
    },
    /** The message under an empty table; `filtered` is whether any filter is in effect. */
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "No staff match these filters." : "No staff found.";
      }
      return filtered ? `No staff match “${query}” with these filters.` : `No staff match “${query}”.`;
    },
    columns: {
      name: "Name",
      age: "Age",
      job: "Job",
      club: "Club",
      nation: "Nation",
      born: "Born",
      currentAbility: "CA",
      potentialAbility: "PA",
      id: "ID",
    } satisfies Record<StaffSort | "job" | "born" | "id", string>,
    /** Hover text of a column header that sorts the list; `by` is a name from `sortNames`. */
    sortBy: (by: string) => `Sort by ${by}`,
    /** The name of each sortable column, as the summary line and the hover text of a header say it. */
    sortNames: {
      currentAbility: "current ability",
      potentialAbility: "potential ability",
      age: "age",
      name: "name",
      nation: "nation",
      club: "club",
    } satisfies Record<StaffSort, string>,
    /** The filters only the staff list has; the others are the player list's (`playerList.filters`). */
    filters: {
      job: "Job",
      /** The entry of the job select that is no filter. */
      anyJob: "Any",
      unemployedOnly: "Unemployed only",
    },
  },

  /** The club profile: what the player and staff panels do not have. */
  clubProfile: {
    // Header
    womensClub: "Women's club",
    /** "Founded 1882", in the line under the name. */
    founded: (year: number) => `Founded ${year}`,
    reputationShort: "REP",
    reputationTitle: "Reputation",

    // The tabs under the header: what the club has, and its squad (see `squad`).
    /** The name of the tabs for assistive technology. */
    tabsLabel: "Club sections",
    tabs: { overview: "Overview", squad: "Squad", staff: "Staff", stadium: "Stadium" },
    /** Hover text of the Squad tab while the club is edited: its values are on the Overview. */
    squadLocked: "Finish editing to open the squad",
    /** The same for the Staff tab (see `clubStaff`). */
    staffLocked: "Finish editing to open the staff",

    facilities: "Facilities",

    // Supporters
    supporters: "Supporters",
    supporterMix: "Supporter mix",
    /** A share of the supporters; `value` is already a percentage (35 for 35%). */
    percent: (value: number) => `${percents.format(value)}%`,
    /** Hover text of a segment of the supporter-mix bar. */
    mixTooltip: (kind: string, percent: string) => `${kind} · ${percent}`,

    // Finances
    finances: "Finances",
    balance: "Balance",
    transferBudget: "Transfer budget",
    wageBudget: "Wage budget (spending)",
    totalWageBudget: "Total wage budget",
    ticketPrice: "Average ticket price",
    /** Under the labels of the two wage budgets, which are amounts per week. */
    perWeek: "per week",
    /** Clubs outside the leagues being played have no finance record in memory. */
    noFinances: "FM keeps finances only for clubs in the leagues being played.",
    /** Freezing the club's money, while the game can be written to, and what that does. */
    freeze: "Freeze money",
    freezeNote: "The balance does not go down while the app is open and connected; income still counts",

    // Stadium
    stadium: "Stadium",
    capacity: "Capacity",
    seating: "Seated",
    used: "In use",
    /** The capacity in use when the game does not limit it (stored as 0). */
    usedAll: "All of it",
    usedTitle: "The part of the capacity the game lets in while it limits it; 0 means all of it",
    expansion: "Can grow to",
    /** When the layout of this build does not know where the stadium is, or the club's stadium did not check out. */
    noStadium: "The stadium could not be read for this club.",
    /** Its name, which can be changed in place: in the block the game gave the old one. */
    stadiumName: "Name",
    rename: "Rename",
    renameTitle: "Give the stadium another name; it is written at once",
    /** The (i) beside the name: how a new name lasts, and that the app has to stay open for it. */
    renameInfoLabel: "How does renaming work?",
    renameInfo:
      "The game keeps no stadium names in its saves: it takes them from its database each time it loads a save. So " +
      "FMLibreEditor remembers the new name for this save, and gives it back within seconds each time the game loads " +
      "it, as long as the app is open and connected. If the game loads the save while the app is closed, it shows its " +
      "own name until the app connects again. To go back to the old name, undo the rename in Changes, or rename the " +
      "stadium back.",
    saveName: "Save",
    renaming: "Saving…",
    cancelRename: "Cancel",
    /** How long the name being typed is, in bytes of UTF-8, and how long it may be. */
    nameLength: (bytes: number, min: number, max: number) =>
      min <= 1
        ? `${bytes} of at most ${max} characters (an accented letter counts as two)`
        : `${bytes} characters: from ${min} to ${max}, to fit where the game keeps the name (an accented letter counts as two)`,
    /** Instead of Rename, when other things in the game hold the same name. */
    nameShared: (holders: number) =>
      `${holders} things in the game share this name, so it cannot be changed for the stadium alone`,

    // Club info
    info: "Club info",
    seasonTickets: "Season tickets",
    socialMedia: "Social media followers",
  },

  /**
   * The Staff tab of a club's profile: the club's staff, and Release all staff, which releases every one of them the
   * editor can (not you, not the board) after a dialog that asks first.
   */
  clubStaff: {
    loading: "Reading the staff…",
    /** When the game keeps no staff for the club. */
    empty: "The game keeps no staff for this club: clubs of leagues not played in this save have none.",
    /**
     * Above the table: how many staff the club has, and how many of them stay when the rest are released (0 when there
     * is nobody to release).
     */
    count: (total: number, staying: number) => {
      const all = total === 1 ? "1 member of staff" : `${format(total)} staff`;
      return staying === 0 ? all : `${all} · ${format(staying)} stay if the rest are released`;
    },

    // The action on the whole staff
    /** The name of the group of buttons for assistive technology. */
    actionsLabel: "Actions on the whole staff",
    /** `count` is how many of the club's staff it releases. */
    releaseAll: (count: number) => (count === 0 ? "Release all staff" : `Release all staff (${format(count)})`),
    releaseAllTitle: "Release all of the club's staff but you and the board; it asks first",
    /** Hover text of Release all staff while none of the club's staff can be released. */
    releaseNone: "None of this club's staff can be released",
    /** Beside the button: whom it leaves, and where undoing is. */
    hint: "Everyone but you and the board leaves the club at once. Undo is in the Changes view as well.",
    /** What Release all did, under the button; `count` is how many were released. */
    released: (count: number) =>
      count === 1 ? "1 member of staff released" : `${format(count)} members of staff released`,
    /** A release the game refused: `name` is the member of staff's, `reason` the game's answer. */
    refused: (name: string, reason: string) => `${name}: ${reason}`,
    undo: "Undo",
    undoTitle: "Bring the released staff back to the club, on their contracts",

    // The table
    /** The table's name for assistive technology. */
    tableLabel: "The club's staff",
    /** The last column: why a member of staff stays when the rest are released (empty for one who leaves). */
    staysColumn: "Stays",
    /** The reasons, short; the hover text has the game's answer in full. */
    stays: {
      you: "You",
      board: "The board",
      player: "A player too",
      held: "Held by the club",
      other: "Cannot be released",
    },

    // The dialog that asks first
    title: "Release all staff",
    /** The club the staff leave. */
    from: "Club",
    /** The headings over those who leave and over those who stay; `count` is how many. */
    leaving: (count: number) => (count === 1 ? "1 leaves the club" : `${format(count)} leave the club`),
    staying: (count: number) => (count === 1 ? "1 stays" : `${format(count)} stay`),
    /** After the names shown: how many more there are. */
    more: (count: number) => `and ${format(count)} more`,
    doesHeading: "What it does",
    /** What the release does to each one, one line each. */
    does: [
      "Each one leaves the club's staff at once, and the contract ends: unemployed, as the game's own staff without a club are",
      "No one is paid anything",
      "A place as manager or director of football is left empty, for the club to fill",
      "You, the board and those the editor cannot release stay",
      "Listed under Changes, where one undo brings them all back on the same contracts",
    ],
    /** In the dialog's foot: nothing changes in the game until Release all. */
    dialogHint: "Nothing changes in the game until you press Release all.",
    release: "Release all",
    releasing: "Releasing…",
    cancel: "Cancel",

    // Moving the whole staff to another club: a button beside Release all staff, and a dialog that asks for the club
    moveAll: "Move all staff",
    moveAllTitle: "Move all of the club's staff but you and the board to another club; it asks first",
    /** Hover text of Move all staff while none of the club's staff can be moved. */
    moveNone: "None of this club's staff can be moved",
    /** What Move all did, under the button; `count` is how many moved, `club` the club they joined. */
    moved: (count: number, club: string) =>
      count === 1 ? `1 member of staff moved to ${club}` : `${format(count)} members of staff moved to ${club}`,
    undoMoveTitle: "Bring the moved staff back to this club, on their contracts",
    moveTitle: "Move all staff",
    /** The name of the search box for the club the staff move to, for assistive technology. */
    moveSearch: "Search for the club the staff move to",
    /** The line under the club in the dialog: before a club is picked, while the move is worked out, and then. */
    movePick: "Choose the club the staff move to.",
    movePlanning: "Working out who can move…",
    movePlan: (count: number, club: string) =>
      count === 1 ? `1 member of staff moves to ${club}` : `${format(count)} members of staff move to ${club}`,
    moveNobody: (club: string) => `None of this club's staff can move to ${club}.`,
    /**
     * Why one stays when the rest move, short, beyond the reasons a release has (see `stays`); `club` is the club they
     * move to. The hover text has the game's answer in full.
     */
    moveStays: {
      managerTaken: (club: string) => `${club} has a manager`,
      directorTaken: (club: string) => `${club} has a director of football`,
      yourClub: (club: string) => `You manage ${club}`,
      other: "Cannot be moved",
    },
    /** What the move does to each one, one line each. */
    moveDoes: [
      "Each one joins the new club where the job is: its medical, coaching or scouting department",
      "Same job, wage and contract end; each contract is dated from the game's date",
      "A manager or a director of football joins only where the new club's place is empty; a place left here stays " +
        "empty, for the club to fill",
      "You, the board and those the editor cannot move stay",
      "Listed under Changes, where one undo brings them all back to this club",
    ],
    /** In the dialog's foot: nothing changes in the game until Move all. */
    moveHint: "Nothing changes in the game until you press Move all.",
    move: "Move all",
    moving: "Moving…",
  },

  /** The club list, with the sidebar entry and the status-line count that go with it. */
  clubList: {
    /** The entry in the sidebar. */
    nav: "Clubs",
    /** In the status line, once connected. */
    count: (total: number) => `${format(total)} clubs`,
    search: "Search clubs by name or UID",
    summary: (total: number, shown: number) =>
      total > shown
        ? `${format(total)} clubs · showing the top ${shown} by reputation`
        : `${format(total)} clubs`,
    /** The message under an empty table; `filtered` is whether a filter is in effect. */
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "No clubs match this filter." : "No clubs found.";
      }
      return filtered ? `No clubs match “${query}” with this filter.` : `No clubs match “${query}”.`;
    },
    /** The small tag on a women's club. */
    women: "Women",
    columns: {
      name: "Name",
      nation: "Nation",
      league: "League",
      reputation: "Reputation",
      founded: "Founded",
      uid: "UID",
    },
    filters: {
      /** The label of the select of which clubs to show. */
      kind: "Clubs to show",
      all: "All clubs",
      men: "Men's clubs",
      women: "Women's clubs",
      nation: "Nation",
      league: "League",
      /** The first entry of the league select. */
      anyLeague: "Any league",
      /** The hover text of the league select. */
      leagueTitle: "The league the first team plays in this season",
      reputation: "Reputation",
      /** The hover text of the reputation range. */
      reputationTitle: "From 0 to 10,000, as the game keeps it",
      /** The names of the two ends of the range, which have no labels of their own. */
      minReputation: "Lowest reputation",
      maxReputation: "Highest reputation",
    },
  },
  /** The Clubs tab's national teams: each nation's men's and women's team, its senior team's squad and reputation. */
  national: {
    /** The button of the Clubs tab's switch that lists them, and the palette's command to go there. */
    nav: "National teams",
    /** The name of the Clubs tab's switch between the clubs and the national teams, for assistive technology. */
    switchLabel: "Clubs or national teams",
    search: "Search nations by name, code or UID",
    summary: (total: number, shown: number) =>
      total > shown ? `${format(total)} national teams · showing the top ${shown} by reputation` : `${format(total)} national teams`,
    /** The message under an empty table; `filtered` is whether a filter is in effect. */
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "No national teams match this filter." : "No national teams found.";
      }
      return filtered ? `No national teams match “${query}” with this filter.` : `No national teams match “${query}”.`;
    },
    /** The small tag on a women's team. */
    women: "Women",
    columns: {
      name: "Nation",
      code: "Code",
      reputation: "Reputation",
      players: "Players",
      uid: "UID",
    },
    filters: {
      /** The label of the select of which teams to show. */
      kind: "Teams to show",
      all: "All teams",
      men: "Men's teams",
      women: "Women's teams",
    },
    /** In the header of a profile, by the name. */
    womensTeam: "Women's national team",
    mensTeam: "Men's national team",
    reputationShort: "REP",
    reputationTitle: "Reputation of the senior team, from 0 to 10,000",
    /**
     * The game's names of a nation's teams by the code of their kind, as its national team screens name them; a kind
     * missing here is named by `teamType`. Kind 0 is the senior team.
     */
    teamKinds: { 0: "Senior team", 9: "Under 23", 10: "Under 21", 18: "Under 20", 11: "Under 19", 12: "Under 18" } as Partial<Record<number, string>>,
    /** A team of a kind the editor has no name for: the game's code for it. */
    teamType: (kind: number) => `Type ${kind}`,
    /** The name of the group of buttons that picks one of the nation's teams, for assistive technology. */
    teamsLabel: "Teams of this nation",
    /** The name of the reputation of a team other than the senior one, in the Changes view; `team` is its name. */
    teamReputation: (team: string) => `Reputation (${team})`,
    /** Hover text of the reputation of the team picked, other than the senior one. */
    teamReputationTitle: "Reputation of this team, from 0 to 10,000",
    /** Over the squad; `team` is the name of the team picked and `count` how many players it lists. */
    squadHeading: (team: string, count: number) => `${team}: ${format(count)} ${count === 1 ? "player" : "players"}`,
    /** The name of the squad table for assistive technology; `team` is the name of the team picked. */
    squadLabel: (team: string) => `Players of the national team: ${team}`,
    squadNote: "The players the game lists for this team, in its order. Calling players up, captains and the manager's contract are not edited here.",
    /** What the profile shows of the nation and its federation, read from the game; the staff's heading has how many there are. */
    details: {
      nation: "Nation",
      founded: "Federation founded",
      continent: "Continent",
      staff: (count: number) => `Federation staff (${format(count)})`,
      noStaff: "No staff of the federation found.",
      job: "Job in the national team",
      team: "Team",
      staffNote: "Read from the game; not edited here. The job is the one each has with the federation, not the one at a club.",
    },
    /** Beside Heal all, Inspire all and Refresh all, which the senior team has: whom they cover, and where undoing is. */
    actionsHint: "The actions cover every player the senior team lists. Undo is in the Changes view as well.",
    /** For a nation the game keeps no team for. */
    noTeams: "The game keeps no teams for this one, so there is no squad or reputation to show.",
    reading: "Reading the squad…",
    noPlayers: "The game lists no players for this team.",
    /** Where the tab cannot show national teams: why, for a version of the game the editor has not been checked with. */
    unavailableTitle: "National teams are not available on this version of the game",
    unavailableBuild: "Nobody has found yet where this version of the game keeps its national teams, so the editor shows none rather than read the wrong memory.",
    unavailableUnreadable: "The editor looked where it expects the national teams on this version of the game, but what it found does not read as the game's, so it shows none.",
  },

  /**
   * The Prize money tab: the competitions whose stages pay prize money, what each pays by final position and per match.
   * It only reads; the amounts are kept in pounds and shown in the chosen currency.
   */
  leaguePrizes: {
    /** The heading of the group in a club's Overview, under its finances. */
    title: "League prize money",
    /** Under the heading: the league and its nation. */
    league: (league: string) => `What ${league} pays this season`,
    /** While the amounts are read: the editor reads all of the game's memory once. */
    reading: "Reading the league's prize money from the game… The first time this can take half a minute or more.",
    readAgain: "Read again",
    readAgainTitle: "Read the amounts from the game again: a stage that has started since may pay too",
    /** When the club's league pays nothing the editor reads. */
    paysNothing: "The club's league pays no prize money by final position or per match this season.",
    /** The heading of one stage of the league. */
    stageStarted: "Stage being played",
    stageFuture: "Stage not started yet",
    /** Under a stage's heading, when several of its groups (or stages) pay the same. */
    alike: (count: number) => `The same amounts in ${format(count)} groups or stages`,
    byPosition: "By final position",
    /** A row of the list by position. */
    place: (place: number) => `${format(place)}.`,
    perMatch: "Per match",
    win: "Per win",
    draw: "Per draw",
    loss: "Per loss",
    noList: "Nothing by final position.",
    noPerMatch: "Nothing per match.",
    /** Under the amounts. */
    note: "What knockout rounds pay, such as a final's winner and loser, and a competition's participation fee are not read yet.",
    /** Where the app cannot show prize money: why. */
    unavailableBuild: "Nobody has checked yet where this version of the game keeps the prize money, so the editor shows none rather than read the wrong memory.",
    unavailableUnreadable: "The editor looked for the prize money where it expects it on this version of the game, but what it found does not read as the game's, so it shows none.",
    /** The button that turns a stage's amounts into inputs. */
    edit: "Change amounts",
    editTitle: "Change what this stage of the league pays, for every club in it",
    save: "Save amounts",
    saving: "Saving…",
    cancel: "Cancel",
    /** Under the inputs, and in the (i) beside the button. */
    everyClub: (league: string) =>
      `This changes what ${league} pays every club in it, not this club alone. The game keeps it in the save, but only for this season: it sets the next season up with its own amounts again. Undo in Changes puts the old amounts back.`,
    infoLabel: "How a change of the prize money lasts",
    /** Under an input that does not hold an amount the editor writes. */
    invalid: (most: string) => `Enter a whole amount from 0 to ${most}.`,
    /** Under the inputs, when every amount of the stage would be nothing. */
    allNothing: "A stage that pays nothing at all is not listed any more: leave at least one amount above nothing.",
    /** What the Changes view calls a change of the amount for a final position. */
    placeField: (place: number) => `League prize money for place ${format(place)}`,
    /** In the Changes view, under a change of the prize money: the league, and how many of its groups it changed. */
    changedIn: (league: string, groups: number) =>
      groups > 1 ? `For every club in ${league}, in ${format(groups)} groups` : `For every club in ${league}`,
  },

  /**
   * A club's sponsorship deals, in its finances: each deal by the name the game's Sponsorship screen gives its kind, what
   * it pays per season and in all, its term and the change a relegation (or a promotion) brings. It only reads; the
   * amounts are kept in pounds and shown in the chosen currency.
   */
  sponsorships: {
    /** The heading of the group in a club's Overview, under its finances. */
    title: "Sponsorship deals",
    reading: "Reading the club's sponsorship deals…",
    /** When the club holds no deal. */
    none: "The club has no sponsorship deals.",
    perSeason: "Per season",
    total: "Total value",
    term: "Term",
    /** The length of a deal, as the game's screen counts it. */
    years: (count: number) => (count === 1 ? "1 year" : `${format(count)} years`),
    /** The name of a kind the game's screen is not known to name here. */
    unnamed: (kind: number) => `Type ${format(kind)}`,
    unnamedTitle: "This kind of deal has not been matched to a name on the game's screen yet",
    /** A badge on a deal that ended before the game's date. */
    ended: "Ended",
    endedTitle: "Ended before the game's date: the game's Sponsorship screen no longer lists it",
    /** What a deal's percentage does: on relegation, and for a kit manufacturer on promotion. */
    falls: (percent: number) => `Falls by ${format(percent)}% on relegation`,
    rises: (percent: number) => `Rises by ${format(percent)}% on promotion to the top division`,
    /** Under the deals. */
    note: "Read only. These are the amounts the game keeps for each deal. Its Sponsorship screen lists the deals that have not ended.",
    /** Where the app cannot show the deals: why. */
    unavailableBuild: "Nobody has checked yet where this version of the game keeps the sponsorship deals, so the editor shows none rather than read the wrong memory.",
    unavailableUnreadable: "The editor looked for the sponsorship deals where it expects them on this version of the game, but what it found does not read as the game's, so it shows none.",
  },

  /**
   * The Competitions tab: the competitions the game is playing, and beside the list the squad rules of the one picked,
   * this season's and next season's in an area each: how many players of a kind a squad may register or a team may
   * pick. While the game can be written to, the counts can be changed.
   */
  competitions: {
    /** The tab in the masthead, and the palette's command to go there. */
    nav: "Competitions",
    search: "Search competitions by name, nation or UID",
    summary: (total: number, shown: number) =>
      total > shown ? `${format(shown)} of ${format(total)} competitions` : `${format(total)} competitions`,
    /** The message under an empty table; `filtered` is whether a nation is picked. */
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "No competitions of this nation have squad rules." : "No competitions with squad rules found.";
      }
      return filtered ? `No competitions match “${query}” in this nation.` : `No competitions match “${query}”.`;
    },
    /** While the rules are read: the editor reads all of the game's memory once. */
    reading: "Reading the competitions' squad rules from the game… This takes a few seconds.",
    readAgain: "Read again",
    readAgainTitle: "Read the rules from the game again",
    /** Under the list, and under a search that finds none: competitions with no squad rules are listed too. */
    listNote: "Only the competitions the game is playing in this save are listed.",
    /** Where the app cannot show the rules: the heading, and why. */
    unavailableTitle: "No squad rules to show",
    unavailableBuild: "Nobody has checked yet where this version of the game keeps the competitions' squad rules, so the editor shows none rather than read the wrong memory.",
    unavailableUnreadable: "The editor looked for the squad rules where it expects them on this version of the game, but what it found does not read as the game's, so it shows none.",
    columns: {
      name: "Competition",
      nation: "Nation",
      level: "Level",
      rules: "Rules",
      uid: "UID",
    },
    /** In the Level column: the top division is level 1. */
    level: (level: number) => format(level),
    /** In the Rules column: how many rules this season, and next season when its list differs in length. */
    rulesCount: (current: number, next: number | null) =>
      next === null || next === current ? format(current) : `${format(current)} · ${format(next)}`,
    rulesCountTitle: "Squad rules this season, and next season where it has another number of them",
    /** In the place of a nation, for a continent's competition, and in the filter. */
    international: "International",
    filters: {
      nation: "Nation",
      allNations: "All nations",
    },
    /** The heading of the panel's body, and the line under it. */
    title: "Squad rules",
    intro: "How many players of a kind a squad may register, or a team may pick for a match, in this competition. Who counts as foreign or home-grown is the game's own to say.",
    /** The headings of the two areas, and beside each the year the season begins in. */
    seasons: { current: "This season", next: "Next season" },
    began: (year: number) => `began in ${year}`,
    begins: (year: number) => `begins in ${year}`,
    /** In an area with no rules, and in next season's when the game holds no list for it. */
    noRules: "No squad rules.",
    noNext: "The game holds no rules for next season.",
    /** The panel of a competition with no squad rule in either season (Scotland's top division, most cups). */
    noneGiven: "The game gives this competition no squad rules, so there is nothing to change here.",
    ruleColumns: {
      rule: "Rule",
      where: "Counted in",
      limit: "Limit",
      value: "Players",
    },
    atMost: "At most",
    atLeast: "At least",
    /** Where a rule counts players. */
    scopes: {
      squad: "Squad",
      matchSquad: "Match squad",
      eleven: "Eleven",
      startingEleven: "Starting eleven",
      bench: "Bench",
    },
    /** Whom a rule counts, by the game's key for its kind; the ages a kind names are given. */
    who: {
      squadSize: "Players in the squad",
      foreign: "Foreign players",
      foreignExceptAsian: "Foreign players, Asian ones aside",
      foreignGoalkeepers: "Foreign goalkeepers",
      nonEu: "Non-EU players",
      domestic: "Domestic players",
      domesticGoalkeepers: "Domestic goalkeepers",
      goalkeepers: "Goalkeepers",
      outfield: "Outfield players",
      nonHomegrown: "Players who are not home-grown",
      youthContract: "Players on youth contracts",
      fullTime: "Players on full-time contracts",
      amateur: "Amateur players",
      youthOrAmateur: "Youth or amateur players",
      trialists: "Trialists",
      loans: "Loan players",
      internationals: "International players",
      otherTeam: "Players registered for another team",
      firstTeam: "Players registered for the first team",
      over: (age: number) => `Players over ${format(age)}`,
      under: (age: number) => `Players under ${format(age)}`,
      domesticUnder: (age: number) => `Domestic players under ${format(age)}`,
      foreignOver: (age: number) => `Foreign players over ${format(age)}`,
      goalkeepersOver: (age: number) => `Goalkeepers over ${format(age)}`,
      outfieldOver: (age: number) => `Outfield players over ${format(age)}`,
      /** Trained at the club, in the nation, or at either, between two ages. */
      homegrown: (from: "club" | "nation" | "clubOrNation", fromAge: number, toAge: number) => {
        const ages = `trained at ${format(fromAge)}–${format(toAge)}`;
        if (from === "club") {
          return `Home-grown at the club (${ages})`;
        }
        return from === "nation" ? `Home-grown in the nation (${ages})` : `Home-grown at the club or in the nation (${ages})`;
      },
      /** The same in the nation, for players under an age. */
      homegrownUnder: (age: number, fromAge: number, toAge: number) =>
        `Under-${format(age)}s home-grown in the nation (trained at ${format(fromAge)}–${format(toAge)})`,
    },
    /** A rule of a kind the game gives no name. */
    unnamedKind: (kind: number) => `Rule of kind ${format(kind)}`,
    /** The hover text of a rule's name: the game's own key for the kind. */
    gameKey: (key: string) => `The game's name for this rule: ${key}`,
    /** The small tag under a rule that holds for some teams, or under a condition of the game's. */
    teamsFrom: (competition: string) => `Teams from ${competition}`,
    teamsFromUnknown: "Teams from another division",
    condition: (code: string) => `Conditional (${code})`,
    conditionTitle: "The game applies this rule under a condition of its own, which the editor does not explain yet.",
    /** The years the nation's rules give a rule, where they give any. */
    years: (from: number | null, to: number | null) => {
      if (from !== null && to !== null) {
        return from === to ? `${from}` : `${from}–${to}`;
      }
      return from !== null ? `from ${from}` : `until ${to}`;
    },
    yearsTitle: "The seasons the nation's rules give this rule for, by the year a season begins in",
    /** In the place of an input, for a rule the editor leaves alone, and why. */
    leftAlone: "Left alone",
    notSavedTitle:
      "The save keeps no such rule, so a change would be gone once it is loaded: the editor leaves it alone",
    notACountTitle: "An amount of money, not a count of players: the editor leaves it alone.",
    /** Over the areas, when the editor changes none of the competition's rules: why, and that no date changes it. */
    noneChangeable: "These rules cannot be changed yet, at any date: the editor changes a rule only where it finds it in the rules the save keeps, so that the change is still there when the save is loaded, and it has not found this competition's there. So far that goes for the women's leagues, Major League Soccer and a few cups.",
    /**
     * In the place of `lasts`, for a competition whose rules the game keeps in no record (UEFA's Champions League): the
     * editor holds a change of them. The small tag under a rule it holds, and the tag's hover text with the game's own
     * count.
     */
    unsavedNote: "The game keeps this competition's rules in no save: it makes them itself each time it loads one, and again for each new season. So the editor holds a change here: it writes it to the running game, remembers it for this career, and writes it again whenever it connects or reads the data again. After loading a save, connect the editor (or press Reload data) once for the change to be back. Undo in Changes lets go of it.",
    heldTag: "Held",
    heldTitle: (original: number) =>
      `The editor holds this count and writes it again when it reads the game; the game's own is ${format(original)}`,
    /** Under a rule whose count in the save's rules is another than the list's. */
    savedDiffers: (value: number) => `The save's rules hold ${format(value)}`,
    savedDiffersTitle:
      "The game plays by the list and makes it from the save's rules on loading; a change here sets both",
    /** The button that turns the counts into inputs, and the ones under them. */
    edit: "Change rules",
    editTitle: "Change the counts of this competition's squad rules",
    save: "Save rules",
    saving: "Saving…",
    cancel: "Cancel",
    /** Under an input that does not hold a count the editor writes. */
    invalid: (most: number) => `Enter a whole number from 0 to ${format(most)}.`,
    /** Over the areas, when other competitions are played under the same lists: their names. */
    shared: (names: string) => `These rules are also those of ${names}: a change is theirs too.`,
    /**
     * Under each area: how long a change of it holds, and when the game shows it. `turn` is the day the nation's seasons
     * turn on ("20 June") where its rules give one. Seen over a turn of the season: this season's change is gone with
     * it, next season's becomes this season's and stays, unless the nation has another rule (the Süper Lig's on
     * foreign players over 24 from 2028) or another file of rules (England's from 2028) for a later season.
     */
    currentNote: (turn: string | null) =>
      `A change here holds for the rest of this season${turn === null ? "" : `, which turns on ${turn}`}. The game counts squads against it at once; its own screens show it once a day has passed.`,
    nextNote: (turn: string | null) =>
      `A change here becomes this season's rule when the season turns${turn === null ? "" : ` on ${turn}`}, and stays for the seasons after unless the game has rules of its own for a later one. The game's Next Season page shows it at once.`,
    /** Under the areas, and in the (i) beside the button. */
    lasts: "A change is written to the list the game plays by and to the nation's rules the save keeps, so it is there again when the save is loaded. A change of this season's rule ends when the season turns: next season's rules take its place. Undo in Changes puts the old count back.",
    infoLabel: "How a change of a squad rule lasts",
    /** What the Changes view calls a change of a rule: the season, and the rule. */
    ruleField: (season: string, rule: string) => `Squad rule, ${season.toLowerCase()}: ${rule}`,
    /** In the Changes view, under a change of a rule: how many other competitions it is for too. */
    alsoFor: (count: number) =>
      count === 1 ? "Also for 1 other competition under the same rules" : `Also for ${format(count)} other competitions under the same rules`,
  },

  /** The app around the lists: the sidebar, the status line and the connect panel. */
  app: {
    /** The small line under the name in the sidebar. */
    stage: "beta",
    /** The settings menu at the right of the masthead: its name, and the headings of its two lists. */
    settingsLabel: "Settings",
    languageLabel: "Language",
    currencyLabel: "Currency",

    // The note at the foot of the sidebar; which one shows depends on the connection (see `ConnectionInfo.editable`).
    /** Connected, and the game was opened for writing. */
    noteEditable: "Edits reach the game only when you apply them. Back up your save first.",
    /** Connected, but Windows did not allow writing. */
    noteReadOnly: "Read-only: Windows did not let FMLibreEditor write to the game.",
    /** Read-only because the game is a version FMLibreEditor was not checked with (see `compatibility`). */
    noteUnknownBuild: "Read-only: this version of the game is new to FMLibreEditor.",
    noteNotConnected: "Nothing in the game changes until you edit and apply.",

    // The status line and the busy texts beside it
    notConnected: "Not connected",
    /** Beside the status line in a plain browser, where fixtures stand in for the game. */
    previewTag: "browser preview · sample data",
    /** In place of the game's date when it could not be read, and the note it shows on hover. */
    noDate: "No in-game date",
    noDateTitle:
      "The in-game date could not be read: ages are not shown and age filters find no one. Check for updates.",
    /** The button that reads the game again, once connected. */
    reload: "Reload data",
    /** The button that looks for the game again, while not connected. */
    refresh: "Refresh",
    detecting: "Looking for Football Manager…",
    connecting: "Reading players, staff and clubs…",
    reloading: "Reloading players, staff and clubs…",

    /**
     * The notice under the masthead once the game has loaded a save, or gone back to its main menu, since the data was
     * read (`SaveChangedNotice`), beside a Reload data button.
     */
    saveChanged: {
      title: "The game's save has changed",
      text:
        "The game has loaded a save, or gone back to its main menu, since FMLibreEditor read it. Until you reload the " +
        "data, it changes nothing in the game and holds nothing frozen: what it shows may belong to another save.",
    },

    /** The notice after connecting to a save in which something was frozen before (`FrozenNotice`). */
    refrozen: {
      title: "Frozen again from last time",
      /** When nothing could be frozen again. */
      waitingTitle: "What was frozen waits for now",
      /** `names` are the players' names, set apart by commas. */
      players: (names: string) => `Attributes: ${names}`,
      staff: (names: string) => `Staff attributes: ${names}`,
      clubs: (names: string) => `Money: ${names}`,
      fitness: (names: string) => `Energy and sharpness: ${names}`,
      positions: (names: string) => `Positions: ${names}`,
      /** `names` are the stadiums' new names, given again. */
      stadiums: (names: string) => `Stadium names: ${names}`,
      /** After the first few names. */
      more: (count: number) => `and ${format(count)} more`,
      /** What was left for later: an update of the game, say. */
      waiting: (count: number) =>
        `${count === 1 ? "1 is" : `${format(count)} are`} remembered but not frozen now: FMLibreEditor cannot write ` +
        "to this version of the game yet.",
      dismiss: "Dismiss",
    },

    /** The (i) beside every box that freezes something: how freezing works, and that the app has to stay open. */
    freezeInfo: {
      label: "How does freezing work?",
      note:
        "Freezing does not change the game for good: every 2 seconds, FMLibreEditor puts back what the game took. So it " +
        "works only while the app is open and connected; close it, and the game changes them again. The app remembers " +
        "what is frozen in this save, and freezes it again the next time it connects to it.",
    },

    /** The panel shown while not connected. */
    connect: {
      title: "Connect to Football Manager 27",
      intro: "FMLibreEditor reads the game's memory while it runs. Start the game and load a save, then connect.",
      notRunning: "Football Manager 27 is not running.",
      /** `error` is the answer of the Rust side, which stays in English. */
      openFailed: (error: string) => `Could not open the game: ${error}`,
      game: "Game",
      gameData: "Game data",
      loaded: "Loaded",
      stillLoading: "Still loading; wait for the main menu",
      process: "Process",
      pid: (pid: number) => `pid ${pid}`,
      several: "Several copies of the game are running; the first one is used.",
      button: "Connect and read players, staff and clubs",

      /** macOS: the bridge FM27 has to load before the app can reach it, and setting it up. */
      bridge: {
        title: "The bridge (macOS)",
        intro:
          "macOS lets no app into another app's memory, so FM27 has to hand its memory over itself. It does once it " +
          "loads FMLibreEditor's bridge: a small library that hooks and changes nothing in the game and gives its " +
          "memory to this app only. A launch option in Steam has FM27 load it.",
        library: "Bridge",
        installed: "Installed",
        missing: "Not installed",
        launchOption: "Launch option",
        set: "Set in Steam",
        notSet: "Not set",
        ready: "Set up. Start FM27 from Steam (quit it and start it again if it is running), load a save, then connect.",
        steamRunning:
          "Steam is running, and keeps the launch options while it does. Quit Steam to have the launch option set " +
          "for you, or enter it in Steam yourself.",
        setUp: "Set up the bridge",
        remove: "Remove the bridge",
        manual: "Or, in Steam, right-click Football Manager 27 › Properties › General › Launch Options, and enter:",
        copy: "Copy",
        copied: "Copied",
      },
    },
  },

  /** The graphics packs the pictures (club logos, faces, flags) come from: their status at the foot of the sidebar. */
  graphics: {
    /** While the app is still reading the packs, which takes a moment after it starts. */
    reading: "Reading graphics packs…",
    /** What the packs hold: "Graphics: 68,131 club logos · 250 flags · 0 faces". */
    summary: ({ clubLogos, flags, faces }: Pick<GraphicsCounts, "clubLogos" | "flags" | "faces">) =>
      `Graphics: ${format(clubLogos)} club ${clubLogos === 1 ? "logo" : "logos"} · ` +
      `${format(flags)} ${flags === 1 ? "flag" : "flags"} · ${format(faces)} ${faces === 1 ? "face" : "faces"}`,
    /** When the app found no pack, and under it where packs go. The folder itself is the hover text of both lines. */
    none: "No graphics packs found",
    noneHint: "Logo and face packs go in the FM27 graphics folder.",
  },

  /**
   * The notice under the masthead when the game is a version FMLibreEditor has no profile for, or some of the checks
   * it makes before writing did not pass (`CompatibilityNotice`).
   */
  compatibility: {
    /** The headline for a version without a profile; `game` as the status line names it. */
    unknownBuild: (game: string) => `FMLibreEditor has not been checked with ${game} yet`,
    unknownBuildText:
      "The game has probably been updated. FMLibreEditor found the game's data and checked it, but it does not " +
      "write to a version it was not tested with until you allow it. A new FMLibreEditor usually follows within days.",
    /** The headline when checks did not pass on a version the editor knows or may edit, and what may help. */
    failedTitle: "Some of the game's data did not check out",
    reloadHint: "If a save was still loading, Reload data checks again.",
    /** The in-game date did not check out: shown apart, as it leaves nothing read-only. */
    noDate: "The in-game date did not check out, so no ages are shown.",
    /** The other checks that did not pass, joined (see `join`), each as `failedCheck` words it. */
    failed: (names: string) => `Left read-only: ${names}.`,
    /** A check that did not pass: its name (see `checks`), and how many of the people or clubs it sampled fit. */
    failedCheck: (name: string, fit: number, sampled: number) => `${name} (${format(fit)} of ${format(sampled)} fit)`,
    /** Joins the names of the checks that did not pass. */
    join: (names: string[]) =>
      names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`,
    allow: "Edit anyway",
    allowTitle: "Turn editing on until the app is closed or connects again. Back up your save first.",
  },

  /**
   * Copy diagnostics, at the foot of the window and in the notice under the masthead: copies a report of what the app
   * found in the game, in English whatever the language, to paste into a bug report (`CopyDiagnostics`).
   */
  diagnostics: {
    copy: "Copy diagnostics",
    copyTitle: "Copy what the app found in the game, for a bug report; it holds no names or paths",
    /** Said by the button for a moment once the report is on the clipboard. */
    copied: "Copied",
    failed: (reason: string) => `Could not copy the diagnostics: ${reason}`,
  },

  /** What each check is about (`CheckKey`), as the notice lists the ones that did not pass and the errors name them. */
  checks: {
    gameDate: "the in-game date",
    players: "players' details",
    positions: "positions",
    attributes: "attributes",
    personality: "personality",
    liveValues: "energy, match sharpness, jadedness and morale",
    contracts: "contracts",
    teams: "teams",
    staff: "staff",
    clubs: "clubs",
    cohesion: "cohesion with clubs",
    tactics: "tactical familiarity",
  } satisfies Record<CheckKey, string>,

  /** New versions: the notice under the masthead, and the version and Check for updates at the foot of the window. */
  update: {
    /** The notice's headline, and what a check by hand found. */
    available: (version: string) => `FMLibreEditor ${version} is available`,
    youHave: (version: string) => `You have ${version}.`,
    /** Opens the release's page in the browser. */
    download: "Download",
    /** Downloads the new version's installer and runs it, where the app can update itself (see `can_self_update`). */
    install: "Update",
    installTitle: "Download and install the new version; the app closes and opens again with it",
    preparing: "Preparing…",
    /** `percent` is null while the size of the download is not known. */
    downloading: (percent: number | null) => (percent === null ? "Downloading…" : `Downloading… ${percent}%`),
    installing: "Installing: FMLibreEditor closes and opens again with the new version.",
    installFailed: (reason: string) => `Could not update: ${reason}. Download it from its page instead.`,
    notInstallable: "This version cannot be installed from here. Download it from its page instead.",
    /** Hides the notice until the app starts again. */
    later: "Later",
    check: "Check for updates",
    checking: "Checking for updates…",
    upToDate: "You have the latest version.",
    failed: "Could not check for updates.",
  },

  /** Once, after a few starts: the note in the top right corner that asks for a star on GitHub (see `StarRequest`). */
  star: {
    title: "Enjoying FMLibreEditor?",
    text: "A star on GitHub helps it reach more players and grow faster.",
    /** Opens the project's page on GitHub, where the star is; the note does not come back. */
    star: "Star on GitHub",
    /** Puts the note away for good. */
    dismiss: "No thanks",
  },

  /** Editing a person or a club: the Edit button, the inputs, and the footer under the profile. */
  edit: {
    /** A nation field's value whose name the app has not read: one no one in the lists belongs to. */
    unknownNation: "Unknown nation",
    unknownCity: "Unknown city",
    /** The button in the header of a profile that can be edited. */
    edit: "Edit",
    editTitle: "Change this profile's values in the game",
    /** Why editing did not start: the field table or the values could not be read. */
    startFailed: (reason: string) => `Could not start editing: ${reason}`,
    /** The name of a position's field, e.g. "ST rating"; `position` is its entry in `positions`. */
    positionRating: (position: string) => `${position} rating`,
    /** Hover text of a changed input: the value it started from, as shown. */
    was: (value: string) => `was ${value}`,
    /** Hover text of an input that cannot be applied; `min` and `max` are the values it takes, as shown. */
    invalid: (min: number, max: number) => `Enter a whole number from ${min} to ${max}`,
    /** The same for a date input; `from` and `to` are the earliest and the latest date it takes, as dates are shown. */
    invalidDate: (from: string, to: string) => `Enter a date from ${from} to ${to}`,
    /**
     * The same for an amount of money, in whole units of the chosen currency; `from` and `to` are the least and the
     * most it takes, as amounts are shown.
     */
    invalidMoney: (from: string, to: string) => `Enter a whole amount from ${from} to ${to}`,
    /** The same for a percentage, in whole percent; `from` and `to` are the least and the most it takes, as shown. */
    invalidPercentage: (from: string, to: string) => `Enter a whole percentage from ${from} to ${to}`,
    /** After the input of a percentage: the game shows energy and match sharpness as 0–100%. */
    percent: "%",
    /** The two values of a yes-or-no field, as the lists of changes and the hover text of its checkbox say them. */
    yes: "Yes",
    no: "No",
    /**
     * What an input that may be left empty reads as then, in its hint, the hover text and the lists of changes:
     * "Squad number 20 → none". The profile itself shows a dash for it (`profile.none`).
     */
    none: "none",

    // The footer
    footer: "Editing",
    changes: changeCount,
    /** After the number of changes, while some inputs hold values that cannot be applied. */
    invalidCount: (count: number) => `${count} invalid`,
    /** Opens the list of the changes Apply would write. */
    review: "Review",
    reviewList: "Changes to apply",
    /** Puts the inputs back to the values the game has. */
    discard: "Discard",
    apply: "Apply",
    applying: "Applying…",
    /** Hover text of Apply while an input holds a value that cannot be written. */
    applyBlocked: "Fix the invalid values first",
    /** Leaves edit mode. */
    done: "Done",
    /** Takes the place of the buttons when leaving (Done, close, another row) would lose `count` changes. */
    confirmDiscard: (count: number) => `Discard ${changeCount(count)}?`,
    keepEditing: "Keep editing",

    // After Apply
    applied: (count: number) => `Applied ${changeCount(count)}`,
    /** Every value asked for was the game's already. */
    nothingToChange: "Nothing to change: the game already has these values.",
    /** A change the game refused; `label` is the field's name (see `fieldLabel`) and `reason` the game's answer. */
    refused: (label: string, reason: string) => `${label}: ${reason}`,
    rereadFailed: (reason: string) => `Could not read the values back: ${reason}`,
    dismiss: "Dismiss",
  },

  /** The Changes view: what was written to the game this session. */
  changes: {
    /** The entry in the sidebar. */
    nav: "Changes",
    title: "Changes",
    hint: "Newest first. The app keeps the changes of each career, so they are listed again after a restart. A change can be undone only while the game still holds the value it wrote.",
    /** Under the hint, when the list holds changes from earlier sessions: how many, and how many of them the game did not hold. */
    earlierNote: (count: number, missing: number) =>
      `${changeCount(count)} from earlier sessions` +
      (missing > 0 ? `, ${format(missing)} of them not in the game when the data was read` : "") +
      ". Moves, heals, ties, clauses and names among them are kept as history, without Undo.",
    /** The small tag after the name of an earlier change, and its hover text. */
    earlierTag: "Earlier",
    earlierTitle: "Written before the app last connected, and kept in the history of this career",
    /** Under the status of an earlier change: whether the game held its value when the data was last read. */
    inGame: "In the game",
    inGameTitle: "The game held this value when the data was last read",
    notInGame: "Not in the game",
    notInGameTitle:
      "Not in the game when the data was last read: not saved after the change, or changed by the game since",
    /** In the place of Undo for an earlier change that cannot be undone from here, and its hover text. */
    historyOnly: "History",
    historyOnlyTitle: "Made before the app last connected: undoing it needed the game's memory as it was then",
    /** Under a mass edit: how many of its earlier changes the game did not hold. */
    batchNotInGame: (count: number) => `${format(count)} not in the game`,
    /** Empties the list and the history of the career; the question that asks first, and its two answers. */
    clearHistory: "Clear history",
    clearHistoryTitle: "Empty this list and forget this career's history; the changes stay in the game",
    confirmClear: "Clear the history of this career? The changes stay in the game, but can no longer be undone from here.",
    keepHistory: "Keep",
    clearConfirm: "Clear",
    /** Under the hint: a change shows in the game only after it has moved on once. */
    continueHint: "The game shows a change once it moves on: press Continue in the game.",
    /** Under a move to another club that was a swap: the player who went the other way. */
    swappedWith: (name: string) => `Swapped with ${name}`,
    /** Under a move that released a player of the new club to make room: that player. */
    released: (name: string) => `${name} released`,
    /** Under a transfer that had a fee: the amount, written out. */
    fee: (amount: string) => `Fee ${amount}`,
    /** Under a transfer arranged for the game to make: the day it moves him (and pays the fee). */
    arranged: (date: string) => `The game makes the move on ${date}`,
    /** Under a loan arranged for the game to make: the day it sends him there, and the loan's last day. */
    arrangedLoan: (day: string, until: string) => `The game makes the loan on ${day}, until ${until}`,
    /** Under a recall from loan that took the loan's option to buy away, which its undo writes back. */
    optionRemoved: (amount: string) => `Option to buy (${amount}) taken away`,
    /** What a heal changed, in the place of its values: `count` is how many injuries the player had. */
    healed: (count: number) => (count === 1 ? "Healed 1 injury" : `Healed ${format(count)} injuries`),
    /** The same for lifting bans: `count` is how many bans the player had. */
    lifted: (count: number) => (count === 1 ? "Lifted 1 ban" : `Lifted ${format(count)} bans`),
    /** What keeping a player from retiring changed: the date he was to retire on, or none when only his traits changed. */
    keptPlaying: (date: string | null) => (date === null ? "Will play on" : `Retirement on ${date} prevented`),
    /** The line beside the title; `undone` of the `total` changes were undone. */
    count: (total: number, undone: number) => {
      const count = changeCount(total);
      return undone === 0 ? count : `${count} · ${undone} undone`;
    },
    empty: "No changes yet. Open a player, a member of staff or a club and choose Edit, or use Mass edit in a list.",
    columns: {
      time: "Time",
      /** The player, member of staff or club the change was made to. */
      name: "Name",
      field: "Field",
      change: "Change",
      status: "Status",
    },
    /** The small tag after a name. */
    kinds: {
      player: "Player",
      staff: "Staff",
      club: "Club",
      nationalTeam: "National team",
      competition: "Competition",
    } satisfies Record<EditEntity, string>,
    /** Hover text of a change of an attribute: the values as stored; `change` is from `valueChange`. */
    stored: (change: string) => `stored ${change}`,
    undone: (time: string) => `Undone at ${time}`,
    undo: "Undo",
    /** Hover text of Undo; `label` is the field's name. */
    undoTitle: (label: string) => `Write the old value of ${label} back to the game`,
    /** The small tag after the fields a mass edit changed: a mass edit is one row of the list. */
    batch: "Mass edit",
    /** Under those fields: how many changes the mass edit made, and how many of them are not undone. */
    batchCount: (total: number, remaining: number) =>
      remaining === 0
        ? `${changeCount(total)} · all undone`
        : `${changeCount(total)} · ${format(remaining)} not undone`,
    /** Opens the list of the changes of a mass edit under its row, and closes it again. */
    showChanges: "Show changes",
    hideChanges: "Hide changes",
    /** Undoes the whole mass edit. */
    undoBatch: "Undo mass edit",
    /** Hover text of Undo mass edit; `remaining` is how many of its changes are not undone yet. */
    undoBatchTitle: (remaining: number) =>
      `Write the old values of this mass edit back to the game (${format(remaining)} still in place)`,

    // Pages: the list, and the changes of a mass edit that is open, are shown a page at a time.
    /** The names of the two groups of buttons for assistive technology. */
    pages: "Pages of the list",
    batchPages: "Pages of the changes of this mass edit",
    previous: "Previous",
    next: "Next",
    /** Between the buttons: the rows on show and how many there are, e.g. "101–200 of 450". */
    range: (first: number, last: number, total: number) => `${format(first)}–${format(last)} of ${format(total)}`,

    // Search and filters
    /** The search box: what it looks through. Its name for assistive technology is the same. */
    searchPlaceholder: "Search changes by name, UID, field or club",
    /** The name of the three buttons that choose which sessions' changes are listed, for assistive technology. */
    sessionGroup: "Session",
    sessions: { all: "All", this: "This session", earlier: "Earlier sessions" } satisfies Record<SessionChoice, string>,
    /** The check boxes: only changes still in place, and only earlier ones the game did not hold; their hover text. */
    notUndone: "Not undone",
    notUndoneTitle: "Only the changes that are still in place",
    notInGameFilterTitle: "Only the earlier changes the game did not hold when the data was last read",
    /** Takes the search text and every choice away. */
    clearFilter: "Clear filter",
    /** The line beside the title while a search or a filter is on: `matching` of the `total` changes, `undone` of those undone. */
    filteredCount: (matching: number, total: number, undone: number) => {
      const count = `${format(matching)} of ${changeCount(total)}`;
      return undone === 0 ? count : `${count} · ${format(undone)} undone`;
    },
    /** Under a mass edit while a search or a filter is on: how many of its changes they leave. */
    batchMatching: (matching: number, total: number) => `${format(matching)} of ${format(total)} match`,
    /** In the place of the list when the search and the filters leave no change. */
    noMatches: "No change matches the search and the filters.",
  },

  /** Exporting players or clubs to a file: the button in the toolbar of the player and club lists and its dialog. */
  export: {
    button: "Export",
    buttonTitle: {
      player: "Write the players the list shows to a CSV or JSON file",
      staff: "Write the staff the list shows to a CSV or JSON file",
      club: "Write the clubs the list shows to a CSV or JSON file",
    } satisfies Record<ExportEntity, string>,
    title: { player: "Export players", staff: "Export staff", club: "Export clubs" } satisfies Record<
      ExportEntity,
      string
    >,
    /** What the export covers: everything the list's search and filters select, in its order. */
    scope: (entity: ExportEntity, count: number) =>
      count === 0
        ? `No ${entity === "staff" ? "member of staff" : entity} matches the search and the filters.`
        : `${entityCount[entity](count)}: what the list's search and filters select, in its order.`,
    formatLabel: "Format",
    formats: {
      csv: "CSV, comma-separated",
      csvSemicolon: "CSV, semicolon-separated",
      json: "JSON",
    } satisfies Record<ExportFormat, string>,
    formatHints: {
      csv: "For most spreadsheets and scripts",
      csvSemicolon: "For Excel where decimals are written with a comma: in Turkish, Spanish or German, say",
      json: {
        player: "For scripts: the positions, attributes and personality as objects of their own",
        staff: "For scripts: the attributes, personality and contract as objects of their own",
        club: "For scripts: the supporters, facilities, stadium and finances as objects of their own",
      } satisfies Record<ExportEntity, string>,
    },
    contents: {
      player:
        "Each player's abilities, positions and position ratings, attributes on the 1–20 scale (the hidden ones " +
        "too), personality, reputation, caps, and contract with its clauses, with the in-game date. Money is in " +
        "pounds, as the game keeps it. Nothing in the game changes.",
      staff:
        "Each member of staff's job and employer, abilities, attributes on the 1–20 scale, personality, reputation, " +
        "and contract (wage and dates), with the in-game date. Money is in pounds, as the game keeps it. Nothing in " +
        "the game changes.",
      club:
        "Each club's nation, league, reputation, founding year, season tickets, social media followers, supporter " +
        "mix and traits, " +
        "facilities, stadium, and finances: balance, transfer budget, weekly wage spend and wage budget, and ticket " +
        "price, with the in-game date. FM keeps finances only for clubs in the leagues being played. Money is in " +
        "pounds, as the game keeps it. Nothing in the game changes.",
    } satisfies Record<ExportEntity, string>,
    export: "Export",
    exporting: "Exporting…",
    /** After the export: what was written, and where. */
    done: (entity: ExportEntity, count: number, file: string) => `Exported ${entityCount[entity](count)} to ${file}`,
    folder: (folder: string) => `in ${folder}`,
    skipped: (entity: ExportEntity, count: number) => {
      const pronoun = count !== 1 || entity === "staff" ? "they were" : entity === "player" ? "he was" : "it was";
      return (
        `${entityCount[entity](count)} changed in the game while ${pronoun} read, and ` +
        `${count === 1 ? "was" : "were"} left out.`
      );
    },
    open: "Open",
    openTitle: "Open the file in the app your system opens it with",
    show: "Show in folder",
    showTitle: "Show the file in its folder",
    close: "Close",

    /** The export of the Changes view: a CSV file of the changes its search and filters show. */
    changes: {
      buttonTitle: "Write the changes the list shows to a CSV file",
      title: "Export changes",
      /** What the export covers: everything the list's search and filters select, or, with none on, the whole history. */
      scope: (count: number, filtering: boolean) =>
        count === 0
          ? "No change matches the search and the filters."
          : filtering
            ? `${changeCount(count)}: what the search and the filters select, newest first.`
            : `${changeCount(count)}: the whole history of this career, newest first.`,
      contents:
        "Each change's time (local, with its offset from UTC), name and UID, the field, its old and new value as " +
        "the game stores them and as shown here, what the list says under them, the mass edit it was part of, when " +
        "it was undone, and whether it is from an earlier session and in the game. Nothing in the game changes.",
      done: (count: number, file: string) => `Exported ${changeCount(count)} to ${file}`,
    },
  },

  /** Mass editing: the button in the toolbar of a list and the dialog it opens. */
  massEdit: {
    /** The button in the toolbar of the player, staff and club lists. */
    button: "Mass edit",
    buttonTitle: "Change values of everything the list shows, with a preview first",
    title: {
      player: "Mass edit players",
      staff: "Mass edit staff",
      club: "Mass edit clubs",
    } satisfies Record<Entity, string>,

    // What it applies to
    /** `total` is the list's: the search and the filters of the list select them. */
    scope: (entity: Entity, total: number) =>
      `The ${entityCount[entity](total)} the list shows now (search and filters)`,
    /** After the scope, when the list shows only the first `shown` rows of its `total`. */
    scopeAll: (shown: number) => `That is every match, not only the first ${format(shown)} rows on screen.`,
    scopeNone: (entity: Entity) =>
      `No ${entityNouns[entity]} match the search and filters, so there is nothing to change.`,
    /** `limit` is the most one mass edit takes. */
    scopeTooMany: (entity: Entity, total: number, limit: number) =>
      `The ${entityCount[entity](total)} the list shows are more than one mass edit takes (${format(limit)}). ` +
      "Narrow the search or the filters first.",
    loadingFields: "Reading the fields…",
    fieldsFailed: (reason: string) => `Could not read the fields: ${reason}`,

    // The fields to change
    /** The groups of the field select, in the order the dialog lists them. */
    groups: {
      ability: "Ability",
      technical: "Technical attributes",
      mental: "Mental attributes",
      physical: "Physical attributes",
      goalkeeping: "Goalkeeping attributes",
      hidden: "Hidden attributes",
      feet: "Feet",
      coaching: "Coaching attributes",
      knowledge: "Knowledge attributes",
      medical: "Medical attributes",
      positions: "Positions",
      personality: "Personality",
      reputation: "Reputation",
      international: "International",
      contract: "Contract",
      facilities: "Facilities",
      finances: "Finances",
      stadium: "Stadium",
      traits: "Traits",
      /** A player's energy, match sharpness and morale: the Medical group of his profile. */
      health: "Medical",
      /** Whatever the other groups do not have, e.g. a player's height. */
      other: "Other",
    },
    fieldsLabel: "Fields to change",
    /** The name of a row of the dialog for assistive technology; `position` counts from 1. */
    row: (position: number) => `Change ${position}`,
    field: "Field",
    operation: "Operation",
    operations: { set: "Set to", add: "Add", scale: "Scale to %", addYears: "Add years" } satisfies Record<
      MassOperationKind["op"],
      string
    >,
    /** The name of the value input, by operation. */
    values: { set: "Value", add: "Amount", scale: "Percent", addYears: "Years" } satisfies Record<
      MassOperationKind["op"],
      string
    >,
    /** Hover text of the amount of an Add. */
    addTitle: "Added to every value as shown; a negative number takes away",
    /** The same for a percentage: the amount is in percentage points, not a percent of the value (that is Scale). */
    addPointsTitle: "Percentage points added to every value (70% plus 10 is 80%); a negative number takes away",
    /** The hint in an empty value input: what it takes. */
    rangeHint: (min: number, max: number) => `${format(min)}–${format(max)}`,
    /** The same for an amount, which may be negative: up to `max` either way. */
    amountHint: (max: number) => `±${format(max)}`,
    /** After the input of a Scale: the number is a percent of the value the game has now. */
    ofCurrent: "% of current",
    percentTitle: "A percent of the current value: 100 keeps it, 110 raises it by a tenth, 50 halves it",
    /** Hover text of the years of an Add years, and the word after its input. */
    addYearsTitle: "Years added to every date; a negative number moves it back, and 29 February may become 28",
    years: "years",
    /** Hover text of an amount that cannot be applied; `min` and `max` are what it takes. */
    invalidAdd: (min: number, max: number) => `Enter a whole number from ${format(min)} to ${format(max)}`,
    invalidPercent: (min: number, max: number) => `Enter a whole percent from ${min} to ${max}`,
    invalidYears: (min: number, max: number) => `Enter a whole number of years from ${format(min)} to ${format(max)}`,
    /** A date cannot be added to or scaled, only set or moved by years; and nothing else is moved by years. */
    dateSetOnly: "A date can only be set or moved by years",
    yearsDateOnly: "Only a date can be moved by years",
    addField: "Add a field",
    /** Hover text of Add a field when the rows are full; `max` is how many fields one mass edit changes. */
    addFieldFull: (max: number) => `A mass edit changes up to ${max} fields`,
    remove: "Remove this field",
    /** Hover text of Remove on the only row. */
    removeLast: "A mass edit needs at least one field",

    // The preview
    preview: "Preview",
    previewing: "Previewing…",
    /** Beside Preview while it cannot be pressed. */
    previewBlocked: "Fill in every field with a valid value to preview",
    /** "312 changes for 140 of 237 players · 97 already have these values · 12 values left alone". */
    summary: (entity: Entity, preview: MassPreview) =>
      [
        preview.changes === 0
          ? "No changes"
          : `${changeCount(preview.changes)} for ${format(preview.targets - preview.unchanged)} of ` +
            entityCount[entity](preview.targets),
        preview.unchanged > 0 &&
          (preview.unchanged === 1
            ? "1 already has these values"
            : `${format(preview.unchanged)} already have these values`),
        preview.skippedCount > 0 && valuesLeftAlone(preview.skippedCount),
      ]
        .filter(Boolean)
        .join(" · "),
    tableLabel: "Changes the mass edit would make",
    columns: { name: "Name", field: "Field", change: "Change", reason: "Reason" },
    /** Under a table or a list that shows only the first rows; `count` is how many more there are. */
    more: (count: number) => `and ${format(count)} more`,
    /** The line that opens the list of the values left alone. */
    skippedHeading: valuesLeftAlone,
    skippedLabel: "Values the mass edit leaves alone",

    // Apply and undo
    apply: "Apply",
    applying: "Applying…",
    /** Hover text of Apply; `changes` is how many values it writes. */
    applyTitle: (changes: number) => `Write ${changeCount(changes)} to the game`,
    applyFirst: "Preview the mass edit first",
    applyNothing: "The preview has no changes to write",
    /** Nothing changes in the game until Apply. */
    hint: "Nothing changes in the game until you apply.",
    applied: (count: number) => (count === 0 ? "No changes were written" : `Applied ${changeCount(count)}`),
    /** A change the game refused: who, which field (see `fieldLabel`) and the game's answer. */
    failure: (name: string, label: string, reason: string) => `${name} · ${label}: ${reason}`,
    undo: "Undo this mass edit",
    undoing: "Undoing…",
    undoTitle: "Write the old values of this mass edit back to the game",
    undone: (count: number) => (count === 0 ? "Nothing was undone" : `Undid ${changeCount(count)}`),
    /** A change an undo could not take back: `who` names the person and the field, or the change by its number. */
    undoFailure: (who: string, reason: string) => `${who}: ${reason}`,
    changeNumber: (id: number) => `Change ${id}`,
    close: "Close",
  },

  /** Comparing players: the button in a player's profile, the tray under the player list and the dialog. */
  comparison: {
    /** The button in the header of a player's profile. */
    compare: "Compare",
    /** Hover text of that button while the player is not in the comparison, and while they are. */
    add: "Add to comparison",
    remove: "Remove from comparison",
    /** Hover text of the button while the comparison is full and cannot take this player; `max` is its size. */
    full: (max: number) => `A comparison holds up to ${max} players. Remove one to add this player.`,

    // The tray under the player list
    trayLabel: "Players to compare",
    /** The name and hover text of the × on a player's chip. */
    removePlayer: (name: string) => `Remove from comparison: ${name}`,
    clear: "Clear",
    /** The button that opens the dialog; `count` is how many players are picked. */
    open: (count: number) => `Compare (${count})`,

    // The dialog
    title: "Comparison",
    /** Under the title: what the highlight in the table means. */
    hint: "The best value in each row is highlighted: the highest, or the lowest where lower is better.",
    /** What the dialog says when fewer than two players are picked. */
    tooFew: "Add at least two players to compare them.",
    loading: "Loading the players…",
    tableLabel: "Values of the compared players",
    /** Said after the highlighted value of a row, for assistive technology. */
    highest: "highest",
    lowest: "lowest",
    /** The heading of the rows with the positions, height, reputation and contract. */
    profile: "Profile",
    close: "Close",
  },

  /**
   * Moving a player to another club, or swapping him with a player of another club: the button in his profile and the
   * dialog it opens.
   */
  move: {
    /** The button in the header of a player's profile. */
    button: "Transfer",
    buttonTitle: "Transfer this player to another club in the game, for a fee if you like",

    // The dialog
    title: "Transfer",
    /** The club the player is at, and the club he moves to (or, in a swap, goes to). */
    from: "From",
    to: "To",

    // The switch at the top of the dialog: a transfer the game makes the next day, a move to a club now, or a swap with
    // one of its players.
    /** Its name for assistive technology. */
    modeLabel: "Transfer, loan, move now or swap",
    modeArrange: "Transfer",
    modeMove: "Move now",
    modeSwap: "Swap with a player",
    /** Under the switch: what each of the first two does, and why Transfer is missing where it is. */
    arrangeNote:
      "The game makes the transfer on its next day, as it makes its own: his history keeps this season's matches " +
      "with his old club, lists the new club with the fee, and the game pays the fee.",
    moveNote:
      "The editor moves him at once. The game's history does not list it: this season shows under the new club, " +
      "with no fee.",
    arrangeUnavailable:
      "This version of the game, or this system, does not let the editor arrange a transfer for the game to make: " +
      "Move now moves him at once.",

    // A transfer the game makes the next day
    /** While the plan is worked out: the first time, finding the game's transfers takes a few seconds. */
    arrangeChecking: "Checking the transfer… the first time, finding the game's transfers takes a few seconds.",
    /** The day the game makes the move, in the plan. */
    movesOn: (date: string) => `The game makes the move on ${date}`,
    /** The fee in the plan: the game pays it on the day. */
    arrangeFee: (amount: string) => `Fee ${amount}, paid by the game on the day`,
    /** The contract in the plan: the wage per week and the end date, written out. */
    arrangeContract: (wage: string, expires: string) => `Contract: ${wage} a week, until ${expires}`,
    /** What arranging the transfer does, one line each, in the place of `does`. */
    arrangeDoes: [
      "Agreed now: the game makes the move when it reaches its next day",
      "His history keeps this season's matches with his old club, and lists the new club with the fee",
      "The game pays the fee on the day, as it pays for its own transfers",
      "Contract with the new club from that day; wage and contract end change only if you set new ones",
      "Listed under Changes, where one undo takes it back until the day",
    ],
    /** The button of the foot. */
    arrangeButton: "Arrange transfer",

    // A loan the game makes the next day
    /** The choice of the switch. */
    modeLoan: "Loan",
    /** Under the switch in loan mode. */
    loanNote: "The game makes the loan on its next day, as it makes its own; he is back at his club after it.",
    /** While the loan's plan is worked out. */
    loanChecking: "Checking the loan…",
    /** The plan's lines: the day the game makes the loan, its last day, what the club pays, the monthly fee, the option. */
    loanOn: (date: string) => `The game makes the loan on ${date}`,
    loanUntil: (date: string) => `The loan lasts until ${date}`,
    loanWage: (money: string, share: number) => `The club pays ${money} a week (${format(share)}% of his wage)`,
    loanMonthlyFee: (money: string) => `Monthly fee ${money}`,
    loanOption: (money: string) => `Option to buy for ${money}`,
    /** What arranging the loan does, one line each, in the place of `does`. */
    loanDoes: [
      "Agreed now: the game makes the loan when it reaches its next day",
      "His history lists the loan, and he returns to his own club the day after the last day",
      "The club pays its share of his wage, and the monthly fee if you set one",
      "With an option, the club he joins may sign him for its fee when the loan ends",
    ],
    /** The heading of `loanDoes`. */
    loanDoesHeading: "What the loan does",
    /** The foot's hint and button in loan mode. */
    loanHint: "Nothing changes in the game until you press Arrange loan.",
    loanButton: "Arrange loan",
    /** The loan's inputs: label, and the short hint under it. */
    loanLastDay: "Last day of the loan",
    loanLastDayHint: "He is back at his own club the next day",
    loanShare: "Share of his wage paid",
    loanShareHint: "What the club he joins pays; his own club pays the rest",
    loanShareInvalid: "Enter a whole number from 0 to 100",
    loanMonthly: "Monthly fee",
    loanOptionFee: "Option to buy",
    loanOptionFeeHint: "The club he joins may sign him for this fee when the loan ends; empty for none",

    // Choosing the club
    /** The name of the search box, and of the list of clubs under it, for assistive technology. */
    searchLabel: "Search for the club to transfer to",
    resultsLabel: "Clubs found",
    searching: "Searching clubs…",
    searchFailed: (reason: string) => `Could not search the clubs: ${reason}`,
    /** Under the list when the search found more clubs than it lists; `count` is how many more. */
    more: (count: number) => `and ${format(count)} more; type to narrow the search`,
    /** Takes the place of the search once a club is picked: the button that brings it back. */
    change: "Choose another club",

    // The fee
    feeHeading: "Fee",
    fee: "Transfer fee",
    /** Under the fee input while it can be sent, and while it cannot. */
    feeHint: "Leave it empty for a free transfer",
    /** `max` is the most a fee can be, as amounts are shown. */
    feeInvalid: (max: string) => `Enter a whole amount, from 0 to ${max}`,
    /**
     * What the fee does to the clubs' money, a line each in the plan. `fee` is the amount, `balance` and `budget` a
     * change written out ("£9,492,232 → £10,726,799"); `budget` is null when the club has no transfer budget set.
     */
    pays: (club: string, fee: string, balance: string, budget: string | null) =>
      `${club} pays ${fee}: balance ${balance}${budget === null ? "" : `, transfer budget ${budget}`}`,
    receives: (club: string, fee: string, balance: string) => `${club} receives ${fee}: balance ${balance}`,
    /** For a club outside the leagues being played, which the game keeps no finances for. */
    noFinances: (club: string) => `${club} has no finances in the game: its money stays as it is`,

    // The contract
    /** Under an input that cannot be sent. */
    wageInvalid: "Enter a whole amount, 0 or more",
    expiresInvalid: "Enter a date",

    // What the dialog says about the move itself
    chooseClub: "Choose the club to transfer the player to.",
    fixTerms: "Fix the fee or the contract values first.",
    checking: "Checking the transfer…",
    /** The move can be made; `from` and `to` are the names of the clubs. */
    route: (from: string, to: string) => `${from} → ${to}`,
    doesHeading: "What the transfer does",
    /** What the game does to the player, one line each. */
    does: [
      "Joins the senior team of the new club",
      "Contract dated from the game's date; squad number cleared",
      "Comes off the transfer and loan lists",
      "Wage and contract end change only if you set new ones",
      "The fee comes out of the buying club's balance and transfer budget, and goes into the selling club's balance",
      "Any captaincy at the old club is left empty",
      "The game's transfer history does not list it yet",
      "Listed under Changes, where one undo takes back the transfer and the fee",
    ],

    // A club whose squad list is full: the box that takes the place of the refusal and offers to make room, by
    // releasing one of its players in the same transfer, or by making it a swap with that player.
    /** The first line; `club` is the club picked. */
    noRoom: (club: string) => `${club} has no room in its squad.`,
    /** The name of the (i) button after the first line, for assistive technology, and the note it shows. */
    noRoomInfoLabel: "Why?",
    noRoomInfo:
      "The editor makes a full squad list bigger where it can, but it cannot make this one bigger: a player has to " +
      "leave to make room.",
    /** The second line, which also names the choices under it; `player` is the player transferred. */
    noRoomNeed: (player: string, club: string) => `For ${player} to join, a player has to leave ${club}.`,
    /** The first choice: a player of the club picked from a list, who becomes a free agent. */
    releaseChoice: "Release:",
    releasePickLabel: "Player to release",
    releaseOutcome: "→ becomes a free agent",
    /** After a player's name in that list: what makes him a worse choice. */
    injuredTag: "injured",
    captainTag: "captain",
    /** The second choice, which turns the dialog into a swap with the player picked; `club` is the player's club. */
    swapChoice: "Make it a swap:",
    swapChoiceOutcome: (club: string) => `this player goes to ${club}`,
    /** The button of the foot while a player is released; `name` is that player. */
    moveAndRelease: (name: string) => `Transfer and release ${name}`,
    /** What a transfer that makes room does, one line each, in the place of `does`. */
    makeRoomDoes: [
      "Joins the senior team of the new club, in the place of the player released",
      "The player released leaves every team of that club, and their contract ends: a free agent",
      "Contract dated from the game's date; squad number cleared",
      "Comes off the transfer and loan lists",
      "Wage and contract end change only if you set new ones",
      "The fee comes out of the buying club's balance and transfer budget, and goes into the selling club's balance",
      "Any captaincy either of them held at the club they leave is left empty",
      "The game's transfer history does not list it yet",
      "Listed under Changes as one change, where one undo takes back the transfer, the release and the fee",
    ],

    // Swapping with a player of the club instead: the title, and the section that picks the player (the club is
    // chosen as for a move).
    swapTitle: "Swap with a player",
    /** The player who goes the other way. */
    swapWith: "Swap with",
    /** The name of the search box of the club's players, its hint, and the name of the list under it. */
    playerSearchLabel: "Search for the player to swap with",
    playerSearch: "Search this club's players by name",
    playersLabel: "Players found",
    playersSearching: "Searching players…",
    playersSearchFailed: (reason: string) => `Could not search the players: ${reason}`,
    /** Under the list when it is empty: `query` is what was typed. */
    playersEmpty: (query: string) =>
      query === "" ? "This club has no players." : `No player of this club matches “${query}”.`,
    /** Takes the place of the list once a player is picked: the button that brings it back. */
    changePlayer: "Choose another player",

    // What the dialog says about the swap
    /** A swap has no contract terms to set. */
    swapContract: "Each player keeps their own contract; wages and contract ends do not change.",
    // Moving a member of staff, who has neither a fee nor terms to set, and no swap.
    staffButtonTitle: "Move this member of staff to another club in the game",
    staffChooseClub: "Choose the club to move this member of staff to.",
    staffContract: "Keeps the job, the wage and the contract end; the contract is dated from the game's date.",
    /** The select of the job they take at the club, and its first choice for one who has no job yet. */
    staffJob: "Job",
    staffJobChoose: "Choose a job…",
    /** After the name of their own job in that select. */
    staffJobKept: (job: string) => `${job} (keeps it)`,
    /** In the place of `staffContract` when another job is chosen. */
    staffNewJob: "Takes the new job, and keeps the wage and the contract end; the contract is dated from the game's date.",
    staffDoes: [
      "Joins the new club where the job is: its medical, coaching or scouting department, or as its director of " +
        "football or manager, which a club with one already does not take",
      "Same wage and contract end; the contract is dated from the game's date",
      "A manager who leaves a team leaves its place empty, for the club to fill; the board is left to the game",
      "Listed under Changes, where it can be undone",
    ],
    // Signing a member of staff who has no club: the same dialog with a job to choose and a contract the editor makes.
    staffSignButtonTitle: "Sign this member of staff, who has no club, for a club in the game",
    staffSignTitle: "Sign a member of staff",
    staffSignChooseClub: "Choose the club to sign them for.",
    staffSignChooseJob: "Choose the job they take at the club.",
    /** Under the contract's inputs. */
    staffSignTerms:
      "Leave them empty for the wage of the club's member of staff whose job is most like theirs, and a contract to " +
      "the end of next season.",
    /** The signing can be made: `to` is the club. */
    staffSignRoute: (to: string) => `No club → ${to}`,
    /** The contract the editor makes: `wage` and `expires` written out. */
    staffSignContract: (wage: string, expires: string) => `New contract: ${wage} a week until ${expires}`,
    staffSignDoes: [
      "Joins the club where the job is: its department, made bigger when full, or as its director of football or " +
        "manager, when it has none",
      "A new contract from the game's date, in one of the game's own free contract slots, as the game makes one",
      "Modelled on the contract of the club's member of staff with the same job (else in the same department, else " +
        "any) nearest their ability",
      "Your wage and contract end, or that contract's wage and the end of next season; no clauses or bonuses",
      "Listed under Changes, where one undo takes it all back",
    ],
    swapChooseClub: "Choose the club of the player to swap with.",
    swapChoosePlayer: "Choose the player to swap with.",
    swapChecking: "Checking the swap…",
    /** The swap can be made: who goes where, a line each. `from` is the club of the player, `to` that of the other. */
    swapRoute: (player: string, from: string, to: string, other: string) =>
      `${player}: ${from} → ${to}\n${other}: ${to} → ${from}`,
    swapDoesHeading: "What the swap does",
    swapDoes: [
      "Each joins the senior team of the other's club",
      "Contracts dated from the game's date; squad numbers cleared",
      "Both come off the transfer and loan lists",
      "Any captaincy at their old clubs is left empty",
      "No fees are paid; career history is not updated",
      "Listed under Changes as one change, which undoes both moves",
    ],

    // Signing a free agent, who has no club: the same dialog with no fee and no swap, and a contract the editor makes.
    signButtonTitle: "Sign this free agent for a club in the game",
    signTitle: "Sign a free agent",
    signChooseClub: "Choose the club to sign the player for.",
    signChecking: "Checking the signing…",
    /** Under the contract's inputs. */
    signTerms:
      "Leave them empty for the wage of the club's player nearest his ability, and a contract to the end of next " +
      "season.",
    /** The signing can be made: `to` is the club. */
    signRoute: (to: string) => `Free agent → ${to}`,
    /** The contract the editor makes: `wage` and `expires` written out, `status` the squad status's name. */
    signContract: (wage: string, expires: string, status: string) =>
      `New contract: ${wage} a week until ${expires}, ${status}`,
    signDoesHeading: "What the signing does",
    signDoes: [
      "Joins the senior team of the club; a full squad list is made bigger",
      "A new contract from the game's date, in one of the game's own free contract slots, as the game makes one",
      "Modelled on the contract of the club's player nearest his ability: the same kind of contract and squad status",
      "Your wage and contract end, or that player's wage and the end of next season",
      "No squad number, loyalty bonus, clauses or bonuses",
      "The game's transfer history does not list it yet",
      "Listed under Changes, where one undo takes it all back",
    ],
    signHint: "Nothing changes in the game until you press Sign.",
    sign: "Sign",
    signing: "Signing…",

    // The foot
    /** Nothing changes in the game until Transfer, or Swap. */
    hint: "Nothing changes in the game until you press Transfer.",
    /** The same for a transfer arranged for the game, and for a player moved now. */
    arrangeHint: "Nothing changes in the game until you press Arrange transfer.",
    moveNowHint: "Nothing changes in the game until you press Move now.",
    move: "Transfer",
    moving: "Transferring…",
    cancel: "Cancel",
    swapHint: "Nothing changes in the game until you press Swap.",
    swap: "Swap",
    swapping: "Swapping…",
  },

  /**
   * A player's ties to nations and clubs: their secondary nationalities, and the nations and clubs they were trained
   * in, which decide whether they count as homegrown under a competition's rules. The group in the profile and its
   * dialog.
   */
  ties: {
    heading: "Nationality and homegrown",
    nationalities: "Secondary nationalities",
    trainedInNation: "Trained in nation",
    trainedAtClub: "Trained at club",
    /** A nation he needs no work permit in, as the game lets players of the EU who were in the UK before Brexit. */
    workPermit: "No work permit needed in",
    none: "None",
    /** The game's names of its homegrown rules, by code; `rule` names one it has no name for here. */
    rules: {
      1: "Homegrown 15-21",
      2: "Homegrown 0-21",
      5: "Homegrown 15-21 (excluding loans)",
      10: "Homegrown 0-19 (1 year)",
    } as Readonly<Record<number, string>>,
    rule: (code: number) => `Homegrown rule ${format(code)}`,

    // The button under the group, and the dialog it opens
    change: "Change",
    changeTitle: "Change this player's secondary nationalities and homegrown status in the game",
    title: "Nationality and homegrown",
    hint: "Each change is written to the game at once, and listed under Changes, where it can be undone.",
    /** When the player's list has no room for another tie. */
    full:
      "The game made this player's list just big enough for what it holds: a nationality or a training can be " +
      "changed or removed, but not added.",
    /** The control of a row, for assistive technology: `name` is the nation's or club's. */
    nationOf: (name: string) => `Nation instead of ${name}`,
    ruleOf: (name: string) => `Homegrown rule for ${name}`,
    remove: "Remove",
    removeTitle: (name: string) => `Remove ${name}`,
    /** The rows that add a tie, where the list has room. */
    addNationality: "Add a nationality…",
    addNation: "Add a nation…",
    addPermit: "Add a country with no permit needed…",
    /** After a nation he needs no work permit in. */
    daysLeft: (days: number) => `${format(days)} days left`,
    permitInfoLabel: "What does this do?",
    permitInfo:
      "The game lets players of the European Union who were in England or Scotland before Brexit play there without " +
      "a work permit, for a number of days. A player given this needs no work permit to play in that country either, " +
      "for as many days as theirs have left (ten years where no one in the save has it).",
    newRule: "Homegrown rule of the new nation",
    add: "Add",
    /** A club he was trained at: the button that points it at another club, and the search it opens. */
    changeClub: "Change club",
    changeClubTitle: (name: string) => `Make him trained at another club instead of ${name}`,
    clubInsteadOf: (name: string) => `Club instead of ${name}`,
    /** The button that adds a club he was trained at, and what it opens. */
    addClub: "Add a club…",
    addClubTitle: "Make him trained at one more club",
    newClub: "New club",
    pickAnother: "Pick another",
    newClubRule: "Homegrown rule of the new club",
    cancel: "Cancel",
    working: "Writing to the game…",
    close: "Close",
  },

  /** Changing a contract's bonuses and clauses: the button under them in the profile, and the dialog it opens. */
  clauses: {
    change: "Change",
    changeTitle: "Change this player's bonuses and clauses in the game",
    title: "Bonuses and clauses",
    hint: "Each change is written to the game at once, and listed under Changes, where it can be undone.",
    /** When the contract has no release clause and its list has no room for one. */
    full:
      "The game made this contract's list just big enough for what it holds: a bonus or clause can be changed or " +
      "removed, but a release clause cannot be added.",
    /** The inputs of a row, for assistive technology: `name` is the clause's. */
    amountOf: (name: string) => `Amount of ${name}`,
    conditionOf: (name: string) => `Condition of ${name}`,
    save: "Save",
    remove: "Remove",
    removeTitle: (name: string) => `Remove ${name}`,
    /** The row that adds a release clause, where the list has room and the contract has none. */
    addRelease: "Add a release clause",
    releaseAmount: "Amount of the new release clause",
    add: "Add",
    /** When an amount or condition typed is not a whole number in range: `max` is the most it may be. */
    /** `max` is written out already: an amount as amounts are shown, or a number. */
    outOfRange: (max: string) => `Enter a whole number from 0 to ${max}.`,
    working: "Writing to the game…",
    close: "Close",
  },

  /** Releasing a player from their club, which leaves them a free agent: the button beside Transfer and its dialog. */
  release: {
    /** The button in the header of a player's profile, beside Transfer. */
    button: "Release",
    buttonTitle: "Release this player from their club in the game: they become a free agent",

    /** The same button in a member of staff's profile: its hover text. */
    staffButtonTitle: "Release this member of staff from their club in the game: they are left without a club",

    // The dialog
    title: "Release",
    /** The club the player leaves. */
    from: "Leaves",
    checking: "Checking the release…",
    /** The player can be released; `club` is the name of their club. */
    ready: (club: string) => `${club} → free agent`,
    /** A member of staff can be released; `club` is the name of their club. */
    staffReady: (club: string) => `${club} → unemployed`,
    doesHeading: "What the release does",
    /** What the game does to the player, one line each. */
    does: [
      "Leaves every team of the club, and the contract ends: a free agent any club can sign",
      "No one is paid anything",
      "Any captaincy at the club is left empty",
      "The game's transfer history does not list it",
      "Listed under Changes, where one undo brings the player back on the same contract",
    ],
    /** What the release does to a member of staff, one line each. */
    staffDoes: [
      "Leaves the club's staff at once, and the contract ends: unemployed, as the game's own staff without a club are",
      "No one is paid anything",
      "A place as manager or director of football is left empty, for the club to fill",
      "Listed under Changes, where one undo brings them back on the same contract",
    ],

    // The foot
    /** Nothing changes in the game until Release. */
    hint: "Nothing changes in the game until you press Release.",
    release: "Release",
    releasing: "Releasing…",
    cancel: "Cancel",
  },

  /** Changing a player's names: the button beside Release and its dialog. */
  rename: {
    /** The button in the header of a player's profile, beside Release. */
    button: "Rename",
    buttonTitle: "Change this player's names in the game",

    // The dialog
    title: "Rename",
    loading: "Reading the names…",
    first: "First name",
    last: "Last name",
    common: "Common name",
    commonHint:
      "The name the game shows instead of the first and last name, as with Pedri or Vinícius Júnior. Leave it empty for none",
    full: "Full name",
    fullHint: "The name in full, as the profile gives it. Leave it empty for none",
    /** The placeholder of a name that can be left empty. */
    none: "None",
    required: "Cannot be empty",
    tooLong: (max: number) => `Too long: at most ${max} bytes`,
    noRoom:
      "The game has no room for another new name of this kind just now: save the game, load the save again, and try again",
    unavailable: "The editor cannot change names in this version of the game",
    doesHeading: "What it does",
    does: [
      "The game shows the new name once you press Continue in it",
      "The name stays when you save the game",
      "A new first, last or common name goes into the game's tables of names, where the game uses it for this player only",
      "Listed under Changes, one line per name, where Undo puts the old name back",
    ],

    // The foot
    hint: "Nothing changes in the game until you press Rename.",
    rename: "Rename",
    renaming: "Renaming…",
    cancel: "Cancel",
  },

  /** Making a player's loan permanent: the dialog the Make permanent button of the Loan part of his profile opens. */
  permanent: {
    title: "Make the loan permanent",
    /** The club he stays at, and his own club, which he leaves. */
    stays: "Stays at",
    leaves: "Leaves",
    checking: "Checking…",
    doesHeading: "What it does",
    /** One line each. */
    does: [
      "He stays where he plays, now under contract with that club from today, on the terms above",
      "He keeps the squad number and squad status he has there",
      "He leaves every team of his own club, and the loan ends",
      "The game's transfer history does not list it",
      "Listed under Changes as a transfer, where one undo puts the loan back",
    ],
    /** The fee, filled in from the loan's option to buy. */
    optionFee: (money: string) => `Filled in from the loan's option to buy: ${money}`,
    /** Nothing changes in the game until Make permanent. */
    hint: "Nothing changes in the game until you press Make permanent.",
    confirm: "Make permanent",
    confirming: "Making it permanent…",
    cancel: "Cancel",
  },

  /** Recalling a player from his loan: the dialog the Recall button of the Loan part of his profile opens. */
  recall: {
    title: "Recall from loan",
    /** The club he is on loan at, and the one he goes back to. */
    from: "On loan at",
    to: "Goes back to",
    doesHeading: "What the recall does",
    /** One line each; `parent` is the club he goes back to. */
    does: (parent: string) => [
      "Today becomes the last day of the loan: when the day is over, the game ends the loan itself",
      `Continue one day in the game and he is back at ${parent}`,
      "Until then it is listed under Changes, where an undo puts the loan's old end back",
    ],
    /**
     * What the loan's terms would not allow in the game, when it would not let his club recall him or end the loan
     * early; `parent` is his club. The recall here moves the loan's last day all the same.
     */
    termsHeading: "In the game",
    notRecallable: (parent: string) => `The loan does not let ${parent} recall him`,
    notTerminable: "The loan cannot be ended early",
    worksAnyway: "The recall here works all the same: it does not go through the game's recall, it moves the loan's last day",
    /**
     * A line of what the recall does, for a loan with an option to buy: `club` is the club he is on loan at. When a loan
     * with one ends, the game may let that club sign him for it.
     */
    dropsOption: (club: string, amount: string) =>
      `${club}'s option to buy him for ${amount} is taken away: else, when the loan ends, the game may sell him to ${club}`,
    /** Nothing changes in the game until Recall. */
    hint: "Nothing changes in the game until you press Recall.",
    confirm: "Recall",
    confirming: "Recalling…",
    cancel: "Cancel",
  },

  /** Batch traits: the dialog of a club's Squad tab that adds or removes traits for every player of a team. */
  batchTraits: {
    title: "Batch team traits",
    addMode: "+ Add to squad",
    removeMode: "- Remove from squad",
    addHint: "Applies selected traits to players in this team who don't have them. Existing traits are preserved.",
    removeHint: "Removes selected traits from players in this team who have them. Other traits are left untouched.",
    noneSelected: "No traits selected in this mode",
    selectedCount: (count: number) => (count === 1 ? "1 trait selected" : `${format(count)} traits selected`),
    deselectAll: "Deselect all",
    oppositeModeNote: "Selected in opposite mode",
    applyNote: (players: number) => `Applies to ${format(players)} players · Can be undone in 1 click`,
    emptySquad: (players: number) => `Squad of ${format(players)} players`,
    cancel: "Cancel",
    apply: "Apply",
    applying: "Applying…",
  },

  /**
   * A club's squad: the tab of the club profile that lists the players of each of its teams, with the actions on a
   * whole team and the captains.
   */
  squad: {
    // The switch between the club's teams
    /** The name of the switch for assistive technology. */
    teamsLabel: "Team",
    /**
     * The names of the teams (see `teamLabel` in labels.ts): the first team, a B team, a team with an age limit, and
     * any other, which is named by its place in the club's list (`place` counts from 1, the first team being the
     * first).
     */
    teams: {
      first: "First team",
      b: "B team",
      age: (limit: number) => `U${limit}`,
      other: (place: number) => `Team ${place}`,
    },
    /** When the game lists no team for the club. */
    noTeams: "This club has no teams.",
    loading: "Reading the squad…",
    /** The message under an empty table. */
    empty: "No players in this team.",

    // Above the table
    players: (count: number) => (count === 1 ? "1 player" : `${format(count)} players`),
    /** `age` is written out already, with one decimal. */
    averageAge: (age: string) => `average age ${age}`,
    /** `captain` and `viceCaptain` are names, or `profile.none` for nobody. */
    captains: (captain: string, viceCaptain: string) => `Captain: ${captain} · Vice-captain: ${viceCaptain}`,

    // The actions on the whole team
    /** The name of the group of buttons for assistive technology. */
    actionsLabel: "Actions on the whole team",
    /** `injured` is how many of the team's players have an injury. */
    healAll: (injured: number) => (injured === 0 ? "Heal all" : `Heal all (${format(injured)} injured)`),
    healAllTitle: "Heal every injury of every player in this team",
    /** Hover text of Heal all while nobody in the team is injured. */
    healNone: "Nobody in this team is injured",
    /** `banned` is how many of the team's players have a ban. */
    liftAll: (banned: number) => (banned === 0 ? "Lift bans" : `Lift bans (${format(banned)} banned)`),
    liftAllTitle: "Lift every ban of every player in this team",
    /** Hover text of Lift bans while nobody in the team is banned. */
    liftNone: "Nobody in this team is banned",
    inspireAll: "Inspire all",
    inspireAllTitle: "Set every player's morale to 20, the highest, and remove their reasons to be unhappy",
    maxCohesion: "Max cohesion",
    maxCohesionTitle:
      "Set every player's cohesion with the club to 100, the highest; the game shows it once it moves on",
    /** Hover text of Max cohesion while no player's cohesion with the club can be read. */
    cohesionNone: "Cannot be read: this game version is not checked for it, or no player has an entry for the club",
    /** After Max cohesion: how many players of the team have no entry for the club yet, and were left out. */
    cohesionWithout: (count: number) =>
      count === 1
        ? "1 player has no cohesion with the club yet"
        : `${format(count)} players have no cohesion with the club yet`,
    maxTactics: "Max tactics",
    maxTacticsTitle:
      "Have every player know the team's tactic at its best; it fades after some six weeks, as training does",
    /** Hover text of Max tactics while no player's familiarity with the team's tactic can be read. */
    tacticsNone: "Cannot be read: this game version is not checked for it, or the team does not play a tactic you pick",
    /** After Max tactics: how many players of the team do not train, whose history of training was left as it is. */
    tacticsUntrained: (count: number) =>
      count === 1
        ? "1 player does not train (as when injured): his history of training stays as it is"
        : `${format(count)} players do not train (as when injured): their history of training stays as it is`,
    refreshAll: "Refresh all",
    refreshAllTitle: "Set every player's energy and match sharpness to 100%, and rest them fully (jadedness -500)",
    batchTraits: "Batch traits",
    batchTraitsTitle: "Add or remove preferred moves for players in this team",
    maxAll: "Max attributes",
    maxAllTitle: "Set every attribute of every player to its best: 20, and 1 for injury proneness and dirtiness",
    atItsBest: "Team at its best",
    atItsBestTitle:
      "Heal all, Inspire all, Refresh all, Max cohesion and Max tactics in one press; one Undo takes it back",
    /** After Team at its best or Destroy: a step it left out, by its name, and why. */
    atItsBestSkipped: (step: string, reason: string) => `${step} skipped: ${reason}`,
    /** The red button that takes the team to its worst, after asking (see `destroyDialog`). */
    destroy: "Destroy",
    destroyTitle: "Take every player's morale, fitness, cohesion and tactic knowledge to their worst; it asks first",
    /** The names of Destroy's steps, for one it left out (see `atItsBestSkipped`). */
    destroySteps: {
      demoralize: "Morale and happiness",
      exhaust: "Energy and sharpness",
      minCohesion: "Cohesion",
      minTactics: "Tactics",
    },
    /** The menu with the actions on the whole team one at a time: Heal all to Max tactics. */
    moreActions: "More actions",
    moreActionsTitle: "The actions on the whole team, one at a time",
    /** Destroy's question, asked before anything is written. */
    destroyDialog: {
      title: "Destroy this team?",
      doesHeading: "For every player in the list, those out on loan too",
      does: [
        "Morale to 1, the lowest; happiness and playing time happiness to -100",
        "Energy to 0%, match sharpness to 35% and jadedness to 1000",
        "Cohesion with the club to 1, for those who have it",
        "How well he knows the tactic to its least, where you pick the team's tactic",
      ],
      keeps: "No value is made better than it is. Attributes, injuries and bans stay as they are.",
      /** When a manager of the user's runs the club. */
      ownClub: "This is a team of your own club.",
      hint: "One Undo takes it all back, before the game moves on.",
      cancel: "Cancel",
    },
    /** Beside the buttons: whom they cover, and where undoing is. */
    hint: "The actions cover every player in the list, those out on loan too. Undo is in the Changes view as well.",

    // Freezing the whole team, under the actions
    /** The name of the group of boxes for assistive technology. */
    freezeLabel: "Freeze the whole team",
    freezeAttributes: "Freeze attributes",
    freezeAttributesTitle:
      "The attributes of every player in this team do not get worse while the app is open and connected",
    freezeFitness: "Freeze energy and sharpness",
    freezeFitnessTitle:
      "Every player's energy and match sharpness stay up while the app is connected; Refresh all first for 100%",
    freezePositions: "Freeze positions",
    freezePositionsTitle:
      "The position ratings of every player in this team stay as they are while the app is open and connected",
    /** After a box: how many of the team's `total` players are frozen that way, while some are and some are not. */
    frozenCount: (frozen: number, total: number) => `${format(frozen)} of ${format(total)}`,
    /** Beside the boxes: whom freezing covers, and for how long. */
    freezeHint:
      "Freezing covers every player in the list and stays with each one wherever he goes. The app remembers it for " +
      "this save.",
    /** What a box did, in the line under the buttons; `count` is how many players it froze or unfroze now. */
    frozeAttributes: (count: number) =>
      count === 0 ? "Their attributes were frozen already" : `Froze the attributes of ${playerCount(count)}`,
    unfrozeAttributes: (count: number) => `Unfroze the attributes of ${playerCount(count)}`,
    frozeFitness: (count: number) =>
      count === 0
        ? "Their energy and sharpness were frozen already"
        : `Froze the energy and sharpness of ${playerCount(count)}`,
    unfrozeFitness: (count: number) => `Unfroze the energy and sharpness of ${playerCount(count)}`,
    frozePositions: (count: number) =>
      count === 0 ? "Their positions were frozen already" : `Froze the positions of ${playerCount(count)}`,
    unfrozePositions: (count: number) => `Unfroze the positions of ${playerCount(count)}`,

    // What an action did, under the buttons
    /** `count` is how many values were written. */
    written: (count: number) => `${changeCount(count)} written`,
    /** A change the game refused: `name` is the player's, `reason` the game's answer (it names the value). */
    refused: (name: string, reason: string) => `${name}: ${reason}`,
    /** Takes back what the line beside it says was written. */
    undo: "Undo",
    undoTitle: "Write the old values of these changes back to the game",

    // Captains
    /** The badges after the name of the captain and of the vice-captain; their hover texts are the roles' names. */
    captainShort: "C",
    viceCaptainShort: "VC",
    /** The menu button at the end of a row: its name for assistive technology (`name` is the player's), hover text. */
    menuLabel: (name: string) => `Captaincy of ${name}`,
    menuTitle: "Captaincy",
    makeCaptain: "Make captain",
    makeViceCaptain: "Make vice-captain",
    /** Who holds a role now: said after a change, and in the Changes view under a captaincy that moved the other. */
    nowCaptain: (name: string) => `${name} is now captain`,
    nowViceCaptain: (name: string) => `${name} is now vice-captain`,
    /** The same when there was nobody to take the role the new holder left, so that it stands empty. */
    noCaptain: "Nobody is captain now",
    noViceCaptain: "Nobody is vice-captain now",

    // The table
    /** The table's name for assistive technology; `team` is the name of the team. */
    tableLabel: (team: string) => `Players of ${team}`,
    /** Hover text of a player's name, which opens his profile in the player list. */
    openProfile: "Open the player's profile",
    columns: {
      name: "Name",
      position: "Pos",
      age: "Age",
      currentAbility: "CA",
      potentialAbility: "PA",
      condition: "Energy",
      matchSharpness: "Sharpness",
      jadedness: "Jaded.",
      morale: "Morale",
      cohesion: "Cohesion",
      tactics: "Tactics",
      /** The last column has no heading but this one, for assistive technology: it holds the captaincy menus. */
      actions: "Captaincy",
    } satisfies Record<SquadSort | "actions", string>,
    /** Hover text of a column header that sorts the table; `by` is a name from `sortNames`. */
    sortBy: (by: string) => `Sort by ${by}`,
    sortNames: {
      name: "name",
      position: "position",
      age: "age",
      currentAbility: "current ability",
      potentialAbility: "potential ability",
      condition: "energy",
      matchSharpness: "match sharpness",
      jadedness: "jadedness",
      morale: "morale",
      cohesion: "cohesion",
      tactics: "tactical familiarity",
    } satisfies Record<SquadSort, string>,

    // The tags after a name, with what each means as hover text
    injured: "Injured",
    /** `count` is how many injuries he has. */
    injuredTitle: (count: number) => (count === 1 ? "1 injury" : `${format(count)} injuries`),
    banned: "Banned",
    /** `count` is how many bans he has. */
    bannedTitle: (count: number) => (count === 1 ? "1 ban" : `${format(count)} bans`),
    /** A player his teammates hold reasons to be unhappy about; `count` is how many of them do. */
    unrest: "Unrest",
    unrestTitle: (count: number) =>
      count === 1
        ? "1 teammate is unhappy about him; Remove all, in his profile, settles it once the game moves on"
        : `${format(count)} teammates are unhappy about him; Remove all, in his profile, settles it once the game moves on`,
    onLoan: "On loan",
    onLoanTitle: "Out on loan to another club",
    loanee: "Loanee",
    loaneeTitle: "Here on loan from another club",
    elsewhere: "Elsewhere",
    elsewhereTitle: "Plays for another team of the club",
    frozen: "Frozen",
    /** Hover text of Frozen: what is frozen, one of them at least. */
    frozenTitle: (attributes: boolean, fitness: boolean, positions: boolean): string => {
      const frozen = [
        ...(attributes ? ["attributes"] : []),
        ...(fitness ? ["energy", "match sharpness"] : []),
        ...(positions ? ["positions"] : []),
      ];
      const last = frozen.pop() ?? "";
      const listed = frozen.length > 0 ? `${frozen.join(", ")} and ${last}` : last;
      return `His ${listed} are frozen`;
    },
  },

  /** The game, as `describeGame` in `format.ts` names it. */
  game: {
    /** The game's name when its edition is not known: "FM27" otherwise. */
    name: "Football Manager",
    storefronts: {
      gamePass: "Game Pass",
      steam: "Steam",
      epic: "Epic Games",
      unknown: "Unknown store",
    } satisfies Record<Storefront, string>,
    /** Steam's build id of the install, e.g. `"build 26227640`". */
    steamBuild: (id: string) => `build ${id}`,
  },

  /** The Scouting tab: an assistant scout who advises on signings, the squad's depth and who could go. */
  scouting: {
    nav: "Scouting",
    reading: "Reading your club…",
    refresh: "Refresh",
    refreshTitle: "Read the club from the game again",
    searching: "Searching…",
    none: "—",
    perWeek: "/wk",
    openProfile: "Open the profile",
    freeAgent: "Free agent",
    loan: "Loan",
    header: {
      transferBudget: "Transfer budget",
      wageRoom: "Wage room",
      wageBudget: "Wage budget",
      squad: "Squad",
      averageAge: "Average age",
      players: (count: number) => (count === 1 ? "1 player" : `${format(count)} players`),
    },
    tabs: {
      label: "Scouting sections",
      recommend: "Transfer advice",
      opportunities: "Opportunities",
      similar: "Similar players",
      depth: "Squad depth",
      departures: "Players to let go",
      youth: "Youth intake",
    },
    /** The depth statuses: the dots on the pitch and the badges of the cards. */
    status: {
      missing: "Missing",
      thin: "Thin",
      fine: "Fine",
      crowded: "Crowded",
    },
    /** The lines of the formation that roles belong to: the groups of the role selects. */
    lines: {
      goalkeeper: "Goalkeeper",
      centreBack: "Centre-back",
      fullBack: "Full-back",
      wingBack: "Wing-back",
      defensiveMidfield: "Defensive midfield",
      centralMidfield: "Central midfield",
      attackingMidfield: "Attacking midfield",
      wide: "Wide",
      striker: "Striker",
    },
    /** The squad lines, by key. */
    depthLines: {
      gk: "Goalkeepers",
      dc: "Centre-backs",
      rightBack: "Right-backs",
      leftBack: "Left-backs",
      dm: "Defensive midfielders",
      mc: "Central midfielders",
      rightWing: "Right wingers",
      leftWing: "Left wingers",
      amc: "Attacking midfielders",
      st: "Strikers",
    } as Record<string, string>,
    /** The hover of a position on the pitch: "Right-backs: 2 in the squad (usually 2) — Fine". */
    positionTip: (line: string, count: number, target: number, status: string) =>
      `${line}: ${format(count)} in the squad (usually ${format(target)}) — ${status}`,
    brief: {
      heading: "What are you looking for?",
      pitch: "Position",
      legend: "The dots show how the squad stands in each line.",
      inPossession: "In possession",
      outOfPossession: "Out of possession",
      anyRole: "Any — best role for each player",
      purpose: "For",
      filters: "Filters",
      minAge: "Min age",
      maxAge: "Max age",
      maxFee: "Max fee",
      minProbability: "Probability",
      anyProbability: "Any",
      noFreeAgents: "No free agents",
    },
    purposes: {
      firstTeam: "First team",
      rotation: "Rotation",
      future: "Future",
      any: "All",
    },
    purposeTips: {
      firstTeam: "Better than your best player in this position",
      rotation: "As good as your second choice, at a sensible price",
      future: "21 or younger, with room to grow",
      any: "Everyone who fits",
    },
    /** The sentence above the advice: before the position, and after it; `roles` and `purpose` follow a dot. */
    ask: {
      before: "Advice for ",
      after: "",
      anyRole: "best role per player",
    },
    own: {
      heading: "In your squad",
      empty: "Nobody in your squad plays here.",
      position: "Position",
    },
    summary: (candidates: number, eligible: number, shown: number, purpose: string) =>
      `${format(candidates)} players can play here · ${format(eligible)} match ${purpose} · ${format(shown)} recommended`,
    how: {
      label: "How is this list made?",
      note: (rule: string, count: string) =>
        `Players rated 10 or more at this position (not yours or other human managers') who ${rule}. The best ${count} are shown by fit (70%) and probability (30%); Rotation weighs both alike, Future counts potential too. Click a column title to sort.`,
    },
    purposeRules: {
      firstTeam: "fit the position better than your best player there",
      rotation: "fit at least as well as your second choice",
      future: "are 21 or younger with room to grow (potential at least 15 above ability)",
      any: "fit at all",
    },
    sortBy: (by: string) => `Sort by ${by}`,
    sortNames: {
      rank: "the scout's order",
      name: "name",
      age: "age",
      ca: "current ability",
      pa: "potential ability",
      fit: "fit",
      probability: "probability",
      fee: "fee",
      similarity: "similarity",
    },
    backToScoutOrder: "Back to the scout's order",
    showMore: (count: number) => `Show ${format(count)} more`,
    /** Under a player whose contract is with another club: the club he plays for, on loan or in its second team. */
    playsFor: (club: string) => `plays for ${club}`,
    empty: "No advice for this position with these settings. Try the purpose All or looser filters.",
    columns: {
      rank: "#",
      ca: "CA",
      pa: "PA",
      player: "Player",
      age: "Age",
      fit: "Fit",
      role: "Role",
      probability: "Probability",
      fee: "Est. fee",
      wage: "Wage",
      note: "Scout's note",
      money: "Fee",
      value: "Value",
    },
    probabilityInfo:
      "How likely the player is to join your club — an estimate from his value, contract, club and reputation.",
    probabilityInfoLabel: "What is probability?",
    /** The hover of a fit: his attributes for each role (1–20) and how well he plays the position. */
    fitTitle: (inPossession: string | null, outOfPossession: string | null, position: string) =>
      [
        inPossession !== null && `In possession: ${inPossession}`,
        outOfPossession !== null && `Out of possession: ${outOfPossession}`,
        `Position: ${position}`,
      ]
        .filter(Boolean)
        .join("\n"),
    note: "Fit uses the editor's own attribute weights for each role; fees, wages and probabilities are estimates.",
    depth: {
      summary: (size: number, age: string | null, level: string) =>
        `${format(size)} players${age === null ? "" : ` · average age ${age}`} · best eleven average ability ${level}`,
      weak: "Below squad level",
      ageing: "Ageing",
      cover: (names: string) => `Can also play here: ${names}`,
      advice: "Get advice",
      adviceTitle: "Transfer advice for this line",
      empty: "Nobody",
      ability: "Current ability",
      more: (count: number) => `+${format(count)} more`,
      columns: {
        line: "Line",
        status: "Status",
        count: "Players",
        players: "Best first (ability)",
        cover: "Can also play here",
        age: "Avg age",
      },
      countTitle: (count: number, target: number) =>
        `${format(count)} players whose best position is in this line; a squad usually carries ${format(target)}`,
      statusHelp: {
        missing: "Nobody plays here.",
        thin: "Fewer than a squad usually carries; players who can cover count as half.",
        fine: "About what a squad usually carries.",
        crowded: "Two or more players beyond what a squad usually carries.",
      },
      attention: "Needs a look:",
      allFine: "Every line looks balanced.",
      /** The switch between the pitch and the table. */
      views: { label: "Show the squad as", pitch: "Pitch", table: "Table" },
      pitchLabel: "The squad on the pitch, line by line",
      /** Under a line on the pitch: how many players of other lines can play there. */
      coverCount: (count: number) => `${format(count)} can cover`,
      /** The button under a line picked on the pitch. */
      adviceFor: (position: string) => `Transfer advice for ${position}`,
    },
    departures: {
      intro: "Players your scout would let go, most pressing first.",
      filter: "Advice",
      all: "All",
      empty: "Your scout would not let anyone go right now.",
      sortNames: {
        rank: "the scout's order",
        name: "name",
        age: "age",
        ca: "current ability",
        pa: "potential ability",
        value: "value",
        wage: "wage",
        contract: "contract end",
      },
      columns: {
        player: "Player",
        age: "Age",
        ability: "Ability",
        value: "Value",
        wage: "Wage",
        contract: "Contract until",
        advice: "Advice",
        reasons: "Reasons",
      },
      actions: { sell: "Sell", loan: "Loan out", release: "Release" },
      /** "3rd" in a line. */
      rank: (line: string, rank: number) => {
        const tens = rank % 100;
        const suffix = (tens >= 11 && tens <= 13) || rank % 10 > 3 ? "th" : ["th", "st", "nd", "rd"][rank % 10];
        return `${line} · ${rank}${suffix}`;
      },
    },
    /** The actions at the end of a row of players the scout found, and on a player he would let go. */
    actions: {
      column: "Actions",
      compare: "Compare with your squad",
      compareLabel: (name: string) => `Compare ${name} with your squad`,
      similar: "Find similar players",
      similarLabel: (name: string) => `Find players like ${name}`,
      report: "Scout report",
      reportLabel: (name: string) => `Scout report on ${name}`,
      replacement: "Find a replacement",
      replacementLabel: (name: string) => `Find a replacement for ${name}`,
      replacementTitle: "Players like him, who could take his place",
    },
    /**
     * What makes a player an opportunity, by code: `value` is the reason's value as text (days, an amount, a count,
     * a potential), `against` his value for a release clause (null when he is not for sale).
     */
    why: {
      freeAgent: () => "Free agent",
      expiring: (value: string) => `Contract ends in ${value} days`,
      releaseClause: (value: string, against: string | null) =>
        against === null ? `Release clause ${value}` : `Release clause ${value} (value ${against})`,
      unhappy: (value: string) => (value === "1" ? "Unhappy at his club" : `Unhappy at his club (${value} reasons)`),
      inTheRed: (value: string) => `His club is in the red (${value})`,
      listed: () => "Transfer listed",
      loanListed: () => "Available for loan",
      wonderkid: (value: string) => `Potential ${value}`,
    } as Record<string, (value: string, against: string | null) => string>,
    /** How a player the scout found compares with the club's best player at his position. */
    verdicts: {
      better: "Better than your no. 1",
      close: "Close to your no. 1",
      below: "Below your no. 1",
      none: "Nobody in your squad plays here",
    },
    /** How likely a player is to join, in words, by the probability: 70% and above, 50% and above, below. */
    chances: { likely: "Likely to join", possible: "Could join", hard: "Hard to sign" },
    opportunities: {
      kindsLabel: "Lists of opportunities",
      kinds: {
        bosman: "Bosman",
        releaseClause: "Release clauses",
        unhappy: "Unhappy",
        inTheRed: "Clubs in the red",
        listed: "Transfer list",
        loanListed: "Loan list",
        wonderkid: "Wonderkids",
      } satisfies Record<OpportunityKind, string>,
      hints: {
        bosman: "Free agents, and contracts that end within six months",
        releaseClause: "A release clause below his value",
        unhappy: "Unhappy at his club",
        inTheRed: "His club needs the money",
        listed: "His club would sell him",
        loanListed: "His club would lend him out",
        wonderkid: "19 or younger, with a great future",
      } satisfies Record<OpportunityKind, string>,
      countLabel: "Players on this list",
      /** "34", or "300+" for a list that holds more. */
      count: (count: number, more: boolean) => (more ? `${format(count)}+` : format(count)),
      position: "Position",
      anyPosition: "Any position",
      maxAge: "Max age",
      maxFee: "Max fee",
      betterOnly: "Better than my no. 1",
      betterOnlyTitle: "Only players who fit their position better than your best player there",
      summary: (kind: string, lowest: string, highest: string, pool: string) =>
        `${kind} · players of ability ${lowest}–${highest}, around your squad's level · ${pool} looked at`,
      how: {
        label: "How are these lists made?",
        note: "Players near your best eleven's level (30 below to 45 above), not yours or other human managers', each measured at his best position or the one you pick. Each list is sorted by fit and probability together.",
      },
      empty: "Nobody on this list with these filters.",
      emptyWonderkids: "No wonderkids with these filters.",
      better: "Better than your no. 1 here",
      columns: { position: "Pos", why: "Why" },
    },
    similar: {
      intro: "Pick a player to find others like him: their attributes are compared where his position needs them.",
      search: "Player to compare with",
      searchPlaceholder: "Search a player by name…",
      noMatch: "No player by that name.",
      quickPicks: "Or start from one of your players:",
      change: "Choose another player",
      reference: "Players like",
      position: "Compare at",
      cheaper: "Cheaper",
      cheaperTitle: "Only players worth less than him",
      younger: "Younger",
      youngerTitle: "Only players younger than him",
      maxFee: "Max fee",
      value: "Value",
      notForSale: "Not for sale",
      doesNotPlay: (position: string) => `He does not play ${position}: only his attributes are compared.`,
      summary: (candidates: string, shown: string, position: string) =>
        `${candidates} players play ${position} · the ${shown} most alike`,
      how: {
        label: "How is similarity measured?",
        note: "The scout compares the attributes the position's roles rely on, the key ones most. Where a player is strong and where he is weak counts more than his level, so a cheaper or younger player can still be very alike.",
      },
      empty: "Nobody alike with these settings.",
      columns: { similarity: "Alike", value: "Value" },
      similarityTitle: (value: number) => `${format(value)}% alike`,
    },
    compare: {
      title: "Compare with your squad",
      hint: (position: string, name: string) =>
        `Against ${name}, your best player at ${position}. The role's key attributes come first.`,
      noStarter: "Nobody in your squad plays this position.",
      starter: "Your no. 1",
      candidate: "Candidate",
      inPossession: "In possession",
      outOfPossession: "Out of possession",
      add: "Add a player",
      addNone: "Pick from the list…",
      remove: (name: string) => `Take ${name} out of the comparison`,
      removeShort: "Remove",
      scoutView: "Scout's view",
      rows: {
        fit: "Fit",
        position: (position: string) => `At ${position}`,
        roleRating: (role: string) => `As ${role}`,
        probability: "Probability",
        fee: "Est. fee",
        wage: "Wage",
        contract: "Contract until",
        verdict: "Verdict",
      },
      ownPlayer: "Your player",
      roleAttributes: (roles: string) => `The role's attributes: ${roles}`,
      keyAttribute: "A key attribute of the role",
      versus: (difference: string) => `${difference} against your no. 1`,
      best: "the best",
      age: (age: number) => `Age ${format(age)}`,
      allAttributes: "All attributes",
      loading: "Reading the players…",
      close: "Close",
    },
    report: {
      title: (name: string) => `Scout report: ${name}`,
      hint: "Save it as a picture or copy it to share.",
      making: "Writing the report…",
      failed: (reason: string) => `Could not make the report: ${reason}`,
      alt: (name: string) => `The scout report on ${name}`,
      save: "Save as image",
      savePdf: "Save as PDF",
      saving: "Saving…",
      copy: "Copy image",
      copied: "Copied to the clipboard.",
      copyFailed: (reason: string) => `Could not copy the image: ${reason}`,
      similar: "Find similar players",
      saved: (file: string) => `Saved as ${file}.`,
      open: "Open",
      show: "Show in folder",
      close: "Close",
      /** The texts on the picture itself. */
      heading: "Scout report",
      age: (age: number) => `Age ${format(age)}`,
      freeAgent: "Free agent",
      contract: "contract until",
      fit: "Fit",
      probability: "Probability",
      fee: "Est. fee",
      abilities: "CA / PA",
      value: "Value",
      role: "Role",
      strengths: "Strengths",
      weaknesses: "Weaknesses",
      profile: "Character",
      note: "Scout's note",
      similarity: (value: number) => `${format(value)}% alike`,
      footer: "FMLibreEditor scout report · fees, wages and probabilities are estimates",
      traits: {
        consistent: "Consistent",
        inconsistent: "Inconsistent",
        bigGames: "Big-game player",
        nervous: "Nervous in big games",
        injuryProne: "Injury prone",
        robust: "Rarely injured",
        versatile: "Versatile",
        professional: "Model professional",
        ambitious: "Ambitious",
        loyal: "Loyal",
        hotHeaded: "Hot-headed",
      },
    },
    /** "Youth intake": the players the game made at a club's youth intakes, by the day they joined it, and their edits. */
    youth: {
      intro: "The players the game made at the club's youth intakes who are still there, by the day they joined it.",
      otherClub: "Look at another club",
      searchLabel: "Club to look at",
      mine: "Back to my club",
      intakesLabel: "Youth intakes",
      /** A day nothing says. */
      noDay: "Day not known",
      /** `best` is a name and the potential in brackets. */
      summary: (count: number, average: string, best: string) =>
        `${count === 1 ? "1 player" : `${format(count)} players`} · average potential ${average} · best: ${best}`,
      lent: (count: number) => (count === 1 ? "1 out on loan" : `${format(count)} out on loan`),
      how: {
        label: "How is this list made?",
        note: "Players the game made who joined this club at 17 or younger and were trained at no other club, by the day they joined. Those out on loan are listed; those sold or let go are not.",
      },
      unmarked:
        "The editor does not know how this version of the game marks the players it makes: the club's own young players from the game's database are listed too.",
      empty: (club: string) => `${club} has no youth intake players at the moment.`,
      emptyHint: "An intake's players show here for as long as they are at the club. Look at another club to see its youth intake.",
      columns: {
        player: "Player",
        position: "Pos",
        born: "Born",
        nation: "Nationality",
        city: "City of birth",
        ca: "CA",
        pa: "PA",
        actions: "Edit",
      },
      age: (age: number) => `age ${format(age)}`,
      joinedAt: (age: number) => `joined at ${format(age)}`,
      onLoan: (club: string) => `On loan at ${club}`,
      youthContract: "Youth contract",
      edit: (name: string) => `Edit ${name}`,
      editor: {
        label: (name: string) => `Editing ${name}`,
        reading: "Reading his values…",
        dateOfBirth: "Date of birth",
        nation: "Nationality",
        city: "City of birth",
        /** The city select of a player without a city: the game keeps none for him, and the editor sets none. */
        noCity: "None in the game",
        /** Above the cities of the nation picked: they are the ones people of the save were born in. */
        cityHint: "Cities people of this save were born in",
        ca: "Current ability",
        pa: "Potential ability",
        save: "Save",
        saving: "Saving…",
        cancel: "Cancel",
        profile: "Full profile",
        profileTitle: "Positions, attributes and the rest, in the player's profile",
        nothing: "Nothing to save: no value was changed.",
        saved: (count: number) => (count === 1 ? "1 change saved." : `${format(count)} changes saved.`),
        failed: (field: string, reason: string) => `${field}: ${reason}`,
        invalid: (field: string) => `${field}: not a value it can take.`,
      },
      loading: "Reading the youth intakes…",
      failed: (reason: string) => `Could not read the youth intakes: ${reason}`,
    },
    roles: {
      bgk: "Ball-Playing Goalkeeper",
      ngk: "No-Nonsense Goalkeeper",
      sk: "Sweeper Keeper",
      lhk: "Line-Holding Keeper",
      cb: "Centre-Back",
      bcb: "Ball-Playing Centre-Back",
      ncb: "No-Nonsense Centre-Back",
      acb: "Advanced Centre-Back",
      ocb: "Overlapping Centre-Back",
      scb: "Stopping Centre-Back",
      ccb: "Covering Centre-Back",
      wcb: "Wide Centre-Back",
      fb: "Full-Back",
      ifb: "Inside Full-Back",
      pfb: "Pressing Full-Back",
      hfb: "Holding Full-Back",
      wb: "Wing-Back",
      iwb: "Inside Wing-Back",
      pwb: "Playmaking Wing-Back",
      awb: "Advanced Wing-Back",
      hwb: "Holding Wing-Back",
      dm: "Defensive Midfielder",
      hb: "Half Back",
      ddm: "Dropping Defensive Midfielder",
      pdm: "Pressing Defensive Midfielder",
      wdm: "Wide Covering Defensive Midfielder",
      bbm: "Box-to-Box Midfielder",
      bbp: "Box-to-Box Playmaker",
      dlp: "Deep-Lying Playmaker",
      cm: "Central Midfielder",
      pcm: "Pressing Central Midfielder",
      scm: "Screening Central Midfielder",
      chm: "Channel Midfielder",
      wcm: "Wide Central Midfielder",
      ap: "Advanced Playmaker",
      am: "Attacking Midfielder",
      oam: "Central Outlet Attacking Midfielder",
      w: "Winger",
      if: "Inside Forward",
      iw: "Inside Winger",
      pw: "Playmaking Winger",
      wfd: "Wide Forward",
      tw: "Tracking Winger",
      iow: "Inside Outlet Winger",
      wow: "Wide Outlet Winger",
      cfd: "Centre Forward",
      dlf: "Deep-Lying Forward",
      chf: "Channel Forward",
      p: "Poacher",
      tcf: "Tracking Centre Forward",
      ocf: "Central Outlet Centre Forward",
      gk: "Goalkeeper",
      wm: "Wide Midfielder",
    } as Record<string, string>,
    reasons: {
      listed: () => "Transfer listed",
      freeAgent: () => "Free agent",
      expiring: (value: string) => `Contract ends in ${value} days`,
      releaseClause: (value: string) => `Release clause ${value}`,
      fringe: () => "Not a regular at his club",
      keyPlayer: () => "Key player at his club",
      unwanted: () => "Surplus to requirements at his club",
      overBudget: (value: string) => `${value} over your budget`,
      stretch: (value: string) => `Just over budget (+${value})`,
      wageHigh: (value: string) => `Wage ${value}/wk above your room`,
      biggerClub: () => "Plays for a bigger club",
      smallerClub: () => "Plays for a smaller club",
      reputationGap: () => "Too big a name for your club",
      ambitious: () => "Ambitious: would welcome the step up",
      notForSale: () => "Not for sale",
    } as Record<string, (value: string) => string>,
    /** Why a player could go, by code; `value` is the reason's value as text. */
    departureReasons: {
      surplus: (value: string) => `Crowded line (${value} players)`,
      belowLevel: () => "Below the squad's level",
      ageing: (value: string) => `Getting old (${value})`,
      expiring: (value: string) => `Contract ends in ${value} days`,
      highWage: (value: string) => `High wage for his role (${value}/wk)`,
      unhappy: () => "Unhappy",
      lowMorale: () => "Low morale",
      blocked: () => "Needs games to grow",
      unwanted: () => "Squad status: surplus to requirements",
      listed: () => "Already transfer listed",
    } as Record<string, (value: string) => string>,
  },

  /** "My club" (`MyClub`): the page the app opens on, about the club the user manages in the save. */
  home: {
    /** The tab's name. */
    nav: "My club",
    loading: "Looking for your club…",
    failed: (reason: string) => `Could not look for your club: ${reason}`,
    /** Under the club's name: who manages it, or that it is a club picked to follow. */
    manager: (name: string) => `Manager: ${name}`,
    following: "A club you follow",
    /** The name of the switch between the clubs, in a save with several managers of the user's. */
    clubsLabel: "Your clubs",
    /** The button that opens the club in the Clubs tab, and its hover text. */
    openProfile: "Club profile",
    openProfileTitle: "Open this club in the Clubs tab: facilities, finances, stadium and more",
    /** When the user's manager has no club: a club can be picked to follow instead. */
    noClubTitle: "You manage no club in this save",
    noClubText: "Pick a club to follow here instead: its squad, who needs a look, and the actions on a whole team.",
    chooseAnother: "Choose another club",
    /** The name of the search that picks the club to follow. */
    searchLabel: "Club to follow",
    /** The name of the page's squad part. */
    squad: "Squad",
    /** The cards over the squad: who in the shown team needs a look. Injured, Banned and Unrest take the squad's tags. */
    cards: {
      label: "Who needs a look",
      lowMorale: "Low morale",
      tired: "Tired",
      contracts: "Contracts ending",
      /** The hover texts of the cards' titles: what each one counts. `below` is a morale or a percentage as shown. */
      injuredHint: "Players with an injury",
      bannedHint: "Players with a ban",
      lowMoraleHint: (below: string) => `Players whose morale is below ${below}`,
      tiredHint: (below: string) => `Players whose energy is below ${below}`,
      unrestHint: "Players some of their teammates are unhappy about",
      contractsHint: (months: number) => `Players whose contracts end within ${months} months`,
      /** In a card that counts nobody. */
      none: "None",
      /** After the first few names. */
      more: (count: number) => `and ${format(count)} more`,
    },
  },

  /**
   * Recipes (`RecipeMenu`): ready-made sets of changes to one player or one club. The Recipes button opens a menu of
   * them; the dialog of the one picked lists what it would write, like the preview of a mass edit, whose words for
   * Apply, the columns and the outcome it shares.
   */
  recipes: {
    /** The button beside Max attributes in a player's profile, and in the header of a club's. */
    button: "Recipes",
    buttonTitle: "Ready-made sets of changes, previewed first",
    /** The recipes by key, as the menu and the title of the dialog name them. */
    names: {
      wonderkid: "Make a wonderkid",
      injuryProof: "Injury-proof",
      longCareer: "Extend his career",
      richClub: "Make the club rich",
      topFacilities: "Top facilities",
    },
    /** What each one does, kept short: the note beside its menu item, and the line under the dialog's title. */
    notes: {
      wonderkid:
        "21 or younger: potential ability at least 180, ability and attributes to suit his age. Higher values " +
        "stay.",
      injuryProof: "Injury proneness 1, natural fitness 20, stamina at least 15, injuries healed.",
      longCareer:
        "No planned retirement, three more years of contract, natural fitness 20, professionalism at least 18.",
      richClub: "Balance, transfer budget and wage budgets up to the level of the richest clubs.",
      topFacilities: "All five facilities to 20.",
    },
    /** The note of a recipe that is dimmed: the player is older than `oldest`, or his age is not known. */
    tooOld: (oldest: number) => `For players of ${oldest} or younger`,
    /** A recipe as the command palette lists it for the profile on show. */
    command: (recipe: string) => `Recipe: ${recipe}`,
    /** In the dialog while the recipe is worked out. */
    working: "Working out the changes…",
    /** "14 changes · 30 values as good already · 2 values left alone". */
    summary: (changes: number, kept: number, left: number) =>
      [
        changeCount(changes),
        kept > 0 && (kept === 1 ? "1 value as good already" : `${format(kept)} values as good already`),
        left > 0 && valuesLeftAlone(left),
      ]
        .filter(Boolean)
        .join(" · "),
    tableLabel: "Changes the recipe would make",
    /** The line that opens the list of the values that stay because they are as good already, or better. */
    keptHeading: (count: number) =>
      count === 1 ? "1 value stays as it is: as good already" : `${format(count)} values stay as they are: as good already`,
    keptLabel: "Values that are as good already",
    /** The head of the column of those values. */
    valueColumn: "Value",
    leftLabel: "What the recipe leaves alone",
    undo: "Undo this recipe",
    undoTitle: "Write everything this recipe changed back to the game",
  },

  /**
   * A player's development, from the records the app keeps of a career (`PlayerProgress`): the Development tab of his
   * profile, the note under his abilities in its header, and the change beside an ability in a squad's table.
   */
  progress: {
    /** The name of the profile's tabs, and the two tabs. */
    tabsLabel: "Sections of the player's profile",
    tabs: { overview: "Profile", progress: "Development" },
    /** Hover text of the Development tab while the player is edited. */
    lockedWhileEdited: "Finish editing to open this tab",
    /** Hover text of the note under the abilities, under what changed. */
    openTab: "Open the Development tab",
    loading: "Reading the records…",
    failed: (reason: string) => `Could not read the records: ${reason}`,
    /** After a change: "+6 since 1 Jul 2026". `date` is a date as the language writes it. */
    since: (date: string) => `since ${date}`,
    /** A change in words, for hover texts and screen readers: "120 → 126 since 1 Jul 2026". */
    change: (from: string, to: string, date: string) => `${from} → ${to} since ${date}`,
    /** The periods to look back over, where the records reach back far enough for a choice. */
    rangeLabel: "Period",
    ranges: { quarter: "3 months", year: "1 year", all: "All" },
    /** How many records there are of the player, and the date of the first. */
    recorded: (count: number, first: string) => `Records: ${count} · first on ${first}`,
    /** The headings: current and potential ability over time, the transfer value, and the attributes. */
    abilityTitle: "Ability",
    valueTitle: "Value",
    attributesTitle: "Attributes that changed",
    noAttributeChanges: (date: string) => `No attribute has changed since ${date}.`,
    /** With no record before today's: how the records come about. */
    emptyTitle: "Nothing to compare with yet",
    emptyText:
      "The app notes every player's abilities, value and attributes about once a week of the game's time, whenever it reads the game's data. Play on, read the data again, and how this player develops shows here.",
    /** Where the app keeps no records: a save without a manager of the user's, or data that fails the checks. */
    offTitle: "No records for this save",
    offText:
      "The app keeps records for a save with a manager of yours, on a version of the game whose data passes its checks.",
  },

  /**
   * The command palette (`CommandPalette`): one box that finds players, staff, clubs and the app's commands. The
   * keyboard shortcuts (`shortcuts.ts`) take their key names from here.
   */
  palette: {
    /** The button in the masthead that opens it. */
    button: "Search",
    /** The button's hover text, and the name of the box. */
    title: "Search or run a command",
    /** In the box while connected, and while not: then it finds commands only. */
    placeholder: "Search players, staff, clubs and commands",
    placeholderCommands: "Search commands",
    /** The heading over the commands; the names of the lists head the people and the clubs found. */
    commands: "Commands",
    /** The command that shows one of the app's lists; `list` is the name of its tab. */
    goTo: (list: string) => `Go to ${list}`,
    /** The command that puts the caret in the search box of the list on show. */
    searchList: "Search this list",
    /** The commands for the profile on show: they press its Edit button (to start, and to end) and its Apply button. */
    editProfile: "Edit this profile",
    doneEditing: "Finish editing this profile",
    applyChanges: "Apply the changes to this profile",
    /** Under the people or the clubs found, when the list has more: opens that list with the same search. */
    showAll: (count: number, list: string) => `Show all ${format(count)} in ${list}`,
    searching: "Searching…",
    /** When nothing matches what is typed. */
    empty: (query: string) => `Nothing matches “${query}”.`,
    /** Under the commands while not connected. */
    notConnected: "Connect to the game to search its players, staff and clubs.",
    failed: (reason: string) => `The search failed: ${reason}`,
    /** The foot of the box: what the arrow keys, Enter and Escape do. */
    hintMove: "Move",
    hintOpen: "Open",
    hintClose: "Close",
    /** The names of the keys as Windows keyboards have them ("Ctrl+K"); macOS shows the keys' signs instead. */
    keys: { ctrl: "Ctrl", shift: "Shift", enter: "Enter", escape: "Esc" },
  },

  /**
   * What's new (`WhatsNewDialog`): what a version brings. It opens by itself the first time the app starts after an
   * update, and from the foot of the window or the palette when asked.
   */
  whatsNew: {
    title: (version: string) => `What's new in ${version}`,
    /** Under the title when the dialog opened by itself. */
    updated: "FMLibreEditor has been updated.",
    /** Over each version's list, when the dialog tells about more than one. */
    version: (version: string) => `Version ${version}`,
    /** `names` is a list the language's own way ("a, b and c"). */
    thanks: (names: string) => `Thanks to ${names}.`,
    /** Opens the release's notes on GitHub. */
    allChanges: "All changes",
    allChangesTitle: "Open this version's notes in full on GitHub",
    /** Closes the dialog, which does not open by itself again for this version. */
    close: "Got it",
    /** The link at the foot of the window that opens it again, and the palette's command. */
    link: "What's new",
    command: "What's new in this version",
    /**
     * What each version brings, newest first: a few words in bold, then a sentence. Where a language lacks a version,
     * the dialog shows it in English. A release adds its version here (see docs/DEVELOPING.md).
     */
    versions: {
      "0.5.5": [
        {
          title: "FM 27.1.1.",
          text: "The update of 24 November is known on Game Pass, Steam and Mac, and everything works on it as before. When a future update comes out, the app keeps reading club finances and the tactic in use until a version that knows it follows.",
        },
        {
          title: "Competitions tab.",
          text: "See and change each competition's squad rules, such as how many foreign players a squad may register, for this season and the next apart. On Windows and Apple silicon Macs.",
        },
        {
          title: "Loans.",
          text: "The Transfer dialog's new Loan arranges a loan for the game's next day, in a transfer window or out of one. You set its last day, the share of his wage the other club pays, a monthly fee and, if you like, an option to buy. On Windows and Apple silicon Macs.",
        },
        {
          title: "Recipes.",
          text: "Ready-made sets of changes for a player or a club: Make a wonderkid, Injury-proof, Extend his career, Make the club rich and Top facilities. Each shows what it will change before anything is written, and one Undo takes it back.",
        },
        {
          title: "Development.",
          text: "The app keeps a weekly record of every player as it reads the game, and a player's profile shows it in a new Development tab: his ability, potential, value and attributes over your career.",
        },
        {
          title: "B teams.",
          text: "A club's Squad tab shows its B teams after its own teams, such as Castilla for Real Madrid, and the team actions work on them too.",
        },
        {
          title: "Shorter notes.",
          text: "The notes on buttons are a line each, in a small box instead of a long strip across the window.",
        },
      ],
      "0.5.4": [
        {
          title: "Transfers in the player's history.",
          text: "Transfer, now the first choice when you move a player, arranges the move for the game's next day. The game makes it as one of its own: it pays the fee and keeps the move in his career history, with this season's matches at his old club in a row of their own. Move now still moves him at once.",
        },
        {
          title: "Team at its best, and Destroy.",
          text: "In a club's Squad tab, one press heals, inspires and refreshes the whole team and takes its cohesion and tactic to the top; Destroy, after a question, does the opposite. One Undo takes either back, and the single actions are under More actions.",
        },
        {
          title: "Batch traits.",
          text: "Under More actions in a club's Squad tab, Batch traits gives every player of the team the traits you pick, or takes them away, and leaves the rest of their traits as they are. One Undo takes it back.",
        },
        {
          title: "Move all staff.",
          text: "A club's Staff tab moves its whole staff to another club at once, each in the same job, and one Undo brings them all back.",
        },
        {
          title: "National teams.",
          text: "A national team's senior squad gets Heal all, Inspire all and Refresh all, and its table shows energy, sharpness and morale.",
        },
        {
          title: "Sponsorship deals.",
          text: "A club's finances list its sponsorship deals, read only: what each pays per season and in all, its term, and what a relegation changes. On Game Pass 0.9.2524.0 so far.",
        },
        {
          title: "Fix.",
          text: "On some careers the staff check failed although the staff read right, which left staff read-only and refused healing, Max cohesion and Max tactics. It now passes.",
        },
      ],
      "0.5.3": [
        {
          title: "FM27's update of 17 November.",
          text: "On Windows and macOS, Game Pass 0.9.2524.0 and Steam build 26620374 are known builds, and the clubs' finances and the tactic your team plays are read again where the update moved them.",
        },
        {
          title: "National teams.",
          text: "The switch over the club list shows every nation's men's and women's teams: a team's squad, its youth teams (Under 21, Under 20 and the others) with theirs, and the reputation of each, which you can edit.",
        },
        {
          title: "League prize money.",
          text: "A club's overview shows what its league pays this season, by final position and per match, and the amounts can be changed for every club in the league until the season ends.",
        },
        {
          title: "Fix.",
          text: "A save whose youth players were born after 2020 no longer fails the check the editor makes before it writes.",
        },
      ],
      "0.5.2": [
        {
          title: "My club.",
          text: "The app opens on the club you manage: who needs a look, its money and the squad's actions, in one place. Without a club of your own, you can follow one.",
        },
        {
          title: "Command palette.",
          text: "Ctrl+K (⌘K on a Mac) finds a player, a member of staff, a club or a command, and shortcuts move between the tabs.",
        },
        {
          title: "Scouting.",
          text: "Opportunities in the market, players like one you would let go, a comparison with your no. 1 at his position, scout reports to save as a picture or a PDF, the squad on a pitch and the youth intakes.",
        },
        {
          title: "Rename a player.",
          text: "First, last, common and full name. The game keeps the new name in its saves.",
        },
        {
          title: "Contracts and staff.",
          text: "Extend a contract by five years in one click, or add years to many in a mass edit. Release a member of staff, or a club's whole staff, and bring them back with one Undo.",
        },
        {
          title: "Max tactics.",
          text: "In a club's Squad tab, it brings the team's tactical familiarity to the top. Reasons to be unhappy are now worded as the game words them.",
        },
        {
          title: "Your changes, kept.",
          text: "Each career's changes stay in the Changes tab after a restart, and you can search, filter and export them.",
        },
        {
          title: "Club filters.",
          text: "Nation, league and reputation; Mass edit and Export take the clubs the list shows.",
        },
        {
          title: "Russian and Japanese.",
          text: "Two more languages. Steam's update of 12 November is a known build too.",
        },
      ],
    } as Record<string, { title: string; text: string }[]>,
  },

  errors,
};

/** What a dictionary has to provide. */
export type Strings = typeof en;
