// Fixtures for the Scouting tab: the human manager's club with its squad line by line and the players a scout would
// let go, a 4-3-3 he plays, the positions and roles the editor knows (the same as the core's), and recommendations
// worked out from the fixture players, so the tab can be tried without the game.

import type {
  ClubSummary,
  Lineup,
  LineupSlot,
  OwnTactic,
  Phase,
  Placed,
  PlayerRoles,
  RoleFit,
  SlotRoles,
  SquadChoice,
  TacticRank,
  Unit,
  Departure,
  DepartureReason,
  DepthLine,
  DepthPlayer,
  DepthStatus,
  Fitting,
  Line,
  PlayerSummary,
  Reason,
  Role,
  ScoutPosition,
  Scouted,
  ScoutingOverview,
  ScoutRequest,
  Suggestion,
} from "../types";

/** [key, phase, line] of every role the core knows, in its order. */
const ROLE_LIST: [string, "inPossession" | "outOfPossession", Line][] = [
  ["bgk", "inPossession", "goalkeeper"],
  ["ngk", "inPossession", "goalkeeper"],
  ["cb", "inPossession", "centreBack"],
  ["bcb", "inPossession", "centreBack"],
  ["ncb", "inPossession", "centreBack"],
  ["acb", "inPossession", "centreBack"],
  ["ocb", "inPossession", "centreBack"],
  ["fb", "inPossession", "fullBack"],
  ["ifb", "inPossession", "fullBack"],
  ["wb", "inPossession", "wingBack"],
  ["iwb", "inPossession", "wingBack"],
  ["pwb", "inPossession", "wingBack"],
  ["awb", "inPossession", "wingBack"],
  ["dm", "inPossession", "defensiveMidfield"],
  ["hb", "inPossession", "defensiveMidfield"],
  ["bbm", "inPossession", "defensiveMidfield"],
  ["bbp", "inPossession", "defensiveMidfield"],
  ["chm", "inPossession", "centralMidfield"],
  ["wcm", "inPossession", "centralMidfield"],
  ["ap", "inPossession", "centralMidfield"],
  ["am", "inPossession", "attackingMidfield"],
  ["w", "inPossession", "wide"],
  ["if", "inPossession", "wide"],
  ["pw", "inPossession", "wide"],
  ["wfd", "inPossession", "wide"],
  ["cfd", "inPossession", "striker"],
  ["dlf", "inPossession", "striker"],
  ["p", "inPossession", "striker"],
  ["gk", "inPossession", "goalkeeper"],
  ["wcb", "inPossession", "centreBack"],
  ["dlp", "inPossession", "defensiveMidfield"],
  ["cm", "inPossession", "centralMidfield"],
  ["mpm", "inPossession", "centralMidfield"],
  ["iw", "inPossession", "wide"],
  ["wm", "inPossession", "wide"],
  ["fr", "inPossession", "attackingMidfield"],
  ["ss", "inPossession", "attackingMidfield"],
  ["chf", "inPossession", "striker"],
  ["f9", "inPossession", "striker"],
  ["tf", "inPossession", "striker"],
  ["sk", "outOfPossession", "goalkeeper"],
  ["lhk", "outOfPossession", "goalkeeper"],
  ["cb", "outOfPossession", "centreBack"],
  ["scb", "outOfPossession", "centreBack"],
  ["ccb", "outOfPossession", "centreBack"],
  ["wcb", "outOfPossession", "centreBack"],
  ["fb", "outOfPossession", "fullBack"],
  ["pfb", "outOfPossession", "fullBack"],
  ["hfb", "outOfPossession", "fullBack"],
  ["wb", "outOfPossession", "wingBack"],
  ["hwb", "outOfPossession", "wingBack"],
  ["dm", "outOfPossession", "defensiveMidfield"],
  ["ddm", "outOfPossession", "defensiveMidfield"],
  ["pdm", "outOfPossession", "defensiveMidfield"],
  ["cm", "outOfPossession", "centralMidfield"],
  ["pcm", "outOfPossession", "centralMidfield"],
  ["scm", "outOfPossession", "centralMidfield"],
  ["oam", "outOfPossession", "attackingMidfield"],
  ["w", "outOfPossession", "wide"],
  ["tw", "outOfPossession", "wide"],
  ["iow", "outOfPossession", "wide"],
  ["cfd", "outOfPossession", "striker"],
  ["tcf", "outOfPossession", "striker"],
  ["ocf", "outOfPossession", "striker"],
  ["gk", "outOfPossession", "goalkeeper"],
  ["cwd", "outOfPossession", "centreBack"],
  ["swd", "outOfPossession", "centreBack"],
  ["pwb", "outOfPossession", "wingBack"],
  ["sdm", "outOfPossession", "defensiveMidfield"],
  ["wdm", "outOfPossession", "defensiveMidfield"],
  ["wcm", "outOfPossession", "centralMidfield"],
  ["am", "outOfPossession", "attackingMidfield"],
  ["sam", "outOfPossession", "attackingMidfield"],
  ["tam", "outOfPossession", "attackingMidfield"],
  ["wm", "outOfPossession", "wide"],
  ["twm", "outOfPossession", "wide"],
  ["owm", "outOfPossession", "wide"],
  ["wow", "outOfPossession", "wide"],
  ["scf", "outOfPossession", "striker"],
];

const ROLES: Role[] = ROLE_LIST.map(([key, phase, line]) => ({
  key,
  phase,
  line,
  keyAttributes: ["passing", "first_touch", "decisions"],
  otherAttributes: ["stamina", "work_rate"],
}));

/** The positions as the core lists them. */
const POSITIONS: ScoutPosition[] = [
  { key: "gk", lines: ["goalkeeper"] },
  { key: "dr", lines: ["fullBack", "wingBack"] },
  { key: "dc", lines: ["centreBack"] },
  { key: "dl", lines: ["fullBack", "wingBack"] },
  { key: "wbr", lines: ["wingBack", "fullBack"] },
  { key: "dm", lines: ["defensiveMidfield", "centralMidfield"] },
  { key: "wbl", lines: ["wingBack", "fullBack"] },
  { key: "mr", lines: ["wide"] },
  { key: "mc", lines: ["centralMidfield", "attackingMidfield", "defensiveMidfield"] },
  { key: "ml", lines: ["wide"] },
  { key: "amr", lines: ["wide"] },
  { key: "amc", lines: ["attackingMidfield", "centralMidfield"] },
  { key: "aml", lines: ["wide"] },
  { key: "st", lines: ["striker"] },
];

/** The squad's lines as the core has them: key, positions, how many a squad carries. */
const LINES: [string, string[], number][] = [
  ["gk", ["gk"], 2],
  ["dc", ["dc"], 4],
  ["rightBack", ["dr", "wbr"], 2],
  ["leftBack", ["dl", "wbl"], 2],
  ["dm", ["dm"], 2],
  ["mc", ["mc"], 3],
  ["rightWing", ["amr", "mr"], 2],
  ["leftWing", ["aml", "ml"], 2],
  ["amc", ["amc"], 2],
  ["st", ["st"], 3],
];

export interface ScoutingFixtures {
  players: PlayerSummary[];
  clubs: ClubSummary[];
  ratings: Record<number, Record<string, number>>;
  women: Set<number>;
}

const TRANSFER_BUDGET = 22_957_535;
const WAGE_BUDGET = 3_638_850;
const WAGE_ROOM = 666_235;

/** The human manager's club in the fixtures: the first men's club. */
function humanClub(f: ScoutingFixtures): ClubSummary {
  return f.clubs.find((club) => !club.women)!;
}

const rating = (f: ScoutingFixtures, uid: number, key: string) => f.ratings[uid]?.[key] ?? 0;
const best = (f: ScoutingFixtures, uid: number, keys: string[]) => Math.max(0, ...keys.map((key) => rating(f, uid, key)));

/** The line a fixture player plays best. */
function lineOf(f: ScoutingFixtures, uid: number): number {
  let found = 0;
  let top = 0;
  LINES.forEach(([, keys], i) => {
    const here = best(f, uid, keys);
    if (here > top) {
      top = here;
      found = i;
    }
  });
  return found;
}

function depthStatus(players: number, cover: number, target: number): DepthStatus {
  if (players === 0 && cover === 0) return "missing";
  if (players + Math.floor(cover / 2) < target) return "thin";
  if (players >= target + 2) return "crowded";
  return "fine";
}

/** A made-up but steady weekly wage for a fixture player. */
const wageOf = (p: PlayerSummary) => Math.round(250 + p.currentAbility ** 2.4 / 6);
/** A made-up but steady transfer value for a fixture player. */
const valueOf = (p: PlayerSummary) => Math.round(p.currentAbility ** 3 * 9);

export function scoutingOverview(f: ScoutingFixtures): ScoutingOverview {
  const club = humanClub(f);
  const squad = f.players.filter((p) => p.clubUid === club.uid);
  const byAbility = (a: DepthPlayer, b: DepthPlayer) => b.player.currentAbility - a.player.currentAbility;
  const abilities = squad.map((p) => p.currentAbility).sort((a, b) => b - a).slice(0, 11);
  const level = abilities.length ? Math.round(abilities.reduce((s, a) => s + a, 0) / abilities.length) : 0;
  const lines: DepthLine[] = LINES.map(([key, positions, target], i) => {
    const players = squad
      .filter((p) => lineOf(f, p.uid) === i)
      .map((p): DepthPlayer => ({ player: p, rating: best(f, p.uid, positions), onLoan: p.uid % 17 === 0 }))
      .sort(byAbility);
    const cover = squad
      .filter((p) => lineOf(f, p.uid) !== i && best(f, p.uid, positions) >= 15)
      .map((p): DepthPlayer => ({ player: p, rating: best(f, p.uid, positions), onLoan: false }))
      .sort(byAbility);
    return {
      key,
      positions,
      target,
      players,
      cover,
      status: depthStatus(players.length, cover.length, target),
      weak: players.length > 0 && players[0].player.currentAbility + 15 < level,
      ageing: players.length > 0 && players.every((d) => (d.player.age ?? 0) >= 31),
    };
  });
  const departures: Departure[] = [];
  for (const line of lines) {
    line.players.forEach((d, i) => {
      const p = d.player;
      const rank = i + 1;
      const starters = Math.ceil(line.target / 2);
      const age = p.age ?? 25;
      const reasons: DepartureReason[] = [];
      let priority = 0;
      const add = (code: string, weight: number, value: number | null) => {
        reasons.push({ code, value });
        priority += weight;
      };
      if (line.status === "crowded" && rank > line.target) add("surplus", 3, line.players.length);
      const below = p.currentAbility + 25 < level && age >= 23;
      if (below) add("belowLevel", 3, p.currentAbility);
      const ageing = (age >= 32 && rank > starters) || age >= 34;
      if (ageing) add("ageing", 2, age);
      if (p.uid % 9 === 0 && rank > starters) add("expiring", 2, 160);
      if (p.uid % 11 === 0) add("lowMorale", 1, 5);
      const blocked = age <= 21 && p.potentialAbility - p.currentAbility >= 15 && rank > line.target;
      if (blocked) add("blocked", 2, p.potentialAbility);
      // One fixture player in a few stands for those whose squad status is surplus to requirements.
      if (p.uid % 13 === 0 && rank > starters) add("unwanted", 3, null);
      // As the core: his mood only adds to other reasons.
      const onlyMood = reasons.every((r) => r.code === "unhappy" || r.code === "lowMorale");
      if (onlyMood || d.onLoan) return;
      const value = valueOf(p);
      // One fixture player stands for those the game keeps as not for sale.
      const notForSale = p.uid % 7 === 0;
      departures.push({
        player: p,
        action: blocked && !below ? "loan" : value < 250_000 && age >= 28 && (below || ageing) ? "release" : "sell",
        reasons,
        priority,
        value: notForSale ? null : value,
        notForSale,
        wage: wageOf(p),
        line: line.key,
        rank,
      });
    });
  }
  departures.sort((a, b) => b.priority - a.priority || a.player.currentAbility - b.player.currentAbility);
  const ages = squad.map((p) => p.age ?? 0).filter((a) => a > 0);
  return {
    club,
    transferBudget: TRANSFER_BUDGET,
    wageBudget: WAGE_BUDGET,
    wageRoom: WAGE_ROOM,
    report: {
      lines,
      departures,
      level,
      size: squad.length,
      averageAge: ages.length ? ages.reduce((s, a) => s + a, 0) / ages.length : null,
    },
    positions: POSITIONS,
    roles: ROLES,
  };
}

/** A made-up but steady measure of how a fixture player suits a position. */
function measure(f: ScoutingFixtures, player: PlayerSummary, request: ScoutRequest): Fitting {
  const position = POSITIONS.find((p) => p.key === request.position)!;
  const own = rating(f, player.uid, position.key);
  const roleRating = Math.min(20, 4 + player.currentAbility / 13 + ((player.uid >> 3) % 5) / 2);
  const factor = own >= 18 ? 1 : own >= 15 ? 0.97 : own >= 13 ? 0.88 : own >= 10 ? 0.75 : 0;
  const fit = Math.max(0, Math.min(100, Math.round(((roleRating - 5) / 12) * 100 * factor)));
  const firstOf = (phase: "inPossession" | "outOfPossession") => {
    const choices = ROLES.filter((r) => r.phase === phase && position.lines.includes(r.line));
    return choices[player.uid % choices.length]?.key ?? null;
  };
  return {
    player,
    fit,
    inPossession: Math.round(roleRating * 10) / 10,
    outOfPossession: Math.round((roleRating - 0.6) * 10) / 10,
    inPossessionRole: request.inPossession ?? firstOf("inPossession"),
    outOfPossessionRole: request.outOfPossession ?? firstOf("outOfPossession"),
    positionRating: own,
  };
}

function suggestion(f: ScoutingFixtures, player: PlayerSummary, request: ScoutRequest, club: ClubSummary): Suggestion {
  const fitting = measure(f, player, request);
  const value = valueOf(player);
  const theirs = f.clubs.find((c) => c.uid === player.clubUid);
  const reasons: Reason[] = [];
  let fee: number | null = player.clubUid === null ? 0 : Math.round(value * 1.15);
  if (player.clubUid === null) reasons.push({ code: "freeAgent", points: 25, value: null });
  if (player.uid % 7 === 0) {
    reasons.push({ code: "listed", points: 15, value: null });
    fee = fee === null ? null : Math.round(fee * 0.8);
  }
  if (player.uid % 5 === 0) reasons.push({ code: "fringe", points: 10, value: 4 });
  else if (player.uid % 11 === 0) reasons.push({ code: "keyPlayer", points: -15, value: 1 });
  else if (player.uid % 17 === 0) reasons.push({ code: "unwanted", points: 15, value: 22 });
  if (player.uid % 13 === 0) reasons.push({ code: "expiring", points: 15, value: 140 });
  if (fee !== null && fee > TRANSFER_BUDGET * 1.3) reasons.push({ code: "overBudget", points: -40, value: fee - TRANSFER_BUDGET });
  else if (fee !== null && fee > TRANSFER_BUDGET) reasons.push({ code: "stretch", points: -15, value: fee - TRANSFER_BUDGET });
  if (theirs?.reputation != null && club.reputation != null) {
    if (theirs.reputation > club.reputation + 1000) reasons.push({ code: "biggerClub", points: -20, value: theirs.reputation });
    else if (theirs.reputation + 1000 < club.reputation) reasons.push({ code: "smallerClub", points: 10, value: theirs.reputation });
  }
  const probability = Math.max(0, Math.min(100, 55 + reasons.reduce((sum, r) => sum + r.points, 0)));
  const age = player.age ?? 27;
  const years = age <= 29 ? 1 : age <= 31 ? 0.95 : age <= 33 ? 0.88 : 0.8;
  const purpose = request.purpose ?? "firstTeam";
  const potential = Math.max(0, Math.min(100, player.potentialAbility - 100));
  const score =
    purpose === "rotation" ? (0.5 * fitting.fit + 0.5 * probability) * years
    : purpose === "future" ? 0.35 * fitting.fit + 0.35 * potential + 0.3 * probability
    : (0.7 * fitting.fit + 0.3 * probability) * years;
  // Every ninth player plays on loan from another club, which would sell him.
  const lender = player.uid % 9 === 0 ? f.clubs.find((c) => !c.women && c.uid !== club.uid && c.uid !== player.clubUid) : undefined;
  return {
    ...fitting,
    probability,
    reasons,
    fee,
    wage: wageOf(player),
    value,
    score: Math.round(score),
    ownerClub: player.clubUid !== null && lender ? lender.name : null,
    ownerClubUid: player.clubUid !== null && lender ? lender.uid : null,
    // A made-up gain to the best eleven, only when a tactic was asked about.
    elevenGain: request.tactic ? Math.max(0, Math.round((fitting.fit - 70) / 3 + ((player.uid >> 2) % 3))) : null,
  };
}

export function scoutingSuggest(f: ScoutingFixtures, request: ScoutRequest): Scouted {
  const club = humanClub(f);
  if (!POSITIONS.some((p) => p.key === request.position)) {
    throw { code: "scout.unknownRole", message: "unknown position", params: { role: request.position } };
  }
  const own = f.players
    .filter((p) => p.clubUid === club.uid && rating(f, p.uid, request.position) >= 10)
    .map((p) => measure(f, p, request))
    .sort((a, b) => b.fit - a.fit);
  const bestOwn = own[0]?.fit ?? 0;
  const secondOwn = own[1]?.fit ?? 0;
  const purpose = request.purpose ?? "firstTeam";
  const pool = f.players.filter((p) => !f.women.has(p.uid) && p.clubUid !== club.uid);
  const fitting = pool
    .filter((p) => rating(f, p.uid, request.position) >= 10)
    .filter((p) => (request.minAge == null || (p.age ?? 0) >= request.minAge) && (request.maxAge == null || (p.age ?? 99) <= request.maxAge))
    .filter((p) => !(request.noFreeAgents && p.clubUid === null))
    .filter((p) => purpose !== "future" || ((p.age ?? 99) <= 21 && p.potentialAbility - p.currentAbility >= 15));
  let suggestions = fitting.map((p) => suggestion(f, p, request, club));
  if (purpose === "firstTeam") suggestions = suggestions.filter((s) => s.fit > bestOwn);
  if (purpose === "rotation") suggestions = suggestions.filter((s) => s.fit >= Math.max(secondOwn, bestOwn - 10));
  if (request.minProbability != null) suggestions = suggestions.filter((s) => s.probability >= request.minProbability!);
  if (request.maxFee != null) suggestions = suggestions.filter((s) => s.fee !== null && s.fee <= request.maxFee!);
  const order = request.order ?? "score";
  suggestions.sort((a, b) =>
    order === "fit" ? b.fit - a.fit
    : order === "probability" ? b.probability - a.probability
    : order === "fee" ? (a.fee ?? Infinity) - (b.fee ?? Infinity)
    : order === "elevenGain" ? (b.elevenGain ?? 0) - (a.elevenGain ?? 0)
    : b.score - a.score);
  return {
    suggestions: suggestions.slice(0, request.limit ?? 50),
    squad: own.slice(0, 5),
    transferBudget: TRANSFER_BUDGET,
    wageRoom: WAGE_ROOM,
    examined: f.players.length,
    candidates: fitting.length,
    eligible: suggestions.length,
  };
}

// --- Best eleven and tactics -----------------------------------------------------------------------------------------

/** The positions each line plays in, the line's own first, on the right and the left; as the core has them. */
const LINE_POSITIONS: Record<Line, { right: string[]; left: string[]; either: string[] }> = {
  goalkeeper: { right: ["gk"], left: ["gk"], either: ["gk"] },
  centreBack: { right: ["dc"], left: ["dc"], either: ["dc"] },
  fullBack: { right: ["dr", "wbr"], left: ["dl", "wbl"], either: ["dr", "dl", "wbr", "wbl"] },
  wingBack: { right: ["wbr", "dr"], left: ["wbl", "dl"], either: ["wbr", "wbl", "dr", "dl"] },
  defensiveMidfield: { right: ["dm", "mc"], left: ["dm", "mc"], either: ["dm", "mc"] },
  centralMidfield: { right: ["mc", "dm"], left: ["mc", "dm"], either: ["mc", "dm"] },
  attackingMidfield: { right: ["amc", "mc"], left: ["amc", "mc"], either: ["amc", "mc"] },
  wide: { right: ["amr", "mr"], left: ["aml", "ml"], either: ["amr", "aml", "mr", "ml"] },
  striker: { right: ["st"], left: ["st"], either: ["st"] },
};

const lineOfRole = (phase: Phase, key: string | null) =>
  key === null ? null : (ROLE_LIST.find(([k, p]) => k === key && p === phase)?.[2] ?? null);

/** A made-up but steady fit of a fixture player for a role on a side, and the position he would play it in. */
function roleFitOf(f: ScoutingFixtures, player: PlayerSummary, line: Line, side: SlotRoles["side"], key: string) {
  const positions = LINE_POSITIONS[line][side ?? "either"];
  const [position, own] = positions
    .map((p) => [p, rating(f, player.uid, p)] as const)
    .reduce((a, b) => (b[1] > a[1] ? b : a));
  const roleRating = Math.min(20, 4 + player.currentAbility / 13 + ((player.uid + key.length) % 5) / 2);
  const factor = own >= 18 ? 1 : own >= 15 ? 0.97 : own >= 13 ? 0.88 : own >= 10 ? 0.75 : 0;
  return { fit: Math.max(0, Math.min(100, Math.round(((roleRating - 5) / 12) * 100 * factor))), position, roleRating, own };
}

function placedIn(f: ScoutingFixtures, player: PlayerSummary, slot: SlotRoles, weight: number): Placed {
  const ipLine = lineOfRole("inPossession", slot.inPossession);
  const oopLine = lineOfRole("outOfPossession", slot.outOfPossession);
  const ip = ipLine ? roleFitOf(f, player, ipLine, slot.side, slot.inPossession!) : null;
  const oop = oopLine ? roleFitOf(f, player, oopLine, slot.side, slot.outOfPossession!) : null;
  const fit = ip && oop ? Math.round(weight * ip.fit + (1 - weight) * oop.fit) : (ip ?? oop)?.fit ?? 0;
  return { player, fit, inPossession: ip?.fit ?? null, outOfPossession: oop?.fit ?? null, position: (ip ?? oop)?.position ?? null };
}

/** The senior squad of the fixtures' human club. */
const squadOf = (f: ScoutingFixtures, choice: SquadChoice) =>
  f.players.filter((p) => p.clubUid === humanClub(f).uid && !(choice.availableOnly && p.uid % 10 === 3));

/** The best slot by slot: the fixtures stand in for the core's exact assignment. */
function pick(f: ScoutingFixtures, slots: SlotRoles[], players: PlayerSummary[], weight: number): (Placed | null)[] {
  const left = new Set(players.map((p) => p.uid));
  return slots.map((slot) => {
    const best = players
      .filter((p) => left.has(p.uid))
      .map((p) => placedIn(f, p, slot, weight))
      .filter((placed) => placed.fit > 0)
      .sort((a, b) => b.fit - a.fit)[0];
    if (!best) return null;
    left.delete(best.player.uid);
    return best;
  });
}

const averageOf = (placed: (Placed | null)[]) =>
  placed.length ? placed.reduce((sum, p) => sum + (p?.fit ?? 0), 0) / placed.length : 0;

const POSITION_OF_LINE: Record<Line, { right: string; left: string } | string> = {
  goalkeeper: "gk",
  centreBack: "dc",
  fullBack: { right: "dr", left: "dl" },
  wingBack: { right: "wbr", left: "wbl" },
  defensiveMidfield: "dm",
  centralMidfield: "mc",
  attackingMidfield: "amc",
  wide: { right: "amr", left: "aml" },
  striker: "st",
};

export function scoutingLineup(f: ScoutingFixtures, slots: SlotRoles[], weight: number, choice: SquadChoice): Lineup {
  const squad = squadOf(f, choice);
  const first = pick(f, slots, squad, weight);
  const starting = new Set(first.flatMap((p) => (p ? [p.player.uid] : [])));
  const rest = squad.filter((p) => !starting.has(p.uid));
  const second = pick(f, slots, rest, weight);
  const lineupSlots: LineupSlot[] = slots.map((slot, index) => {
    const line = lineOfRole("inPossession", slot.inPossession) ?? lineOfRole("outOfPossession", slot.outOfPossession);
    const at = line ? POSITION_OF_LINE[line] : null;
    const position = at === null ? null : typeof at === "string" ? at : slot.side ? at[slot.side] : null;
    const cover = rest
      .map((p) => placedIn(f, p, slot, weight))
      .filter((p) => p.fit > 0)
      .sort((a, b) => b.fit - a.fit)
      .slice(0, 3);
    return { ...slot, index, line, position, first: first[index], second: second[index], cover };
  });
  return { slots: lineupSlots, firstAverage: averageOf(first), secondAverage: averageOf(second), squadSize: squad.length };
}

const s = (inPossession: string, outOfPossession: string, side: SlotRoles["side"] = null): SlotRoles => ({
  inPossession,
  outOfPossession,
  side,
});

/** The manager's tactic in the fixtures: a 4-3-3, with one role the editor does not know in each phase. */
const OWN_TACTICS: OwnTactic[] = [
  {
    style: "CONT",
    copies: 3,
    unknownRoles: 1,
    slots: [
      s("bgk", "sk"),
      s("ifb", "fb", "right"),
      s("bcb", "cb"),
      s("cb", "ccb"),
      s("wb", "fb", "left"),
      s("dm", "dm"),
      s("bbm", "pcm"),
      { inPossession: "ap", outOfPossession: null, side: null },
      s("if", "tw", "right"),
      s("w", "tw", "left"),
      s("cfd", "ocf"),
    ],
  },
];

export const scoutingTactics = (): OwnTactic[] => OWN_TACTICS;

/** The core's formations, as `reference_tactics` lists them. */
const REFERENCES: [string, SlotRoles[]][] = [
  ["4-2-3-1", [s("gk", "gk"), s("fb", "fb", "right"), s("cb", "cb"), s("bcb", "cb"), s("fb", "fb", "left"), s("dm", "dm"), s("bbm", "cm"), s("w", "w", "right"), s("am", "am"), s("if", "w", "left"), s("cfd", "cfd")]],
  ["4-3-3", [s("gk", "gk"), s("fb", "fb", "right"), s("cb", "cb"), s("bcb", "cb"), s("fb", "fb", "left"), s("dm", "dm"), s("cm", "cm"), s("bbm", "pcm"), s("if", "tw", "right"), s("w", "tw", "left"), s("cfd", "cfd")]],
  ["4-4-2", [s("gk", "gk"), s("fb", "fb", "right"), s("cb", "cb"), s("ncb", "cb"), s("fb", "fb", "left"), s("wm", "wm", "right"), s("cm", "cm"), s("bbm", "pcm"), s("wm", "wm", "left"), s("dlf", "cfd"), s("p", "ocf")]],
  ["3-5-2", [s("gk", "gk"), s("wcb", "wcb"), s("cb", "cb"), s("wcb", "wcb"), s("wb", "wb", "right"), s("dm", "dm"), s("cm", "cm"), s("ap", "cm"), s("wb", "wb", "left"), s("cfd", "cfd"), s("p", "ocf")]],
  ["3-4-2-1", [s("gk", "gk"), s("wcb", "wcb"), s("cb", "cb"), s("wcb", "wcb"), s("wb", "wb", "right"), s("dm", "dm"), s("bbm", "pcm"), s("wb", "wb", "left"), s("am", "am"), s("ss", "sam"), s("cfd", "cfd")]],
];

const UNIT_OF: Record<Line, Unit> = {
  goalkeeper: "goalkeeper",
  centreBack: "defence",
  fullBack: "defence",
  wingBack: "defence",
  defensiveMidfield: "midfield",
  centralMidfield: "midfield",
  attackingMidfield: "attack",
  wide: "attack",
  striker: "attack",
};

function rankOf(f: ScoutingFixtures, slots: SlotRoles[], weight: number, choice: SquadChoice) {
  const lineup = scoutingLineup(f, slots, weight, choice);
  const units: [Unit, number][] = [];
  for (const unit of ["goalkeeper", "defence", "midfield", "attack"] as Unit[]) {
    const fits = lineup.slots.filter((slot) => slot.line && UNIT_OF[slot.line] === unit).map((slot) => slot.first?.fit ?? 0);
    if (fits.length) units.push([unit, fits.reduce((a, b) => a + b, 0) / fits.length]);
  }
  return {
    slots,
    covered: lineup.slots.filter((slot) => (slot.first?.fit ?? 0) >= 60).length,
    size: slots.length,
    firstAverage: lineup.firstAverage,
    secondAverage: lineup.secondAverage,
    units,
  };
}

export function scoutingCompare(
  f: ScoutingFixtures,
  own: { style: string | null; slots: SlotRoles[] }[],
  weight: number,
  choice: SquadChoice,
): TacticRank[] {
  const ranks: TacticRank[] = [
    ...own.map((tactic, i) => ({ name: null, own: i, style: tactic.style, ...rankOf(f, tactic.slots, weight, choice) })),
    ...REFERENCES.map(([name, slots]) => ({ name, own: null, style: null, ...rankOf(f, slots, weight, choice) })),
  ];
  return ranks.sort((a, b) => b.covered - a.covered || b.firstAverage - a.firstAverage);
}

/** A fixture player's roles, and made-up training advice for the best one in possession or `asked`. */
export function playerRoles(f: ScoutingFixtures, uid: number, asked: { key: string; phase: Phase } | null): PlayerRoles {
  const player = f.players.find((p) => p.uid === uid);
  if (!player) {
    throw { code: "notFound", message: `no player ${uid}`, params: {} };
  }
  const fits: RoleFit[] = ROLE_LIST.map(([key, phase, line]) => {
    const { fit, position, roleRating, own } = roleFitOf(f, player, line, null, key);
    return { key, phase, line, fit, rating: Math.round(roleRating * 10) / 10, position, positionRating: own };
  }).sort((a, b) => b.fit - a.fit);
  const role = asked ?? fits.find((fit) => fit.phase === "inPossession") ?? null;
  const pool = ["passing", "first_touch", "decisions", "composure", "stamina", "work_rate", "acceleration"];
  return {
    fits,
    trainingRole: role ? { key: role.key, phase: role.phase } : null,
    training: pool.slice(0, 5).map((attribute, i) => ({
      attribute,
      value: 9 + ((player.uid + i) % 8),
      gain: Math.round((2.4 - i * 0.3) * 10) / 10,
      key: i < 3,
    })),
  };
}
