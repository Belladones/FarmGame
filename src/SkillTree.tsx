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
  groupProgress,
  researchGroupFor,
  hasResearchLevel,
} from "./researchGroups";
import {
  researchTrees as trees,
  type ResearchNode as Node,
  type ResearchTree as Tree,
} from "./researchTrees";
import { sum } from "./catalog";
function progressOf(node: Node, farm: Farm) {
  return node.group ? groupProgress(node.group, farm.unlocks) : undefined;
}
function nextResearch(node: Node, farm: Farm) {
  return node.group
    ? progressOf(node, farm)!.next
    : research.find((r) => r.id === node.research);
}
function isAcquired(node: Node, farm: Farm) {
  const progress = progressOf(node, farm);
  return progress
    ? progress.level === progress.max
    : !!node.base ||
        (!!node.research && hasResearchLevel(farm.unlocks, node.research));
}
function isLearned(node: Node, farm: Farm) {
  return (progressOf(node, farm)?.level ?? 0) > 0 || isAcquired(node, farm);
}
function containsResearch(node: Node, id: string) {
  return node.research === id || !!node.group?.steps.includes(id);
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
  const [requirementTarget, setRequirementTarget] = useState<string | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const progress = progressOf(node, farm);
  const researchItem = nextResearch(node, farm);
  const acquired = isAcquired(node, farm),
    future = !node.base && !node.research && !node.group;
  const blocker = researchItem ? researchBlocker(farm, researchItem.id) : null;
  const prerequisiteMissing = !!blocker?.startsWith("Requis");
  const affordable =
    !!researchItem &&
    farm.gold >= (researchItem.goldCost ?? 0) &&
    Object.entries(researchItem.materials).every(
      ([i, n]) => getStock(farm, i as Item) >= n,
    );
  const visitResearch = (id: string) => {
    const pageIndex = pages.findIndex((p) =>
      p.nodes.some((n) => containsResearch(n, id)),
    );
    if (pageIndex >= 0) {
      setPage(pageIndex);
      setSelected(researchGroupFor(id)?.id ?? id);
      setRequirementTarget(id);
    }
  };
  const changePage = (index: number) => {
    setPage(index);
    setRequirementTarget(null);
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
              {t.nodes.filter((n) => isLearned(n, farm)).length} /{" "}
              {t.nodes.length}
            </small>
          </button>
        ))}
      </nav>
      <div className="skill-layout">
        <div className="skill-map-section">
          <div className="skill-map-heading">
            <span>
              {tree.caption} Branches par thème · prérequis complets dans le
              détail.
            </span>
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
              style={{
                width: tree.width,
                height: Math.max(...tree.nodes.map((n) => n.y)) + 150,
              }}
            >
              <svg
                className="skill-links"
                width={tree.width}
                height="100%"
                aria-hidden="true"
              >
                {tree.nodes
                  .filter((n) => n.branchParent)
                  .map((n) => {
                    const previous = tree.nodes.find(
                      (p) => p.id === n.branchParent,
                    )!;
                    return (
                      <path
                        key={`${previous.id}-${n.id}`}
                        d={`M${previous.x + 57} ${previous.y + 92}V${previous.y + 130}H${n.x + 57}V${n.y}`}
                        className={isLearned(n, farm) ? "unlocked" : ""}
                      />
                    );
                  })}
              </svg>
              {tree.nodes.map((n) => {
                const owned = isAcquired(n, farm),
                  r = nextResearch(n, farm),
                  level = progressOf(n, farm),
                  planned = !n.base && !n.research && !n.group,
                  locked =
                    !owned &&
                    !!r &&
                    r.prerequisites.some(
                      (id) =>
                        !hasResearchLevel(farm.unlocks, id) &&
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
                    aria-label={`${n.title}${level ? ` · ${level.level} / ${level.max}` : ""} · ${owned ? (level ? "Niveau maximum" : "Acquis") : planned ? "À venir" : r ? formatResearchCost(r) : ""}`}
                    onClick={() => {
                      setSelected(n.id);
                      setRequirementTarget(null);
                    }}
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
                    {level && (
                      <span
                        className="node-level"
                        aria-label={`Niveau ${level.level} sur ${level.max}`}
                      >
                        {level.level} / {level.max}
                      </span>
                    )}
                    <span className="node-title">{n.title}</span>
                    <span className="node-status">
                      {owned
                        ? level
                          ? "✓ Maximum"
                          : "✓ Acquis"
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
            {acquired
              ? progress
                ? "NIVEAU MAXIMUM"
                : "ACQUIS"
              : future
                ? "BRANCHE À VENIR"
                : "RECHERCHE"}
          </span>
          <div className="detail-art">
            {node.art ? (
              <ResourceIcon kind={node.art} />
            ) : (
              <code>{node.symbol}</code>
            )}
          </div>
          <h3>{node.title}</h3>
          {progress && (
            <div className="research-level-detail">
              <strong>
                Niveau {progress.level} / {progress.max}
              </strong>
              <progress
                aria-label={`Progression ${node.title}`}
                value={progress.level}
                max={progress.max}
              />
              {progress.current && (
                <p>Effet acquis : {progress.current.detail}</p>
              )}
              {progress.next && (
                <span>
                  Prochain niveau : {progress.level + 1} / {progress.max}
                </span>
              )}
            </div>
          )}
          {requirementTarget &&
            !hasResearchLevel(farm.unlocks, requirementTarget) &&
            researchItem?.id !== requirementTarget && (
              <p className="capacity-warning">
                Prérequis à atteindre :{" "}
                {research.find((r) => r.id === requirementTarget)?.name}
              </p>
            )}
          {(!progress?.current || researchItem) && (
            <p>{researchItem?.detail ?? node.detail}</p>
          )}
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
              <span>
                {progress ? "PRÉREQUIS DU PROCHAIN NIVEAU" : "PRÉREQUIS RÉELS"}
              </span>
              {researchItem.prerequisites.length ? (
                researchItem.prerequisites.map((id) => {
                  const requirement = research.find((r) => r.id === id)!;
                  const known =
                    hasResearchLevel(farm.unlocks, id) ||
                    (id === "extension" && farm.width >= 3);
                  const available = pages.some((p) =>
                    p.nodes.some((n) => containsResearch(n, id)),
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
              {acquired && progress
                ? "Niveau maximum atteint"
                : researchItem
                  ? formatResearchCost(researchItem)
                  : node.base
                    ? "Gratuit"
                    : node.cost}
            </strong>
          </div>
          <button
            className="purchase-skill"
            disabled={acquired || future || !!blocker || !affordable}
            onClick={() => researchItem && onBuy(researchItem.id)}
          >
            {acquired
              ? progress
                ? "✓ Niveau maximum atteint"
                : "✓ Compétence acquise"
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
