require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { fresh } = require("../src/engine.ts");
const { research } = require("../src/catalog.ts");
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
    const f = fresh();
    f.unlocks = research.filter((r) => !r.localOnly).map((r) => r.id);
    f.resources = { Wood: 100, Hay: 50 };
    f.gold = 500;
    f.sites.push({ x: 0, y: -1 }, { x: 1, y: -1 });
    f.buildings.push({
      ...structuredClone(f.buildings[0]),
      id: "atelier",
      kind: "Workshop",
      x: 0,
      y: -1,
      inventory: {},
    });
    f.buildings.push({
      ...structuredClone(f.buildings[0]),
      id: "depot2",
      x: 1,
      y: -1,
      inventory: {},
    });
    f.robots.push({
      ...structuredClone(f.robots[0]),
      id: "f2",
      deployed: false,
    });
    await p.addInitScript((f) => {
      if (!localStorage.getItem("farmscript-v1"))
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
    }, f);
    const read = () =>
      p.evaluate(() => JSON.parse(localStorage.getItem("farmscript-v1")).farm);
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    await p.getByRole("button", { name: "Équiper f1", exact: true }).click();
    const gear = p.getByRole("region", { name: "Équipement f1", exact: true });
    assert.match(
      await gear.locator('[data-upgrade="hold"] h4').innerText(),
      /1 \/ 5/,
    );
    await gear.locator('[data-upgrade="hold"] button').click();
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.robots[0]
          .equipment?.hold === 2,
    );
    let s = await read();
    assert.equal(s.robots[1].equipment?.hold ?? 1, 1);
    assert.equal(s.resources.Wood, 0);
    assert.equal(s.resources.Hay, 0);
    assert.match(
      await gear.locator('[data-upgrade="hold"]').innerText(),
      /atelier/,
    );
    await p.getByLabel("Robot à équiper", { exact: true }).selectOption("f2");
    assert.match(
      await p
        .getByRole("region", { name: "Équipement f2", exact: true })
        .locator('[data-upgrade="hold"] h4')
        .innerText(),
      /1 \/ 5/,
    );
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p.getByRole("button", { name: "Magasin", exact: true }).click();
    await p
      .getByRole("button", { name: "Mon exploitation", exact: true })
      .click();
    const depot = p.locator('[data-building-id="b1"]');
    await depot.getByText("Améliorer Dépôt", { exact: true }).click();
    await depot.locator('[data-upgrade="storage"] button').click();
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.buildings[0]
          .upgrades?.storage === 2,
    );
    s = await read();
    assert.equal(s.gold, 0);
    assert.equal(
      s.buildings.find((b) => b.id === "depot2").upgrades?.storage ?? 1,
      1,
    );
    assert.match(
      await depot.locator('[data-upgrade="storage"] h4').innerText(),
      /2 \/ 10/,
    );
    assert.match(
      await depot.locator('[data-upgrade="storage"]').innerText(),
      /2.?000 or/,
    );
    await p.reload();
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    await p.getByRole("button", { name: "Équiper f1", exact: true }).click();
    assert.match(
      await p
        .getByRole("region", { name: "Équipement f1", exact: true })
        .locator('[data-upgrade="hold"] h4')
        .innerText(),
      /2 \/ 5/,
    );
    s = await read();
    assert.equal(s.buildings[0].upgrades.storage, 2);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: "/tmp/individual-equipment-mobile.png" });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Individual upgrades: robot isolation, atomic costs, workshop level gate, depot isolation, next exponential price, reload and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
