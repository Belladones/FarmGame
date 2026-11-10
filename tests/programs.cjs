require("tsx/cjs");
const { legacyFarm: fresh } = require("./fixtures.ts");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { buy } = require("../src/modules/farm/application/engine.ts");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    p.setDefaultTimeout(30000);
    p.on("pageerror", (e) => errors.push(e.message));
    const f = fresh();
    f.stock = 100;
    f.resources.Hay = 30;
    buy(f, "extension");
    f.unlocks = require("./catalog.ts").research.map((r) => r.id);
    f.robots[0].code =
      'const marker: string = "ONE";\nwhile (true) { console.log(marker); harvest(); }';
    f.robots.push({
      ...structuredClone(f.robots[0]),
      id: "f2",
      x: 1,
      code: 'const marker: string = "TWO";\nwhile (true) { print(marker); harvest(); }',
    });
    await p.addInitScript((f) => {
      if (!sessionStorage.getItem("program-fixture")) {
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
        sessionStorage.setItem("program-fixture", "1");
      }
    }, f);
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    const a = p.locator('[data-robot-id="f1"]'),
      b = p.locator('[data-robot-id="f2"]');
    await a.locator(".monaco-editor").waitFor();
    await b.locator(".monaco-editor").waitFor();
    assert.equal(await p.locator(".program-desktop .workspace").count(), 2);
    await a.getByRole("button", { name: "Exécuter f1", exact: true }).click();
    await p.waitForFunction(() =>
      document
        .querySelector('[data-robot-id="f1"] .log-lines')
        .textContent.includes("ONE"),
    );
    await b.getByRole("button", { name: "Exécuter f2", exact: true }).click();
    await p.waitForFunction(() =>
      document
        .querySelector('[data-robot-id="f2"] .log-lines')
        .textContent.includes("TWO"),
    );
    assert.match(await a.locator(".program-state").innerText(), /En cours/);
    await a
      .getByRole("button", { name: "Réduire l’éditeur", exact: true })
      .click();
    assert.equal(await a.locator(".editor").isVisible(), false);
    assert.equal(await b.locator(".editor").isVisible(), true);
    const printed = (await a.locator(".log-lines").innerText()).split(
      "ONE",
    ).length;
    await p.waitForFunction(
      (count) =>
        document
          .querySelector('[data-robot-id="f1"] .log-lines')
          .textContent.split("ONE").length > count,
      printed,
    );

    assert.match(await a.locator(".program-state").innerText(), /En cours/);
    await a
      .getByRole("button", { name: "Restaurer l’éditeur", exact: true })
      .click();
    assert.equal(await a.locator(".editor").isVisible(), true);
    await b.getByRole("button", { name: "Arrêter f2", exact: true }).click();
    await b.locator(".monaco-editor").click();
    await p.keyboard.press("Control+KeyA");
    await p.keyboard.insertText('const marker: number = "INVALID";');
    await b.getByRole("button", { name: "Exécuter f2", exact: true }).click();
    await p.waitForFunction(() =>
      document
        .querySelector('[data-robot-id="f2"] .log-lines')
        .textContent.includes("Erreur TypeScript"),
    );
    assert.match(await a.locator(".program-state").innerText(), /En cours/);
    const saved = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    assert.match(saved.robots[0].code, /ONE/);
    assert.match(saved.robots[1].code, /INVALID/);
    await p.screenshot({ path: "/tmp/farm-programs.png" });
    await p.reload();
    await a.locator(".monaco-editor").waitFor();
    assert.equal(await p.locator(".program-desktop .workspace").count(), 2);
    assert.equal(await a.locator(".program-state").innerText(), "Arrêté");
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    await p.getByRole("button", { name: "Rappeler f2", exact: true }).click();
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    assert.equal(await p.locator(".program-desktop .workspace").count(), 1);
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    await p.getByRole("button", { name: /Déployer f2/ }).click();
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    assert.equal(await p.locator(".program-desktop .workspace").count(), 2);
    assert.match(await b.locator(".program-state").innerText(), /Arrêté/);
    await p.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Programs: independent code, diagnostics, concurrent execution, minimize, reload and mobile passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
