require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { fresh, buy } = require("../src/engine.ts");
const { missions } = require("../src/missions.ts");
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
    const fixture = fresh();
    fixture.harvested = 1;
    fixture.cargo = 1;
    await p.addInitScript((f) => {
      if (!sessionStorage.getItem("campaign-seed")) {
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
        sessionStorage.setItem("campaign-seed", "1");
      }
    }, fixture);
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.locator(".campaign-peek.ready").waitFor();
    await p
      .locator(".peek-footer")
      .getByRole("button", { name: "Récupérer la récompense", exact: true })
      .click();
    await p.waitForFunction(() =>
      JSON.parse(localStorage.getItem("farmscript-v1")).farm.claimed.includes(
        "first",
      ),
    );
    await p
      .getByRole("button", { name: "Ouvrir les missions", exact: true })
      .click();
    assert.equal(await p.locator(".campaign-chapters button").count(), 4);
    assert.equal(
      await p.locator('[data-mission="deposit"]').getAttribute("class"),
      "campaign-mission current",
    );
    assert.equal(
      await p.locator('[data-mission="first"]').getAttribute("class"),
      "campaign-mission complete",
    );
    assert.equal(
      await p.locator(".campaign-mission").first().getAttribute("data-mission"),
      "deposit",
    );
    await p
      .locator(".campaign-chapters")
      .getByRole("button", { name: /Changer d’échelle/ })
      .click();
    assert.equal(await p.locator(".campaign-mission.current").count(), 0);
    await p
      .getByRole("button", { name: "Revenir à ma mission →", exact: true })
      .click();
    await p.screenshot({ path: "/tmp/farm-missions.png" });
    await p
      .getByRole("button", { name: "Programmer le dépôt ↗", exact: true })
      .click();
    assert.equal(await p.locator(".workspace").isVisible(), true);
    await p.reload();
    await p
      .getByRole("button", { name: "Ouvrir les missions", exact: true })
      .click();
    assert.equal(
      await p.locator(".career-rank small").innerText(),
      "25 XP / 150 XP",
    );
    // Finish chapter one and verify the next chapter becomes the selected page.
    const expanded = fresh();
    expanded.stock = 25;
    buy(expanded, "extension");
    expanded.visited = [0, 1, 2];
    expanded.claimed = missions.slice(0, 3).map((m) => m.id);
    await p.evaluate(
      (f) =>
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        ),
      expanded,
    );
    await p.reload();
    await p
      .getByRole("button", { name: "Ouvrir les missions", exact: true })
      .click();
    await p.locator(".campaign-claim").click();
    await p.locator('[data-mission="observe"].current').waitFor();
    assert.match(
      await p.locator(".campaign-footer").innerText(),
      /Prochaine étape/,
    );
    assert.equal(
      await p.locator(".career-rank > span").innerText(),
      "NIVEAU 2",
    );
    await p
      .getByRole("button", { name: "Rechercher les capteurs ↗", exact: true })
      .click();
    await p.getByRole("dialog", { name: "Recherches", exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Ouvrir les missions", exact: true })
      .click();
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: "/tmp/farm-missions-mobile.png" });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Missions: claim, XP, locked chapters, migration, chapter transition, navigation and mobile passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
