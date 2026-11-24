// The Roles group of the player profile: how the player suits each role of the tactics screen in both phases, and
// the attributes he would best train for one of them. Worked out in the core from the player list (see `role_fits`
// and `training_focus`); it reads nothing more from the game.

import { useEffect, useState } from "react";
import { playerRoles } from "./editing";
import { describeError, formatNumber } from "./format";
import { ATTRIBUTE_LABELS, positionLabel, scoutingText } from "./labels";
import { FitBar, roleAbbreviation, roleName } from "./ScoutParts";
import type { Phase, PlayerRoles, RoleFit } from "./types";

const text = scoutingText.playerRoles;

/** How many roles of each phase are shown before "All roles". */
const SHOWN = 4;

const PHASES: Phase[] = ["inPossession", "outOfPossession"];

const attributeName = (key: string) => (ATTRIBUTE_LABELS as Record<string, string>)[key] ?? key;

/** `stamp` changes whenever the profile was read again, after an edit say: the roles follow it. */
export function PlayerRolesGroup({ uid, stamp }: { uid: number; stamp: unknown }) {
  const [roles, setRoles] = useState<PlayerRoles | null>(null);
  const [asked, setAsked] = useState<{ key: string; phase: Phase } | null>(null);
  const [all, setAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    playerRoles(uid, asked).then(
      (read) => {
        if (live) {
          setRoles(read);
          setError(null);
        }
      },
      (e) => live && setError(describeError(e)),
    );
    return () => {
      live = false;
    };
  }, [uid, asked, stamp]);

  if (error) {
    return (
      <section className="profile-group">
        <h3>{text.heading}</h3>
        <p className="banner">{error}</p>
      </section>
    );
  }
  if (roles === null) {
    return null;
  }
  const training = roles.trainingRole;
  const trainingId = training ? `${training.phase}:${training.key}` : "";
  const byPhase = (phase: Phase) => roles.fits.filter((fit) => fit.phase === phase);

  return (
    <section className="profile-group player-roles">
      <h3>{text.heading}</h3>
      <div className="player-roles-phases">
        {PHASES.map((phase) => (
          <div key={phase} className="player-roles-phase">
            <h4>{text[phase]}</h4>
            <ul>
              {byPhase(phase)
                .slice(0, all ? undefined : SHOWN)
                .map((fit) => (
                  <RoleRow
                    key={fit.key}
                    fit={fit}
                    chosen={trainingId === `${fit.phase}:${fit.key}`}
                    onTrain={() => setAsked({ key: fit.key, phase: fit.phase })}
                  />
                ))}
            </ul>
          </div>
        ))}
      </div>
      <button type="button" className="player-roles-more" onClick={() => setAll(!all)}>
        {all ? text.fewer : text.more}
      </button>

      {training && (
        <div className="player-roles-training">
          <h4>{text.training(roleName(training.key))}</h4>
          {roles.training.length === 0 ? (
            <p className="note">{text.noTraining}</p>
          ) : (
            <ol>
              {roles.training.map((focus) => (
                <li key={focus.attribute}>
                  <span className={focus.key ? "player-roles-key" : undefined} title={focus.key ? text.keyAttribute : undefined}>
                    {attributeName(focus.attribute)}
                  </span>{" "}
                  <span className="muted num">{focus.value}</span>{" "}
                  <span className="muted" title={text.gainTitle}>
                    {text.gain(formatNumber(focus.gain, { maximumFractionDigits: 1 }))}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <p className="note">{text.note}</p>
    </section>
  );
}

function RoleRow({ fit, chosen, onTrain }: { fit: RoleFit; chosen: boolean; onTrain: () => void }) {
  return (
    <li className="player-roles-row" aria-current={chosen || undefined}>
      <button type="button" className="name-link" title={`${text.trainingRole}: ${roleName(fit.key)}`} onClick={onTrain}>
        <span className="player-roles-abbr">{roleAbbreviation(fit.key)}</span> {roleName(fit.key)}
      </button>
      <span className="muted">{text.at(positionLabel(fit.position), fit.positionRating)}</span>
      <FitBar fit={fit.fit} title={fit.rating.toFixed(1)} />
    </li>
  );
}
