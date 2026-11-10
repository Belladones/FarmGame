import { upgradeAsset, assetUpgradeBlocker } from "./engine";
import { GuiCompanion } from "./GuiCompanion";
import { CompanionPanel, CompanionAvatar } from "./CompanionPanel";
import { customizeCompanion } from "./companion";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import {
  fresh,
  command,
  buy,
  claim,
  sell,
  type Farm,
  hydrateFarm,
  advance,
  activeRobot,
  capacity,
  robotSpeed,
  stockCapacity,
  missionBlocker,
  getStock,
  totalStock,
  selectRobot,
  purchase,
  purchaseForInventory,
  configureSite,
  siteBlocker,
  storeBuilding,
  storeBuildingBlocker,
  placeBuilding,
  buildingPlacementBlocker,
  robotPlacementBlocker,
  recallBlocker,
  sellStock,
  fulfillOrder,
  resellAsset,
  repair,
  relocateBuilding,
  releaseReservation,
  at,
  cropProgress,
  deployRobot,
  recallRobot,
} from "./engine";
import { WorkspaceNav } from "./WorkspaceNav";
import { HelpPanel } from "./HelpPanel";
import { InventoryPanel, type InventoryAction } from "./InventoryPanel";
import { MissionPanel } from "./MissionPanel";
import {
  currentMission,
  chapters,
  career,
  completedMissions,
} from "./missions";
import { FleetPanel, type FleetAction } from "./FleetPanel";
import { FarmScene } from "./FarmScene";
import { CloudSave, downloadFarm, type SyncStatus } from "./persistence";
import { SessionPanel, type SessionAction } from "./SessionPanel";
import { SaveSlotsPanel } from "./SaveSlotsPanel";
import { Shop, type ShopAction } from "./Shop";
import { declarations } from "./api";
import { models, itemNames, sum, research } from "./catalog";
import { SkillTree } from "./SkillTree";
import { Icon, ResourceIcon } from "./Icons";
import "./style.css";
import "./command-theme.css";
(self as any).MonacoEnvironment = {
  getWorker: (_: unknown, label: string) =>
    label === "typescript" || label === "javascript"
      ? new TsWorker()
      : new EditorWorker(),
};
loader.config({ monaco });
monaco.editor.defineTheme("farmscript-command", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "8297A6" },
    { token: "keyword", foreground: "FF9A55" },
    { token: "number", foreground: "E8BF7E" },
    { token: "string", foreground: "9BC9C3" },
  ],
  colors: {
    "editor.background": "#0D151E",
    "editor.foreground": "#E7EEF4",
    "editorLineNumber.foreground": "#667E90",
    "editorLineNumber.activeForeground": "#FF9A55",
    "editorCursor.foreground": "#FF8B3D",
    "editor.selectionBackground": "#385166",
    "editor.lineHighlightBackground": "#172330",
    "editorIndentGuide.background1": "#253744",
  },
});
monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
  strict: true,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  allowImportingTsExtensions: true,
  // Separate scripts may reuse variable names without sharing a TypeScript scope.
  moduleDetection: 3,
  noEmit: true,
});
monaco.languages.typescript.typescriptDefaults.addExtraLib(
  declarations,
  "file:///farm-api.d.ts",
);
const resourceNumber = (n: number) =>
  n >= 10000
    ? new Intl.NumberFormat("fr-FR", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n)
    : String(n);
const starter = `// Récoltez l’herbe, puis déposez le foin.\n// Relancez ce programme pour obtenir 5 foins.\nharvest();\ndeposit();\n`;
const examples: Record<string, string> = {
  "Premier programme": starter,
  "Première boucle":
    "// Recherche : Boucle while (5 foins)\nwhile (true) {\n  harvest();\n  deposit();\n}\n",
  "Premiers buissons":
    "// Recherches : Vitesse + plant() + Buisson + Conditions + Capteur de maturité\nwhile (true) {\n  plant(Entities.Bush);\n  while (!can_harvest()) {}\n  harvest();\n  deposit();\n}\n",
  "Cultiver le blé":
    "// Recherches : Boucle while + Culture du blé + Capteur de maturité\nwhile (true) {\n  plant(Entities.Wheat);\n  while (!can_harvest()) {\n    // Attendre la maturité avant de récolter.\n  }\n  harvest();\n  deposit();\n}",
  "Avec un capteur":
    "// Recherches : Conditions + Capteur de maturité\nwhile (true) {\n  if (can_harvest()) {\n    harvest();\n    deposit();\n  }\n  plant(Entities.Wheat);\n}",
  "Explorer les parcelles":
    "// Recherches : Expansion 1 + move() + Coordonnées + Variables\nfor (let x: number = 0; x < get_world_size().width; x++) {\n  plant(Entities.Wheat);\n  move(Direction.East);\n}\nwhile (get_pos_x() > 0) {\n  move(Direction.West);\n}\ndeposit();",
};
const docs = [
  [
    "plant(Entities.Bush)",
    "plant() : 50 foins après Vitesse. Buisson : 50 foins. Gratuit à semer sur prairie ou terre, pousse en 3,2 à 4,8 s, donne 1 bois au niveau 1.",
  ],
  [
    "plant(Entities.Carrot)",
    "Carottes : 50 bois. Labourer puis semer coûte 1 foin + 1 bois dans la soute. Pousse en 4,8 à 7,2 s, donne 1 carotte. Les améliorations doublent le rendement.",
  ],
  [
    "use_item(Items.Water, n)",
    "Après Utilisation des objets et Eau : consomme jusqu’à n réservoirs passifs ; chacun ajoute 0,25 d’humidité. Eau 1 produit un réservoir toutes les 10 secondes, les niveaux suivants doublent le débit. Croissance jusqu’à ×5 ; humidité multipliée par 0,99 par seconde.",
  ],
  [
    "console.log(...)",
    "Recherche Journal : 150 foins + 50 bois. Affiche dans le journal du robot, comme print().",
  ],
  [
    "plant(Entities.Wheat)",
    "Recherches plant() puis Culture du blé (branche après Carottes) : plante gratuitement sur une case vide ou remplace l’herbe. Pousse en 5 secondes.",
  ],
  [
    "Entities.Grass / Items.Hay",
    "L’herbe pousse automatiquement sur prairie en 0,5 seconde et produit du foin. Elle peut être plantée sur Soil ou Grassland.",
  ],
  [
    "while (true) { harvest(); deposit(); }",
    "Recherche Boucle while : 5 foins au dépôt. Les booléens TypeScript sont true et false. Arrêter termine une boucle infinie sans bloquer le jeu.",
  ],
  [
    "Grounds.Grassland / Grounds.Soil",
    "La prairie est le sol par défaut. till() alterne prairie et terre labourée. L’herbe repousse seule sur prairie, mais pas sur sol labouré.",
  ],
  [
    "harvest()",
    "Sur les nouvelles parties : récolte l’entité sous le robot ; une entité immature est détruite sans ressource. Renvoie true si une entité est retirée, false sinon. Durée de base : 200 ticks (1 s) si retrait, 1 tick (5 ms) sinon. Soute pleine : la culture mûre est conservée.",
  ],
  [
    "deposit()",
    "Transfère la cargaison vers un dépôt adjacent, dans la limite de sa place disponible. Le dépôt initial est voisin de (0, 0).",
  ],
  [
    "move(Direction.East)",
    "Après la recherche move() : sur le champ, dépasser un bord rejoint le bord opposé. Les terrains constructibles gardent leurs limites et les collisions restent actives. Les anciennes parties gardent leurs bords bloqués.",
  ],
  [
    "can_harvest()",
    "Retourne un boolean. Recherchez Capteur de maturité puis installez-le sur ce robot dans Robots → Équipement, avec un atelier construit.",
  ],
  [
    "get_pos_x() / get_pos_y()",
    "Retourne une coordonnée. Recherche : Coordonnées.",
  ],
  ["get_world_size()", "Retourne { width, height }. Recherche : Coordonnées."],
  ["get_stock(Resources.Wheat)", "Lit la quantité de blé dans le dépôt."],
  ["get_inventory(Resources.Wheat)", "Lit le blé dans la soute du robot."],
  ["get_capacity()", "Retourne la capacité actuelle de la soute."],
  ['print("Bonjour !")', "Écrit dans le journal. Recherche : Journal."],
  [
    "load(Resources.Wood, 5)",
    "Charge depuis un dépôt adjacent, dans la limite de la soute. Les graines sont prélevées dans la soute, pas dans les dépôts.",
  ],
  [
    "till()",
    "Disponible dès le départ pour le fermier : alterne prairie et terre labourée et retire l’herbe. Récoltez d’abord les autres cultures présentes.",
  ],
  [
    "watering() / refill_water()",
    "Nouvelle partie : watering() consomme un réservoir d’eau passive, comme use_item(Items.Water). refill_water() remplit le réservoir embarqué depuis un puits adjacent ; ce circuit physique reste séparé de l’inventaire passif.",
  ],
  [
    "use_item(Items.Fertilizer)",
    "Consomme un engrais transporté pour ajouter de la croissance. Recherches Consommables et Engrais.",
  ],
  [
    "get_entity_type() / get_ground_type()",
    "Identifie la culture et le sol. Recherche Analyse de la parcelle et équipement installé sur ce robot.",
  ],
  [
    "get_water()",
    "Humidité de la parcelle entre 0 et 1. Recherche Capteur d’humidité et capteur installé sur ce robot.",
  ],
  [
    "harvest_group()",
    "Bonus d’un carré de 2 × 2 citrouilles mûres du même niveau. Recherche Récolte groupée.",
  ],
  [
    "is_occupied(Direction.East)",
    "Détecte un robot incompatible dans la case voisine. Les drones peuvent coexister avec les robots terrestres.",
  ],
  [
    "reserve(Direction.East) / release()",
    "Réserve atomiquement la case suivante, pour 5 secondes au maximum. Recherche Circulation 2.",
  ],
  [
    "deliver(Direction.South, Resources.Wheat, 5)",
    "Livre une machine adjacente depuis la soute. La fabrication démarre automatiquement ; tampon d’entrée de 50 unités.",
  ],
  [
    "collect(Direction.South, Resources.Flour, 1)",
    "Récupère la sortie d’une machine dans la soute. Déposez-la avant de la vendre ou de financer une recherche.",
  ],
  [
    "get_building_stock(direction, item)",
    "Quantité dans les tampons d’entrée et de sortie du bâtiment adjacent.",
  ],
  [
    "get_building_status(direction)",
    "working, missing_input, output_full, idle, ou null. Recherche Construction.",
  ],
  [
    "sell(Resources.Wheat, 10)",
    "Vend uniquement depuis les dépôts au tarif normal. Recherche Commerce automatisé.",
  ],
  [
    "get_gold()",
    "Solde d’or disponible. Les ventes du magasin sont accessibles dès le début.",
  ],
];
function load(): Farm {
  try {
    const saved = JSON.parse(localStorage.getItem("farmscript-v1") || "null");
    return hydrateFarm(saved?.farm, localStorage.getItem("farmscript-code"));
  } catch {
    return fresh();
  }
}
interface Runtime {
  worker?: Worker;
  queue: { id: number; name: string; args: unknown[] }[];
}
function App() {
  const [initialFarm] = useState(load);
  const farm = useRef(initialFarm);
  const [s, setS] = useState({ ...farm.current });
  const programExamples: Record<string, string> = s.previousProgram
    ? { ...examples, "Mon programme précédent": s.previousProgram }
    : examples;
  const [code, setCode] = useState(
    () => activeRobot(farm.current).code || starter,
  );
  const [panel, setPanel] = useState<string | null>(null);
  const [garageEditorId, setGarageEditorId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [showStart, setShowStart] = useState(
    () => localStorage.getItem("farmscript-tips-dismissed") !== "1",
  );
  const notify = (text: string, error = false) => setNotice({ text, error });
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [minimized, setMinimized] = useState<Record<string, boolean>>({});
  const [initialMinimized] = useState(() => window.innerWidth < 900);
  const isMinimized = (id: string) => minimized[id] ?? initialMinimized;
  const programRobots = s.robots.filter(
    (r) => !r.destroyed && (r.deployed || r.id === garageEditorId),
  );
  const editorOpen = programRobots.some((r) => !isMinimized(r.id));
  const setEditorOpen = (open: boolean) => {
    if (open) {
      const r = activeRobot(farm.current);
      if (!r.deployed) setGarageEditorId(r.id);
      setMinimized((m) => ({ ...m, [r.id]: false }));
    } else {
      setMinimized((m) => ({
        ...m,
        ...Object.fromEntries(programRobots.map((r) => [r.id, true])),
      }));
      setExpanded(null);
    }
  };
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const cloud = useRef<CloudSave | null>(null);
  const syncReady = useRef(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    mode: "loading",
    player: null,
    dirty: false,
    lastSavedAt: null,
    message: "Recherche de votre session…",
  });
  const dialogRef = useRef<HTMLElement>(null);
  const menuOpener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!panel) return;
    const previous =
      menuOpener.current ?? (document.activeElement as HTMLElement | null);
    dialogRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, a[href], [tabindex="0"]',
        ) ?? [],
      ).filter((node) => node.getClientRects().length > 0);
      if (!nodes?.length) {
        event.preventDefault();
        return;
      }
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [panel]);
  const runtimes = useRef(new Map<string, Runtime>());
  const generations = useRef(new Map<string, number>());
  const pausedRef = useRef(false),
    speedRef = useRef(1);
  const [logs, setLogs] = useState<string[]>([
    "Bienvenue ! Lancez votre premier programme.",
  ]);
  const logElements = useRef(new Map<string, HTMLDivElement>());
  useEffect(() => {
    for (const el of logElements.current.values())
      el.scrollTop = el.scrollHeight;
  }, [logs, minimized]);
  const log = (text: string) => setLogs((a) => [...a.slice(-49), text]);
  const refresh = () => {
    setS(structuredClone(farm.current));
    localStorage.setItem(
      "farmscript-v1",
      JSON.stringify({ version: 1, farm: farm.current }),
    );
    cloud.current?.markDirty();
  };
  const stop = (id = farm.current.activeRobotId, unpause = true) => {
    generations.current.set(id, (generations.current.get(id) ?? 0) + 1);
    runtimes.current.get(id)?.worker?.terminate();
    runtimes.current.delete(id);
    releaseReservation(farm.current, id);
    if (id === farm.current.activeRobotId) setRunning(false);
    if (!runtimes.current.size && unpause) {
      setPaused(false);
      pausedRef.current = false;
    }
  };
  const stopAll = () => {
    for (const id of runtimes.current.keys()) stop(id);
  };
  useEffect(() => {
    const client = new CloudSave({
      getFarm: () => farm.current,
      applyFarm: (saved) => {
        stopAll();
        farm.current = hydrateFarm(saved);
        const r = activeRobot(farm.current);
        setCode(r.code || starter);
        setS(structuredClone(farm.current));
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: farm.current }),
        );
        localStorage.setItem("farmscript-code", r.code || starter);
      },
      onChange: setSyncStatus,
    });
    cloud.current = client;
    let alive = true;
    void client.bootstrap().finally(() => {
      if (alive) {
        syncReady.current = true;
        setSessionReady(true);
      }
    });
    const timer = setInterval(() => void client.flush(), 5000);
    const leave = () => {
      void client.flush(true);
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") leave();
    };
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      alive = false;
      syncReady.current = false;
      clearInterval(timer);
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", hidden);
      client.dispose();
    };
  }, []);
  useEffect(() => {
    const r = activeRobot(farm.current);
    if (r) {
      setCode(r.code || starter);
      setRunning(runtimes.current.has(r.id));
    }
  }, [s.activeRobotId]);
  useEffect(() => {
    let previousTick = performance.now(),
      previousRender = previousTick;
    const timer = setInterval(() => {
      const now = performance.now(),
        elapsed = Math.min(1, (now - previousTick) / 1000);
      previousTick = now;
      if (pausedRef.current || !syncReady.current) return;
      advance(farm.current, elapsed * speedRef.current);
      for (const [id, rt] of runtimes.current) {
        const r = farm.current.robots.find((r) => r.id === id && !r.destroyed);
        if (!r || !r.deployed) {
          log(`[${id}] Robot détruit ou retiré ; programme conservé.`);
          stop(id);
          continue;
        }
        if (
          !rt.worker ||
          !rt.queue.length ||
          r.readyAt > farm.current.time ||
          r.moving
        )
          continue;
        const request = rt.queue.shift()!;
        try {
          const value =
            request.name === "__step"
              ? undefined
              : command(farm.current, request.name, request.args, id);
          if (request.name === "print")
            log(`[${id}] ` + request.args.map(String).join(" "));
          rt.worker.postMessage({ type: "result", id: request.id, value });
        } catch (e) {
          rt.worker.postMessage({
            type: "result",
            id: request.id,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
      if (now - previousRender >= 100) {
        previousRender = now;
        refresh();
      }
    }, 5);
    return () => {
      clearInterval(timer);
      for (const rt of runtimes.current.values()) rt.worker?.terminate();
      runtimes.current.clear();
    };
  }, []);
  async function run(id = farm.current.activeRobotId) {
    if (!syncReady.current) return;
    stop(id);
    const generation = generations.current.get(id),
      rt: Runtime = { queue: [] };
    runtimes.current.set(id, rt);
    if (id === farm.current.activeRobotId) setRunning(true);
    const r = farm.current.robots.find((r) => r.id === id);
    if (!r || r.destroyed || !r.deployed) {
      stop(id);
      return;
    }
    const source = r.code;
    const files = Object.fromEntries(
      farm.current.robots.map((robot) => [robot.id, robot.code]),
    );
    // Keep all local robot files available to TypeScript, including garage robots.
    for (const robot of farm.current.robots) {
      const fileUri = monaco.Uri.parse(
        `file:///robots/${encodeURIComponent(robot.id)}.ts`,
      );
      const existing = monaco.editor.getModel(fileUri);
      if (!existing)
        monaco.editor.createModel(robot.code, "typescript", fileUri);
      else if (existing.getValue() !== robot.code)
        existing.setValue(robot.code);
    }
    delete r.lastError;
    const uri = monaco.Uri.parse(`file:///robots/${encodeURIComponent(id)}.ts`);
    const model =
      monaco.editor.getModel(uri) ??
      monaco.editor.createModel(source, "typescript", uri);
    if (model) {
      try {
        const getClient =
            await monaco.languages.typescript.getTypeScriptWorker(),
          client = await getClient(model.uri);
        const { programDependencies } = await import("./programModules");
        const checkedFiles = programDependencies(id, files);
        const diagnostics: {
          diagnostic: monaco.languages.typescript.Diagnostic;
          fileModel: monaco.editor.ITextModel;
          file: string;
        }[] = [];
        for (const file of checkedFiles) {
          const fileModel = monaco.editor.getModel(
            monaco.Uri.parse(`file:///robots/${encodeURIComponent(file)}.ts`),
          )!;
          for (const diagnostic of [
            ...(await client.getSyntacticDiagnostics(fileModel.uri.toString())),
            ...(await client.getSemanticDiagnostics(fileModel.uri.toString())),
          ])
            diagnostics.push({ diagnostic, fileModel, file });
        }
        if (generations.current.get(id) !== generation) return;
        if (r.code !== source) {
          stop(id);
          return;
        }
        if (diagnostics.length) {
          const { diagnostic: d, fileModel, file } = diagnostics[0],
            pos = fileModel.getPositionAt(d.start ?? 0),
            message =
              typeof d.messageText === "string"
                ? d.messageText
                : d.messageText.messageText;
          r.lastError = `Erreur TypeScript (${file}.ts), ligne ${pos.lineNumber} : ${message}`;
          log(`[${id}] ${r.lastError}`);
          notify(`[${id}] ${r.lastError}`, true);
          stop(id);
          return;
        }
      } catch (error) {
        if (generations.current.get(id) === generation) {
          r.lastError =
            error instanceof Error
              ? error.message
              : "Le service TypeScript n’est pas prêt. Réessayez dans un instant.";
          log(`[${id}] ${r.lastError}`);
          notify(`[${id}] ${r.lastError}`, true);
          stop(id);
        }
        return;
      }
    }
    if (generations.current.get(id) !== generation) return;
    if (r.code !== source) {
      stop(id);
      return;
    }
    const w = new Worker(new URL("./runner.worker.ts", import.meta.url), {
      type: "module",
    });
    rt.worker = w;
    w.onmessage = ({ data }) => {
      if (runtimes.current.get(id) !== rt) return;
      if (data.type === "call") rt.queue.push(data);
      else {
        if (data.type === "error") {
          r.lastError = String(data.message);
          notify(`[${id}] ${r.lastError}`, true);
        }
        log(
          `[${id}] ` +
            (data.type === "error"
              ? "Erreur : " + data.message
              : "Programme terminé."),
        );
        stop(id);
      }
    };
    w.onerror = (e) => {
      r.lastError = e.message;
      notify(`[${id}] ${e.message}`, true);
      log(`[${id}] Erreur du programme : ${e.message}`);
      stop(id);
    };
    w.postMessage({
      type: "run",
      code: source,
      entry: id,
      files,
      imports: farm.current.unlocks.includes("imports"),
      conditions: farm.current.unlocks.includes("conditions"),
      loops:
        farm.current.unlocks.includes("loops") ||
        farm.current.progressionVersion === 1,
    });
    log(`[${id}] Programme lancé.`);
    notify(`Programme de ${id} lancé. Suivez sa progression sur le terrain.`);
  }
  const chooseRobot = (id: string) => {
    if (selectRobot(farm.current, id)) {
      if (!activeRobot(farm.current).deployed) setGarageEditorId(id);
      setCode(activeRobot(farm.current).code || starter);
      setRunning(runtimes.current.has(id));
      refresh();
    }
  };
  const shopAction = (action: ShopAction): boolean => {
    try {
      let result = false;
      if (action.type === "buy")
        result =
          action.store && action.kind !== "Fertilizer"
            ? purchaseForInventory(farm.current, action.kind)
            : purchase(farm.current, action.kind, action.quantity, action.site);
      else if (action.type === "upgrade")
        result = upgradeAsset(
          farm.current,
          "building",
          action.id,
          action.upgrade,
        );
      else if (action.type === "sell")
        result = sellStock(farm.current, action.item, action.quantity) > 0;
      else if (action.type === "order")
        result = fulfillOrder(farm.current, action.id);
      else if (action.type === "repair")
        result = repair(farm.current, action.id);
      else if (action.type === "resell") {
        stop(action.id, false);
        result = resellAsset(farm.current, action.id);
      } else if (action.type === "relocate")
        result = relocateBuilding(
          farm.current,
          action.id,
          action.site,
          pausedRef.current,
        );
      else if (action.type === "select") {
        chooseRobot(action.id);
        setEditorOpen(true);
        setPanel(null);
        result = true;
      }
      refresh();
      if (action.type !== "select")
        notify(
          result
            ? "Action effectuée. Les stocks et les équipements sont à jour."
            : "Action impossible. Vérifiez les ressources et les emplacements disponibles.",
          !result,
        );
      return result;
    } catch (e) {
      log(e instanceof Error ? e.message : String(e));
      notify(e instanceof Error ? e.message : String(e), true);
      return false;
    }
  };
  const fleetAction = (action: FleetAction): boolean => {
    let result = false;
    if (action.type === "shop") {
      setPanel("Magasin");
      return true;
    }
    if (action.type === "select") {
      chooseRobot(action.id);
      setEditorOpen(true);
      setPanel(null);
      return true;
    }
    if (action.type === "upgrade") {
      stop(action.id);
      const blocker = assetUpgradeBlocker(
        farm.current,
        "robot",
        action.id,
        action.upgrade,
      );
      result = upgradeAsset(farm.current, "robot", action.id, action.upgrade);
      refresh();
      notify(
        result
          ? `Équipement installé sur ${action.id}.`
          : (blocker ?? "Installation impossible."),
        !result,
      );
      return result;
    }
    if (action.type === "buy") result = buy(farm.current, action.id);
    else if (action.type === "deploy")
      result = deployRobot(farm.current, action.id);
    else if (action.type === "recall") {
      // An explicit recall stops this robot's program without affecting the others.
      result = recallRobot(farm.current, action.id);
      if (result) stop(action.id, false);
    } else if (action.type === "stop") {
      stop(action.id, false);
      result = true;
    } else if (action.type === "repair")
      result = repair(farm.current, action.id);
    refresh();
    const success =
      action.type === "buy"
        ? `${research.find((r) => r.id === action.id)?.name ?? "Amélioration"} débloquée.`
        : action.type === "deploy"
          ? `${action.id} déployé. Lancez son programme quand vous êtes prêt.`
          : action.type === "recall"
            ? `${action.id} rappelé au garage. Code et cargaison conservés.`
            : action.type === "stop"
              ? `Programme de ${action.id} arrêté.`
              : `${action.id} reconstruit.`;
    notify(
      result
        ? success
        : "Action impossible : vérifiez l’état du robot, les prérequis et la place disponible.",
      !result,
    );
    return result;
  };
  const inventoryAction = (
    action: InventoryAction,
  ): { ok: boolean; message: string } => {
    const farmState = farm.current;
    if (action.type === "pause") {
      pausedRef.current = true;
      setPaused(true);
      return {
        ok: true,
        message: "Simulation en pause. Choisissez vos emplacements.",
      };
    }
    if (!pausedRef.current)
      return {
        ok: false,
        message: "Mettez la simulation en pause pour aménager la ferme.",
      };
    let result = false,
      blocker: string | null = null;
    if (action.type === "site-add" || action.type === "site-remove") {
      blocker = siteBlocker(
        farmState,
        action.site,
        action.type === "site-remove",
      );
      result = configureSite(
        farmState,
        action.site,
        action.type === "site-remove",
        true,
      );
    } else if (action.type === "store-building") {
      blocker = storeBuildingBlocker(farmState, action.id);
      result = storeBuilding(farmState, action.id, true);
    } else if (action.type === "place-building") {
      blocker = buildingPlacementBlocker(farmState, action.id, action.site);
      result = placeBuilding(farmState, action.id, action.site, true);
    } else if (action.type === "store-robot") {
      blocker = recallBlocker(farmState, action.id);
      result = recallRobot(farmState, action.id);
      if (result) stop(action.id, false);
    } else if (action.type === "place-robot") {
      blocker = robotPlacementBlocker(farmState, action.id, action.site);
      if (!blocker) result = deployRobot(farmState, action.id, action.site);
    }
    refresh();
    return {
      ok: result,
      message: result
        ? "Aménagement enregistré. Les équipements restent votre propriété."
        : (blocker ?? "Action impossible."),
    };
  };
  const sessionAction = async (action: SessionAction) => {
    const client = cloud.current;
    if (!client) return;
    if (action.type === "export") {
      downloadFarm(farm.current);
      return;
    }
    setSessionBusy(true);
    const freeze = ["auth", "cloud", "local", "logout", "retry"].includes(
      action.type,
    );
    if (freeze) {
      stopAll();
      syncReady.current = false;
    }
    try {
      if (action.type === "auth")
        await client.authenticate(
          action.kind,
          action.username,
          action.password,
        );
      else if (action.type === "save") {
        await client.flush();
      } else if (action.type === "retry") await client.retry();
      else if (action.type === "cloud") await client.useCloud();
      else if (action.type === "local") await client.useLocal();
      else if (action.type === "logout") await client.logout();
    } finally {
      if (freeze) syncReady.current = true;
      setSessionBusy(false);
    }
  };
  const slotOperation = async (operation: () => Promise<void>) => {
    stopAll();
    setSessionBusy(true);
    syncReady.current = false;
    try {
      await operation();
    } finally {
      syncReady.current = true;
      setSessionBusy(false);
    }
  };
  const slotActions = {
    list: () => cloud.current!.listSlots(),
    save: (name: string) => slotOperation(() => cloud.current!.saveSlot(name)),
    remove: (id: string) => slotOperation(() => cloud.current!.deleteSlot(id)),
    open: (id: string | null) =>
      slotOperation(async () => {
        await cloud.current!.openSlot(id);
        setExpanded(null);
        setEditorOpen(true);
        if (id === null) {
          setShowStart(true);
          localStorage.removeItem("farmscript-tips-dismissed");
        }
      }),
  };
  const active = currentMission(s);
  const rank = career(s);
  const missionReady = !!active && active.progress(s) >= active.target;
  const navigateMission = (
    destination: import("./missions").MissionDestination,
  ) => {
    if (destination === "code") {
      setEditorOpen(true);
      setPanel(null);
    } else setPanel(destination);
  };
  const togglePanel = (name: string) =>
    setPanel((p) => (p === name ? null : name));
  const pause = () => {
    pausedRef.current = !paused;
    setPaused(!paused);
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      const editing = !!element.closest(
        'input,textarea,select,[contenteditable="true"],.monaco-editor',
      );
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !panel) {
        event.preventDefault();
        if (
          !runtimes.current.has(farm.current.activeRobotId) &&
          activeRobot(farm.current).deployed
        )
          void run();
        return;
      }
      if (editing || event.ctrlKey || event.metaKey) return;
      const destinations = [
        "Missions",
        "Recherches",
        "Robots",
        "Magasin",
        "API & aide",
      ];
      if (event.altKey && /^Digit[1-5]$/.test(event.code)) {
        event.preventDefault();
        setPanel(destinations[Number(event.code.slice(-1)) - 1]);
      } else if (event.key === "?" && !event.altKey) {
        event.preventDefault();
        setPanel("API & aide");
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [panel, code, running, paused]);
  const claimMission = (id: string) => {
    const mission = currentMission(farm.current);
    const ok = claim(farm.current, id);
    refresh();
    notify(
      ok
        ? `Mission « ${mission?.title ?? ""} » validée ! Votre progression a été enregistrée sur cet appareil.`
        : (missionBlocker(farm.current, id) ?? "Récompense indisponible."),
      !ok,
    );
    return ok;
  };
  const selectedRobot = activeRobot(s);
  const tile = selectedRobot.deployed ? at(s, s.x, s.y) : undefined;
  const growth = cropProgress(s, tile);
  return (
    <div
      onFocusCapture={(event) => {
        if (!panel) menuOpener.current = event.target as HTMLElement;
      }}
      className={"game " + (!editorOpen ? "editor-collapsed" : "")}
    >
      <GuiCompanion
        appearance={s.companion}
        hidden={!!panel || !sessionReady}
      />
      {!sessionReady && (
        <div className="session-loading" role="status">
          Chargement de la session…
        </div>
      )}
      <FarmScene
        farm={s}
        paused={paused}
        running={running}
        zoom={1}
        resetView={0}
        editorOpen={editorOpen}
      />
      <div className="command-masthead">
        farm<span>script</span>
        <small>AGRICULTURE / AUTOMATISATION</small>
      </div>
      <header className="game-header" inert={!!panel} aria-hidden={!!panel}>
        <div className="game-brand">
          <b>
            farm<span>script</span>
            <sup>α</sup>
          </b>
          <span>VOTRE CODE. VOTRE RÉCOLTE.</span>
          <div className="economy">
            <span title="Pièces d’or">◈ {s.gold} or</span>
            <span title="Cargaison du robot">
              ▣ {sum(selectedRobot.inventory)} / {capacity(s)}
            </span>
          </div>
          <button
            className={"sync-badge " + syncStatus.mode}
            aria-label="Session et sauvegarde"
            onClick={() => setPanel("Session et sauvegarde")}
          >
            <CompanionAvatar {...s.companion} />{" "}
            {syncStatus.player ? syncStatus.player.username : "Se connecter"}{" "}
            <small>
              {syncStatus.mode === "saving"
                ? "Enregistrement…"
                : syncStatus.mode === "conflict"
                  ? "Conflit à résoudre"
                  : syncStatus.mode === "expired"
                    ? "Session expirée"
                    : syncStatus.mode === "offline"
                      ? "Hors connexion"
                      : syncStatus.player
                        ? syncStatus.dirty
                          ? "À enregistrer"
                          : "Enregistré"
                        : "Mode local"}
            </small>
          </button>
        </div>
      </header>
      <aside
        inert={!!panel}
        aria-hidden={!!panel}
        className="left-rail"
        aria-label="Gestion de la ferme"
      >
        <div
          className="sidebar-scroll"
          tabIndex={0}
          aria-label="Ressources et outils, zone défilante"
        >
          {" "}
          <div
            className="resources resources-with-hay"
            aria-label="Ressources de la ferme"
          >
            <div className="resource" title="Foin disponible dans les dépôts">
              <ResourceIcon kind="hay" />
              <strong>{resourceNumber(getStock(s, "Hay"))}</strong>
              <span>FOIN</span>
            </div>
            <div
              className="resource"
              title={`Blé au dépôt : ${s.stock} / ${stockCapacity(s)}`}
            >
              <ResourceIcon kind="wheat" />
              <strong>{resourceNumber(s.stock)}</strong>
              <span>BLÉ</span>
            </div>
            <div className="resource" title="Bois dans les dépôts">
              <ResourceIcon kind="wood" />
              <strong>{resourceNumber(getStock(s, "Wood"))}</strong>
              <span>BOIS</span>
            </div>
            <div className="resource" title="Carottes dans les dépôts">
              <ResourceIcon kind="carrot" />
              <strong>{resourceNumber(getStock(s, "Carrot"))}</strong>
              <span>CAROTTES</span>
            </div>
            <div
              className="resource"
              title="Eau dans le réservoir du robot sélectionné"
            >
              <ResourceIcon kind="water" />
              <strong>
                {s.researchRevision === 2
                  ? resourceNumber(s.waterItems ?? 0)
                  : selectedRobot.water.toFixed(1)}
              </strong>
              <span>
                {s.researchRevision === 2
                  ? "RÉSERVOIRS D’EAU"
                  : "EAU EMBARQUÉE"}
              </span>
            </div>
          </div>
          <button
            className="depot-summary"
            onClick={() => setPanel("Magasin")}
            aria-label="Voir les stocks des dépôts"
          >
            <span>Stockage des dépôts</span>
            <strong>
              {totalStock(s)} / {stockCapacity(s)}
            </strong>
            <progress value={totalStock(s)} max={stockCapacity(s)} />
            {totalStock(s) >= stockCapacity(s) && (
              <small>Dépôts pleins · Vendre ou améliorer</small>
            )}
          </button>
          <div className="island-caption">
            <span className="overline">VOTRE EXPLOITATION</span>
            <h1>Centre de contrôle agricole.</h1>
            <p>
              <span
                className={"status-light " + (running && !paused ? "on" : "")}
              />
              {running
                ? paused
                  ? "Programme en pause"
                  : "Robot au travail"
                : "La ferme attend vos instructions"}
              <span className="caption-divider">/</span>
              {s.width} × {s.height} parcelle{s.width > 1 ? "s" : ""}
            </p>
          </div>
          {showStart && s.harvested === 0 && (
            <aside className="start-hint" aria-label="Conseils de départ">
              <button
                className="start-dismiss"
                aria-label="Masquer les conseils de départ"
                onClick={() => {
                  setShowStart(false);
                  localStorage.setItem("farmscript-tips-dismissed", "1");
                }}
              >
                ×
              </button>
              <span className="overline">VOTRE PREMIÈRE RÉCOLTE</span>
              <strong>Votre fermier est prêt.</strong>
              <p>
                Le programme est déjà écrit. Lancez-le avec ▶, puis récupérez
                votre première récompense.
              </p>
              <button onClick={() => setPanel("Missions")}>
                Découvrir ma première mission →
              </button>
            </aside>
          )}
          <nav className="dock" aria-label="Outils de la ferme">
            <button
              className={
                "dock-button " + (panel === "Inventaire" ? "selected" : "")
              }
              aria-label="Inventaire"
              title="Inventaire"
              onClick={() => togglePanel("Inventaire")}
            >
              <Icon name="inventory" size={29} />
              <span>Inventaire</span>
            </button>
            <button
              className={"dock-button " + (editorOpen ? "selected" : "")}
              aria-label="Afficher le code"
              title="Afficher le code"
              onClick={() => setEditorOpen(!editorOpen)}
            >
              <Icon name="code" size={29} />
              <span>Code</span>
            </button>
            <button
              className={
                "dock-button " + (panel === "API & aide" ? "selected" : "")
              }
              aria-label="API et aide"
              title="API et aide"
              onClick={() => togglePanel("API & aide")}
            >
              <Icon name="info" size={29} />
              <span>Guide</span>
            </button>
            <button
              className={
                "dock-button " + (panel === "Recherches" ? "selected" : "")
              }
              aria-label="Recherches"
              title="Recherches"
              onClick={() => togglePanel("Recherches")}
            >
              <Icon name="research" size={29} />
              <span>Recherches</span>
            </button>
            <button
              className={
                "dock-button " + (panel === "Robots" ? "selected" : "")
              }
              aria-label="Robots"
              title="Robots"
              onClick={() => togglePanel("Robots")}
            >
              <Icon name="robots" size={29} />
              <span>Robots</span>
            </button>
            <button
              className={
                "dock-button " + (panel === "Magasin" ? "selected" : "")
              }
              aria-label="Magasin"
              title="Magasin"
              onClick={() => togglePanel("Magasin")}
            >
              <Icon name="shop" size={29} />
              <span>Magasin</span>
            </button>
          </nav>
        </div>{" "}
        <div
          className={
            "mission-peek campaign-peek " + (missionReady ? "ready" : "")
          }
        >
          <button
            className="mission-peek-open"
            onClick={() => togglePanel("Missions")}
            aria-label="Ouvrir les missions"
          >
            <span className="mission-emblem">
              <Icon name="flag" size={22} />
            </span>
            <div>
              <span className="overline">
                {active
                  ? `CHAPITRE ${active.chapter + 1} · ${chapters[active.chapter].title}`
                  : "CAMPAGNE TERMINÉE"}
              </span>
              <strong>{active?.title ?? "Votre ferme a pris son envol"}</strong>
              <span className="peek-objective">
                {active
                  ? `${Math.min(active.target, active.progress(s))} / ${active.target} · ${active.text}`
                  : `${completedMissions(s)} missions validées`}
              </span>
              {active && (
                <progress
                  aria-label="Mission en cours"
                  value={Math.min(active.target, active.progress(s))}
                  max={active.target}
                />
              )}
            </div>
            <Icon name="arrow" size={18} />
          </button>
          <div className="peek-footer">
            <span>
              Niv. {rank.level} · {rank.xp} XP
            </span>
            {missionReady ? (
              <button
                disabled={!!missionBlocker(s, active!.id)}
                title={
                  missionBlocker(s, active!.id) ??
                  "Valider et passer à la prochaine mission"
                }
                onClick={() => {
                  claimMission(active!.id);
                }}
              >
                {missionBlocker(s, active!.id)
                  ? "Dépôt plein"
                  : "Récupérer la récompense"}
              </button>
            ) : (
              <button onClick={() => togglePanel("Missions")}>
                Voir la progression →
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="plot-info">
        <span className="plot-coordinate">
          {s.x}, {s.y}
        </span>
        <div>
          <strong>
            {!selectedRobot.deployed
              ? "Robot au garage"
              : !tile
                ? "Hors parcelle agricole"
                : tile.planted === null
                  ? "Prêt à planter"
                  : growth >= 1
                    ? "La culture est mûre !"
                    : "La culture pousse…"}
          </strong>
          <span>
            {!selectedRobot.deployed
              ? "Déployez-le depuis la flotte"
              : !tile
                ? "Case de construction"
                : tile.planted === null
                  ? s.unlocks.includes("wheat-base")
                    ? "plant(Entities.Wheat)"
                    : tile.ground === "Soil"
                      ? "till() : rétablir la prairie"
                      : "L’herbe repousse seule"
                  : `${Math.round(growth * 100)} % · ${growth >= 1 ? "harvest()" : "Croissance en cours"}`}
          </span>
        </div>
        {tile && tile.planted !== null && (
          <div className="growth-meter">
            <i style={{ width: growth * 100 + "%" }} />
          </div>
        )}
      </div>
      <div className="program-desktop" inert={!!panel} aria-hidden={!!panel}>
        {programRobots.map((robot) => (
          <section
            key={robot.id}
            data-robot-id={robot.id}
            className={
              "workspace floating-window " +
              (isMinimized(robot.id) ? "program-minimized " : "") +
              (expanded === robot.id ? "expanded " : "") +
              (s.activeRobotId === robot.id ? "active" : "")
            }
            inert={!!panel}
            aria-label={`Programme ${robot.id}`}
            aria-hidden={!!panel}
          >
            <div className="window-titlebar">
              <span className="file-icon">TS</span>
              <button
                className="program-robot"
                onClick={() => chooseRobot(robot.id)}
              >
                {robot.id} · {models[robot.model].name}
              </button>
              <span className="program-state">
                {runtimes.current.has(robot.id)
                  ? paused
                    ? "Pause"
                    : "En cours"
                  : "Arrêté"}
              </span>
              <div className="window-actions">
                <button
                  aria-label={`Exécuter ${robot.id}`}
                  disabled={
                    runtimes.current.has(robot.id) ||
                    !robot.deployed ||
                    !sessionReady
                  }
                  onClick={() => {
                    chooseRobot(robot.id);
                    void run(robot.id);
                  }}
                >
                  ▶
                </button>
                <button
                  aria-label={`Arrêter ${robot.id}`}
                  disabled={!runtimes.current.has(robot.id)}
                  onClick={() => stop(robot.id)}
                >
                  ■
                </button>
                <button
                  title={
                    isMinimized(robot.id)
                      ? "Restaurer l’éditeur"
                      : "Réduire l’éditeur"
                  }
                  aria-label={
                    isMinimized(robot.id)
                      ? "Restaurer l’éditeur"
                      : "Réduire l’éditeur"
                  }
                  onClick={() => {
                    setMinimized((m) => ({
                      ...m,
                      [robot.id]: !isMinimized(robot.id),
                    }));
                    setExpanded((id) => (id === robot.id ? null : id));
                  }}
                >
                  <Icon name="minimize" size={16} />
                </button>
                <button
                  title={expanded === robot.id ? "Restaurer" : "Agrandir"}
                  aria-label="Agrandir l’éditeur"
                  onClick={() => {
                    setExpanded(expanded === robot.id ? null : robot.id);
                    setMinimized((m) => ({ ...m, [robot.id]: false }));
                  }}
                >
                  <Icon name="expand" size={14} />
                </button>
              </div>
            </div>
            <div className="toolbar">
              <select
                aria-label="Charger un exemple"
                defaultValue=""
                disabled={runtimes.current.has(robot.id)}
                onChange={(e) => {
                  if (e.target.value) {
                    if (robot.id === s.activeRobotId)
                      setCode(programExamples[e.target.value]);
                    farm.current.robots.find((r) => r.id === robot.id)!.code =
                      programExamples[e.target.value];
                    localStorage.setItem(
                      "farmscript-code",
                      programExamples[e.target.value],
                    );
                    refresh();
                  }
                }}
              >
                <option value="" disabled>
                  Exemples de programmes
                </option>
                {Object.keys(programExamples).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <span>TypeScript</span>
            </div>
            <div className="editor">
              <Editor
                path={`file:///robots/${encodeURIComponent(robot.id)}.ts`}
                height="100%"
                language="typescript"
                theme="farmscript-command"
                value={robot.code}
                onChange={(v) => {
                  if (robot.id === s.activeRobotId) setCode(v || "");
                  farm.current.robots.find((r) => r.id === robot.id)!.code =
                    v || "";
                  localStorage.setItem("farmscript-code", v || "");
                  refresh();
                }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  padding: { top: 18 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  fontFamily: '"SFMono-Regular", Consolas, monospace',
                  readOnly: runtimes.current.has(robot.id),
                  lineNumbersMinChars: 3,
                  overviewRulerLanes: 0,
                  renderLineHighlight: "none",
                  wordWrap: "on",
                }}
              />
            </div>
            <div className="console">
              <div className="console-heading">
                <span>
                  <span className="status-light on" /> JOURNAL DU ROBOT
                </span>
                <button
                  onClick={() =>
                    setLogs((lines) =>
                      lines.filter((line) => !line.startsWith(`[${robot.id}]`)),
                    )
                  }
                >
                  Effacer
                </button>
              </div>
              <div
                className="log-lines"
                role="log"
                ref={(el) => {
                  if (el) logElements.current.set(robot.id, el);
                  else logElements.current.delete(robot.id);
                }}
              >
                {logs
                  .filter((line) => line.startsWith(`[${robot.id}]`))
                  .map((line, i) => (
                    <div key={i}>
                      <span>›</span> {line}
                    </div>
                  ))}
              </div>
            </div>
            <div className="editor-status">
              <span>● Sauvegardé sur cet appareil</span>
              <span>
                UTF-8 <b>TS</b>
              </span>
            </div>
          </section>
        ))}
      </div>
      <aside
        className="robot-telemetry"
        aria-label="Statistiques du robot sélectionné"
      >
        <header>
          <span>
            <Icon name="robots" size={17} /> Systèmes du robot
          </span>
          <strong>
            {selectedRobot.id} · {models[selectedRobot.model].name}
          </strong>
        </header>
        <dl>
          <div>
            <dt>Position</dt>
            <dd>
              ({selectedRobot.x}, {selectedRobot.y})
            </dd>
          </div>
          <div>
            <dt>Déplacement</dt>
            <dd>
              {robotSpeed(s, selectedRobot).toLocaleString("fr-FR")} case/s
            </dd>
          </div>
          <div>
            <dt>Soute</dt>
            <dd>
              {sum(selectedRobot.inventory)} / {capacity(s, selectedRobot)}
            </dd>
          </div>
          <div>
            <dt>Déploiement</dt>
            <dd>{selectedRobot.deployed ? "Sur le terrain" : "Au garage"}</dd>
          </div>
        </dl>
      </aside>
      <div className="control-hub" inert={!!panel} aria-hidden={!!panel}>
        <div className="program-strip">
          <div className="run-controls">
            {running ? (
              <>
                <button
                  className="action-button orange"
                  aria-label="Arrêter le programme"
                  title="Arrêter le programme"
                  onClick={() => stop()}
                >
                  <Icon name="stop" size={22} />
                </button>
                <button
                  className="action-button orange"
                  aria-label={paused ? "▶ Reprendre" : "Ⅱ Pause"}
                  title={paused ? "Reprendre" : "Pause"}
                  onClick={pause}
                >
                  <Icon name={paused ? "play" : "pause"} size={24} />
                </button>
              </>
            ) : (
              <button
                className="action-button"
                aria-label="▶ Exécuter"
                disabled={!selectedRobot.deployed}
                title={
                  selectedRobot.deployed
                    ? "Exécuter le programme"
                    : "Déployez ce robot depuis la flotte"
                }
                onClick={() => void run()}
              >
                <Icon name="play" size={26} />
              </button>
            )}
          </div>
          <button
            className="program-name"
            onClick={() => setEditorOpen(!editorOpen)}
            title="Afficher ou masquer le code"
          >
            <strong>{s.activeRobotId}</strong>
            <span>
              {running
                ? paused
                  ? "EN PAUSE"
                  : "EN COURS"
                : selectedRobot.deployed
                  ? "PRÊT À EXÉCUTER"
                  : "AU GARAGE"}
            </span>
          </button>
          <select
            className="speed"
            aria-label="Vitesse de simulation"
            value={speed}
            onChange={(e) => {
              setSpeed(+e.target.value);
              speedRef.current = +e.target.value;
            }}
          >
            {[1, 2, 5].map((n) => (
              <option key={n} value={n}>
                ×{n}
              </option>
            ))}
          </select>
        </div>
      </div>
      {notice && (
        <div
          className={"action-notice " + (notice.error ? "error" : "")}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          {notice.error &&
            selectedRobot.lastError &&
            notice.text.includes(selectedRobot.lastError) && (
              <button
                onClick={() => {
                  setPanel(null);
                  setEditorOpen(true);
                  setNotice(null);
                }}
              >
                Voir mon programme
              </button>
            )}
          <button
            className="notice-dismiss"
            aria-label="Fermer la notification"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}
      <div className="scene-hint">
        Glisser pour tourner <span>·</span> Molette pour zoomer <span>·</span> ?
        pour le guide
      </div>
      {panel && (
        <div
          className={
            "panel-backdrop " +
            (panel === "Recherches" ||
            panel === "Magasin" ||
            panel === "Inventaire" ||
            panel === "Robots" ||
            panel === "Missions" ||
            panel === "API & aide" ||
            panel === "Session et sauvegarde"
              ? "skills-backdrop"
              : "")
          }
          onClick={() => setPanel(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={panel}
            className={
              "detail-panel floating-window " +
              (panel === "API & aide"
                ? "menu-guide "
                : panel === "Magasin"
                  ? "menu-market "
                  : panel === "Session et sauvegarde"
                    ? "menu-account "
                    : panel === "Inventaire"
                      ? "menu-inventory "
                      : "menu-progression ") +
              (panel === "Recherches" ||
              panel === "Magasin" ||
              panel === "Inventaire" ||
              panel === "Robots" ||
              panel === "Missions" ||
              panel === "API & aide" ||
              panel === "Session et sauvegarde"
                ? "skill-screen"
                : "")
            }
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPanel(null);
            }}
            tabIndex={-1}
            ref={dialogRef}
          >
            <div className="window-titlebar">
              <Icon
                name={
                  panel === "Inventaire"
                    ? "inventory"
                    : panel === "Missions"
                      ? "flag"
                      : panel === "Recherches"
                        ? "research"
                        : panel === "Robots"
                          ? "robots"
                          : panel === "Magasin"
                            ? "shop"
                            : "info"
                }
                size={19}
              />
              <strong>{panel}</strong>
              <button
                className="close-button"
                aria-label="Fermer le panneau"
                onClick={() => setPanel(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <WorkspaceNav current={panel} onNavigate={setPanel} />
            <div className="panel-content">
              {panel === "Inventaire" && (
                <InventoryPanel
                  farm={s}
                  paused={paused}
                  onPause={pause}
                  onAction={inventoryAction}
                  onShop={() => setPanel("Magasin")}
                />
              )}
              {panel === "Session et sauvegarde" && (
                <SessionPanel
                  disabled={sessionBusy}
                  status={syncStatus}
                  onAction={sessionAction}
                >
                  <SaveSlotsPanel
                    disabled={sessionBusy}
                    status={syncStatus}
                    actions={slotActions}
                  />
                  <CompanionPanel
                    farm={s}
                    onCustomize={(id) => {
                      if (customizeCompanion(farm.current, id)) {
                        refresh();
                        notify("La nouvelle tenue de Luma est équipée.");
                      }
                    }}
                  />
                </SessionPanel>
              )}
              {panel === "Missions" && (
                <MissionPanel
                  farm={s}
                  onClaim={claimMission}
                  onNavigate={navigateMission}
                />
              )}
              {panel === "Robots" && (
                <FleetPanel
                  farm={s}
                  paused={paused}
                  runtimes={Object.fromEntries(
                    [...runtimes.current].map(([id, rt]) => [
                      id,
                      rt.worker ? "running" : "starting",
                    ]),
                  )}
                  onPause={pause}
                  onAction={fleetAction}
                />
              )}
              {panel === "Magasin" && (
                <Shop
                  onInventory={() => setPanel("Inventaire")}
                  farm={s}
                  paused={paused}
                  onPause={pause}
                  onAction={shopAction}
                />
              )}
              {panel === "Recherches" && (
                <SkillTree
                  farm={s}
                  onBuy={(id) => {
                    const ok = buy(farm.current, id);
                    refresh();
                    notify(
                      ok
                        ? `${research.find((r) => r.id === id)?.name ?? "Recherche"} débloquée.`
                        : "Recherche indisponible : vérifiez les prérequis et les matériaux.",
                      !ok,
                    );
                  }}
                  onSell={() => {
                    const ok =
                      getStock(farm.current, "Hay") >= 10
                        ? sellStock(farm.current, "Hay", 10) > 0
                        : sell(farm.current);
                    refresh();
                    notify(
                      ok
                        ? "Vente effectuée. Votre solde d’or est à jour."
                        : "Pas assez de foin ou de blé dans les dépôts pour cette vente.",
                      !ok,
                    );
                  }}
                />
              )}
              {panel === "API & aide" && (
                <HelpPanel
                  docs={docs}
                  busy={
                    running ||
                    selectedRobot.readyAt > s.time ||
                    !!selectedRobot.moving
                  }
                  garage={!selectedRobot.deployed}
                  onNavigate={(destination) => {
                    if (destination === "code") {
                      setEditorOpen(true);
                      setPanel(null);
                    } else setPanel(destination);
                  }}
                  onCommand={(name) => {
                    try {
                      const result = command(
                        farm.current,
                        name,
                        name === "plant"
                          ? [
                              farm.current.unlocks.includes("wheat-base")
                                ? "Wheat"
                                : farm.current.unlocks.includes("bush")
                                  ? "Bush"
                                  : "Grass",
                            ]
                          : [],
                      );
                      refresh();
                      const message = result
                        ? `${name}() → ${result}`
                        : name === "harvest"
                          ? "Aucune entité retirée : la case est vide ou la soute est pleine."
                          : name === "deposit"
                            ? "Aucun dépôt effectué : vérifiez la cargaison et la proximité d’un dépôt disposant de place."
                            : "Semis impossible : vérifiez que la case est agricole et libre.";
                      log(message);
                      return message;
                    } catch (e) {
                      return e instanceof Error ? e.message : String(e);
                    }
                  }}
                  onReset={() => {
                    if (
                      confirm(
                        "Effacer la ferme et recommencer ? Le code actuel sera conservé dans les exemples.",
                      )
                    ) {
                      stopAll();
                      const previousProgram = activeRobot(farm.current).code;
                      farm.current = { ...fresh(), previousProgram };
                      setCode(activeRobot(farm.current).code);
                      localStorage.setItem(
                        "farmscript-code",
                        activeRobot(farm.current).code,
                      );
                      setExpanded(null);
                      setEditorOpen(true);
                      setShowStart(true);
                      localStorage.removeItem("farmscript-tips-dismissed");
                      refresh();
                      notify(
                        "Nouvelle ferme créée avec le premier programme. Votre ancien code est conservé dans « Mon programme précédent ».",
                      );
                      setPanel(null);
                    }
                  }}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
