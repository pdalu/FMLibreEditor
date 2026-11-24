// The Scouting tab: an assistant scout. It advises on signings for a position and roles, shows how deep the squad is
// line by line, and lists the players it would let go. The overview of the club is read when the tab is first shown
// and again when the data changed; the advice is asked for as the brief changes (see ScoutRecommendations).

import { useCallback, useEffect, useRef, useState } from "react";
import { scoutingOverview } from "./editing";
import { describeError, formatMoney, formatNumber } from "./format";
import { scoutingText as text } from "./labels";
import { ClubLogo, PICTURE_SIZE, WithPicture } from "./Picture";
import { PlayerDialog } from "./PlayerProfile";
import { isRecord, restored, useSnapshot } from "./restore";
import { ScoutDepartures, DEPARTURE_FILTERS, type DepartureFilter } from "./ScoutDepartures";
import { ScoutDepth } from "./ScoutDepth";
import { ScoutLineup, ScoutTactics, useTactics } from "./ScoutLineup";
import {
  type Brief,
  DEFAULT_BRIEF,
  defaultPosition,
  PURPOSES,
  ScoutRecommendations,
} from "./ScoutRecommendations";
import type { PlayerSummary, ScoutingOverview } from "./types";

type ScoutTab = "recommend" | "lineup" | "tactics" | "depth" | "departures";

const TABS: ScoutTab[] = ["recommend", "lineup", "tactics", "depth", "departures"];

/** What was saved before the language was switched; a start from scratch for what is missing or wrong. */
interface Saved {
  tab: ScoutTab;
  brief: Brief;
  departures: DepartureFilter;
}

const readText = (value: unknown): string => (typeof value === "string" ? value : "");

function readSaved(value: unknown): Saved {
  const saved = isRecord(value) ? value : {};
  const brief = isRecord(saved.brief) ? saved.brief : {};
  return {
    tab: TABS.find((tab) => tab === saved.tab) ?? "recommend",
    departures: DEPARTURE_FILTERS.find((filter) => filter === saved.departures) ?? "all",
    brief: {
      position: readText(brief.position),
      inPossession: readText(brief.inPossession),
      outOfPossession: readText(brief.outOfPossession),
      purpose: PURPOSES.find((purpose) => purpose === brief.purpose) ?? DEFAULT_BRIEF.purpose,
      minAge: readText(brief.minAge),
      maxAge: readText(brief.maxAge),
      maxFee: readText(brief.maxFee),
      minProbability: readText(brief.minProbability),
      noFreeAgents: brief.noFreeAgents === true,
    },
  };
}

export function ScoutingBrowser({ version, active }: { version: number; active: boolean }) {
  const [saved] = useState(() => restored("scouting", readSaved));
  const [overview, setOverview] = useState<ScoutingOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ScoutTab>(saved.tab);
  const [chosen, setChosen] = useState<Brief>(saved.brief);
  const [departureFilter, setDepartureFilter] = useState<DepartureFilter>(saved.departures);
  const [shown, setShown] = useState<PlayerSummary | null>(null);
  useSnapshot("scouting", () => ({ tab, brief: chosen, departures: departureFilter }));
  // The manager's tactics take a few seconds to read: only once the sections that need them are opened.
  const tactics = useTactics(version, active && overview !== null && (tab === "lineup" || tab === "tactics"));

  // The data version the club was read at; it is read again when the tab is shown after the data changed.
  const loadedVersion = useRef<number | null>(null);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    loadedVersion.current = version;
    setLoading(true);
    setError(null);
    try {
      const read = await scoutingOverview();
      if (seq === loadSeq.current) {
        setOverview(read);
      }
    } catch (e) {
      if (seq === loadSeq.current) {
        setError(describeError(e));
      }
    } finally {
      if (seq === loadSeq.current) {
        setLoading(false);
      }
    }
  }, [version]);

  useEffect(() => {
    if (active && loadedVersion.current !== version) {
      void load();
    }
  }, [active, version, load]);

  const className = ["workspace", "scouting", !active && "inactive"].filter(Boolean).join(" ");

  if (overview === null) {
    return (
      <div className={className}>
        <div className="scout-main">
          {error && <div className="banner scout-banner">{error}</div>}
          {loading ? (
            <p className="empty">{text.reading}</p>
          ) : (
            error && (
              <div className="scout-header">
                <button type="button" onClick={() => void load()}>
                  {text.refresh}
                </button>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // A position the editor does not list (after an update, say) falls back to where the squad needs a player most.
  const position = overview.positions.some((p) => p.key === chosen.position)
    ? chosen.position
    : defaultPosition(overview);
  const brief: Brief = { ...chosen, position };
  const { report } = overview;
  const wage = overview.wageRoom ?? overview.wageBudget;

  return (
    <div className={className}>
      <div className="scout-main">
        <div className="scout-header">
          <span className="scout-club">
            <WithPicture
              picture={<ClubLogo uid={overview.club.uid} name={overview.club.name} size={PICTURE_SIZE.clubRowLogo} />}
            >
              <span className="name-text">{overview.club.name}</span>
            </WithPicture>
          </span>
          <dl className="scout-figures">
            <div>
              <dt>{text.header.transferBudget}</dt>
              <dd>{overview.transferBudget === null ? text.none : formatMoney(overview.transferBudget)}</dd>
            </div>
            <div>
              <dt>{overview.wageRoom !== null ? text.header.wageRoom : text.header.wageBudget}</dt>
              <dd>{wage === null ? text.none : `${formatMoney(wage)}${text.perWeek}`}</dd>
            </div>
            <div>
              <dt>{text.header.squad}</dt>
              <dd>{text.header.players(report.size)}</dd>
            </div>
            <div>
              <dt>{text.header.averageAge}</dt>
              <dd>
                {report.averageAge === null ? text.none : formatNumber(report.averageAge, { maximumFractionDigits: 1 })}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="scout-refresh"
            title={text.refreshTitle}
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? text.reading : text.refresh}
          </button>
        </div>

        {error && <div className="banner scout-banner">{error}</div>}

        <div className="scout-subtabs" role="tablist" aria-label={text.tabs.label}>
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              data-tab={id}
              aria-selected={tab === id}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) => {
                const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (step !== 0) {
                  const next = TABS[(TABS.indexOf(id) + step + TABS.length) % TABS.length];
                  setTab(next);
                  e.currentTarget.parentElement?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
                }
              }}
            >
              {text.tabs[id]}
              {id === "departures" && <span className="scout-badge">{report.departures.length}</span>}
            </button>
          ))}
        </div>

        <div className="scout-panel" role="tabpanel">
          <ScoutRecommendations
            overview={overview}
            version={version}
            brief={brief}
            onBrief={(patch) => setChosen({ ...brief, ...patch })}
            onOpen={setShown}
            hidden={tab !== "recommend"}
            tactic={
              tactics.own !== null && tactics.chosen
                ? { slots: tactics.chosen.slots, label: tactics.chosen.label, weight: tactics.weight }
                : null
            }
          />
          {tab === "lineup" && <ScoutLineup state={tactics} onOpen={setShown} />}
          {tab === "tactics" && (
            <ScoutTactics
              state={tactics}
              onShow={(id) => {
                tactics.choose(id);
                setTab("lineup");
              }}
            />
          )}
          {tab === "depth" && (
            <ScoutDepth
              report={report}
              onOpen={setShown}
              onAdvice={(key) => {
                setChosen({ ...brief, position: key, inPossession: "", outOfPossession: "" });
                setTab("recommend");
              }}
            />
          )}
          {tab === "departures" && (
            <ScoutDepartures
              departures={report.departures}
              filter={departureFilter}
              onFilter={setDepartureFilter}
              onOpen={setShown}
            />
          )}
        </div>
      </div>

      {shown && <PlayerDialog player={shown} version={version} onClose={() => setShown(null)} />}
    </div>
  );
}
