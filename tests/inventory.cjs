require("tsx/cjs");
const { legacyFarm: fresh } = require("./fixtures.ts");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { buy } = require("../src/modules/farm/application/engine.ts");
const { research } = require("./catalog.ts");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const f = fresh();
    f.stock = 100;
    f.resources.Hay = 30;
    buy(f, "extension");
    f.unlocks = research.map((r) => r.id);
    f.gold = 3000;
    await p.addInitScript((f) => {
      if (sessionStorage.getItem("inventory-seed")) return;
      localStorage.setItem(
        "farmscript-v1",
        JSON.stringify({ version: 1, farm: f }),
      );
      sessionStorage.setItem("inventory-seed", "1");
    }, f);
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.getByRole("button", { name: "Magasin", exact: true }).click();
    await p.getByRole("button", { name: "Bâtiments", exact: true }).click();
    assert.equal(
      await p.getByLabel("Livraison des achats", { exact: true }).inputValue(),
      "inventory",
    );
    await p
      .getByRole("button", { name: "Acheter Dépôt · 500 or", exact: true })
      .click();
    let s = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    assert.equal(s.buildings.length, 1);
    assert.equal(s.storedBuildings.length, 1);
    assert.equal(s.gold, 2500);
    const depot = s.storedBuildings[0].id;
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p.getByRole("button", { name: "Inventaire", exact: true }).click();
    assert.equal(await p.locator(".inventory-tabs button").count(), 2);
    await p
      .getByRole("button", { name: "Placer " + depot, exact: true })
      .click();
    await p.locator('[data-cell="0,-1"]').click();
    await p
      .getByRole("button", { name: "Poser un terrain en béton", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Poser " + depot + " ici", exact: true })
      .click();
    await p.waitForFunction(
      (id) =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.buildings.some(
          (b) => b.id === id,
        ),
      depot,
    );
    await p
      .getByRole("button", {
        name: "Ranger " + depot + " dans l’inventaire",
        exact: true,
      })
      .click();
    await p
      .getByRole("button", { name: "Retirer ce terrain", exact: true })
      .click();
    s = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    assert.equal(s.sites.length, 1);
    assert.equal(s.storedBuildings[0].id, depot);
    await p.locator('[data-cell="0,-1"]').click();
    await p
      .getByRole("button", { name: "Poser un terrain en béton", exact: true })
      .click();
    await p
      .getByLabel("Bâtiment à installer", { exact: true })
      .selectOption(depot);
    await p
      .getByRole("button", { name: "Poser " + depot + " ici", exact: true })
      .click();
    await p.screenshot({ path: "/tmp/farm-inventory-construction.png" });
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    assert.equal(
      await p.locator(".farm-scene").getAttribute("data-site-material"),
      "concrete",
    );
    await p.getByRole("button", { name: "Magasin", exact: true }).click();
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    await p
      .getByRole("button", { name: "Acheter Fermier · 500 or", exact: true })
      .click();
    s = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    const robot = s.robots.find((r) => r.id !== "f1").id;
    assert.equal(s.robots.find((r) => r.id === robot).deployed, false);
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p.getByRole("button", { name: "Inventaire", exact: true }).click();
    await p
      .locator(".inventory-tabs")
      .getByRole("button", { name: /Robots/ })
      .click();
    await p
      .getByRole("button", { name: "Déployer " + robot, exact: true })
      .click();
    await p.locator('[data-cell="1,0"]').click();
    await p
      .getByRole("button", { name: "Poser " + robot + " ici", exact: true })
      .click();
    await p.locator('[data-cell="1,0"]').click();
    await p
      .getByRole("button", {
        name: "Ranger " + robot + " au garage",
        exact: true,
      })
      .click();
    await p.reload();
    await p.getByRole("button", { name: "Inventaire", exact: true }).click();
    await p
      .locator(".inventory-tabs")
      .getByRole("button", { name: /Robots/ })
      .click();
    assert.equal(await p.locator(`[data-asset="${robot}"]`).count(), 1);
    s = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    assert.equal(s.buildings.find((b) => b.id === depot).x, 0);
    assert.equal(s.sites.length, 2);
    assert.equal(s.gold, 2000);
    await p
      .getByRole("button", { name: "Aménager les terrains", exact: true })
      .click();
    await p.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await p.screenshot({ path: "/tmp/farm-inventory-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Inventory: deferred purchases, concrete sites, placement, storing, robot garage, save/reload and mobile passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
