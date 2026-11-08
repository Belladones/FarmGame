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
  const [tab, setTab] = useState("Missions");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const runId = useRef(0);
  const pausedRef = useRef(false),
    speedRef = useRef(1),
    worker = useRef<Worker | null>(null),
    queue = useRef<any[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "Bienvenue ! Lancez votre premier programme.",
  ]);
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
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      farm.current.time += 0.1 * speedRef.current;
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
  return (
    <div className="app">
      <header>
        <a className="brand" href="#">
          <span className="brand-icon">⌘</span> Farm<span>Script</span>
          <small>APPRENDRE. CULTIVER. AUTOMATISER.</small>
        </a>
        <div className="header-right">
          <span className="saved">● Sauvegarde locale</span>
          <span className="version">ALPHA 0.1</span>
        </div>
      </header>
      <main>
        <section className="farm-panel">
          <div className="section-label">VOTRE PETIT COIN DE CODE</div>
          <h1>
            Les bonnes idées
            <br />
            prennent racine<span>.</span>
          </h1>
          <p className="intro">
            Un robot, quelques graines et vos premières lignes de TypeScript.
          </p>
          <div className="resources">
            <div>
              <span>🌾</span>
              <strong>
                {s.stock}
                <small>/ 200</small>
              </strong>
              <label>Blé au dépôt</label>
            </div>
            <div>
              <span>◈</span>
              <strong>{s.gold}</strong>
              <label>Pièces d’or</label>
            </div>
            <div>
              <span>▣</span>
              <strong>
                {s.cargo}
                <small>/ 20</small>
              </strong>
              <label>Soute du robot</label>
            </div>
          </div>
          <div className="world">
            <div className="world-top">
              <span>
                <i /> PARCELLE {s.width} × 1
              </span>
              <span>
                {running
                  ? paused
                    ? "En pause"
                    : "Robot au travail"
                  : "Prêt à cultiver"}
              </span>
            </div>
            <div className="landscape">
              <div className="cloud cloud-one" />
              <div className="cloud cloud-two" />
              <div className="hill hill-one" />
              <div className="hill hill-two" />
              <div className="farm-ground">
                <div className="depot" title="Dépôt adjacent à (0, 0)">
                  🏠<span>DÉPÔT</span>
                </div>
                <div className="tiles">
                  {s.tiles.map((t, i) => {
                    const progress =
                      t.planted === null
                        ? 0
                        : Math.min(1, (s.time - t.planted) / 5);
                    return (
                      <div
                        key={i}
                        className={"tile " + (progress >= 1 ? "ripe" : "")}
                      >
                        <span className="crop">
                          {t.planted === null
                            ? "·"
                            : progress < 0.35
                              ? "🌱"
                              : progress < 1
                                ? "🌿"
                                : "🌾"}
                        </span>
                        {s.x === i && <span className="robot">🤖</span>}
                        <span className="coordinate">{i}, 0</span>
                        {t.planted !== null && (
                          <div className="growth">
                            <i style={{ width: progress * 100 + "%" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="ground-shadow" />
            </div>
            <div className="world-footer">
              <span>☀ Temps de pousse : 5 s</span>
              <span>↗ Nord = +y · Est = +x</span>
            </div>
          </div>
          <div className="notebook">
            <span>✦</span>
            <div>
              <strong>Votre code fait pousser les choses.</strong>
              <p>
                Commencez avec la boucle proposée. Observez le robot, récoltez
                du blé, puis débloquez de nouvelles possibilités.
              </p>
            </div>
          </div>
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
        </section>
        <section className="workspace">
          <div className="editor-top">
            <div>
              <span className="file-icon">TS</span> mon-premier-robot.ts{" "}
              <span className="dot">●</span>
            </div>
            <span className="language">TypeScript</span>
          </div>
          <div className="toolbar">
            <select
              aria-label="Charger un exemple"
              defaultValue=""
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
            <div className="run-controls">
              <select
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
              {running ? (
                <>
                  <button
                    onClick={() => {
                      pausedRef.current = !paused;
                      setPaused(!paused);
                    }}
                  >
                    {paused ? "▶ Reprendre" : "Ⅱ Pause"}
                  </button>
                  <button aria-label="Arrêter le programme" onClick={stop}>
                    ■
                  </button>
                </>
              ) : (
                <button className="primary" onClick={run}>
                  ▶ Exécuter
                </button>
              )}
            </div>
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
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 22 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                fontFamily: "monospace",
                readOnly: running,
              }}
            />
          </div>
          <div className="console">
            <div className="console-heading">
              <span>›_ JOURNAL DU ROBOT</span>
              <button onClick={() => setLogs([])}>Effacer</button>
            </div>
            <div className="log-lines" role="log">
              {logs.map((line, i) => (
                <div key={i}>
                  <span>›</span> {line}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <section className="bottom">
        <nav>
          {["Missions", "Recherches", "API & aide"].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t === "Missions" ? "⚑" : t === "Recherches" ? "⌘" : "⌁"} {t}
              {t === "Missions" && (
                <span>
                  {s.claimed.length}/{missions.length}
                </span>
              )}
            </button>
          ))}
          <button
            className="sell"
            disabled={s.stock < 10}
            onClick={() => {
              sell(farm.current);
              refresh();
            }}
          >
            Vendre 10 blés · +10 or ↗
          </button>
        </nav>
        {tab === "Missions" && (
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
                            Math.min(1, m.progress(s) / m.target) * 100 + "%",
                        }}
                      />
                    </div>
                    <small>
                      {Math.min(m.target, m.progress(s))} / {m.target}{" "}
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
        )}
        {tab === "Recherches" && (
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
        )}
        {tab === "API & aide" && (
          <div className="docs">
            <p>
              Du vrai TypeScript : variables, boucles et fonctions nommées sont
              disponibles. Les appels du robot sont séquencés automatiquement.
              Ce prototype ne prend pas encore en charge les callbacks,
              générateurs ou imports. Les recherches de langage avancées et les
              autres cultures arriveront ensuite.
            </p>
            {docs.map(([name, text]) => (
              <div key={name}>
                <code>{name}</code>
                <span>{text}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <footer>
        <span>
          FARMSCRIPT <b>·</b> Petit à petit, le code devient une récolte.
        </span>
        <button
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
          Recommencer la ferme
        </button>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
