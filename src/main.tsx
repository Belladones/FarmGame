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
  research,
  sell,
  type Farm,
} from "./engine";
import { FarmScene } from "./FarmScene";
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
  `declare enum Entities { Wheat = "Wheat" }\ndeclare enum Resources { Wheat = "Wheat" }\ndeclare enum Direction { North = "North", East = "East", South = "South", West = "West" }\ndeclare function plant(entity: Entities): boolean;\ndeclare function harvest(): boolean;\ndeclare function deposit(): number;\ndeclare function move(direction: Direction): boolean;\ndeclare function can_harvest(): boolean;\ndeclare function get_pos_x(): number;\ndeclare function get_pos_y(): number;\ndeclare function get_world_size(): {width: number; height: number};\ndeclare function get_inventory(resource: Resources): number;\ndeclare function get_stock(resource: Resources): number;\ndeclare function get_capacity(): number;\ndeclare function print(...values: unknown[]): void;`,
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
  ["harvest()", "Récolte une plante mûre dans la soute (20 unités)."],
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
  ["get_capacity()", "Retourne la capacité de la soute : 20."],
  ['print("Bonjour !")', "Écrit dans le journal. Recherche : Journal."],
];
function load(): Farm {
  try {
    const data = JSON.parse(localStorage.getItem("farmscript-v1") || "null");
    if (
      data?.version === 1 &&
      Array.isArray(data.farm.tiles) &&
      data.farm.tiles.length === data.farm.width
    )
      return data.farm;
  } catch {}
  return fresh();
}
function App() {
  const farm = useRef(load());
  const [s, setS] = useState({ ...farm.current });
  const [code, setCode] = useState(
    () => localStorage.getItem("farmscript-code") || starter,
  );
  const [panel, setPanel] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(() => window.innerWidth >= 900);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [resetView, setResetView] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
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
  const runId = useRef(0);
  const pausedRef = useRef(false),
    speedRef = useRef(1),
    worker = useRef<Worker | null>(null),
    queue = useRef<any[]>([]);
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
  };
  const stop = () => {
    runId.current++;
    worker.current?.terminate();
    worker.current = null;
    queue.current = [];
    setRunning(false);
    setPaused(false);
    pausedRef.current = false;
  };
  useEffect(() => {
    let previousTick = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      // Keep growth tied to elapsed time when rendering is slow, without offline catch-up.
      const elapsed = Math.min(1, (now - previousTick) / 1000);
      previousTick = now;
      if (pausedRef.current) return;
      farm.current.time += elapsed * speedRef.current;
      const request = queue.current.shift();
      if (request && worker.current) {
        try {
          const value =
            request.name === "__step"
              ? undefined
              : command(farm.current, request.name, request.args);
          if (request.name === "print") log(request.args.map(String).join(" "));
          worker.current.postMessage({ type: "result", id: request.id, value });
        } catch (e) {
          worker.current.postMessage({
            type: "result",
            id: request.id,
            error: String(e instanceof Error ? e.message : e),
          });
        }
      }
      refresh();
    }, 100);
    return () => {
      clearInterval(timer);
      worker.current?.terminate();
    };
  }, []);
  async function run() {
    stop();
    const generation = runId.current;
    setRunning(true);
    const model = monaco.editor
      .getModels()
      .find((m) => m.getLanguageId() === "typescript");
    if (model) {
      try {
        const getClient =
          await monaco.languages.typescript.getTypeScriptWorker();
        const client = await getClient(model.uri);
        const diagnostics = [
          ...(await client.getSyntacticDiagnostics(model.uri.toString())),
          ...(await client.getSemanticDiagnostics(model.uri.toString())),
        ];
        if (diagnostics.length) {
          const d = diagnostics[0];
          const pos = model.getPositionAt(d.start ?? 0);
          const message =
            typeof d.messageText === "string"
              ? d.messageText
              : d.messageText.messageText;
          log(`Erreur TypeScript, ligne ${pos.lineNumber} : ${message}`);
          stop();
          return;
        }
      } catch {
        log("Le service TypeScript n’est pas prêt. Réessayez dans un instant.");
        stop();
        return;
      }
    }
    if (generation !== runId.current) return;
    const w = new Worker(new URL("./runner.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = ({ data }) => {
      if (worker.current !== w) return;
      if (data.type === "call") queue.current.push(data);
      else {
        if (data.type === "error") log("Erreur : " + data.message);
        else log("Programme terminé.");
        stop();
      }
    };
    w.onerror = (e) => {
      log("Erreur du programme : " + e.message);
      stop();
    };
    w.postMessage({
      type: "run",
      code,
      conditions: farm.current.unlocks.includes("conditions"),
    });
    setRunning(true);
    log("Programme lancé.");
  }
  const active = missions.find((m) => !s.claimed.includes(m.id));
  const togglePanel = (name: string) =>
    setPanel((p) => (p === name ? null : name));
  const pause = () => {
    pausedRef.current = !paused;
    setPaused(!paused);
  };
  const tile = s.tiles[s.x];
  const growth =
    tile.planted === null ? 0 : Math.min(1, (s.time - tile.planted) / 5);
  return (
    <div className={"game " + (!editorOpen ? "editor-collapsed" : "")}>
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
          <div className="resource" title={`Blé au dépôt : ${s.stock} / 200`}>
            <ResourceIcon kind="wheat" />
            <strong>{s.stock}</strong>
            <span>BLÉ</span>
          </div>
          <div
            className="resource unavailable"
            title="Le bois sera disponible dans une prochaine version"
          >
            <ResourceIcon kind="wood" />
            <strong>—</strong>
            <span>BOIS · VERROUILLÉ</span>
          </div>
          <div
            className="resource unavailable"
            title="Les carottes seront disponibles dans une prochaine version"
          >
            <ResourceIcon kind="carrot" />
            <strong>—</strong>
            <span>CAROTTES · VERROUILLÉ</span>
          </div>
          <div
            className="resource unavailable"
            title="L’eau sera disponible dans une prochaine version"
          >
            <ResourceIcon kind="water" />
            <strong>—</strong>
            <span>EAU · VERROUILLÉE</span>
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
            <span title="Cargaison du robot">▣ {s.cargo} / 20</span>
          </div>
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
          {s.width} × 1 parcelle{s.width > 1 ? "s" : ""}
        </p>
      </div>
      <div className="plot-info">
        <span className="plot-coordinate">{s.x}, 0</span>
        <div>
          <strong>
            {tile.planted === null
              ? "Prêt à planter"
              : growth >= 1
                ? "Le blé est mûr !"
                : "Le blé pousse…"}
          </strong>
          <span>
            {tile.planted === null
              ? "plant(Entities.Wheat)"
              : `${Math.round(growth * 100)} % · ${growth >= 1 ? "harvest()" : "5 secondes à ×1"}`}
          </span>
        </div>
        {tile.planted !== null && (
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
          <strong>f1</strong>
          <span className="filename">mon-premier-robot.ts</span>
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
                localStorage.setItem(
                  "farmscript-code",
                  examples[e.target.value],
                );
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
              localStorage.setItem("farmscript-code", v || "");
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
                  onClick={stop}
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
            <strong>f1</strong>
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
        <div className="panel-backdrop" onClick={() => setPanel(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={panel}
            className="detail-panel floating-window"
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
                                s.stock + m.reward > 200
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
              {panel === "Recherches" && (
                <>
                  <div className="research-summary">
                    <ResourceIcon kind="wheat" />
                    <div>
                      <strong>{s.stock} blés</strong>
                      <span>disponibles dans le dépôt</span>
                    </div>
                  </div>
                  <div className="research-grid">
                    {research.map((r) => (
                      <article key={r.id}>
                        <h3>{r.name}</h3>
                        <p>{r.detail}</p>
                        <button
                          disabled={
                            s.unlocks.includes(r.id) ||
                            s.stock < r.cost ||
                            (r.id === "position" && s.width < 3)
                          }
                          onClick={() => {
                            buy(farm.current, r.id);
                            refresh();
                          }}
                        >
                          {s.unlocks.includes(r.id)
                            ? "✓ Acquis"
                            : `Rechercher · ${r.cost} blés`}
                        </button>
                      </article>
                    ))}
                  </div>
                  <div className="trade">
                    <span>◈ {s.gold} pièces d’or</span>
                    <button
                      disabled={s.stock < 10}
                      onClick={() => {
                        sell(farm.current);
                        refresh();
                      }}
                    >
                      Vendre 10 blés · +10 or
                    </button>
                  </div>
                </>
              )}
              {panel === "API & aide" && (
                <div className="docs">
                  <h2>Un robot. Vos instructions.</h2>
                  <p>
                    Lancez le programme f1 pour planter, récolter et déposer
                    automatiquement. Le robot travaille sur les cases bordées
                    d’or ; le reste de l’îlot est un décor sauvage. Vos
                    premières recherches permettent d’exploiter trois cases.
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
                    disponibles. Les callbacks, générateurs, imports et cultures
                    autres que le blé ne sont pas encore pris en charge. La
                    progression est sauvegardée sur cet appareil.
                  </p>
                  <button
                    className="reset-farm"
                    onClick={() => {
                      if (
                        confirm(
                          "Effacer la ferme et recommencer ? Le code sera conservé.",
                        )
                      ) {
                        stop();
                        farm.current = fresh();
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
