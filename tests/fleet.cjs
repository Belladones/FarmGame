require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
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
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.locator(".farm-scene canvas").waitFor();
    await p.getByRole("button", { name: "Flotte", exact: true }).click();
    assert.equal(await p.locator(".fleet-card").count(), 1);
    await p.getByRole("button", { name: "Rappeler f1", exact: true }).click();
    await p.waitForFunction(
      () => document.querySelector(".farm-scene").dataset.deployedRobots === "",
    );
    assert.equal(await p.locator(".deployment-tag").innerText(), "Non déployé");
    await p.reload();
    await p.getByRole("button", { name: "Flotte", exact: true }).click();
    assert.equal(await p.locator(".robot-state").innerText(), "Au garage");
    await p.getByRole("button", { name: /Déployer f1/ }).click();
    await p.waitForFunction(
      () =>
        document.querySelector(".farm-scene").dataset.deployedRobots === "f1",
    );
    await p.getByLabel("Rechercher un robot").fill("inexistant");
    assert.equal(await p.locator(".fleet-card").count(), 0);
    await p.getByLabel("Rechercher un robot").fill("");
    await p.screenshot({ path: "/tmp/farm-fleet.png" });
    await p
      .getByRole("button", { name: "Arbre de compétences", exact: true })
      .click();
    assert.equal(await p.locator(".skill-tabs button").count(), 5);
    for (const name of [
      "Motorisation",
      "Outils et eau",
      "Capteurs et flotte",
      "Dépôts",
      "Soutes",
    ]) {
      await p
        .locator(".skill-tabs")
        .getByRole("button", { name: new RegExp(name) })
        .click();
      assert.ok((await p.locator(".skill-node").count()) > 0);
    }
    await p.screenshot({ path: "/tmp/farm-fleet-upgrades.png" });
    await p.getByRole("button", { name: "Mes robots", exact: true }).click();
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: "/tmp/farm-fleet-mobile.png" });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const { fresh, buy } = require("../src/engine.ts");
    const fixture = fresh();
    fixture.stock = 100;
    buy(fixture, "extension");
    fixture.stock = 180;
    fixture.resources = { Wood: 100 };
    fixture.unlocks.push("bush");
    await p.evaluate(
      (f) =>
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        ),
      fixture,
    );
    await p.reload();
    await p.getByRole("button", { name: "Flotte", exact: true }).click();
    await p
      .getByRole("button", { name: "Arbre de compétences", exact: true })
      .click();
    await p.getByRole("button", { name: /^Soute · 80/, exact: true }).click();
    await p
      .getByRole("button", {
        name: /^Rechercher · 80/,
        exact: true,
      })
      .click();
    await p.getByRole("button", { name: "Mes robots", exact: true }).click();
    assert.match(await p.locator(".fleet-stats").innerText(), /20/);
    assert.deepEqual(errors, []);
    console.log(
      "Fleet: garage, deployment, save, filters, five skill pages and mobile passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
