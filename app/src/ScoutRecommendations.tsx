// "Transfer advice": the brief (a position, roles, a purpose, filters) and what the scout recommends for it. The
// scout picks its recommendations in the core (see `Session::scout`); the table can sort them by any column.

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toPounds } from "./currency";
import { scoutingSuggest } from "./editing";
import { currencySymbol, describeError, fold, formatMoney, formatNumber, formatPercent } from "./format";
import { InfoTip } from "./InfoTip";
import { intlLocale } from "./i18n";
import { positionLabel, scoutingText as text } from "./labels";
import {
  ClubLine,
  depthLineName,
  familiarity,
  FitBar,
  LINE_OF_POSITION,
  PlayerName,
  ProbabilityInfo,
  reasonText,
  roleAbbreviation,
  RoleAbbreviations,
  roleName,
  shortMoney,
  signed,
  StatusDot,
} from "./ScoutParts";
import { type ColumnOrder, SortHeader } from "./SortHeader";
import type {
  DepthLine,
  DepthStatus,
  Fitting,
  Line,
  Phase,
  PlayerSummary,
  Purpose,
  Role,
  Scouted,
  ScoutingOverview,
  ScoutPosition,
  ScoutRequest,
  SlotRoles,
  Suggestion,
} from "./types";

/** What the user asks the scout for; the fields typed into are kept as typed. */
export interface Brief {
  position: string;
  /** A role key; empty for any. */
  inPossession: string;
  outOfPossession: string;
  purpose: Purpose;
  minAge: string;
  maxAge: string;
  /** In the shown currency. */
  maxFee: string;
  minProbability: string;
  noFreeAgents: boolean;
}

export const PURPOSES: Purpose[] = ["firstTeam", "rotation", "future", "any"];
const PROBABILITIES = ["30", "50", "70"];

export const DEFAULT_BRIEF: Brief = {
  position: "",
  inPossession: "",
  outOfPossession: "",
  purpose: "firstTeam",
  minAge: "",
  maxAge: "",
  maxFee: "",
  minProbability: "",
  noFreeAgents: false,
};

/** The positions in the order of the pitch, attack at the top: [key, column, row]. */
const PITCH: readonly (readonly [string, number, number])[] = [
  ["st", 2, 1],
  ["aml", 1, 2],
  ["amc", 2, 2],
  ["amr", 3, 2],
  ["ml", 1, 3],
  ["mc", 2, 3],
  ["mr", 3, 3],
  ["wbl", 1, 4],
  ["dm", 2, 4],
  ["wbr", 3, 4],
  ["dl", 1, 5],
  ["dc", 2, 5],
  ["dr", 3, 5],
  ["gk", 2, 6],
];

const LINES: Line[] = [
  "goalkeeper",
  "centreBack",
  "fullBack",
  "wingBack",
  "defensiveMidfield",
  "centralMidfield",
  "attackingMidfield",
  "wide",
  "striker",
];

const DEBOUNCE_MS = 300;

/** How many recommendations are asked for at first, and at most (the core gives up to 200). */
const PAGE = 50;
const MOST = 200;

/** The columns the advice can be sorted by; `rank` is the scout's own order, best first. */
type AdviceSort = "rank" | "name" | "age" | "ca" | "pa" | "fit" | "probability" | "fee" | "elevenGain";

/** The columns that sort from the lowest first when picked; the others start with the highest. */
const ASCENDING_FIRST: ReadonlySet<AdviceSort> = new Set(["rank", "name", "age", "fee"]);

const SCOUT_ORDER: ColumnOrder<AdviceSort> = { by: "rank", ascending: true };

/** A whole number from what was typed, or null when it is empty or not a number. */
function wholeNumber(typed: string): number | null {
  const number = typed.trim() === "" ? NaN : Number(typed);
  return Number.isFinite(number) ? Math.round(number) : null;
}

/**
 * The position to start with: the first line that is missing or thin, else one below the squad's level, else an
 * ageing one, else the strikers. A line that needs nobody may have no one better than its best player to show.
 */
export function defaultPosition(overview: ScoutingOverview): string {
  const { lines } = overview.report;
  const needy =
    lines.find((line) => line.status === "missing" || line.status === "thin") ??
    lines.find((line) => line.weak) ??
    lines.find((line) => line.ageing);
  const wanted = needy?.positions[0] ?? "st";
  return overview.positions.some((p) => p.key === wanted) ? wanted : (overview.positions[0]?.key ?? "st");
}

/** The roles of one phase that are played at a position, grouped by line, the position's own line first. */
function rolesAt(roles: Role[], position: ScoutPosition | undefined, phase: Phase): { line: Line; roles: Role[] }[] {
  const lines = position?.lines ?? LINES;
  return lines
    .map((line) => ({ line, roles: roles.filter((role) => role.phase === phase && role.line === line) }))
    .filter((group) => group.roles.length > 0);
}

const roleAvailable = (roles: Role[], position: ScoutPosition | undefined, phase: Phase, key: string) =>
  rolesAt(roles, position, phase).some((group) => group.roles.some((role) => role.key === key));

/** A recommendation and its place in the scout's own order. */
interface Ranked {
  suggestion: Suggestion;
  rank: number;
}

/** What a recommendation is sorted by in a column; a missing value sorts last either way. */
function sortValue(entry: Ranked, by: AdviceSort): number | string | null {
  const s = entry.suggestion;
  switch (by) {
    case "rank":
      return entry.rank;
    case "name":
      return fold(s.player.name);
    case "age":
      return s.player.age;
    case "ca":
      return s.player.currentAbility;
    case "pa":
      return s.player.potentialAbility;
    case "fit":
      return s.fit;
    case "probability":
      return s.probability;
    case "fee":
      return s.fee;
    case "elevenGain":
      return s.elevenGain;
  }
}

function sortAdvice(list: Ranked[], order: ColumnOrder<AdviceSort>): Ranked[] {
  const direction = order.ascending ? 1 : -1;
  return [...list].sort((a, b) => {
    const x = sortValue(a, order.by);
    const y = sortValue(b, order.by);
    if (x === null || y === null) {
      return x === y ? a.rank - b.rank : x === null ? 1 : -1;
    }
    const compared =
      typeof x === "string" && typeof y === "string" ? x.localeCompare(y, intlLocale) : Number(x) - Number(y);
    return compared === 0 ? a.rank - b.rank : compared * direction;
  });
}

interface Props {
  overview: ScoutingOverview;
  /** The data version: the advice is asked for again when it changes. */
  version: number;
  brief: Brief;
  onBrief: (patch: Partial<Brief>) => void;
  onOpen: (player: PlayerSummary) => void;
  hidden: boolean;
  /** The tactic of the Best eleven section, once read: each recommendation then says how much he would raise its
   * best eleven. */
  tactic: { slots: SlotRoles[]; label: string; weight: number } | null;
}

export function ScoutRecommendations({ overview, version, brief, onBrief, onOpen, hidden, tactic }: Props) {
  const position = overview.positions.find((p) => p.key === brief.position);
  const statusOf = useMemo(() => new Map(overview.report.lines.map((line) => [line.key, line])), [overview]);

  const choosePosition = (key: string) => {
    const next = overview.positions.find((p) => p.key === key);
    onBrief({
      position: key,
      inPossession: roleAvailable(overview.roles, next, "inPossession", brief.inPossession) ? brief.inPossession : "",
      outOfPossession: roleAvailable(overview.roles, next, "outOfPossession", brief.outOfPossession)
        ? brief.outOfPossession
        : "",
    });
  };

  // What to ask for: the brief, and how many recommendations; a new brief starts again from the first page.
  const briefKey = JSON.stringify(brief);
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [briefKey]);
  const request: ScoutRequest = useMemo(() => {
    const fee = wholeNumber(brief.maxFee);
    return {
      position: brief.position,
      inPossession: brief.inPossession || null,
      outOfPossession: brief.outOfPossession || null,
      purpose: brief.purpose,
      minAge: wholeNumber(brief.minAge),
      maxAge: wholeNumber(brief.maxAge),
      maxFee: fee === null ? null : toPounds(Math.max(0, fee)),
      minProbability: wholeNumber(brief.minProbability),
      noFreeAgents: brief.noFreeAgents,
      order: "score",
      limit,
      tactic: tactic?.slots ?? null,
      inPossessionWeight: tactic?.weight ?? null,
    };
  }, [brief, limit, tactic]);
  const requestKey = JSON.stringify(request);

  const [result, setResult] = useState<Scouted | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    const mine = ++seq.current;
    setSearching(true);
    const timer = window.setTimeout(() => {
      scoutingSuggest(request).then(
        (found) => {
          // An answer to a request that has been replaced since is of no use.
          if (mine === seq.current) {
            setResult(found);
            setError(null);
            setSearching(false);
          }
        },
        (e) => {
          if (mine === seq.current) {
            setResult(null);
            setError(describeError(e));
            setSearching(false);
          }
        },
      );
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // `requestKey` stands for `request`, which is a new object whenever the brief is set again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, overview, version]);

  // The table's order: the scout's own until a column is picked; a new brief goes back to it.
  const [order, setOrder] = useState<ColumnOrder<AdviceSort>>(SCOUT_ORDER);
  useEffect(() => setOrder(SCOUT_ORDER), [briefKey]);
  const sortBy = (by: AdviceSort) =>
    setOrder({ by, ascending: order.by === by ? !order.ascending : ASCENDING_FIRST.has(by) });
  const rows = useMemo(
    () => sortAdvice((result?.suggestions ?? []).map((suggestion, i) => ({ suggestion, rank: i + 1 })), order),
    [result, order],
  );
  const header = (by: AdviceSort, label: string, className?: string, extra?: ReactNode, title?: string) => (
    <SortHeader
      by={by}
      order={order}
      onSort={sortBy}
      label={label}
      title={title ?? text.sortBy(text.sortNames[by])}
      className={className}
    >
      {extra}
    </SortHeader>
  );

  const roleNames = [brief.inPossession, brief.outOfPossession].filter(Boolean).map(roleName);
  const more = result !== null && result.suggestions.length >= limit && limit < MOST && result.eligible > limit;

  return (
    <div className="scout-recommend" hidden={hidden}>
      <aside className="scout-brief" aria-label={text.brief.heading}>
        <h2 className="scout-heading">{text.brief.heading}</h2>

        <section className="scout-block" aria-label={text.brief.pitch}>
          <div className="scout-pitch" role="group" aria-label={text.brief.pitch}>
            {PITCH.filter(([key]) => overview.positions.some((p) => p.key === key)).map(([key, column, row]) => {
              const line = statusOf.get(LINE_OF_POSITION[key] ?? "");
              const status: DepthStatus | null = line?.status ?? null;
              return (
                <button
                  key={key}
                  type="button"
                  className="scout-spot"
                  data-position={key}
                  aria-pressed={key === brief.position}
                  title={
                    line && status
                      ? text.positionTip(depthLineName(line.key), line.players.length, line.target, text.status[status])
                      : positionLabel(key)
                  }
                  style={{ gridColumn: column, gridRow: row }}
                  onClick={() => choosePosition(key)}
                >
                  {status && <StatusDot status={status} />}
                  {positionLabel(key)}
                </button>
              );
            })}
          </div>
          <ul className="scout-legend" aria-label={text.brief.legend}>
            {(["missing", "thin", "fine", "crowded"] as DepthStatus[]).map((status) => (
              <li key={status}>
                <StatusDot status={status} />
                {text.status[status]}
              </li>
            ))}
          </ul>
        </section>

        <section className="scout-block">
          <span className="scout-label" id="scout-purpose-label">
            {text.brief.purpose}
          </span>
          <div className="scout-purpose scout-segmented" role="group" aria-labelledby="scout-purpose-label">
            {PURPOSES.map((purpose) => (
              <button
                key={purpose}
                type="button"
                data-purpose={purpose}
                aria-pressed={brief.purpose === purpose}
                title={text.purposeTips[purpose]}
                onClick={() => onBrief({ purpose })}
              >
                {text.purposes[purpose]}
              </button>
            ))}
          </div>
        </section>

        <section className="scout-block">
          {(["inPossession", "outOfPossession"] as Phase[]).map((phase) => (
            <label className="scout-field" key={phase}>
              <span>{text.brief[phase]}</span>
              <select
                data-phase={phase}
                value={brief[phase]}
                onChange={(e) => onBrief({ [phase]: e.currentTarget.value })}
              >
                <option value="">{text.brief.anyRole}</option>
                {rolesAt(overview.roles, position, phase).map((group) => (
                  <optgroup key={group.line} label={text.lines[group.line]}>
                    {group.roles.map((role) => (
                      <option key={role.key} value={role.key}>
                        {roleAbbreviation(role.key)} — {roleName(role.key)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          ))}
        </section>

        <details className="scout-filters">
          <summary>{text.brief.filters}</summary>
          <div className="scout-filter-grid">
            <label className="scout-field">
              <span>{text.brief.minAge}</span>
              <input
                type="number"
                min={15}
                max={60}
                value={brief.minAge}
                onChange={(e) => onBrief({ minAge: e.currentTarget.value })}
              />
            </label>
            <label className="scout-field">
              <span>{text.brief.maxAge}</span>
              <input
                type="number"
                min={15}
                max={60}
                value={brief.maxAge}
                onChange={(e) => onBrief({ maxAge: e.currentTarget.value })}
              />
            </label>
            <label className="scout-field wide">
              <span>
                {text.brief.maxFee} ({currencySymbol})
              </span>
              <input
                type="number"
                min={0}
                step="any"
                value={brief.maxFee}
                onChange={(e) => onBrief({ maxFee: e.currentTarget.value })}
              />
            </label>
            <label className="scout-field wide">
              <span>{text.brief.minProbability}</span>
              <select value={brief.minProbability} onChange={(e) => onBrief({ minProbability: e.currentTarget.value })}>
                <option value="">{text.brief.anyProbability}</option>
                {PROBABILITIES.map((value) => (
                  <option key={value} value={value}>
                    {formatPercent(Number(value))}+
                  </option>
                ))}
              </select>
            </label>
            <label className="scout-check wide">
              <input
                type="checkbox"
                checked={brief.noFreeAgents}
                onChange={(e) => onBrief({ noFreeAgents: e.currentTarget.checked })}
              />
              {text.brief.noFreeAgents}
            </label>
          </div>
        </details>
      </aside>

      <div className="scout-results">
        <h2 className="scout-ask" aria-live="polite">
          {text.ask.before}
          <strong>{positionLabel(brief.position)}</strong>
          {text.ask.after}
          {" · "}
          {roleNames.length > 0 ? roleNames.join(" / ") : text.ask.anyRole}
          {" · "}
          {text.purposes[brief.purpose]}
        </h2>

        {error && <div className="banner scout-banner">{error}</div>}

        {result && (
          <OwnOptions squad={result.squad} line={statusOf.get(LINE_OF_POSITION[brief.position] ?? "")} onOpen={onOpen} />
        )}

        <div className="scout-toolbar">
          <span className="scout-summary muted" aria-live="polite">
            {result
              ? text.summary(result.candidates, result.eligible, result.suggestions.length, text.purposes[brief.purpose])
              : searching
                ? text.searching
                : ""}
            {result && searching && ` · ${text.searching}`}
          </span>
          <span className="scout-how">
            <InfoTip label={text.how.label} note={text.how.note(text.purposeRules[brief.purpose], formatNumber(limit))} />
            <span className="muted">{text.how.label}</span>
          </span>
          {order.by !== "rank" && (
            <button type="button" className="scout-reset-order" onClick={() => setOrder(SCOUT_ORDER)}>
              {text.backToScoutOrder}
            </button>
          )}
        </div>

        {result &&
          (result.suggestions.length === 0 ? (
            <p className="empty">{text.empty}</p>
          ) : (
            <table className="grid scout-grid">
              <thead>
                <tr>
                  {header("rank", text.columns.rank, "num scout-col-rank")}
                  {header("name", text.columns.player, "col-name")}
                  {header("age", text.columns.age, "num")}
                  {header("ca", text.columns.ca, "num")}
                  {header("pa", text.columns.pa, "num")}
                  {header("fit", text.columns.fit)}
                  {header("probability", text.columns.probability, "num scout-col-probability", <ProbabilityInfo />)}
                  {header("fee", text.columns.money, "num")}
                  {tactic &&
                    header("elevenGain", text.columns.elevenGain, "num scout-col-gain", undefined, text.elevenGainTitle(tactic.label))}
                  <th>{text.columns.note}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ suggestion, rank }) => (
                  <SuggestionRow
                    key={suggestion.player.uid}
                    rank={rank}
                    suggestion={suggestion}
                    onOpen={onOpen}
                    gain={tactic !== null}
                  />
                ))}
              </tbody>
            </table>
          ))}
        {more && (
          <button type="button" className="scout-more" onClick={() => setLimit(Math.min(MOST, limit + PAGE))}>
            {text.showMore(PAGE)}
          </button>
        )}
        <p className="scout-note muted">{text.note}</p>
      </div>
    </div>
  );
}

/** The squad's own players for the position: what a signing has to beat, with how the line stands. */
function OwnOptions({
  squad,
  line,
  onOpen,
}: {
  squad: Fitting[];
  line: DepthLine | undefined;
  onOpen: (player: PlayerSummary) => void;
}) {
  return (
    <section className="scout-own" aria-label={text.own.heading}>
      <h3>
        {text.own.heading}
        {line && (
          <span className="scout-own-line">
            {depthLineName(line.key)} {line.players.length}/{line.target}
            <span className="scout-status" data-status={line.status}>
              {text.status[line.status]}
            </span>
          </span>
        )}
      </h3>
      {squad.length === 0 ? (
        <p className="muted">{text.own.empty}</p>
      ) : (
        <ul>
          <li className="scout-own-head" aria-hidden="true">
            <span>{text.columns.player}</span>
            <span className="num">{text.columns.age}</span>
            <span className="num">{text.columns.ca}</span>
            <span className="num">{text.columns.pa}</span>
            <span>{text.columns.fit}</span>
            <span>{text.columns.role}</span>
            <span>{text.own.position}</span>
          </li>
          {squad.slice(0, 5).map((f) => (
            <li key={f.player.uid}>
              <span className="scout-own-name">
                <PlayerName player={f.player} onOpen={onOpen} />
              </span>
              <span className="num muted">{f.player.age ?? text.none}</span>
              <span className="num">{f.player.currentAbility}</span>
              <span className="num muted">{f.player.potentialAbility}</span>
              <FitBar fit={f.fit} title={fitTitle(f)} />
              <RoleAbbreviations inPossession={f.inPossessionRole} outOfPossession={f.outOfPossessionRole} />
              <span className="muted">{familiarity(f.positionRating)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const rating = (value: number | null) => (value === null ? null : value.toFixed(1));

const fitTitle = (f: Fitting) =>
  text.fitTitle(
    rating(f.inPossession),
    rating(f.outOfPossession),
    `${f.positionRating.toFixed(0)} · ${familiarity(f.positionRating)}`,
  );

/** The hover of the fee and wage: the amounts in full, and his transfer value. */
const moneyTitle = (s: Suggestion) =>
  [
    s.fee !== null && `${text.columns.fee}: ${formatMoney(s.fee)}`,
    s.wage !== null && `${text.columns.wage}: ${formatMoney(s.wage)}${text.perWeek}`,
    s.value !== null && `${text.columns.value}: ${formatMoney(s.value)}`,
  ]
    .filter(Boolean)
    .join("\n") || undefined;

function SuggestionRow({
  rank,
  suggestion: s,
  onOpen,
  gain,
}: {
  rank: number;
  suggestion: Suggestion;
  onOpen: (player: PlayerSummary) => void;
  /** Whether the table has the column of the gain to the best eleven. */
  gain: boolean;
}) {
  const level = s.probability >= 70 ? "good" : s.probability >= 50 ? "ok" : "poor";
  const shown = s.reasons.slice(0, 2);
  const more = s.reasons.length - shown.length;
  const all = s.reasons.map((r) => `${reasonText(r)} (${signed(r.points)})`).join("\n");
  const roleTitle = [s.inPossessionRole, s.outOfPossessionRole]
    .filter((key): key is string => key !== null)
    .map(roleName)
    .join(" / ");
  const owner = s.ownerClub !== null && s.ownerClubUid !== null ? { uid: s.ownerClubUid, name: s.ownerClub } : null;
  return (
    <tr>
      <td className="num muted scout-col-rank">{rank}</td>
      <td className="col-name">
        <PlayerName player={s.player} onOpen={onOpen} sub={<ClubLine player={s.player} owner={owner} />} />
      </td>
      <td className="num">{s.player.age ?? text.none}</td>
      <td className="num scout-ca">{s.player.currentAbility}</td>
      <td className="num muted">{s.player.potentialAbility}</td>
      <td>
        <FitBar fit={s.fit} title={fitTitle(s)} />
        {/* The roles he was measured for: those asked for, or the best of the position's for him. */}
        <div className="sub scout-fit-roles" title={roleTitle || undefined}>
          <RoleAbbreviations inPossession={s.inPossessionRole} outOfPossession={s.outOfPossessionRole} />
        </div>
      </td>
      <td className={`num scout-probability ${level}`} title={all || undefined}>
        {formatPercent(s.probability)}
      </td>
      <td className="num scout-money" title={moneyTitle(s)}>
        <span className="scout-fee">{s.fee === null ? text.none : shortMoney(s.fee)}</span>
        <span className="sub">{s.wage === null ? text.none : `${shortMoney(s.wage)}${text.perWeek}`}</span>
      </td>
      {gain && (
        <td className={`num scout-gain${s.elevenGain !== null && s.elevenGain > 0 ? " pos" : " muted"}`}>
          {s.elevenGain === null ? text.none : s.elevenGain > 0 ? `+${formatNumber(s.elevenGain, { maximumFractionDigits: 1 })}` : "0"}
        </td>
      )}
      <td className="scout-note-cell" title={all || undefined}>
        <div className="scout-reasons">
          {shown.map((r) => (
            <span key={r.code} className={`tag scout-reason ${r.points > 0 ? "pos" : r.points < 0 ? "neg" : ""}`}>
              {reasonText(r)}
            </span>
          ))}
          {more > 0 && <span className="tag scout-reason">+{more}</span>}
        </div>
      </td>
    </tr>
  );
}
