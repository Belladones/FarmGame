require("tsx/cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const { fresh } = require("../src/engine.ts");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [],
      assetErrors = [],
      modelRequests = [];
    p.setDefaultTimeout(30000);
    p.on("request", (r) => {
      if (r.url().includes("/models/luma/")) modelRequests.push(r.url());
    });
    p.on("response", (r) => {
      if (r.url().includes("/models/luma/") && r.status() >= 400)
        assetErrors.push(r.url());
    });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    const mascot = p.locator(".gui-companion");
    await mascot.locator("canvas").waitFor();
    await p.waitForFunction(
      () =>
        document.querySelector(".gui-companion").dataset.model ===
        "utility-robot",
    );
    await p.waitForFunction(
      () => document.querySelector(".gui-companion").dataset.x,
    );
    const initial = await mascot.getAttribute("data-x");
    await p.waitForFunction(
      (x) => document.querySelector(".gui-companion").dataset.x !== x,
      initial,
    );
    assert.equal(
      await mascot.evaluate((el) => getComputedStyle(el).position),
      "fixed",
    );
    assert.equal(
      await mascot.evaluate((el) => getComputedStyle(el).pointerEvents),
      "none",
    );
    assert.equal(await p.locator(".farm-scene .gui-companion").count(), 0);
    assert.equal(
      await p.locator(".farm-scene").getAttribute("data-deployed-robots"),
      "f1",
    );
    const azimuth = await p
      .locator(".farm-scene")
      .getAttribute("data-camera-azimuth");
    await p.mouse.move(470, 490);
    await p.mouse.down();
    await p.mouse.move(650, 520, { steps: 10 });
    await p.mouse.up();
    await p.waitForFunction(
      (a) =>
        Math.abs(
          Number(document.querySelector(".farm-scene").dataset.cameraAzimuth) -
            Number(a),
        ) > 0.1,
      azimuth,
    );
    assert.equal(await mascot.getAttribute("data-space"), "gui");
    assert.equal(
      await mascot.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return !el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
      true,
    );
    await p.screenshot({ path: "/tmp/farm-luma.png" });
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    assert.equal(await mascot.isVisible(), false);
    const panel = p.getByRole("region", { name: "Votre compagne Luma" });
    await panel
      .getByRole("button", { name: "Équipé Perle", exact: true })
      .scrollIntoViewIfNeeded();
    assert.equal(
      await panel
        .getByRole("button", { name: "Verrouillé Rosée", exact: true })
        .isDisabled(),
      true,
    );
    const f = fresh();
    f.claimed = require("../src/missions.ts")
      .missions.slice(0, 3)
      .map((m) => m.id);
    await p.addInitScript((f) => {
      if (!sessionStorage.getItem("luma-seed")) {
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
        sessionStorage.setItem("luma-seed", "1");
      }
    }, f);
    await p.reload();
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    await panel
      .getByRole("button", { name: "Débloquer et équiper Rosée", exact: true })
      .click();
    await panel
      .getByRole("button", { name: "Accessoires", exact: true })
      .click();
    await panel
      .getByRole("button", {
        name: "Débloquer et équiper Fleur solaire",
        exact: true,
      })
      .click();
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p.waitForFunction(
      () =>
        document.querySelector(".gui-companion").dataset.skin === "rose" &&
        document.querySelector(".gui-companion").dataset.accessory === "flower",
    );
    await p.reload();
    await p.waitForFunction(
      () => document.querySelector(".gui-companion").dataset.skin === "rose",
    );
    assert.equal(
      await p.locator(".gui-companion").getAttribute("data-accessory"),
      "flower",
    );
    await p.emulateMedia({ reducedMotion: "reduce" });
    const still = await p.locator(".gui-companion").getAttribute("data-x");
    const stillY = await p.locator(".gui-companion").getAttribute("data-y");
    await p.waitForTimeout(1000);
    assert.equal(
      await p.locator(".gui-companion").getAttribute("data-y"),
      stillY,
    );
    assert.equal(
      await p.locator(".gui-companion").getAttribute("data-x"),
      still,
    );
    await p.setViewportSize({ width: 390, height: 844 });
    if (await p.locator(".workspace .editor").isVisible())
      await p
        .getByRole("button", { name: "Afficher le code", exact: true })
        .click();
    await p.waitForFunction(() => {
      const el = document.querySelector(".gui-companion"),
        r = el.getBoundingClientRect();
      return (
        getComputedStyle(el).visibility === "visible" &&
        r.x >= 0 &&
        r.y >= 0 &&
        r.right <= innerWidth &&
        r.bottom <= innerHeight
      );
    });
    await p.screenshot({ path: "/tmp/luma-gui-mobile.png" });
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    await panel
      .getByRole("button", { name: "Apparences", exact: true })
      .click();
    await panel.scrollIntoViewIfNeeded();
    await p.screenshot({ path: "/tmp/farm-luma-cosmetics-mobile.png" });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(assetErrors, []);
    assert.ok(
      modelRequests.some((url) => url.includes("utility-robot.glb")),
      "supplied robot must load",
    );
    console.log(
      "Companion: GUI roaming, click-through, independent farm camera, separate fleet, cosmetic unlocks, equipment, persistence, reduced motion and mobile passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
