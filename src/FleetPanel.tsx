import { useState } from "react";
import {
  capacity,
  deploymentPosition,
  recallBlocker,
  stockCapacity,
  type Farm,
} from "./engine";
import { models, itemNames, sum, type Item } from "./catalog";
import {
  robotStatus,
  robotStats,
  robotCapabilities,
  type RobotRuntime,
} from "./fleet";
import { ProductArt } from "./ui/ProductArt";
export type FleetAction =
  | { type: "deploy" | "recall" | "select" | "stop" | "repair"; id: string }
  | { type: "buy"; id: string }
  | { type: "upgrade"; id: string; upgrade: string; workshopId?: string }
  | { type: "workshop"; id?: string }
  | { type: "shop" };
export function FleetPanel({
  farm,
  paused,
  runtimes,
  onAction,
  onPause,
}: {
  farm: Farm;
  paused: boolean;
  onPause: () => void;
  runtimes: Record<string, RobotRuntime>;
  onAction: (action: FleetAction) => boolean;
}) {
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [message, setMessage] = useState("");
  const living = farm.robots.filter((r) => !r.destroyed),
    deployed = living.filter((r) => r.deployed),
    garage = living.filter((r) => !r.deployed),
    destroyed = farm.robots.filter((r) => r.destroyed);
  const visible = farm.robots.filter((r) => {
    if (filter === "deployed" && (!r.deployed || r.destroyed)) return false;
    if (filter === "garage" && (r.deployed || r.destroyed)) return false;
    if (filter === "running" && !runtimes[r.id]) return false;
    if (filter === "destroyed" && !r.destroyed) return false;
    return `${r.id} ${models[r.model].name}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  const act = (action: FleetAction, success: string) => {
    setMessage(
      onAction(action)
        ? success
        : "Action impossible. Vérifiez l’état du robot et la place disponible sur le terrain.",
    );
  };
  return (
    <div className="fleet-panel">
      <nav className="fleet-nav" aria-label="Gestion des robots">
        <span>Mes robots</span>
        <button
          disabled={!farm.buildings.some((b) => b.kind === "Workshop")}
          onClick={() => onAction({ type: "workshop" })}
        >
          Ouvrir l’atelier
        </button>
        <button
          className="fleet-shop-link"
          onClick={() => onAction({ type: "shop" })}
        >
          Acheter un robot ↗
        </button>
      </nav>
      <>
        <header className="fleet-heading">
          <div>
            <span className="overline">UNE ÉQUIPE SOUS VOTRE CONTRÔLE</span>
            <h2>Votre flotte</h2>
            <p>
              Programmez chaque robot, suivez son activité et gérez son
              déploiement.
            </p>
          </div>
          <button className="fleet-global-pause" onClick={onPause}>
            {paused ? "▶ Reprendre la simulation" : "Ⅱ Mettre en pause"}
          </button>
        </header>
        <div className="fleet-summary">
          <div>
            <strong>{living.length}</strong>
            <span>Possédés</span>
          </div>
          <div>
            <strong>{deployed.length}</strong>
            <span>Déployés</span>
          </div>
          <div>
            <strong>{garage.length}</strong>
            <span>Au garage</span>
          </div>
          <div>
            <strong>{destroyed.length}</strong>
            <span>Carcasses</span>
          </div>
          <div>
            <strong>{stockCapacity(farm)}</strong>
            <span>Stockage des dépôts</span>
          </div>
        </div>
        <div className="fleet-filters">
          <label>
            Rechercher
            <input
              aria-label="Rechercher un robot"
              type="search"
              placeholder="Identifiant ou modèle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Afficher
            <select
              aria-label="Filtrer les robots"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Tous les robots</option>
              <option value="deployed">Déployés</option>
              <option value="garage">Au garage</option>
              <option value="running">Programme actif</option>
              <option value="destroyed">Détruits</option>
            </select>
          </label>
        </div>
        <div className="fleet-list">
          {visible.map((r) => {
            const status = robotStatus(farm, r, runtimes[r.id], paused),
              stats = robotStats(farm, r),
              cargo = sum(r.inventory),
              max = capacity(farm, r),
              position = deploymentPosition(farm, r.id),
              recall = recallBlocker(farm, r.id);
            return (
              <article
                className={
                  "fleet-card " +
                  status.tone +
                  (farm.activeRobotId === r.id ? " current" : "")
                }
                data-robot={r.id}
                key={r.id}
              >
                <div className="fleet-card-top">
                  <ProductArt kind={r.model} />
                  <div>
                    <span className="overline">
                      {models[r.model].medium === "air"
                        ? "AÉRIEN"
                        : "TERRESTRE"}
                      {r.loan ? " · PRÊT DE SECOURS" : ""}
                    </span>
                    <h3>
                      {r.id} <span>{models[r.model].name}</span>
                    </h3>
                    <span className={"robot-state " + status.tone}>
                      {status.label}
                    </span>
                  </div>
                  <span
                    className={
                      "deployment-tag " +
                      (r.destroyed
                        ? "dead"
                        : r.deployed
                          ? "deployed"
                          : "garage")
                    }
                  >
                    {r.destroyed
                      ? "Carcasse"
                      : r.deployed
                        ? "Déployé"
                        : "Non déployé"}
                  </span>
                </div>
                <div className="fleet-stats">
                  <div>
                    <span>Soute embarquée</span>
                    <strong>
                      {cargo} <small>/ {max}</small>
                    </strong>
                    <div className="cargo-meter">
                      <i
                        style={{
                          width: Math.min(1, cargo / max) * 100 + "%",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <span>Déplacement</span>
                    <strong>
                      {stats.speed.toLocaleString("fr-FR")}{" "}
                      <small>case/s</small>
                    </strong>
                  </div>
                  <div>
                    <span>
                      {r.model === "Transporter"
                        ? "Spécialité"
                        : "Actions agricoles"}
                    </span>
                    <strong>
                      {r.model === "Transporter"
                        ? "Transport"
                        : `${stats.actionSeconds.toLocaleString("fr-FR")} s`}
                    </strong>
                  </div>
                  <div>
                    <span>Réservoir d’eau</span>
                    <strong>
                      {r.model === "Transporter" ||
                      !farm.unlocks.includes("tank")
                        ? "Non équipé"
                        : `${r.water.toFixed(1)} / 10`}
                    </strong>
                  </div>
                </div>
                <p className="fleet-position">
                  {r.destroyed
                    ? "Carcasse en"
                    : r.deployed
                      ? "Position"
                      : "Dernière position"}{" "}
                  ({r.x}, {r.y})
                  {r.moving ? ` → (${r.moving.x}, ${r.moving.y})` : ""}
                  {r.reservation
                    ? ` · Case réservée jusqu’à ${Math.max(0, r.reservation.expires - farm.time).toFixed(1)} s`
                    : ""}
                </p>
                <div className="fleet-inventory">
                  {Object.entries(r.inventory)
                    .filter(([, n]) => n && n > 0)
                    .map(([item, n]) => (
                      <span key={item}>
                        {n} {itemNames[item as Item]}
                      </span>
                    ))}
                  {!cargo && <span>Soute vide</span>}
                  {cargo >= max && (
                    <span className="full-cargo">Soute pleine</span>
                  )}
                </div>
                <div className="fleet-capabilities">
                  {robotCapabilities(farm, r).map((a) => (
                    <span
                      key={a.name}
                      className={a.enabled ? "enabled" : "locked"}
                      title={
                        a.enabled
                          ? "Disponible pour ce modèle"
                          : "Recherche ou équipement requis"
                      }
                    >
                      {a.enabled ? "✓" : "·"} {a.name}
                    </span>
                  ))}
                </div>
                {r.lastError && <p className="robot-error">{r.lastError}</p>}
                <button
                  disabled={
                    r.destroyed ||
                    r.loan ||
                    !farm.buildings.some((b) => b.kind === "Workshop")
                  }
                  onClick={() => onAction({ type: "workshop", id: r.id })}
                >
                  Améliorer {r.id} à l’atelier
                </button>
                <div className="fleet-card-actions">
                  {r.destroyed ? (
                    <button
                      disabled={
                        !farm.buildings.some((b) => b.kind === "Workshop") ||
                        farm.gold < models[r.model].price * 0.4
                      }
                      onClick={() =>
                        act(
                          { type: "repair", id: r.id },
                          "Robot reconstruit et déployé.",
                        )
                      }
                    >
                      Reconstruire · {models[r.model].price * 0.4} or
                    </button>
                  ) : (
                    <>
                      <button
                        className="fleet-primary"
                        onClick={() => onAction({ type: "select", id: r.id })}
                      >
                        Programmer {r.id}
                      </button>
                      {runtimes[r.id] && (
                        <button
                          onClick={() =>
                            act({ type: "stop", id: r.id }, "Programme arrêté.")
                          }
                        >
                          Arrêter {r.id}
                        </button>
                      )}
                      {r.deployed ? (
                        <button
                          disabled={!!recall}
                          title={
                            recall ??
                            "Code et cargaison conservés ; le programme sera arrêté."
                          }
                          onClick={() =>
                            act(
                              { type: "recall", id: r.id },
                              `${r.id} rappelé au garage. Code et cargaison conservés.`,
                            )
                          }
                        >
                          Rappeler {r.id}
                        </button>
                      ) : (
                        <button
                          className="fleet-primary"
                          disabled={!position}
                          title={
                            position
                              ? `Déployer sur (${position.x}, ${position.y})`
                              : "Aucune case libre compatible. Libérez ou étendez le terrain."
                          }
                          onClick={() =>
                            act(
                              { type: "deploy", id: r.id },
                              `${r.id} déployé. Son programme reste à lancer.`,
                            )
                          }
                        >
                          Déployer {r.id}
                          {position ? ` · (${position.x}, ${position.y})` : ""}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
          {!visible.length && (
            <p className="fleet-empty">
              Aucun robot ne correspond à ce filtre.
            </p>
          )}
        </div>
        <footer className="fleet-footer">
          <span role="status">
            {message ||
              "Au garage, un robot conserve son code et sa cargaison, mais n’exécute aucune action et ne bloque aucune case."}
          </span>
          <span>
            Les équipements individuels s’installent dans un atelier construit.
          </span>
        </footer>
      </>
    </div>
  );
}
