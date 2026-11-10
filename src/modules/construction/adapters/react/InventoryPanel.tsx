import { useState } from "react";
import {
  placedSites,
  slotCount,
  siteCandidates,
  siteBlocker,
  storeBuildingBlocker,
  buildingPlacementBlocker,
  robotPlacementBlocker,
  recallBlocker,
  type Farm,
  type Site,
} from "../../../farm/application/engine";
import { buildings } from "../../domain/catalog";
import { models } from "../../../robots/domain/catalog";
import { ProductArt } from "../../../../shared/adapters/react/ProductArt";
export type InventoryAction =
  | { type: "pause" }
  | { type: "site-add" | "site-remove"; site: Site }
  | { type: "place-building" | "place-robot"; id: string; site: Site }
  | { type: "store-building" | "store-robot"; id: string };
export function InventoryPanel({
  farm,
  paused,
  onPause,
  onAction,
  onShop,
}: {
  farm: Farm;
  paused: boolean;
  onPause: () => void;
  onAction: (action: InventoryAction) => { ok: boolean; message: string };
  onShop: () => void;
}) {
  const [tab, setTab] = useState<"buildings" | "robots">("buildings"),
    [plan, setPlan] = useState(false),
    [selection, setSelection] = useState<{
      type: "building" | "robot";
      id: string;
    } | null>(null),
    [cell, setCell] = useState<Site | null>(null),
    [notice, setNotice] = useState("");
  const sites = placedSites(farm),
    robots = farm.robots.filter((r) => !r.destroyed && !r.deployed);
  const act = (action: InventoryAction) => {
    const result = onAction(action);
    setNotice(result.message);
    return result.ok;
  };
  const edit = () => {
    if (!paused) act({ type: "pause" });
    setPlan(true);
  };
  const begin = (type: "building" | "robot", id: string) => {
    edit();
    setSelection({ type, id });
    setCell(null);
  };
  const occupied = cell
    ? farm.buildings.find((b) => b.x === cell.x && b.y === cell.y)
    : undefined;
  const occupant = cell
    ? farm.robots.find(
        (r) => r.deployed && !r.destroyed && r.x === cell.x && r.y === cell.y,
      )
    : undefined;
  const isSite = !!cell && sites.some((p) => p.x === cell.x && p.y === cell.y);
  const placing =
    cell && selection
      ? selection.type === "building"
        ? buildingPlacementBlocker(farm, selection.id, cell)
        : robotPlacementBlocker(farm, selection.id, cell)
      : null;
  const selectedName =
    selection?.type === "building"
      ? buildings[
          farm.storedBuildings.find((b) => b.id === selection.id)?.kind ??
            "Depot"
        ].name
      : selection?.id;
  return (
    <div className="inventory-panel">
      <header className="inventory-heading">
        <div>
          <span className="overline">VOS ÉQUIPEMENTS, À VOTRE MAIN</span>
          <h2>Inventaire & construction</h2>
          <p>
            Rangez vos équipements, choisissez leur emplacement et aménagez vos
            blocs de béton.
          </p>
        </div>
        <div>
          <button onClick={onShop}>Acheter au magasin ↗</button>
          <button onClick={edit}>Aménager les terrains</button>
          <button onClick={onPause}>
            {paused
              ? "Reprendre la simulation"
              : "Mettre la simulation en pause"}
          </button>
        </div>
      </header>
      <nav className="inventory-tabs" aria-label="Catégories de l’inventaire">
        <button
          className={!plan && tab === "buildings" ? "selected" : ""}
          onClick={() => {
            setPlan(false);
            setTab("buildings");
          }}
        >
          Bâtiments <small>{farm.storedBuildings.length}</small>
        </button>
        <button
          className={!plan && tab === "robots" ? "selected" : ""}
          onClick={() => {
            setPlan(false);
            setTab("robots");
          }}
        >
          Robots <small>{robots.length}</small>
        </button>
      </nav>
      <div className="inventory-body">
        {!plan ? (
          <>
            <p className="inventory-intro">
              {tab === "buildings"
                ? "Bâtiments possédés mais non installés. Un bâtiment rangé ne produit rien et n’ajoute aucune capacité de stockage."
                : "Robots au garage. Leur programme, leur cargaison et leurs équipements sont conservés ; leur programme se relance manuellement après déploiement."}
            </p>
            <div className="inventory-cards">
              {tab === "buildings"
                ? farm.storedBuildings.map((b) => (
                    <article data-asset={b.id} key={b.id}>
                      <ProductArt kind={b.kind} />
                      <div>
                        <span className="overline">NON POSÉ · {b.id}</span>
                        <h3>{buildings[b.kind].name}</h3>
                        <p>{buildings[b.kind].description}</p>
                        <button onClick={() => begin("building", b.id)}>
                          Placer {b.id}
                        </button>
                      </div>
                    </article>
                  ))
                : robots.map((r) => (
                    <article data-asset={r.id} key={r.id}>
                      <ProductArt kind={r.model} />
                      <div>
                        <span className="overline">AU GARAGE · {r.id}</span>
                        <h3>{models[r.model].name}</h3>
                        <p>{models[r.model].description}</p>
                        <button onClick={() => begin("robot", r.id)}>
                          Déployer {r.id}
                        </button>
                      </div>
                    </article>
                  ))}
            </div>
            {!(tab === "buildings"
              ? farm.storedBuildings.length
              : robots.length) && (
              <div className="inventory-empty">
                <h3>
                  {tab === "buildings"
                    ? "Aucun bâtiment en attente."
                    : "Aucun robot au garage."}
                </h3>
                <p>
                  Achetez un équipement avec la livraison « Dans l’inventaire »,
                  ou rangez un équipement déjà posé depuis le plan.
                </p>
                <button onClick={edit}>Ouvrir le plan de construction →</button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="construction-summary">
              <span>
                <strong>
                  {sites.length} / {slotCount(farm)}
                </strong>{" "}
                terrains posés · {Math.max(0, slotCount(farm) - sites.length)}{" "}
                disponibles
              </span>
              <span>
                {paused
                  ? "Simulation en pause · Aménagement autorisé"
                  : "Mettez en pause pour modifier le terrain."}
              </span>
            </div>
            <p className="inventory-intro">
              {selection
                ? `Sélectionnez une case pour placer ${selectedName} (${selection.id}).`
                : "Sélectionnez une case du pourtour pour poser ou retirer un bloc. Cliquez sur un bâtiment pour le ranger ou le déplacer."}{" "}
              Les terrains restent hors des futures parcelles agricoles et
              doivent toucher la ferme ou un autre bloc.
            </p>
            <div className="construction-layout">
              <div
                className="construction-scroll"
                tabIndex={0}
                aria-label="Plan de construction, défilement horizontal"
              >
                <div className="construction-grid">
                  {Array.from({ length: 81 }, (_, i) => {
                    const p = { x: (i % 9) - 1, y: Math.floor(i / 9) - 1 };
                    const site = sites.some((c) => c.x === p.x && c.y === p.y),
                      ag =
                        p.x >= 0 &&
                        p.y >= 0 &&
                        p.x < farm.width &&
                        p.y < farm.height,
                      b = farm.buildings.find(
                        (b) => b.x === p.x && b.y === p.y,
                      ),
                      r = farm.robots.find(
                        (r) =>
                          r.deployed &&
                          !r.destroyed &&
                          r.x === p.x &&
                          r.y === p.y,
                      ),
                      candidate = siteCandidates.some(
                        (c) => c.x === p.x && c.y === p.y,
                      ),
                      chosen = cell?.x === p.x && cell?.y === p.y;
                    return (
                      <button
                        key={i}
                        data-cell={`${p.x},${p.y}`}
                        disabled={!ag && !site && !candidate}
                        aria-label={`Case ${p.x}, ${p.y} : ${b ? buildings[b.kind].name : site ? "Béton" : ag ? "Parcelle agricole" : candidate ? "Terrain possible" : "Zone agricole future"}`}
                        aria-pressed={chosen}
                        className={
                          "construction-cell " +
                          (ag
                            ? "agriculture"
                            : site
                              ? "concrete"
                              : candidate
                                ? "candidate"
                                : "future") +
                          (chosen ? " selected" : "")
                        }
                        onClick={() => setCell(p)}
                      >
                        <span>
                          {b
                            ? buildings[b.kind].name
                            : r
                              ? r.id
                              : site
                                ? "Béton"
                                : ag
                                  ? "Culture"
                                  : candidate
                                    ? "+"
                                    : "·"}
                        </span>
                        <small>
                          {p.x}, {p.y}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
              <aside className="construction-detail">
                <span className="overline">EMPLACEMENT SÉLECTIONNÉ</span>
                <h3>
                  {cell ? `(${cell.x}, ${cell.y})` : "Choisissez une case"}
                </h3>
                {selection && (
                  <>
                    <p>
                      À poser : {selectedName} · {selection.id}
                    </p>
                    <button onClick={() => setSelection(null)}>
                      Annuler la pose
                    </button>
                  </>
                )}
                {cell && (
                  <>
                    {selection ? (
                      <>
                        {!isSite &&
                          siteCandidates.some(
                            (p) => p.x === cell.x && p.y === cell.y,
                          ) && (
                            <button
                              disabled={!paused || !!siteBlocker(farm, cell)}
                              onClick={() =>
                                act({ type: "site-add", site: cell })
                              }
                            >
                              Poser un terrain en béton
                            </button>
                          )}
                        <button
                          disabled={!paused || !!placing}
                          onClick={() => {
                            if (
                              act({
                                type:
                                  selection.type === "building"
                                    ? "place-building"
                                    : "place-robot",
                                id: selection.id,
                                site: cell,
                              })
                            )
                              setSelection(null);
                          }}
                        >
                          Poser {selection.id} ici
                        </button>
                        {placing && (
                          <p className="construction-blocker">{placing}</p>
                        )}
                      </>
                    ) : (
                      <>
                        {occupied ? (
                          <>
                            <h4>
                              {buildings[occupied.kind].name} · {occupied.id}
                            </h4>
                            <p>
                              {storeBuildingBlocker(farm, occupied.id) ??
                                "Le bâtiment est vide et peut être rangé ou déplacé."}
                            </p>
                            <button
                              disabled={
                                !paused ||
                                !!storeBuildingBlocker(farm, occupied.id)
                              }
                              onClick={() =>
                                act({ type: "store-building", id: occupied.id })
                              }
                            >
                              Ranger {occupied.id} dans l’inventaire
                            </button>
                            <button
                              disabled={
                                !paused ||
                                !!storeBuildingBlocker(farm, occupied.id)
                              }
                              onClick={() => {
                                if (
                                  act({
                                    type: "store-building",
                                    id: occupied.id,
                                  })
                                )
                                  setSelection({
                                    type: "building",
                                    id: occupied.id,
                                  });
                              }}
                            >
                              Déplacer {occupied.id}
                            </button>
                          </>
                        ) : (
                          <>
                            {isSite ? (
                              <>
                                <button
                                  disabled={
                                    !paused || !!siteBlocker(farm, cell, true)
                                  }
                                  onClick={() =>
                                    act({ type: "site-remove", site: cell })
                                  }
                                >
                                  Retirer ce terrain
                                </button>
                                <p>
                                  {siteBlocker(farm, cell, true) ??
                                    "Le terrain retourne dans vos emplacements disponibles."}
                                </p>
                                {farm.storedBuildings.length > 0 && (
                                  <label>
                                    Installer un bâtiment
                                    <select
                                      aria-label="Bâtiment à installer"
                                      value=""
                                      onChange={(e) =>
                                        setSelection({
                                          type: "building",
                                          id: e.target.value,
                                        })
                                      }
                                    >
                                      <option value="" disabled>
                                        Choisir dans l’inventaire…
                                      </option>
                                      {farm.storedBuildings.map((b) => (
                                        <option value={b.id} key={b.id}>
                                          {buildings[b.kind].name} · {b.id}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  disabled={
                                    !paused || !!siteBlocker(farm, cell)
                                  }
                                  onClick={() =>
                                    act({ type: "site-add", site: cell })
                                  }
                                >
                                  Poser un terrain en béton
                                </button>
                                <p>
                                  {siteBlocker(farm, cell) ??
                                    "Un emplacement débloqué sera utilisé, sans frais supplémentaires."}
                                </p>
                              </>
                            )}
                          </>
                        )}
                        {occupant && (
                          <>
                            <p>Robot : {occupant.id}</p>
                            <button
                              disabled={!!recallBlocker(farm, occupant.id)}
                              onClick={() =>
                                act({ type: "store-robot", id: occupant.id })
                              }
                            >
                              Ranger {occupant.id} au garage
                            </button>
                            <small>{recallBlocker(farm, occupant.id)}</small>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </aside>
            </div>
            <p className="inventory-intro">
              Un bâtiment contenant des ressources, de l’eau ou un cycle ne peut
              pas être retiré. Un terrain occupé ou servant de liaison doit être
              libéré avant son retrait. Débloquez davantage d’emplacements dans
              Recherches → Technologie.
            </p>
          </>
        )}
      </div>
      <footer role="status" className="inventory-footer">
        {notice ||
          "Les équipements rangés restent votre propriété. Pose, retrait et choix des terrains sont conservés dans votre sauvegarde."}
      </footer>
    </div>
  );
}
