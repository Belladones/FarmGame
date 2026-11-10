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
    const stop = () =>
      p
        .getByRole("button", { name: "Arrêter le programme", exact: true })
        .click();
    const produce = async (resource, target, code) => {
      console.log(`Producing ${target} ${resource}...`);
      await edit(code);
      await run();
      await p.waitForFunction(
        ([resource, target]) =>
          (JSON.parse(localStorage.getItem("farmscript-v1")).farm.resources[
            resource
          ] ?? 0) >= target,
        [resource, target],
        { timeout: 240000 },
      );
      await stop();
      console.log(`Produced ${target} ${resource}.`);
    };
    const hayCode = "while (true) { harvest(); deposit(); }";
    await produce("Hay", 20, hayCode);
    await claim();
    await research("speed", "20 foins", "Technologie");
    await claim();
    await produce("Hay", 180, hayCode);
    await research("extension", "30 foins", "Agriculture");
    await research("move", "30 foins", "Technologie");
    await edit(
      "move(Direction.West); move(Direction.East); move(Direction.East); move(Direction.East); move(Direction.East);",
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
    await research("plant", "50 foins", "Technologie");
    await research("bush", "50 foins", "Agriculture");
    console.log(
      "Paid While, Speed, Expansion, wrapped movement, plant and Bush passed.",
    );
    const woodWithoutSensor =
      "while (true) { plant(Entities.Bush);" +
      "deposit();".repeat(10) +
      "harvest(); deposit(); }";
    await produce("Wood", 20, woodWithoutSensor);
    await claim();
    await produce("Wood", 70, woodWithoutSensor);
    await research("construction", "20 bois", "Technologie");
    await research("workshop", "20 bois", "Technologie");
    await produce("Hay", 50, hayCode);
    await research("land", "50 foins + 30 bois", "Technologie");
    const sellHay = async () => {
      await p.getByRole("button", { name: "Magasin", exact: true }).click();
      const row = p
        .locator(".sale-row")
        .filter({ has: p.getByLabel("Quantité de Foin", { exact: true }) });
      await row.getByRole("button", { name: "Tout", exact: true }).click();
      await row.getByRole("button", { name: /^Vendre ·/ }).click();
      await close();
    };
    for (const amount of [150, 150, 150, 50]) {
      await produce("Hay", amount, hayCode);
      await sellHay();
    }
    await p.getByRole("button", { name: "Magasin", exact: true }).click();
    await p.getByRole("button", { name: "Bâtiments", exact: true }).click();
    await p
      .getByRole("button", { name: "Acheter Atelier · 500 or", exact: true })
      .click();
    const workshop = (await read()).storedBuildings.find(
      (b) => b.kind === "Workshop",
    ).id;
    await close();
    await p.getByRole("button", { name: "Inventaire", exact: true }).click();
    await p
      .getByRole("button", { name: "Placer " + workshop, exact: true })
      .click();
    await p.locator('[data-cell="0,-1"]').click();
    await p
      .getByRole("button", { name: "Poser un terrain en béton", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Poser " + workshop + " ici", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Reprendre la simulation", exact: true })
      .click();
    await close();
    await claim();
    console.log(
      "Workshop researched, earned through hay sales, purchased and physically installed.",
    );
    await produce("Wood", 20, woodWithoutSensor);

    await produce("Hay", 150, hayCode);
    await research("conditions", "150 foins + 10 bois", "Programmation");
    await produce("Hay", 50, hayCode);
    await research("sensor", "50 foins + 10 bois", "Technologie");
    await produce("Wood", 10, woodWithoutSensor);
    await produce("Hay", 50, hayCode);
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    await p
      .getByRole("button", { name: "Améliorer f1 à l’atelier", exact: true })
      .click();
    await p
      .getByRole("region", { name: "Équipement f1", exact: true })
      .locator('[data-upgrade="sensor"] button')
      .click();
    await close();
    await claim();
    console.log(
      "Real wood production funds Conditions and the maturity sensor without wheat.",
    );
    await produce("Hay", 10, hayCode);
    await produce(
      "Wood",
      52,
      "while (true) { plant(Entities.Bush); while(!can_harvest()) {} harvest(); deposit(); }",
    );
    await research("carrot", "50 bois", "Agriculture");
    // Clear any crop left by a stopped loop, without silently discarding carried materials.
    await edit(
      "harvest(); deposit(); load(Items.Hay,1); load(Resources.Wood,1); till(); plant(Entities.Carrot); while(!can_harvest()) {} harvest(); deposit();",
    );
    await run();
    await p.waitForFunction(
      () =>
        (JSON.parse(localStorage.getItem("farmscript-v1")).farm.depositedItems
          .Carrot ?? 0) >= 1,
    );
    await p.waitForFunction(
      () => document.querySelector(".program-state").textContent === "Arrêté",
    );
    await claim();
    f = await read();
    assert.equal(f.researchRevision, 2);
    assert.equal(f.stock, 0);
    assert.ok(f.harvestedItems.Carrot >= 1);
    assert.ok(f.unlocks.includes("carrot"));
    assert.equal(f.tiles[0].ground, "Soil");
    console.log(
      "First carrot uses hay + wood; mature harvest, mission progression and no gifted wheat passed.",
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
      "Onboarding: workbook hay -> While -> Speed -> plant/move -> Bush -> Conditions/sensor -> Carrot -> reload/mobile/reset passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
