import { useEffect, useRef, useState } from "react";
import {
  research,
  researchBlocker,
  getStock,
  stockCapacity,
  type Farm,
} from "./engine";
import { formatResearchCost, type Item } from "./catalog";
import { Icon, ResourceIcon } from "./Icons";
import { robotTrees } from "./robotTrees";
import {
  researchTrees as trees,
  type ResearchNode as Node,
  type ResearchTree as Tree,
} from "./researchTrees";
import { sum } from "./catalog";
function isAcquired(node: Node, farm: Farm) {
  return (
    !!node.base || (!!node.research && farm.unlocks.includes(node.research))
  );
}
export function SkillTree({
  farm,
  onBuy,
  onSell,
  focus,
}: {
  farm: Farm;
  onBuy: (id: string) => void;
  onSell: () => void;
  focus?: "robots";
}) {
  const [page, setPage] = useState(
      focus !== "robots" &&
        farm.progressionVersion === 2 &&
        !farm.unlocks.includes("loops")
        ? 1
        : 0,
    ),
    [selected, setSelected] = useState(
      farm.progressionVersion === 2 && !farm.unlocks.includes("loops")
        ? "loops"
        : "grass-base",
    );
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = Math.max(0, (740 - el.clientWidth) / 2);
      el.scrollTop = 0;
    }
  }, [page]);
  const pages: Tree[] = focus === "robots" ? robotTrees : trees;
  const tree = pages[page],
    node = tree.nodes.find((n) => n.id === selected) ?? tree.nodes[0];
  useEffect(() => {
    const el = scrollRef.current;
    if (el)
      el.scrollTo({
        left: Math.max(0, node.x - (el.clientWidth - 114) / 2),
        top: Math.max(0, node.y - (el.clientHeight - 114) / 2),
      });
  }, [page, selected]);
  const researchItem = research.find((r) => r.id === node.research);
  const acquired = isAcquired(node, farm),
    future = !node.base && !node.research;
  const blocker = node.research ? researchBlocker(farm, node.research) : null;
  const prerequisiteMissing = !!blocker?.startsWith("Requis");
  const affordable =
    !!researchItem &&
    farm.gold >= (researchItem.goldCost ?? 0) &&
    Object.entries(researchItem.materials).every(
      ([i, n]) => getStock(farm, i as Item) >= n,
    );
  const visitResearch = (id: string) => {
    const pageIndex = pages.findIndex((p) =>
      p.nodes.some((n) => n.research === id),
    );
    if (pageIndex >= 0) {
      setPage(pageIndex);
      setSelected(id);
    }
  };
  const changePage = (index: number) => {
    setPage(index);
    setSelected(pages[index].nodes[0].id);
  };
  return (
    <div
      className={"skill-pages " + (focus === "robots" ? "robot-skills" : "")}
    >
      <header className="skill-header">
        <div>
          <span className="overline">FAITES GRANDIR VOTRE POTENTIEL</span>
          <h2>
            {focus === "robots"
              ? "Améliorations de la flotte"
              : "Arbres de compétences"}
          </h2>
        </div>
        <div className="skill-stock">
          <ResourceIcon kind="hay" />
          <div>
            <strong>
              {getStock(farm, "Hay")}
              <small> / {stockCapacity(farm)}</small>
            </strong>
            <span>foins disponibles</span>
          </div>
        </div>
      </header>
      <nav className="skill-tabs" aria-label="Arbres de compétences">
        {pages.map((t, i) => (
          <button
            key={t.name}
            className={i === page ? "selected" : ""}
            aria-current={i === page ? "page" : undefined}
            onClick={() => changePage(i)}
          >
            <span>0{i + 1}</span>
            {t.name}
            <small>
              {t.nodes.filter((n) => isAcquired(n, farm)).length} /{" "}
              {t.nodes.length}
            </small>
          </button>
        ))}
      </nav>
      <div className="skill-layout">
        <div className="skill-map-section">
          <div className="skill-map-heading">
            <span>{tree.caption}</span>
            <span className="skill-legend">
              <i /> Acquis <i /> À rechercher <i /> À venir
            </span>
          </div>
          <div
            className="skill-scroll"
            ref={scrollRef}
            key={page}
            tabIndex={0}
            aria-label={`Arbre ${tree.name}, défilement horizontal et vertical`}
          >
            <div
              className="skill-map"
              style={{ height: Math.max(...tree.nodes.map((n) => n.y)) + 150 }}
            >
              <svg
                className="skill-links"
                width="740"
                height="100%"
                aria-hidden="true"
              >
                {tree.nodes.flatMap((n) =>
                  n.parents.map((id) => {
                    const parent = tree.nodes.find((p) => p.id === id)!;
                    const x = parent.x + 57,
                      y = parent.y + 92,
                      cx = n.x + 57,
                      cy = n.y;
                    const mid = y + (cy - y) / 2;
                    return (
                      <path
                        key={id + "-" + n.id}
                        d={`M${x} ${y}V${mid}H${cx}V${cy}`}
                        className={isAcquired(parent, farm) ? "unlocked" : ""}
                      />
                    );
                  }),
                )}
              </svg>
              {tree.nodes.map((n) => {
                const owned = isAcquired(n, farm),
                  r = research.find((r) => r.id === n.research),
                  planned = !n.base && !n.research,
                  locked =
                    !owned &&
                    !!r &&
                    r.prerequisites.some(
                      (id) =>
                        !farm.unlocks.includes(id) &&
                        !(id === "extension" && farm.width >= 3),
                    );
                return (
                  <button
                    key={n.id}
                    data-skill={n.id}
                    className={
                      "skill-node " +
                      (owned
                        ? "acquired "
                        : planned
                          ? "planned "
                          : locked
                            ? "locked "
                            : "available ") +
                      (n.id === node.id ? "chosen" : "")
                    }
                    style={{ left: n.x, top: n.y }}
                    aria-pressed={n.id === node.id}
                    aria-label={`${n.title} · ${owned ? "Acquis" : planned ? "À venir" : r ? formatResearchCost(r) : ""}`}
                    onClick={() => setSelected(n.id)}
                  >
                    <div className="node-art">
                      {n.art ? (
                        <ResourceIcon kind={n.art} />
                      ) : (
                        <code>{n.symbol}</code>
                      )}
                      {(planned || locked) && (
                        <svg
                          className="node-lock"
                          width="12"
                          height="14"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v12H5Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="node-title">{n.title}</span>
                    <span className="node-status">
                      {owned
                        ? "✓ Acquis"
                        : planned
                          ? "À venir"
                          : `${r ? formatResearchCost(r) : ""}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="skill-detail" aria-label="Détail de la compétence">
          <span className="overline">
            {tree.name.toUpperCase()} /{" "}
            {acquired ? "ACQUIS" : future ? "BRANCHE À VENIR" : "RECHERCHE"}
          </span>
          <div className="detail-art">
            {node.art ? (
              <ResourceIcon kind={node.art} />
            ) : (
              <code>{node.symbol}</code>
            )}
          </div>
          <h3>{node.title}</h3>
          <p>{node.detail}</p>
          {node.prerequisite && !researchItem && (
            <div
              className={
                "skill-prerequisite " + (prerequisiteMissing ? "missing" : "")
              }
            >
              <span>PRÉREQUIS</span>
              {node.prerequisite}
            </div>
          )}
          {researchItem && (
            <div className="research-requirements">
              <span>PRÉREQUIS RÉELS</span>
              {researchItem.prerequisites.length ? (
                researchItem.prerequisites.map((id) => {
                  const requirement = research.find((r) => r.id === id)!;
                  const known =
                    farm.unlocks.includes(id) ||
                    (id === "extension" && farm.width >= 3);
                  const available = pages.some((p) =>
                    p.nodes.some((n) => n.research === id),
                  );
                  return (
                    <button
                      key={id}
                      aria-label={`Voir le prérequis ${requirement.name}`}
                      disabled={!available}
                      onClick={() => visitResearch(id)}
                      className={known ? "met" : "missing"}
                    >
                      {known ? "✓" : "◇"} {requirement.name}{" "}
                      <small>{requirement.category}</small>
                    </button>
                  );
                })
              ) : (
                <small>Aucune recherche préalable.</small>
              )}
              <p
                className={
                  sum(researchItem.materials) > stockCapacity(farm)
                    ? "capacity-warning"
                    : ""
                }
              >
                Coût total : {sum(researchItem.materials)} unités · Capacité
                actuelle : {stockCapacity(farm)}
              </p>
            </div>
          )}
          <div className="skill-price">
            <span>COÛT</span>
            <strong>
              {node.base
                ? "Gratuit"
                : researchItem
                  ? formatResearchCost(researchItem)
                  : node.cost}
            </strong>
          </div>
          <button
            className="purchase-skill"
            disabled={acquired || future || !!blocker || !affordable}
            onClick={() => node.research && onBuy(node.research)}
          >
            {acquired
              ? "✓ Compétence acquise"
              : future
                ? "Disponible ultérieurement"
                : prerequisiteMissing
                  ? node.research === "position"
                    ? "Débloquez les prérequis"
                    : "Prérequis manquants"
                  : !affordable
                    ? researchItem?.goldCost
                      ? "Or insuffisant"
                      : "Matériaux insuffisants"
                    : "Rechercher · " +
                      (researchItem ? formatResearchCost(researchItem) : "")}
          </button>
          {(blocker?.startsWith("Capacité") ||
            blocker?.startsWith("Or insuffisant")) && (
            <p className="capacity-warning" role="status">
              {blocker}
            </p>
          )}
          {future && (
            <small className="planned-note">
              Aucun achat possible pour cette branche pour le moment.
            </small>
          )}
          {!focus && (
            <>
              <div className="skill-trade">
                <span>◈ {farm.gold} or</span>
                <button
                  disabled={getStock(farm, "Hay") < 10 && farm.stock < 10}
                  onClick={onSell}
                >
                  Vendre 10 {getStock(farm, "Hay") >= 10 ? "foins" : "blés"} ·
                  +10 or
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
      <footer className="skill-pagination">
        <button disabled={page === 0} onClick={() => changePage(page - 1)}>
          ← Page précédente
        </button>
        <span>
          0{page + 1} <small>/ {String(pages.length).padStart(2, "0")}</small>
        </span>
        <button
          disabled={page === pages.length - 1}
          onClick={() => changePage(page + 1)}
        >
          Page suivante →
        </button>
      </footer>
    </div>
  );
}
