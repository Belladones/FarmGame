require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { fresh } = require("../src/engine.ts");
const { research } = require("../src/catalog.ts");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    async function scenario(code, library, unlocked = true) {
      const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      p.setDefaultTimeout(45000);
      const f = fresh();
      f.unlocks = research
        .filter((r) => !r.localOnly && (unlocked || r.id !== "imports"))
        .map((r) => r.id);
      f.robots[0].code = code;
      f.robots.push({
        ...structuredClone(f.robots[0]),
        id: "f2",
        deployed: false,
        code: library,
      });
      await p.addInitScript((f) => {
        if (!localStorage.getItem("farmscript-v1"))
          localStorage.setItem(
            "farmscript-v1",
            JSON.stringify({ version: 1, farm: f }),
          );
      }, f);
      await p.goto(process.env.FARM_URL || "http://localhost:5173");
      const workspace = p.locator('[data-robot-id="f1"]');
      await workspace.locator(".monaco-editor").waitFor();
      await workspace
        .getByRole("button", { name: "Exécuter f1", exact: true })
        .click();
      return { p, workspace };
    }
    const code = `import { recolter as action } from "./f2";
const liste: string[] = ["Hay", "Wood", "Carrot"];
const stock: Record<string, number> = { Hay: 3 };
for (const item of liste) { console.log(item); }
for (let i = 0; i < stock.Hay; i++) { action(); }
console.log("IMPORT_OK");`;
    const library =
      'console.log("MODULE_INIT"); export function recolter(): void { harvest(); deposit(); }';
    let { p, workspace } = await scenario(code, library);
    await p.waitForFunction(() =>
      document
        .querySelector('[data-robot-id="f1"] .log-lines')
        .textContent.includes("IMPORT_OK"),
    );
    const log = await workspace.locator(".log-lines").innerText();
    assert.equal(log.split("MODULE_INIT").length - 1, 1);
    const f = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    assert.ok(f.resources.Hay >= 1, "imported API calls must act on f1");
    assert.equal(f.robots[1].deployed, false);
    assert.equal(f.robots[1].code, library);
    assert.ok(!log.includes("Erreur"), log);
    await p.reload();
    await workspace.locator(".monaco-editor").waitFor();
    await workspace
      .getByRole("button", { name: "Exécuter f1", exact: true })
      .click();
    await p.waitForFunction(() =>
      document
        .querySelector('[data-robot-id="f1"] .log-lines')
        .textContent.includes("IMPORT_OK"),
    );
    await p.close();
    ({ p, workspace } = await scenario(
      'import { recolter } from "./f2"; recolter();',
      library,
      false,
    ));
    await p.waitForFunction(() =>
      document
        .querySelector('[data-robot-id="f1"] .log-lines')
        .textContent.includes("Recherchez Imports"),
    );
    await p.close();
    ({ p, workspace } = await scenario(
      'import { recolter } from "./f2"; export function autre() {}',
      'import { autre } from "./f1"; export function recolter() {}',
    ));
    await p.waitForFunction(() =>
      document
        .querySelector('[data-robot-id="f1"] .log-lines')
        .textContent.includes("circulaire"),
    );
    await p.close();
    ({ p, workspace } = await scenario(
      'import { recolter } from "./f2"; recolter();',
      'export function recolter() { const valeur: number = "incorrect"; }',
    ));
    await p.waitForFunction(() =>
      document
        .querySelector('[data-robot-id="f1"] .log-lines')
        .textContent.includes("Erreur TypeScript (f2.ts)"),
    );
    await p.close();
    console.log(
      "Programming: for, lists, dictionaries, aliased imports, awaited game calls, isolated garage robot, one module initialization, reload, locked imports, cycles and imported TypeScript errors passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
