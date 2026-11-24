// "Best eleven" and "Tactics": the strongest eleven and second eleven of the senior squad in a tactic, and how well
// the squad fills each tactic. The manager's own tactics are read from the game once (a few seconds); the editor's
// formations stand in when none is found. The eleven is worked out in the core (see `best_lineup`).

import { useEffect, useMemo, useRef, useState } from "react";
import { scoutingCompare, scoutingLineup, scoutingTactics } from "./editing";
import { describeError, formatNumber, formatPercent } from "./format";
import { InfoTip } from "./InfoTip";
import { positionLabel, scoutingText as text } from "./labels";
import { FitBar, PlayerName, RoleAbbreviations } from "./ScoutParts";
import type { Lineup, OwnTactic, Placed, PlayerSummary, SlotRoles, SquadChoice, TacticRank } from "./types";

/** The shares of a slot's value its role in possession can have. */
export const WEIGHTS = [0.5, 0.6, 0.7, 0.8, 1];
const DEFAULT_WEIGHT = 0.6;

/** A tactic to pick: one of the manager's ("own:0") or one of the editor's formations ("ref:4-2-3-1"). */
export interface TacticOption {
  id: string;
  label: string;
  slots: SlotRoles[];
  own: boolean;
}

/** Everything the two sections and the transfer advice share: the tactics, the one picked, and how it is measured. */
export interface TacticState {
  /** Null until the manager's tactics have been read (or failed to be). */
  own: OwnTactic[] | null;
  ownError: string | null;
  readingOwn: boolean;
  ranks: TacticRank[] | null;
  options: TacticOption[];
  chosen: TacticOption | null;
  choose: (id: string) => void;
  weight: number;
  setWeight: (weight: number) => void;
  choice: SquadChoice;
  setChoice: (choice: SquadChoice) => void;
}

const ownLabel = (index: number, tactic: { style: string | null }) => text.lineup.own(index, tactic.style);

/** The manager's tactics and the comparison, read once `wanted` and again when the data changed. */
export function useTactics(version: number, wanted: boolean): TacticState {
  const [own, setOwn] = useState<OwnTactic[] | null>(null);
  const [ownError, setOwnError] = useState<string | null>(null);
  const [readingOwn, setReadingOwn] = useState(false);
  const [ranks, setRanks] = useState<TacticRank[] | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [weight, setWeight] = useState(DEFAULT_WEIGHT);
  const [choice, setChoice] = useState<SquadChoice>({ availableOnly: false });
  const readVersion = useRef<number | null>(null);

  useEffect(() => {
    if (!wanted || readVersion.current === version) {
      return;
    }
    readVersion.current = version;
    let live = true;
    setReadingOwn(true);
    scoutingTactics().then(
      (read) => {
        if (live) {
          setOwn(read);
          setOwnError(null);
          setReadingOwn(false);
        }
      },
      (e) => {
        if (live) {
          // Without his tactics the editor's formations still work.
          setOwn([]);
          setOwnError(describeError(e));
          setReadingOwn(false);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [wanted, version]);

  const ownKey = JSON.stringify(own);
  useEffect(() => {
    if (own === null) {
      return;
    }
    let live = true;
    scoutingCompare(
      own.map((tactic) => ({ style: tactic.style, slots: tactic.slots })),
      weight,
      choice,
    ).then(
      (compared) => live && setRanks(compared),
      () => live && setRanks([]),
    );
    return () => {
      live = false;
    };
    // `ownKey` stands for `own`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownKey, weight, choice, version]);

  const options = useMemo(() => {
    const mine: TacticOption[] = (own ?? []).map((tactic, i) => ({
      id: `own:${i}`,
      label: ownLabel(i, tactic),
      slots: tactic.slots,
      own: true,
    }));
    const references: TacticOption[] = (ranks ?? [])
      .filter((rank) => rank.name !== null)
      .map((rank) => ({ id: `ref:${rank.name}`, label: text.lineup.reference(rank.name!), slots: rank.slots, own: false }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return [...mine, ...references];
  }, [own, ranks]);
  const chosen = options.find((option) => option.id === chosenId) ?? options[0] ?? null;

  return {
    own,
    ownError,
    readingOwn,
    ranks,
    options,
    chosen,
    choose: setChosenId,
    weight,
    setWeight,
    choice,
    setChoice,
  };
}

/** The tactic, weight and squad pickers above both sections. */
function Controls({ state }: { state: TacticState }) {
  const mine = state.options.filter((option) => option.own);
  const references = state.options.filter((option) => !option.own);
  return (
    <div className="scout-toolbar scout-lineup-controls">
      <label className="scout-field">
        <span>{text.lineup.tactic}</span>
        <select value={state.chosen?.id ?? ""} onChange={(e) => state.choose(e.currentTarget.value)}>
          {mine.length > 0 && (
            <optgroup label={text.lineup.ownGroup}>
              {mine.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={text.lineup.referenceGroup}>
            {references.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="scout-field">
        <span>{text.lineup.weight}</span>
        <select value={String(state.weight)} onChange={(e) => state.setWeight(Number(e.currentTarget.value))}>
          {WEIGHTS.map((weight) => (
            <option key={weight} value={String(weight)}>
              {formatPercent(Math.round(weight * 100))}
            </option>
          ))}
        </select>
      </label>
      <label className="scout-check">
        <input
          type="checkbox"
          checked={state.choice.availableOnly}
          onChange={(e) => state.setChoice({ availableOnly: e.currentTarget.checked })}
        />
        {text.lineup.availableOnly}
      </label>
      <span className="scout-how">
        <InfoTip label={text.lineup.how.label} note={text.lineup.how.note} />
        <span className="muted">{text.lineup.how.label}</span>
      </span>
    </div>
  );
}

/** What the reading of the manager's tactics came to, when it is worth a word. */
function OwnNote({ state }: { state: TacticState }) {
  if (state.readingOwn) {
    return <p className="muted">{text.lineup.reading}</p>;
  }
  if (state.own !== null && state.own.length === 0) {
    return <p className="note">{text.lineup.noTactic}</p>;
  }
  const index = state.chosen?.own ? Number(state.chosen.id.slice(4)) : -1;
  const unknown = state.own?.[index]?.unknownRoles ?? 0;
  return unknown > 0 ? <p className="note">{text.lineup.unknownRoles(unknown)}</p> : null;
}

const one = (fit: number | null) => (fit === null ? null : String(fit));

function PlacedCell({ placed, onOpen }: { placed: Placed | null; onOpen: (player: PlayerSummary) => void }) {
  if (placed === null) {
    return <span className="muted">{text.lineup.nobody}</span>;
  }
  return (
    <div className="scout-placed">
      <PlayerName
        player={placed.player}
        onOpen={onOpen}
        sub={placed.position === null ? undefined : positionLabel(placed.position)}
      />
      <FitBar fit={placed.fit} title={text.lineup.fitTitle(one(placed.inPossession), one(placed.outOfPossession))} />
    </div>
  );
}

export function ScoutLineup({ state, onOpen }: { state: TacticState; onOpen: (player: PlayerSummary) => void }) {
  const [lineup, setLineup] = useState<Lineup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slotsKey = JSON.stringify(state.chosen?.slots ?? null);
  useEffect(() => {
    const slots = state.chosen?.slots;
    if (!slots) {
      return;
    }
    let live = true;
    scoutingLineup(slots, state.weight, state.choice).then(
      (read) => {
        if (live) {
          setLineup(read);
          setError(null);
        }
      },
      (e) => live && setError(describeError(e)),
    );
    return () => {
      live = false;
    };
    // `slotsKey` stands for the chosen tactic's slots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsKey, state.weight, state.choice]);

  const average = (value: number) => formatNumber(value, { maximumFractionDigits: 1 });
  return (
    <div className="scout-lineup">
      <Controls state={state} />
      <OwnNote state={state} />
      {error && <div className="banner scout-banner">{error}</div>}
      {lineup && (
        <>
          <p className="scout-lineup-summary muted">
            {text.lineup.summary(average(lineup.firstAverage), average(lineup.secondAverage), lineup.squadSize)}
          </p>
          <table className="grid scout-grid scout-lineup-table">
            <thead>
              <tr>
                <th>{text.lineup.columns.slot}</th>
                <th>{text.lineup.columns.roles}</th>
                <th className="col-name">{text.lineup.columns.first}</th>
                <th className="col-name">{text.lineup.columns.second}</th>
                <th>{text.lineup.columns.cover}</th>
              </tr>
            </thead>
            <tbody>
              {lineup.slots.map((slot) => (
                <tr key={slot.index}>
                  <td className="scout-slot">
                    {slot.position !== null ? positionLabel(slot.position) : slot.line ? text.lines[slot.line] : "?"}
                  </td>
                  <td>
                    <RoleAbbreviations inPossession={slot.inPossession} outOfPossession={slot.outOfPossession} />
                  </td>
                  <td className="col-name">
                    <PlacedCell placed={slot.first} onOpen={onOpen} />
                  </td>
                  <td className="col-name">
                    <PlacedCell placed={slot.second} onOpen={onOpen} />
                  </td>
                  <td className="scout-cover">
                    {slot.cover.length === 0 ? (
                      <span className="muted">{text.none}</span>
                    ) : (
                      slot.cover.map((placed, i) => (
                        <span key={placed.player.uid}>
                          {i > 0 && ", "}
                          <button
                            type="button"
                            className="name-link"
                            title={text.openProfile}
                            onClick={() => onOpen(placed.player)}
                          >
                            {placed.player.name}
                          </button>{" "}
                          <span className="muted num">{placed.fit}</span>
                        </span>
                      ))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const UNITS = ["goalkeeper", "defence", "midfield", "attack"] as const;

export function ScoutTactics({ state, onShow }: { state: TacticState; onShow: (id: string) => void }) {
  const average = (value: number) => formatNumber(value, { maximumFractionDigits: 1 });
  const idOf = (rank: TacticRank) => (rank.own !== null ? `own:${rank.own}` : `ref:${rank.name}`);
  const labelOf = (rank: TacticRank) =>
    rank.own !== null ? ownLabel(rank.own, rank) : text.lineup.reference(rank.name ?? "?");
  return (
    <div className="scout-lineup">
      <Controls state={state} />
      <OwnNote state={state} />
      <p className="muted">{text.tactics.intro}</p>
      {state.ranks === null ? null : state.ranks.length === 0 ? (
        <p className="empty">{text.tactics.empty}</p>
      ) : (
        <table className="grid scout-grid scout-tactics-table">
          <thead>
            <tr>
              <th>{text.tactics.columns.tactic}</th>
              <th className="num">{text.tactics.columns.covered}</th>
              <th>{text.tactics.columns.first}</th>
              <th>{text.tactics.columns.second}</th>
              <th>{text.tactics.columns.units}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.ranks.map((rank) => {
              const units = new Map(rank.units);
              return (
                <tr key={idOf(rank)} aria-current={state.chosen?.id === idOf(rank) || undefined}>
                  <td>{labelOf(rank)}</td>
                  <td className="num">{text.tactics.covered(rank.covered, rank.size)}</td>
                  <td>
                    <FitBar fit={rank.firstAverage} title={average(rank.firstAverage)} />
                  </td>
                  <td>
                    <FitBar fit={rank.secondAverage} title={average(rank.secondAverage)} />
                  </td>
                  <td className="scout-units">
                    {UNITS.filter((unit) => units.has(unit)).map((unit) => (
                      <span key={unit} className="tag">
                        {text.tactics.units[unit]} {Math.round(units.get(unit)!)}
                      </span>
                    ))}
                  </td>
                  <td>
                    <button type="button" onClick={() => onShow(idOf(rank))}>
                      {text.tactics.open}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
