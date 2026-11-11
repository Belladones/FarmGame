import { missionBlocker, type Farm } from "../../../farm/application/engine";
import type { Mission, MissionDestination } from "../../domain/missions";
export const missionReward = (m: Mission) =>
  `${m.reward ? `+${m.reward} blés · ` : ""}${m.gold ? `+${m.gold} or · ` : ""}+${m.xp} XP`;
export function MissionDetails({
  farm,
  mission,
  current,
  index,
  onClaim,
  onNavigate,
}: {
  farm: Farm;
  mission: Mission;
  current: boolean;
  index: number;
  onClaim: () => void;
  onNavigate: (destination: MissionDestination) => void;
}) {
  const claimed = farm.claimed.includes(mission.id),
    progress = claimed
      ? mission.target
      : Math.min(mission.target, mission.progress(farm)),
    ready = current && progress >= mission.target,
    blocker = missionBlocker(farm, mission.id);
  return (
    <section
      id="mission-detail"
      className="mission-detail-panel"
      role="region"
      aria-label={`Détail de la mission : ${mission.title}`}
      data-mission-detail={mission.id}
    >
      <div className="mission-detail-scroll" key={mission.id}>
        <div className="mission-detail-topline">
          <span>OBJECTIF {String(index + 1).padStart(2, "0")}</span>
          <span className={"mission-state " + (ready ? "ready" : "")}>
            {claimed
              ? "Validée"
              : ready
                ? "Récompense disponible"
                : current
                  ? "Mission en cours"
                  : "Mission à venir"}
          </span>
        </div>
        <div className="mission-detail-heading">
          <span className="mission-target-mark" aria-hidden="true">
            ⌖
          </span>
          <div>
            <span className="overline">RAPPORT DE MISSION</span>
            <h2>{mission.title}</h2>
          </div>
        </div>
        <p className="mission-description">{mission.text}</p>
        <div className="mission-objective-card">
          <div>
            <span>Progression de l’objectif</span>
            <strong>
              {progress} / {mission.target}
            </strong>
          </div>
          <progress
            aria-label={`Objectif ${mission.title}`}
            value={progress}
            max={mission.target}
          />
          <small>
            {claimed
              ? "Objectif validé et récompense récupérée."
              : ready
                ? "Objectif atteint. Votre récompense vous attend."
                : current
                  ? "Chaque action vous rapproche de la prochaine étape."
                  : "Validez les missions précédentes pour débloquer cette étape."}
          </small>
        </div>
        <div className="mission-reward-card">
          <span className="overline">RÉCOMPENSE</span>
          <strong>{missionReward(mission)}</strong>
          {claimed && <small>Déjà récupérée</small>}
        </div>
        {(current || claimed) && (
          <details key={mission.id} open={current} className="mission-help">
            <summary>Conseil et exemple TypeScript</summary>
            <p>{mission.hint}</p>
            {mission.code && (
              <pre>
                <code>{mission.code}</code>
              </pre>
            )}
            <small>
              Exemple à adapter à votre terrain et aux recherches disponibles.
            </small>
          </details>
        )}
        {!current && !claimed && (
          <p className="mission-locked-note">
            <span aria-hidden="true">◇</span> Cette mission se débloquera en
            suivant votre progression.
          </p>
        )}
      </div>
      {current && (
        <div className="mission-detail-actions">
          <div className="campaign-actions">
            <button
              className="campaign-claim"
              disabled={!!blocker}
              onClick={onClaim}
            >
              {ready ? "Récupérer la récompense" : "Objectif en cours"}
            </button>
            <button
              onClick={() =>
                onNavigate(ready && blocker ? "Magasin" : mission.destination)
              }
            >
              {ready && blocker
                ? "Libérer le dépôt au magasin"
                : mission.action}{" "}
              ↗
            </button>
          </div>
          {ready && blocker && (
            <p className="mission-blocker" role="status">
              {blocker}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
