import { useState } from "react";
import { missionBlocker, type Farm } from "./engine";
import {
  missions,
  chapters,
  currentMission,
  career,
  completedMissions,
  type MissionDestination,
} from "./missions";
export function MissionPanel({
  farm,
  onClaim,
  onNavigate,
}: {
  farm: Farm;
  onClaim: (id: string) => boolean;
  onNavigate: (destination: MissionDestination) => void;
}) {
  const active = currentMission(farm),
    rank = career(farm);
  const [page, setPage] = useState(active?.chapter ?? chapters.length - 1);
  const [notice, setNotice] = useState("");
  const currentChapter = active?.chapter ?? chapters.length;
  const chapter = chapters[page],
    list = missions
      .filter((m) => m.chapter === page)
      .sort((a, b) => {
        const priority = (id: string) =>
          id === active?.id ? 0 : farm.claimed.includes(id) ? 2 : 1;
        return priority(a.id) - priority(b.id);
      });
  const done = completedMissions(farm),
    total = missions.length;
  const reward = (m: (typeof missions)[number]) =>
    `${m.reward ? `+${m.reward} blés · ` : ""}${m.gold ? `+${m.gold} or · ` : ""}+${m.xp} XP`;
  return (
    <div className="mission-campaign">
      <header className="campaign-heading">
        <div>
          <span className="overline">VOTRE CARNET DE FERME</span>
          <h2>Une ligne de code. Une nouvelle étape.</h2>
          <p>
            Apprenez, récoltez, construisez : votre prochaine avancée commence
            ici.
          </p>
        </div>
        <div className="career-rank">
          <span>NIVEAU {rank.level}</span>
          <strong>{rank.title}</strong>
          <small>
            {rank.xp} XP {rank.next ? `/ ${rank.next} XP` : "· Rang maximum"}
          </small>
          <progress
            aria-label="Expérience du niveau"
            value={rank.xp - rank.floor}
            max={rank.next ? rank.next - rank.floor : 1}
          />
        </div>
      </header>
      <div className="campaign-overview">
        <span>
          <strong>
            {done} / {total}
          </strong>{" "}
          missions validées
        </span>
        <progress
          aria-label="Progression de la campagne"
          value={done}
          max={total}
        />
        <span>{Math.round((done / total) * 100)} %</span>
      </div>
      <nav className="campaign-chapters" aria-label="Chapitres des missions">
        {chapters.map((c, i) => {
          const ms = missions.filter((m) => m.chapter === i),
            count = ms.filter((m) => farm.claimed.includes(m.id)).length;
          return (
            <button
              key={c.title}
              className={page === i ? "selected" : ""}
              aria-current={page === i ? "step" : undefined}
              onClick={() => setPage(i)}
            >
              <span>
                {count === ms.length
                  ? "✓"
                  : i > currentChapter
                    ? "◇"
                    : String(i + 1).padStart(2, "0")}
              </span>
              <strong>{c.title}</strong>
              <small>
                {count} / {ms.length}
                {i > currentChapter ? " · À venir" : ""}
              </small>
            </button>
          );
        })}
      </nav>
      <div className="campaign-chapter-title">
        <div>
          <span className="overline">
            CHAPITRE {page + 1} · {chapter.skill}
          </span>
          <h3>{chapter.title}</h3>
          <p>{chapter.subtitle}</p>
        </div>
        {active && page !== active.chapter && (
          <button onClick={() => setPage(active.chapter)}>
            Revenir à ma mission →
          </button>
        )}
      </div>
      <div className="campaign-missions">
        {list.map((m) => {
          const claimed = farm.claimed.includes(m.id),
            current = active?.id === m.id;
          const ready = current && m.progress(farm) >= m.target,
            blocker = missionBlocker(farm, m.id);
          return (
            <article
              key={m.id}
              data-mission={m.id}
              className={
                "campaign-mission " +
                (claimed ? "complete" : current ? "current" : "locked")
              }
            >
              <div className="campaign-step">
                {claimed
                  ? "✓"
                  : String(missions.indexOf(m) + 1).padStart(2, "0")}
              </div>
              <div className="campaign-mission-body">
                <span className={"mission-state " + (ready ? "ready" : "")}>
                  {claimed
                    ? "Validée"
                    : ready
                      ? "Objectif atteint · Récompense disponible"
                      : current
                        ? "Votre objectif actuel"
                        : "À venir · Validez l’étape précédente"}
                </span>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
                <div className="campaign-objective">
                  <progress
                    aria-label={`Objectif ${m.title}`}
                    value={
                      claimed ? m.target : Math.min(m.target, m.progress(farm))
                    }
                    max={m.target}
                  />
                  <strong>
                    {claimed ? m.target : Math.min(m.target, m.progress(farm))}{" "}
                    / {m.target}
                  </strong>
                </div>
                <div className="campaign-reward">{reward(m)}</div>
                {(current || claimed) && (
                  <details open={current} className="mission-help">
                    <summary>Conseil et exemple TypeScript</summary>
                    <p>{m.hint}</p>
                    {m.code && (
                      <pre>
                        <code>{m.code}</code>
                      </pre>
                    )}
                    <small>
                      Exemple à adapter à votre terrain et aux recherches
                      disponibles.
                    </small>
                  </details>
                )}
                {current && (
                  <div className="campaign-actions">
                    <button
                      className="campaign-claim"
                      disabled={!!blocker}
                      onClick={() => {
                        if (onClaim(m.id)) {
                          const next = missions[missions.indexOf(m) + 1];
                          setNotice(
                            `Mission validée ! ${reward(m)}${next ? ` · Prochaine étape : ${next.title}` : " · Campagne terminée, bravo !"}`,
                          );
                          if (next) setPage(next.chapter);
                        } else
                          setNotice(
                            missionBlocker(farm, m.id) ??
                              "Récompense indisponible.",
                          );
                      }}
                    >
                      {" "}
                      {ready ? "Récupérer la récompense" : "Objectif en cours"}
                    </button>
                    <button
                      onClick={() =>
                        onNavigate(ready && blocker ? "Shop" : m.destination)
                      }
                    >
                      {ready && blocker ? "Libérer le dépôt au shop" : m.action}{" "}
                      ↗
                    </button>
                  </div>
                )}
                {ready && blocker && (
                  <p className="mission-blocker" role="status">
                    {blocker}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {done === total && (
        <div className="campaign-finale">
          <strong>Votre ferme a pris son envol.</strong>
          <p>
            La campagne est terminée. Continuez à expérimenter, améliorer vos
            robots et développer votre production.
          </p>
          <button onClick={() => onNavigate("Flotte")}>
            Retrouver ma flotte →
          </button>
        </div>
      )}
      <footer className="campaign-footer" role="status">
        {notice ||
          "Les objectifs cumulés comptent depuis le début de votre partie. Les récompenses se récupèrent dans l’ordre, une seule fois."}
      </footer>
    </div>
  );
}
