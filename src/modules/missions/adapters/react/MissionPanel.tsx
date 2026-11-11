import { useState } from "react";
import { missionBlocker, type Farm } from "../../../farm/application/engine";
import {
  missionsFor,
  chapters,
  currentMission,
  career,
  completedMissions,
  type MissionDestination,
} from "../../domain/missions";
import { MissionDetails, missionReward } from "./MissionDetails";
import "./missions.css";
export function MissionPanel({
  farm,
  onClaim,
  onNavigate,
}: {
  farm: Farm;
  onClaim: (id: string) => boolean;
  onNavigate: (destination: MissionDestination) => void;
}) {
  const missions = missionsFor(farm),
    active = currentMission(farm),
    rank = career(farm);
  const [selection, setSelection] = useState({
    chapter: active?.chapter ?? chapters.length - 1,
    id: active?.id,
  });
  const [notice, setNotice] = useState("");
  const page = selection.chapter,
    chapter = chapters[page],
    currentChapter = active?.chapter ?? chapters.length;
  const list = missions
    .filter((m) => m.chapter === page)
    .sort((a, b) => {
      const priority = (id: string) =>
        id === active?.id ? 0 : farm.claimed.includes(id) ? 2 : 1;
      return priority(a.id) - priority(b.id);
    });
  const selected = list.find((m) => m.id === selection.id) ?? list[0],
    done = completedMissions(farm),
    total = missions.length;
  const chooseChapter = (index: number) =>
    setSelection({
      chapter: index,
      id:
        missions.find((m) => m.chapter === index && m.id === active?.id)?.id ??
        missions.find(
          (m) => m.chapter === index && !farm.claimed.includes(m.id),
        )?.id ??
        missions.find((m) => m.chapter === index)?.id,
    });
  const claim = () => {
    if (!selected) return;
    if (onClaim(selected.id)) {
      const next = missions[missions.indexOf(selected) + 1];
      setNotice(
        `Mission validée ! ${missionReward(selected)}${next ? ` · Prochaine étape : ${next.title}` : " · Campagne terminée, bravo !"}`,
      );
      if (next) setSelection({ chapter: next.chapter, id: next.id });
    } else
      setNotice(
        missionBlocker(farm, selected.id) ?? "Récompense indisponible.",
      );
  };
  return (
    <div className="mission-campaign">
      <header className="campaign-heading">
        <div>
          <span className="overline">
            <i aria-hidden="true" /> JOURNAL DE BORD
          </span>
          <h2>Chaque mission, une nouvelle avancée.</h2>
          <p>Programmez votre prochaine réussite.</p>
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
              onClick={() => chooseChapter(i)}
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
      <div className="mission-layout">
        <aside className="mission-sidebar">
          <div className="mission-list-heading">
            <span className="overline">CHAPITRE {page + 1}</span>
            <h3>{chapter.title}</h3>
            <p>{chapter.subtitle}</p>
          </div>
          <nav
            className="campaign-missions"
            aria-label="Missions du chapitre"
            onKeyDown={(event) => {
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
                return;
              const buttons = Array.from(
                event.currentTarget.querySelectorAll("button"),
              );
              const index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        buttons.length) %
                      buttons.length;
              event.preventDefault();
              buttons[next]?.focus();
              buttons[next]?.click();
            }}
          >
            {list.map((m) => {
              const claimed = farm.claimed.includes(m.id),
                current = active?.id === m.id,
                ready = current && m.progress(farm) >= m.target;
              return (
                <button
                  key={m.id}
                  type="button"
                  data-mission={m.id}
                  className={
                    "campaign-mission " +
                    (claimed ? "complete" : current ? "current" : "locked")
                  }
                  aria-pressed={selected?.id === m.id}
                  aria-controls="mission-detail"
                  onClick={() => setSelection({ chapter: page, id: m.id })}
                >
                  <span className="campaign-step" aria-hidden="true">
                    {claimed
                      ? "✓"
                      : String(missions.indexOf(m) + 1).padStart(2, "0")}
                  </span>
                  <span className="mission-list-copy">
                    <strong>{m.title}</strong>
                    <small>
                      {claimed
                        ? "Validée"
                        : ready
                          ? "Récompense disponible"
                          : current
                            ? "En cours"
                            : "À venir"}
                    </small>
                  </span>
                  <span className="mission-list-arrow" aria-hidden="true">
                    ›
                  </span>
                </button>
              );
            })}
          </nav>
          {active && page !== active.chapter && (
            <button
              className="mission-return"
              onClick={() =>
                setSelection({ chapter: active.chapter, id: active.id })
              }
            >
              Revenir à ma mission →
            </button>
          )}
        </aside>
        {selected ? (
          <MissionDetails
            farm={farm}
            mission={selected}
            current={active?.id === selected.id}
            index={missions.indexOf(selected)}
            onClaim={claim}
            onNavigate={onNavigate}
          />
        ) : (
          <section className="mission-detail-panel mission-empty">
            <h2>Aucune mission dans ce chapitre</h2>
            <p>
              Choisissez un autre chapitre pour poursuivre votre exploration.
            </p>
          </section>
        )}
      </div>
      {done === total && (
        <div className="campaign-finale">
          <strong>Votre ferme a pris son envol.</strong>
          <button onClick={() => onNavigate("Robots")}>
            Retrouver ma flotte →
          </button>
        </div>
      )}
      <footer className="campaign-footer" role="status">
        {notice ||
          "Les récompenses se récupèrent dans l’ordre, une seule fois."}
      </footer>
    </div>
  );
}
