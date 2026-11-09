require("tsx/cjs");
const { legacyFarm: fresh } = require("./fixtures.ts");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { buy } = require("../src/engine.ts");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.addInitScript((f) => {
      if (!localStorage.getItem("farmscript-v1"))
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
    }, fresh());
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.getByRole("button", { name: "Recherches", exact: true }).click();
    await p.locator('[data-skill="wheat3"]').click();
    assert.equal(
      await p
        .locator('[data-skill="wheat3"]')
        .getAttribute("class")
        .then((c) => c.includes("locked")),
      true,
    );
    await p
      .getByRole("button", {
        name: "Voir le prérequis Stockage · niveau 2",
        exact: true,
      })
      .click();
    assert.equal(
      await p.locator(".skill-detail h3").innerText(),
      "Stockage · niveau 2",
    );
    await p.waitForFunction(() => {
      const n = document.querySelector('[data-skill="storage2"]'),
        box = document.querySelector(".skill-scroll").getBoundingClientRect(),
        r = n.getBoundingClientRect();
      return r.top >= box.top && r.bottom <= box.bottom;
    });
    assert.equal(await p.locator(".skill-node.planned").count(), 0);
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    const fixture = fresh();
    fixture.stock = 25;
    fixture.resources.Hay = 30;
    buy(fixture, "extension");
    fixture.unlocks.push("wheat", "bush");
    fixture.stock = 150;
    fixture.resources = { Wood: 50 };
    assert.equal(buy(fixture, "extension3"), true);
    fixture.unlocks.push("wheat3");
    fixture.time = 20;
    fixture.harvested = 100;
    fixture.tiles.forEach((t) =>
      Object.assign(t, { planted: 0, entity: "Wheat", yield: 1 }),
    );
    await p.addInitScript((f) => {
      if (sessionStorage.getItem("progression-fixture")) return;
      localStorage.setItem(
        "farmscript-v1",
        JSON.stringify({ version: 1, farm: f }),
      );
      sessionStorage.setItem("progression-fixture", "1");
    }, fixture);
    await p.reload();
    await p.locator(".farm-scene canvas").waitFor();
    await p.getByRole("button", { name: "Recherches", exact: true }).click();
    assert.equal(
      await p
        .locator('[data-skill="wheat3"]')
        .getAttribute("class")
        .then((c) => c.includes("acquired")),
      true,
    );
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    for (const [dx, dy] of [
      [260, 0],
      [0, -260],
      [-260, 0],
      [0, 260],
    ]) {
      await p.mouse.move(650, 440);
      await p.mouse.down();
      await p.mouse.move(650 + dx, 440 + dy, { steps: 15 });
      await p.mouse.up();
      await p.waitForTimeout(160);
      const data = await p
        .locator(".farm-scene")
        .evaluate((el) => ({ ...el.dataset }));
      assert.ok(
        Number(data.cameraPolar) >= 0.55 - 1e-6 &&
          Number(data.cameraPolar) <= 1.05 + 1e-6,
      );
      assert.ok(
        Math.abs(Number(data.cellWidth) - Number(data.cellHeight)) < 1e-9,
      );
      assert.ok(
        Math.abs(Number(data.projectionAspect) - Number(data.viewportAspect)) <
          1e-9,
      );
    }
    await p.screenshot({ path: "/tmp/farm-stars-orbit.png" });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForFunction(
      () =>
        Math.abs(
          Number(document.querySelector(".farm-scene").dataset.viewportAspect) -
            390 / 844,
        ) < 1e-9,
    );
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await p.screenshot({ path: "/tmp/farm-stars-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Progression: actual prerequisites, cross-tree navigation, legacy unlocks, camera aspect, orbit limits and mobile passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
