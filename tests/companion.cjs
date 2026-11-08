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
      errors = [];
    p.setDefaultTimeout(30000);
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.waitForFunction(
      () => document.querySelector(".farm-scene")?.dataset.companionX,
    );
    assert.equal(
      await p.locator(".farm-scene").getAttribute("data-companion-ground"),
      "none",
    );
    const initial = await p
      .locator(".farm-scene")
      .getAttribute("data-companion-x");
    await p.waitForFunction(
      (x) => document.querySelector(".farm-scene").dataset.companionX !== x,
      initial,
    );
    assert.equal(
      await p.locator(".farm-scene").getAttribute("data-deployed-robots"),
      "f1",
    );
    for (let i = 0; i < 3; i++) {
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
            Number(
              document.querySelector(".farm-scene").dataset.cameraAzimuth,
            ) - Number(a),
          ) > 0.1,
        azimuth,
      );
      const aligned = await p.locator(".farm-scene").evaluate((el) => {
        const d = el.dataset,
          dx = Number(d.companionCameraX) - Number(d.companionX),
          dz = Number(d.companionCameraZ) - Number(d.companionZ),
          angle = Number(d.companionFacing);
        return (
          (Math.sin(angle) * dx + Math.cos(angle) * dz) / Math.hypot(dx, dz)
        );
      });
      assert.ok(aligned > 0.9999, "Luma keeps facing the player during orbit");
    }
    await p.screenshot({ path: "/tmp/farm-luma.png" });
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
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
        document.querySelector(".farm-scene").dataset.companionSkin ===
          "rose" &&
        document.querySelector(".farm-scene").dataset.companionAccessory ===
          "flower",
    );
    await p.reload();
    await p.waitForFunction(
      () =>
        document.querySelector(".farm-scene").dataset.companionSkin === "rose",
    );
    assert.equal(
      await p.locator(".farm-scene").getAttribute("data-companion-accessory"),
      "flower",
    );
    await p.emulateMedia({ reducedMotion: "reduce" });
    const still = await p
      .locator(".farm-scene")
      .getAttribute("data-companion-x");
    const stillY = await p
      .locator(".farm-scene")
      .getAttribute("data-companion-y");
    await p.waitForTimeout(1000);
    assert.equal(
      await p.locator(".farm-scene").getAttribute("data-companion-y"),
      stillY,
    );
    assert.equal(
      await p.locator(".farm-scene").getAttribute("data-companion-x"),
      still,
    );
    await p.setViewportSize({ width: 390, height: 844 });
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
    console.log(
      "Companion: floating without ground, camera facing, separate fleet, cosmetic unlocks, equipment, persistence, reduced motion and mobile passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
