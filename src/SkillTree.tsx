import { useEffect, useRef, useState } from "react";
import { research, type Farm } from "./engine";
import { Icon, ResourceIcon } from "./Icons";
type Branch = "Agriculture" | "Programmation" | "Technologie";
type Art = "wheat" | "wood" | "carrot" | "water";
interface Node {
  id: string;
  title: string;
  symbol?: string;
  art?: Art;
  x: number;
  y: number;
  parents: string[];
  research?: string;
  base?: boolean;
  detail: string;
  cost?: string;
  prerequisite?: string;
}
interface Tree {
  name: Branch;
  caption: string;
  nodes: Node[];
}
// Roadmap entries remain informational: they cannot consume resources or grant abilities.
const trees: Tree[] = [
  {
    name: "Agriculture",
    caption: "De la première graine à une exploitation florissante.",
    nodes: [
      {
        id: "wheat-base",
        title: "Blé · niveau 1",
        art: "wheat",
        x: 315,
        y: 25,
        parents: [],
        base: true,
        detail:
          "La première culture de votre ferme. Plantation gratuite, pousse en 5 secondes, rendement de 1 blé.",
      },
      {
        id: "wheat",
        title: "Blé · niveau 2",
        art: "wheat",
        x: 180,
        y: 190,
        parents: ["wheat-base"],
        research: "wheat",
        detail:
          "Les nouvelles plantations produisent 5 blés. Les cultures déjà plantées conservent leur rendement.",
      },
      {
        id: "extension",
        title: "Trois parcelles",
        symbol: "3 × 1",
        x: 455,
        y: 190,
        parents: ["wheat-base"],
        research: "extension",
        detail:
          "Ajoute deux cases carrées à droite de la première. Vos cultures et leurs coordonnées sont conservées.",
      },
      {
        id: "bush",
        title: "Buisson",
        art: "wood",
        x: 180,
        y: 355,
        parents: ["wheat"],
        cost: "40 blés",
        prerequisite: "Blé · niveau 2",
        detail:
          "Culture gratuite produisant du bois, sans contrainte d’espacement. Cette culture n’est pas encore implémentée.",
      },
      {
        id: "extension3",
        title: "Neuf parcelles",
        symbol: "3 × 3",
        x: 455,
        y: 355,
        parents: ["extension"],
        cost: "150 blés + 50 bois",
        prerequisite: "Trois parcelles",
        detail:
          "Étend la ferme à un carré de neuf parcelles. Cette extension sera disponible avec la production de bois.",
      },
      {
        id: "carrot",
        title: "Carotte",
        art: "carrot",
        x: 45,
        y: 520,
        parents: ["bush"],
        cost: "60 blés + 30 bois",
        prerequisite: "Buisson + Labourage (Technologie)",
        detail:
          "Culture sur terre labourée. Une plantation coûte 2 blés et 1 bois, prélevés dans la soute du robot.",
      },
      {
        id: "tree",
        title: "Arbre",
        art: "wood",
        x: 315,
        y: 520,
        parents: ["bush"],
        cost: "80 blés + 40 bois",
        prerequisite: "Buisson",
        detail:
          "Produit du bois. Les arbres voisins ralentiront sa croissance : apprenez à organiser vos plantations.",
      },
      {
        id: "pumpkin",
        title: "Citrouille",
        symbol: "◈",
        x: 45,
        y: 685,
        parents: ["carrot"],
        cost: "1 000 blés + 500 bois + 300 carottes",
        prerequisite: "Carotte · niveau 2",
        detail: "Culture avancée avec un futur bonus de récolte groupée.",
      },
    ],
  },
  {
    name: "Programmation",
    caption: "Apprenez à penser en code, une notion à la fois.",
    nodes: [
      {
        id: "bases",
        title: "Les bases",
        symbol: "while",
        x: 315,
        y: 25,
        parents: [],
        base: true,
        detail:
          "Appels aux commandes, constantes du jeu et boucles while : tout le nécessaire pour votre première routine.",
      },
      {
        id: "conditions",
        title: "Conditions",
        symbol: "if / else",
        x: 110,
        y: 190,
        parents: ["bases"],
        research: "conditions",
        detail:
          "Exécutez une action seulement quand une condition est vraie. Associez if au capteur de maturité pour récolter au bon moment.",
      },
      {
        id: "print",
        title: "Affichage",
        symbol: "print()",
        x: 315,
        y: 190,
        parents: ["bases"],
        research: "print",
        detail:
          "Écrivez vos propres messages dans le journal du robot pour comprendre ce que fait votre programme.",
      },
      {
        id: "variables",
        title: "Variables et types",
        symbol: "const : number",
        x: 520,
        y: 190,
        parents: ["bases"],
        cost: "25 blés",
        prerequisite: "Les bases",
        detail:
          "Mémorisez une valeur et découvrez number, boolean et string. La recherche de progression est à venir ; ces syntaxes restent libres dans le prototype.",
      },
      {
        id: "loops",
        title: "Boucles comptées",
        symbol: "for (...)",
        x: 110,
        y: 385,
        parents: ["conditions", "variables"],
        cost: "75 blés + 20 bois",
        prerequisite: "Variables et types + Conditions",
        detail:
          "Parcourez des cases avec un compteur. Le déblocage pédagogique est à venir ; for est déjà utilisable librement.",
      },
      {
        id: "functions",
        title: "Fonctions",
        symbol: "function f()",
        x: 520,
        y: 385,
        parents: ["conditions", "variables"],
        cost: "150 blés + 50 bois",
        prerequisite: "Variables et types + Conditions",
        detail:
          "Organisez vos routines en fonctions nommées. La recherche est prévue ; les fonctions nommées sont déjà utilisables dans ce prototype.",
      },
      {
        id: "lists",
        title: "Listes",
        symbol: "[1, 2, 3]",
        x: 315,
        y: 575,
        parents: ["loops", "functions"],
        cost: "600 blés + 200 bois + 100 carottes",
        prerequisite: "Fonctions + Boucles comptées + Mesure",
        detail:
          "Créez et parcourez des tableaux typés. La progression de cette branche sera ajoutée ultérieurement.",
      },
      {
        id: "objects",
        title: "Objets",
        symbol: "{ x: 1 }",
        x: 520,
        y: 575,
        parents: ["functions"],
        cost: "1 000 blés + 400 bois + 200 carottes",
        prerequisite: "Fonctions",
        detail:
          "Organisez vos données avec des objets et des propriétés. Cette recherche de progression est à venir.",
      },
      {
        id: "modeling",
        title: "Modélisation",
        symbol: "interface",
        x: 520,
        y: 740,
        parents: ["objects"],
        cost: "2 000 blés + 800 bois + 400 carottes",
        prerequisite: "Objets",
        detail:
          "Décrivez vos données avec des types, interfaces et unions. Cette recherche et sa branche Objets restent à venir.",
      },
    ],
  },
  {
    name: "Technologie",
    caption: "Donnez à votre robot les moyens de vos ambitions.",
    nodes: [
      {
        id: "robot",
        title: "Robot fermier",
        symbol: "f1",
        x: 315,
        y: 25,
        parents: [],
        base: true,
        detail:
          "Votre premier robot est gratuit. Sa soute contient 20 unités. Le dépôt adjacent stocke jusqu’à 200 unités.",
      },
      {
        id: "sensor",
        title: "Capteur de maturité",
        symbol: "can_harvest()",
        x: 150,
        y: 190,
        parents: ["robot"],
        research: "sensor",
        detail:
          "Détectez les cultures mûres avec can_harvest(). Le capteur ne consomme aucune ressource.",
      },
      {
        id: "position",
        title: "Positionnement",
        symbol: "(x, y)",
        x: 480,
        y: 190,
        parents: ["robot"],
        research: "position",
        prerequisite: "Trois parcelles (Agriculture)",
        detail:
          "Lisez les coordonnées du robot et les dimensions du terrain avec get_pos_x(), get_pos_y() et get_world_size().",
      },
      {
        id: "analysis",
        title: "Analyse de la parcelle",
        symbol: "get_entity_type()",
        x: 150,
        y: 365,
        parents: ["sensor"],
        cost: "40 blés + 15 bois",
        prerequisite: "Capteur de maturité",
        detail:
          "Identifiez une culture et le type de sol. Ce capteur n’est pas encore implémenté.",
      },
      {
        id: "construction",
        title: "Construction",
        symbol: "⌂",
        x: 480,
        y: 365,
        parents: ["robot"],
        cost: "80 blés + 40 bois",
        prerequisite: "Buisson (Agriculture)",
        detail:
          "Débloquera des bâtiments supplémentaires à acheter avec de l’or.",
      },
      {
        id: "humidity",
        title: "Capteur d’humidité",
        art: "water",
        x: 150,
        y: 540,
        parents: ["analysis"],
        cost: "100 blés + 40 bois",
        prerequisite: "Analyse de la parcelle",
        detail:
          "Mesurera l’humidité du sol avec get_water() pour adapter vos arrosages.",
      },
      {
        id: "tank",
        title: "Réservoir embarqué",
        art: "water",
        x: 480,
        y: 540,
        parents: ["construction"],
        cost: "150 blés + 100 bois",
        prerequisite: "Construction",
        detail:
          "Permettra de transporter dix unités d’eau et de remplir le réservoir au puits.",
      },
    ],
  },
];
function isAcquired(node: Node, farm: Farm) {
  return (
    !!node.base || (!!node.research && farm.unlocks.includes(node.research))
  );
}
export function SkillTree({
  farm,
  onBuy,
  onSell,
}: {
  farm: Farm;
  onBuy: (id: string) => void;
  onSell: () => void;
}) {
  const [page, setPage] = useState(0),
    [selected, setSelected] = useState("wheat-base");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = Math.max(0, (740 - el.clientWidth) / 2);
      el.scrollTop = 0;
    }
  }, [page]);
  const tree = trees[page],
    node = tree.nodes.find((n) => n.id === selected) ?? tree.nodes[0];
  const researchItem = research.find((r) => r.id === node.research);
  const acquired = isAcquired(node, farm),
    future = !node.base && !node.research;
  const prerequisiteMissing = node.research === "position" && farm.width < 3;
  const affordable = !!researchItem && farm.stock >= researchItem.cost;
  const changePage = (index: number) => {
    setPage(index);
    setSelected(trees[index].nodes[0].id);
  };
  return (
    <div className="skill-pages">
      <header className="skill-header">
        <div>
          <span className="overline">FAITES GRANDIR VOTRE POTENTIEL</span>
          <h2>Arbres de compétences</h2>
        </div>
        <div className="skill-stock">
          <ResourceIcon kind="wheat" />
          <div>
            <strong>
              {farm.stock}
              <small> / 200</small>
            </strong>
            <span>blés disponibles</span>
          </div>
        </div>
      </header>
      <nav className="skill-tabs" aria-label="Arbres de compétences">
        {trees.map((t, i) => (
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
                  planned = !n.base && !n.research;
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
                          : "available ") +
                      (n.id === node.id ? "chosen" : "")
                    }
                    style={{ left: n.x, top: n.y }}
                    aria-pressed={n.id === node.id}
                    aria-label={`${n.title} · ${owned ? "Acquis" : planned ? "À venir" : r?.cost + " blés"}`}
                    onClick={() => setSelected(n.id)}
                  >
                    <div className="node-art">
                      {n.art ? (
                        <ResourceIcon kind={n.art} />
                      ) : (
                        <code>{n.symbol}</code>
                      )}
                      {planned && (
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
                          : `${r?.cost} blés`}
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
          {node.prerequisite && (
            <div
              className={
                "skill-prerequisite " + (prerequisiteMissing ? "missing" : "")
              }
            >
              <span>PRÉREQUIS</span>
              {node.prerequisite}
            </div>
          )}
          <div className="skill-price">
            <span>COÛT</span>
            <strong>
              {node.base
                ? "Gratuit"
                : researchItem
                  ? `${researchItem.cost} blés`
                  : node.cost}
            </strong>
          </div>
          <button
            className="purchase-skill"
            disabled={acquired || future || prerequisiteMissing || !affordable}
            onClick={() => node.research && onBuy(node.research)}
          >
            {acquired
              ? "✓ Compétence acquise"
              : future
                ? "Disponible ultérieurement"
                : prerequisiteMissing
                  ? "Débloquez Trois parcelles"
                  : !affordable
                    ? "Blés insuffisants"
                    : "Rechercher · " + researchItem?.cost + " blés"}
          </button>
          {future && (
            <small className="planned-note">
              Aucun achat possible pour cette branche pour le moment.
            </small>
          )}
          <div className="skill-trade">
            <span>◈ {farm.gold} or</span>
            <button disabled={farm.stock < 10} onClick={onSell}>
              Vendre 10 blés · +10 or
            </button>
          </div>
        </aside>
      </div>
      <footer className="skill-pagination">
        <button disabled={page === 0} onClick={() => changePage(page - 1)}>
          ← Page précédente
        </button>
        <span>
          0{page + 1} <small>/ 03</small>
        </span>
        <button
          disabled={page === trees.length - 1}
          onClick={() => changePage(page + 1)}
        >
          Page suivante →
        </button>
      </footer>
    </div>
  );
}
