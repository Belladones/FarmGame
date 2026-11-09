const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [];
    p.setDefaultTimeout(60000);
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.locator(".workspace .monaco-editor").waitFor();
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1") || "null")?.farm
          .progressionVersion === 2,
    );
    const read = () =>
      p.evaluate(() => JSON.parse(localStorage.getItem("farmscript-v1")).farm);
    const edit = async (code) => {
      await p.locator(".workspace.active .monaco-editor").click();
      await p.keyboard.press("ControlOrMeta+A");
      await p.keyboard.insertText(code);
    };
    const run = () =>
      p.getByRole("button", { name: "▶ Exécuter", exact: true }).click();
    const claim = () =>
      p
        .getByRole("button", { name: "Récupérer la récompense", exact: true })
        .click();
    const close = () =>
      p.getByRole("button", { name: "Fermer le panneau", exact: true }).click();
    const research = async (id, cost, tab) => {
      await p.getByRole("button", { name: "Recherches", exact: true }).click();
      if (tab) await p.getByRole("button", { name: new RegExp(tab) }).click();
      await p.locator(`[data-skill="${id}"]`).click();
      await p
        .getByRole("button", { name: `Rechercher · ${cost}`, exact: true })
        .click();
      await close();
    };
    let f = await read();
    assert.equal(f.tiles[0].entity, "Grass");
    assert.ok(!f.unlocks.includes("loops"));
    assert.equal(f.stock, 0);
    await p.getByLabel("Vitesse de simulation").selectOption("5");
    await edit("while (true) { harvest(); deposit(); }");
    await run();
    await p.waitForFunction(() =>
      document.querySelector(".log-lines").textContent.includes("5 foins"),
    );
    await edit("harvest();\ndeposit();");
    for (let i = 1; i <= 5; i++) {
      await run();
      await p.waitForFunction(
        (n) =>
          (JSON.parse(localStorage.getItem("farmscript-v1")).farm.resources
            .Hay ?? 0) >= n,
        i,
      );
      await p.waitForFunction(
        () => document.querySelector(".program-state").textContent === "Arrêté",
      );
    }
    console.log("First five hay deposited through the real worker.");
    await claim();
    await claim();
    await research("loops", "5 foins", "Programmation");
    f = await read();
    assert.ok(f.unlocks.includes("loops"));
    assert.equal(f.resources.Hay, 0);
    assert.equal(f.stock, 0);
    await claim();
    await edit("while (true) { harvest(); deposit(); }");
    await run();
    await p.waitForFunction(
      () =>
        (JSON.parse(localStorage.getItem("farmscript-v1")).farm.depositedItems
          .Hay ?? 0) >= 50,
    );
    await p
      .getByRole("button", { name: "Arrêter le programme", exact: true })
      .click();
    await claim();
    console.log("While purchased and automated hay produced.");
    await research("extension", "20 foins", "Agriculture");
    await edit(
      "move(Direction.East);\nmove(Direction.East);\nmove(Direction.West);\nmove(Direction.West);",
    );
    await run();
    await p.waitForFunction(() => {
      const f = JSON.parse(localStorage.getItem("farmscript-v1")).farm;
      return f.visited.length === 3 && f.x === 0;
    });
    await p.waitForFunction(
      () => document.querySelector(".program-state").textContent === "Arrêté",
    );
    await claim();
    assert.equal(
      (await read()).stock,
      0,
      "Introductory rewards must not grant locked wheat",
    );
    await research("wheat-base", "10 foins", "Agriculture");
    await research("sensor", "5 foins", "Technologie");
    await edit(
      "plant(Entities.Wheat);\nwhile (!can_harvest()) {}\nharvest();\ndeposit();",
    );
    await run();
    await p.waitForFunction(
      () =>
        (JSON.parse(localStorage.getItem("farmscript-v1")).farm.depositedItems
          .Wheat ?? 0) >= 1,
    );
    await p.waitForFunction(
      () => document.querySelector(".program-state").textContent === "Arrêté",
    );
    f = await read();
    assert.ok(f.harvestedItems.Wheat >= 1);
    assert.ok(f.depositedItems.Hay >= 50);
    assert.ok(f.unlocks.includes("sensor"));
    await claim();
    console.log(
      "Extension, sensors, first mature wheat and chapter transition passed.",
    );
    await p.screenshot({ path: "/tmp/grass-progression.png" });
    await p.reload();
    await p.waitForFunction(() =>
      JSON.parse(localStorage.getItem("farmscript-v1")).farm.unlocks.includes(
        "loops",
      ),
    );
    assert.equal((await read()).progressionVersion, 2);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.getByRole("button", { name: "API et aide", exact: true }).click();
    await p
      .getByRole("heading", { name: "Pour commencer", exact: true })
      .waitFor();
    await p.screenshot({ path: "/tmp/grass-guide-mobile.png" });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const oldProgram = (await read()).robots[0].code;
    await p.getByText("Recommencer une partie", { exact: true }).click();
    p.once("dialog", (dialog) => dialog.accept());
    await p
      .getByRole("button", { name: "Recommencer la ferme", exact: true })
      .click();
    await p.waitForFunction(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm.width === 1,
    );
    const restarted = await read();
    assert.equal(restarted.previousProgram, oldProgram);
    assert.ok(!/\bwhile\s*\(/.test(restarted.robots[0].code));
    assert.ok(!restarted.unlocks.includes("loops"));
    await p.reload();
    await p.waitForFunction(
      () =>
        document.querySelector(".gui-companion")?.dataset.model === "classic",
    );
    const restoredBackup = await read();
    assert.equal(restoredBackup.previousProgram, oldProgram);
    assert.deepEqual(errors, []);
    console.log(
      "Onboarding: grass -> five deposited hay -> locked/paid while -> automatic hay -> extension -> wheat and sensor -> first mature wheat -> save/reload and mobile passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
