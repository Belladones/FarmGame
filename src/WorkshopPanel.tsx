import { ProductArt } from "./Shop";
import { useState } from "react";
import { AssetUpgradesPanel } from "./AssetUpgradesPanel";
import { models } from "./catalog";
import { robotStatus, type RobotRuntime } from "./fleet";
import type { Farm } from "./engine";
import type { FleetAction } from "./FleetPanel";
export function WorkshopPanel({
  farm,
  workshopId,
  robotId,
  runtimes,
  paused,
  onAction,
  onBuildingUpgrade,
}: {
  farm: Farm;
  workshopId: string;
  robotId?: string;
  runtimes: Record<string, RobotRuntime>;
  paused: boolean;
  onAction: (action: FleetAction) => boolean;
  onBuildingUpgrade: (upgrade: string) => boolean;
}) {
  const workshop = farm.buildings.find(
    (b) => b.id === workshopId && b.kind === "Workshop",
  );
  const robots = farm.robots.filter((r) => !r.destroyed && !r.loan);
  const [selected, setSelected] = useState(robotId ?? farm.activeRobotId),
    [tab, setTab] = useState<"robots" | "building">("robots"),
    [message, setMessage] = useState("");
  const robot = robots.find((r) => r.id === selected) ?? robots[0];
  if (!workshop)
    return (
      <p>
        Cet atelier n’est plus installé. Posez un atelier sur un terrain
        constructible.
      </p>
    );
  const level = workshop.upgrades?.workshop ?? 1,
    max = Math.min(5, level * 2);
  return (
    <div className="workshop-panel">
      <header className="workshop-hero">
        <div className="workshop-emblem" aria-hidden="true">
          <ProductArt kind="Workshop" />
        </div>
        <div>
          <span className="overline">MAINTENANCE & ÉQUIPEMENTS</span>
          <h2>Atelier de robotique</h2>
          <p>Installez les améliorations sur le robot de votre choix.</p>
          <div className="workshop-chips">
            <span>Atelier {workshop.id}</span>
            <span>Niveau {level} / 3</span>
            <span>Équipements jusqu’au niveau {max}</span>
          </div>
        </div>
      </header>
      <nav className="fleet-nav" aria-label="Sections de l’atelier">
        <button
          className={tab === "robots" ? "selected" : ""}
          onClick={() => setTab("robots")}
        >
          Améliorer un robot
        </button>
        <button
          className={tab === "building" ? "selected" : ""}
          onClick={() => setTab("building")}
        >
          Améliorer cet atelier
        </button>
      </nav>
      {message && <p role="status">{message}</p>}
      {tab === "building" ? (
        <AssetUpgradesPanel
          farm={farm}
          kind="building"
          id={workshopId}
          onUpgrade={(id) =>
            setMessage(
              onBuildingUpgrade(id)
                ? "Atelier amélioré."
                : "Amélioration impossible. Vérifiez les ressources et prérequis.",
            )
          }
        />
      ) : (
        <div className="workshop-layout">
          <aside className="workshop-robots">
            <h3>Robots possédés</h3>
            {robots.map((r) => (
              <button
                key={r.id}
                aria-pressed={robot?.id === r.id}
                onClick={() => {
                  setSelected(r.id);
                  setMessage("");
                }}
              >
                <strong>
                  {r.id} · {models[r.model].name}
                </strong>
                <small>
                  {robotStatus(farm, r, runtimes[r.id], paused).label} ·{" "}
                  {r.deployed ? "Déployé" : "Au garage"}
                </small>
              </button>
            ))}
            {!robots.length && <p>Aucun robot permanent en état de marche.</p>}
          </aside>
          <div>
            {robot && (
              <>
                <div className="workshop-selected">
                  <strong>Robot sélectionné : {robot.id}</strong>
                  <button
                    onClick={() => onAction({ type: "stop", id: robot.id })}
                  >
                    Arrêter ce robot
                  </button>
                </div>
                <p>
                  Le robot doit avoir terminé son action. Aucun déplacement
                  physique à l’atelier n’est nécessaire.
                </p>
                <AssetUpgradesPanel
                  farm={farm}
                  kind="robot"
                  id={robot.id}
                  workshopId={workshopId}
                  onUpgrade={(upgrade) =>
                    setMessage(
                      onAction({
                        type: "upgrade",
                        id: robot.id,
                        upgrade,
                        workshopId,
                      })
                        ? `Équipement installé sur ${robot.id}.`
                        : "Installation impossible. Consultez le prérequis indiqué.",
                    )
                  }
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
