require("tsx/cjs");
const { legacyFarm: fresh } = require("./fixtures.ts");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { buy } = require("../src/modules/farm/application/engine.ts");
const { missions } = require("../src/modules/missions/domain/missions.ts");
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
    await p.locator('[data-mission-detail="deposit"]').waitFor();
    const left = await p.locator(".mission-sidebar").boundingBox(),
      right = await p.locator(".mission-detail-panel").boundingBox();
    assert.ok(
      left.x + left.width <= right.x,
      "mission list and description form two columns",
    );
    await p.locator('[data-mission="first"]').click();
    await p.locator('[data-mission-detail="first"]').waitFor();
    assert.equal(
      await p.locator(".mission-detail-panel .campaign-claim").count(),
      0,
    );
    await p.locator('[data-mission="first"]').focus();
    await p.keyboard.press("Home");
    await p.locator('[data-mission-detail="deposit"]').waitFor();
    await p.keyboard.press("ArrowDown");
    await p.locator('[data-mission-detail="routine"]').waitFor();
    assert.equal(
      await p.locator(".mission-detail-panel .campaign-claim").count(),
      0,
    );
    await p.keyboard.press("Home");
    await p.locator('[data-mission-detail="deposit"]').waitFor();
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
    expanded.resources.Hay = 30;
    buy(expanded, "extension");
    expanded.visited = [0, 1, 2];
    expanded.claimed = missions.slice(0, 3).map((m) => m.id);
    await p.addInitScript((f) => {
      if (sessionStorage.getItem("campaign-expanded-fixture")) return;
      localStorage.setItem(
        "farmscript-v1",
        JSON.stringify({ version: 1, farm: f }),
      );
      sessionStorage.setItem("campaign-expanded-fixture", "1");
    }, expanded);
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
    const mobileList = await p.locator(".mission-sidebar").boundingBox(),
      mobileDetail = await p.locator(".mission-detail-panel").boundingBox();
    assert.ok(mobileList.x + mobileList.width <= mobileDetail.x);
    await p.locator('[data-mission="coordinates"]').click();
    await p.locator('[data-mission-detail="coordinates"]').waitFor();
    await p.locator('[data-mission="observe"]').click();
    await p
      .locator(".mission-detail-actions button")
      .last()
      .scrollIntoViewIfNeeded();
    await p.screenshot({ path: "/tmp/farm-missions-mobile.png" });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await p.setViewportSize({ width: 844, height: 390 });
    const lastAction = p.locator(".mission-detail-actions button").last();
    await lastAction.scrollIntoViewIfNeeded();
    const actionBounds = await lastAction.boundingBox();
    assert.ok(
      actionBounds.y >= 0 && actionBounds.y + actionBounds.height <= 390,
    );
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Missions: two-column detail selection, keyboard navigation, claim, XP, locked previews, chapter transition, actions and mobile passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
