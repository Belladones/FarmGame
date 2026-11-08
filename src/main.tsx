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
  missions,
  sell,
  type Farm,
  hydrateFarm,
  advance,
  activeRobot,
  capacity,
  stockCapacity,
  totalStock,
  getStock,
  selectRobot,
  purchase,
  sellStock,
  fulfillOrder,
  resellAsset,
  repair,
  relocateBuilding,
  releaseReservation,
  at,
  cropProgress,
} from "./engine";
import { FarmScene } from "./FarmScene";
import { CloudSave, downloadFarm, type SyncStatus } from "./persistence";
import { SessionPanel, type SessionAction } from "./SessionPanel";
import { Shop, type ShopAction } from "./Shop";
import { declarations } from "./api";
import { models, itemNames, sum } from "./catalog";
import { SkillTree } from "./SkillTree";
import { Icon, ResourceIcon } from "./Icons";
import "./style.css";
(self as any).MonacoEnvironment = {
  getWorker: (_: unknown, label: string) =>
    label === "typescript" || label === "javascript"
      ? new TsWorker()
      : new EditorWorker(),
};
loader.config({ monaco });
monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
  strict: true,
  noEmit: true,
});
monaco.languages.typescript.typescriptDefaults.addExtraLib(
  declarations,
  "file:///farm-api.d.ts",
);
const starter = `// Votre première ferme autonome 🌱\n// Chaque récolte prend 5 secondes.\nwhile (true) {\n  harvest();\n  plant(Entities.Wheat);\n  deposit();\n}\n`;
const examples: Record<string, string> = {
  "Première boucle": starter,
  "Avec un capteur":
    "// Recherches : Conditions + Capteur de maturité\nwhile (true) {\n  if (can_harvest()) {\n    harvest();\n    deposit();\n  }\n  plant(Entities.Wheat);\n}",
  "Explorer les parcelles":
    "// Recherches : Trois parcelles + Positionnement\nfor (let x: number = 0; x < get_world_size().width; x++) {\n  plant(Entities.Wheat);\n  move(Direction.East);\n}\nwhile (get_pos_x() > 0) {\n  move(Direction.West);\n}\ndeposit();",
};
const docs = [
  ["plant(Entities.Wheat)", "Plante gratuitement sur la case vide du robot."],
  [
    "harvest()",
    "Récolte une plante mûre. Fermier uniquement, soute de base : 10 unités.",
  ],
  ["deposit()", "Transfère la soute au dépôt depuis la case (0, 0)."],
  ["move(Direction.East)", "Avance sur une case accessible, sans rebouclage."],
  ["can_harvest()", "Retourne un boolean. Recherche : Capteur de maturité."],
  [
    "get_pos_x() / get_pos_y()",
    "Retourne une coordonnée. Recherche : Positionnement.",
  ],
  [
    "get_world_size()",
    "Retourne { width, height }. Recherche : Positionnement.",
  ],
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
    "Alterne prairie et terre labourée sur une case vide. Recherche Labourage, fermier uniquement.",
  ],
  [
    "watering() / refill_water()",
    "Arrose avec le réservoir embarqué ; le remplit depuis un puits ou une citerne adjacente. L’eau est distincte de la soute.",
  ],
  [
    "use_item(Items.Fertilizer)",
    "Consomme un engrais transporté pour ajouter de la croissance. Recherches Consommables et Engrais.",
  ],
  [
    "get_entity_type() / get_ground_type()",
    "Identifie la culture et le sol. Recherche Analyse de la parcelle.",
  ],
  [
    "get_water()",
    "Humidité de la parcelle entre 0 et 1. Recherche Capteur d’humidité.",
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
    "Solde d’or disponible. Les ventes du shop sont accessibles dès le début.",
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
  const farm = useRef(load());
  const [s, setS] = useState({ ...farm.current });
  const [code, setCode] = useState(
    () => activeRobot(farm.current).code || starter,
  );
  const [panel, setPanel] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(() => window.innerWidth >= 900);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [resetView, setResetView] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const cloud = useRef<CloudSave | null>(null);
  const syncReady = useRef(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    mode: "loading",
    player: null,
    dirty: false,
    lastSavedAt: null,
    message: "Recherche de votre session…",
  });
  const dialogRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
      if (event.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), select, a[href], [tabindex="0"]',
      );
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
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);
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
    let previousTick = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        elapsed = Math.min(1, (now - previousTick) / 1000);
      previousTick = now;
      if (pausedRef.current || !syncReady.current) return;
      advance(farm.current, elapsed * speedRef.current);
      for (const [id, rt] of runtimes.current) {
        const r = farm.current.robots.find((r) => r.id === id && !r.destroyed);
        if (!r) {
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
      refresh();
    }, 100);
    return () => {
      clearInterval(timer);
      for (const rt of runtimes.current.values()) rt.worker?.terminate();
      runtimes.current.clear();
    };
  }, []);
  async function run() {
    if (!syncReady.current) return;
    const id = farm.current.activeRobotId;
    stop(id);
    const generation = generations.current.get(id),
      rt: Runtime = { queue: [] };
    runtimes.current.set(id, rt);
    setRunning(true);
    const source = code;
    const r = farm.current.robots.find((r) => r.id === id);
    if (!r || r.destroyed) {
      stop(id);
      return;
    }
    r.code = source;
    const model = monaco.editor
      .getModels()
      .find((m) => m.getLanguageId() === "typescript");
    if (model) {
      try {
        const getClient =
            await monaco.languages.typescript.getTypeScriptWorker(),
          client = await getClient(model.uri);
        const diagnostics = [
          ...(await client.getSyntacticDiagnostics(model.uri.toString())),
          ...(await client.getSemanticDiagnostics(model.uri.toString())),
        ];
        if (generations.current.get(id) !== generation) return;
        if (diagnostics.length) {
          const d = diagnostics[0],
            pos = model.getPositionAt(d.start ?? 0),
            message =
              typeof d.messageText === "string"
                ? d.messageText
                : d.messageText.messageText;
          log(`Erreur TypeScript, ligne ${pos.lineNumber} : ${message}`);
          stop(id);
          return;
        }
      } catch {
        if (generations.current.get(id) === generation) {
          log(
            "Le service TypeScript n’est pas prêt. Réessayez dans un instant.",
          );
          stop(id);
        }
        return;
      }
    }
    if (generations.current.get(id) !== generation) return;
    const w = new Worker(new URL("./runner.worker.ts", import.meta.url), {
      type: "module",
    });
    rt.worker = w;
    w.onmessage = ({ data }) => {
      if (runtimes.current.get(id) !== rt) return;
      if (data.type === "call") rt.queue.push(data);
      else {
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
      log(`[${id}] Erreur du programme : ${e.message}`);
      stop(id);
    };
    w.postMessage({
      type: "run",
      code: source,
      conditions: farm.current.unlocks.includes("conditions"),
    });
    log(`[${id}] Programme lancé.`);
  }
  const chooseRobot = (id: string) => {
    if (selectRobot(farm.current, id)) {
      setCode(activeRobot(farm.current).code || starter);
      setRunning(runtimes.current.has(id));
      refresh();
    }
  };
  const shopAction = (action: ShopAction): boolean => {
    try {
      let result = false;
      if (action.type === "buy")
        result = purchase(
          farm.current,
          action.kind,
          action.quantity,
          action.site,
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
      return result;
    } catch (e) {
      log(e instanceof Error ? e.message : String(e));
      return false;
    }
  };
  const sessionAction = async (action: SessionAction) => {
    const client = cloud.current;
    if (!client) return;
    if (action.type === "export") {
      downloadFarm(farm.current);
      return;
    }
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
    }
  };
  const active = missions.find((m) => !s.claimed.includes(m.id));
  const togglePanel = (name: string) =>
    setPanel((p) => (p === name ? null : name));
  const pause = () => {
    pausedRef.current = !paused;
    setPaused(!paused);
  };
  const selectedRobot = activeRobot(s);
  const tile = at(s, s.x, s.y);
  const growth = cropProgress(s, tile);
  return (
    <div className={"game " + (!editorOpen ? "editor-collapsed" : "")}>
      {!sessionReady && (
        <div className="session-loading" role="status">
          Chargement de la session…
        </div>
      )}
      <FarmScene
        farm={s}
        paused={paused}
        running={running}
        zoom={zoom}
        resetView={resetView}
        editorOpen={editorOpen}
      />
      <header className="game-header">
        <div className="resources" aria-label="Ressources de la ferme">
          <div
            className="resource"
            title={`Blé au dépôt : ${s.stock} / ${stockCapacity(s)}`}
          >
            <ResourceIcon kind="wheat" />
            <strong>{s.stock}</strong>
            <span>BLÉ</span>
          </div>
          <div className="resource" title="Bois dans les dépôts">
            <ResourceIcon kind="wood" />
            <strong>{getStock(s, "Wood")}</strong>
            <span>BOIS</span>
          </div>
          <div className="resource" title="Carottes dans les dépôts">
            <ResourceIcon kind="carrot" />
            <strong>{getStock(s, "Carrot")}</strong>
            <span>CAROTTES</span>
          </div>
          <div
            className="resource"
            title="Eau dans le réservoir du robot sélectionné"
          >
            <ResourceIcon kind="water" />
            <strong>{selectedRobot.water.toFixed(1)}</strong>
            <span>EAU EMBARQUÉE</span>
          </div>
        </div>
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
            <span>●</span>{" "}
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
      <div className="island-caption">
        <span className="overline">VOTRE EXPLOITATION</span>
        <h1>Un petit monde à programmer.</h1>
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
      <div className="plot-info">
        <span className="plot-coordinate">
          {s.x}, {s.y}
        </span>
        <div>
          <strong>
            {!tile
              ? "Hors parcelle agricole"
              : tile.planted === null
                ? "Prêt à planter"
                : growth >= 1
                  ? "La culture est mûre !"
                  : "La culture pousse…"}
          </strong>
          <span>
            {!tile
              ? "Case de construction"
              : tile.planted === null
                ? "plant(Entities.Wheat)"
                : `${Math.round(growth * 100)} % · ${growth >= 1 ? "harvest()" : "Croissance en cours"}`}
          </span>
        </div>
        {tile && tile.planted !== null && (
          <div className="growth-meter">
            <i style={{ width: growth * 100 + "%" }} />
          </div>
        )}
      </div>
      <section
        className={
          "workspace floating-window " +
          (!editorOpen ? "window-hidden " : "") +
          (expanded ? "expanded" : "")
        }
        aria-label="Éditeur TypeScript"
        aria-hidden={!editorOpen}
      >
        <div className="window-titlebar">
          <span className="file-icon">TS</span>
          <strong>{s.activeRobotId}</strong>
          <select
            className="robot-picker"
            aria-label="Robot à programmer"
            value={s.activeRobotId}
            onChange={(e) => chooseRobot(e.target.value)}
          >
            {s.robots
              .filter((r) => !r.destroyed)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {models[r.model].name}
                  {runtimes.current.has(r.id) ? " · ▶" : ""}
                </option>
              ))}
          </select>
          <div className="window-actions">
            <button
              title="Réduire l’éditeur"
              aria-label="Réduire l’éditeur"
              onClick={() => setEditorOpen(false)}
            >
              <Icon name="minimize" size={16} />
            </button>
            <button
              title={expanded ? "Restaurer" : "Agrandir"}
              aria-label="Agrandir l’éditeur"
              onClick={() => setExpanded(!expanded)}
            >
              <Icon name="expand" size={14} />
            </button>
          </div>
        </div>
        <div className="toolbar">
          <select
            aria-label="Charger un exemple"
            defaultValue=""
            disabled={running}
            onChange={(e) => {
              if (e.target.value) {
                setCode(examples[e.target.value]);
                activeRobot(farm.current).code = examples[e.target.value];
                localStorage.setItem(
                  "farmscript-code",
                  examples[e.target.value],
                );
                refresh();
              }
            }}
          >
            <option value="" disabled>
              Exemples de programmes
            </option>
            {Object.keys(examples).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <span>TypeScript</span>
        </div>
        <div className="editor">
          <Editor
            path="file:///robot.ts"
            height="100%"
            language="typescript"
            theme="vs-dark"
            value={code}
            onChange={(v) => {
              setCode(v || "");
              activeRobot(farm.current).code = v || "";
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
              readOnly: running,
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
            <button onClick={() => setLogs([])}>Effacer</button>
          </div>
          <div className="log-lines" role="log" ref={logRef}>
            {logs.map((line, i) => (
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
      <div className="control-hub">
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
                title="Exécuter le programme"
                onClick={run}
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
              {running ? (paused ? "EN PAUSE" : "EN COURS") : "PRÊT À EXÉCUTER"}
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
        <nav className="dock" aria-label="Outils de la ferme">
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
            className={"dock-button " + (panel === "Shop" ? "selected" : "")}
            aria-label="Shop"
            title="Shop"
            onClick={() => togglePanel("Shop")}
          >
            <Icon name="shop" size={29} />
            <span>Shop</span>
          </button>
          <button
            className="dock-button"
            aria-label="Zoomer sur la ferme"
            title="Zoomer sur la ferme"
            onClick={() => setZoom((z) => (z >= 1.5 ? 1 : z + 0.25))}
          >
            <Icon name="zoom" size={29} />
            <span>Zoom</span>
          </button>
          <button
            className="dock-button"
            aria-label="Recentrer la vue"
            title="Recentrer la vue"
            onClick={() => {
              setZoom(1);
              setResetView((r) => r + 1);
            }}
          >
            <Icon name="home" size={29} />
            <span>Ferme</span>
          </button>
        </nav>
      </div>
      <button className="mission-peek" onClick={() => togglePanel("Missions")}>
        <span className="mission-emblem">
          <Icon name="flag" size={20} />
        </span>
        <div>
          <span>
            MISSION{" "}
            {Math.min(s.claimed.length + 1, missions.length)
              .toString()
              .padStart(2, "0")}{" "}
            / {missions.length.toString().padStart(2, "0")}
          </span>
          <strong>{active?.title || "Toutes les missions terminées"}</strong>
          {active && (
            <div className="mission-progress">
              <i
                style={{
                  width:
                    Math.min(1, active.progress(s) / active.target) * 100 + "%",
                }}
              />
            </div>
          )}
        </div>
        <Icon name="arrow" size={18} />
      </button>
      <div className="scene-hint">
        Glisser pour tourner <span>·</span> Molette pour zoomer
      </div>
      {panel && (
        <div
          className={
            "panel-backdrop " +
            (panel === "Recherches" || panel === "Shop"
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
              (panel === "Recherches" || panel === "Shop" ? "skill-screen" : "")
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
                  panel === "Missions"
                    ? "flag"
                    : panel === "Recherches"
                      ? "research"
                      : panel === "Shop"
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
            <div className="panel-content">
              {panel === "Session et sauvegarde" && (
                <SessionPanel status={syncStatus} onAction={sessionAction} />
              )}
              {panel === "Missions" && (
                <>
                  <p className="panel-intro">
                    Chaque récolte vous apprend quelque chose.
                    <br />
                    Faites grandir votre ferme, une ligne de code à la fois.
                  </p>
                  <div className="mission-grid">
                    {missions.map((m, i) => {
                      const done = s.claimed.includes(m.id),
                        available = active?.id === m.id;
                      return (
                        <article
                          className={"mission " + (done ? "complete" : "")}
                          key={m.id}
                        >
                          <div className="mission-number">
                            {done ? "✓" : String(i + 1).padStart(2, "0")}
                          </div>
                          <div>
                            <h3>{m.title}</h3>
                            <p>{m.text}</p>
                            <div className="mission-progress">
                              <i
                                style={{
                                  width:
                                    Math.min(1, m.progress(s) / m.target) *
                                      100 +
                                    "%",
                                }}
                              />
                            </div>
                            <small>
                              {Math.min(m.target, m.progress(s))} / {m.target}
                              <span>+{m.reward} blés</span>
                            </small>
                            <button
                              disabled={
                                !available ||
                                m.progress(s) < m.target ||
                                totalStock(s) + m.reward > stockCapacity(s)
                              }
                              onClick={() => {
                                claim(farm.current, m.id);
                                refresh();
                              }}
                            >
                              {done
                                ? "Terminée"
                                : available
                                  ? "Récupérer la récompense"
                                  : "À venir"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
              {panel === "Shop" && (
                <Shop
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
                    buy(farm.current, id);
                    refresh();
                  }}
                  onSell={() => {
                    sell(farm.current);
                    refresh();
                  }}
                />
              )}
              {panel === "API & aide" && (
                <div className="docs">
                  <h2>Un robot. Vos instructions.</h2>
                  <p>
                    Lancez le programme f1 pour planter, récolter et déposer
                    automatiquement. Le plateau affiche uniquement vos cases
                    débloquées. Glissez sur le champ pour tourner la caméra et
                    voir tous ses côtés. La première extension ajoute deux cases
                    à droite de (0, 0).
                  </p>
                  <div className="manual">
                    <span>Essayer une commande</span>
                    {["plant", "harvest", "deposit"].map((name) => (
                      <button
                        key={name}
                        disabled={running}
                        onClick={() => {
                          try {
                            const result = command(
                              farm.current,
                              name,
                              name === "plant" ? ["Wheat"] : [],
                            );
                            log(`${name}() → ${result}`);
                            refresh();
                          } catch (e) {
                            log(String(e));
                          }
                        }}
                      >
                        {name}()
                      </button>
                    ))}
                  </div>
                  {docs.map(([name, text]) => (
                    <div className="api-entry" key={name}>
                      <code>{name}</code>
                      <span>{text}</span>
                    </div>
                  ))}
                  <p>
                    TypeScript : variables, boucles et fonctions nommées sont
                    disponibles. Les callbacks, générateurs et imports ne sont
                    pas encore pris en charge. Chaque robot a son propre
                    programme ; sélectionnez-le dans l’éditeur ou depuis le
                    shop. La progression est sauvegardée sur cet appareil.
                  </p>
                  <button
                    className="reset-farm"
                    onClick={() => {
                      if (
                        confirm(
                          "Effacer la ferme et recommencer ? Le code sera conservé.",
                        )
                      ) {
                        stopAll();
                        farm.current = fresh();
                        activeRobot(farm.current).code = code;
                        refresh();
                        log("Nouvelle ferme créée.");
                      }
                    }}
                  >
                    <Icon name="reset" size={15} /> Recommencer la ferme
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
