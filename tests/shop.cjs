require("tsx/cjs");
const { legacyFarm: fresh } = require("./fixtures.ts");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { buy } = require("../src/engine.ts");
const { research, constructionSlots } = require("../src/catalog.ts");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.locator(".farm-scene canvas").waitFor();
    assert.equal(
      await p.locator(".farm-scene").getAttribute("data-starter-model"),
      "Farmer",
    );
    await p.getByRole("button", { name: "Magasin", exact: true }).click();
    assert.equal(await p.locator(".sale-row").count(), 9);
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    await p
      .getByLabel("Livraison des achats", { exact: true })
      .selectOption("field");
    assert.equal(await p.locator(".robot-products .product-card").count(), 3);
    assert.equal(
      await p
        .getByRole("button", { name: "Acheter Fermier · 500 or", exact: true })
        .isDisabled(),
      true,
    );
    await p.getByRole("button", { name: "Bâtiments", exact: true }).click();
    assert.equal(
      await p.locator(".building-products .product-card").count(),
      8,
    );
    const fixture = fresh();
    fixture.stock = 100;
    fixture.resources.Hay = 30;
    buy(fixture, "extension");
    fixture.stock = 200;
    fixture.gold = 3000;
    fixture.resources = { Wood: 50, Carrot: 20 };
    fixture.unlocks = research.map((r) => r.id);
    fixture.sites = structuredClone(constructionSlots);
    await p.addInitScript((fixture) => {
      if (sessionStorage.getItem("shop-fixture")) return;
      localStorage.setItem(
        "farmscript-v1",
        JSON.stringify({ version: 1, farm: fixture }),
      );
      sessionStorage.setItem("shop-fixture", "1");
    }, fixture);
    await p.reload();
    await p.getByRole("button", { name: "Magasin", exact: true }).click();
    await p
      .getByRole("button", { name: "Vendre · 10 or", exact: true })
      .click();
    let saved = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    assert.equal(saved.gold, 3010);
    assert.equal(saved.stock, 190);
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    await p
      .getByLabel("Livraison des achats", { exact: true })
      .selectOption("field");
    await p
      .getByRole("button", { name: "Acheter Fermier · 500 or", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Acheter Drone · 1000 or", exact: true })
      .click();
    await p.screenshot({ path: "/tmp/farm-shop-robots.png" });
    await p.getByRole("button", { name: "Bâtiments", exact: true }).click();
    await p
      .getByRole("button", { name: "Acheter Dépôt · 500 or", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Acheter Moulin · 300 or", exact: true })
      .click();
    await p.screenshot({ path: "/tmp/farm-shop-buildings.png" });
    await p.getByRole("button", { name: "Consommables", exact: true }).click();
    await p
      .getByRole("button", { name: "Acheter Engrais · 25 or", exact: true })
      .click();
    saved = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    assert.equal(saved.gold, 685);
    assert.equal(saved.resources.Wood, 50);
    assert.equal(saved.resources.Carrot, 20);
    assert.equal(saved.resources.Fertilizer, 1);
    assert.equal(saved.buildings.length, 3);
    assert.equal(saved.robots.length, 3);
    const farmer = saved.robots.find(
      (r) => r.model === "Farmer" && r.id !== "f1",
    );
    assert.ok(farmer);
    await p
      .getByRole("button", { name: "Mon exploitation", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Programmer " + farmer.id, exact: true })
      .click();
    await p.locator(".workspace.active .monaco-editor").waitFor();
    await p
      .locator(".workspace.active .monaco-editor")
      .click({ position: { x: 100, y: 60 } });
    await p.keyboard.press("ControlOrMeta+A");
    await p.keyboard.insertText(
      "while (true) { harvest(); plant(Entities.Bush); }",
    );
    await p.getByRole("button", { name: "▶ Exécuter", exact: true }).click();
    await p.waitForFunction(() =>
      document
        .querySelector(".workspace.active .log-lines")
        .textContent.includes("Programme lancé."),
    );
    await p.locator('[data-robot-id="f1"] .program-robot').click();
    await p.getByRole("button", { name: "▶ Exécuter", exact: true }).click();
    await p.waitForFunction(
      (id) => {
        const s = JSON.parse(localStorage.getItem("farmscript-v1")).farm;
        return (
          (s.robots.find((r) => r.id === id).inventory.Wood ?? 0) >= 8 &&
          s.deposited >= 1
        );
      },
      farmer.id,
      { timeout: 60000 },
    );
    await p.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
    const before = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm.time,
    );
    await p.waitForTimeout(600);
    assert.equal(
      await p.evaluate(
        () => JSON.parse(localStorage.getItem("farmscript-v1")).farm.time,
      ),
      before,
    );
    await p.getByRole("button", { name: "Arrêter le programme" }).click();
    await p.locator(`[data-robot-id="${farmer.id}"] .program-robot`).click();
    await p.getByRole("button", { name: "Arrêter le programme" }).click();
    await p
      .getByRole("button", { name: "Afficher le code", exact: true })
      .click();
    await p.screenshot({ path: "/tmp/farm-terrestrial-fleet.png" });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.getByRole("button", { name: "Magasin", exact: true }).click();
    await p.getByRole("button", { name: "Bâtiments", exact: true }).click();
    await p.screenshot({ path: "/tmp/farm-shop-mobile.png" });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await p.reload();
    await p.locator(".farm-scene canvas").waitFor();
    saved = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    assert.equal(saved.robots.length, 3);
    assert.equal(saved.buildings.length, 3);
    assert.equal(saved.gold, 685);
    assert.deepEqual(errors, []);
    console.log(
      "Shop: catalogue, ventes, achats, flotte concurrente, pause, persistance et mobile OK.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
