require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { fresh } = require("../src/modules/farm/application/engine.ts");
const { missionsFor } = require("../src/modules/missions/domain/missions.ts");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    p.setDefaultTimeout(45000);
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (
        /Content Security Policy|GLTFLoader:.*load texture|THREE.WebGLProgram|Shader Error/.test(
          m.text(),
        )
      )
        errors.push(m.text());
    });
    const farm = fresh();
    farm.claimed = missionsFor(farm)
      .slice(0, 10)
      .map((m) => m.id);
    farm.companion.lens = "lens-cyan";
    farm.companion.unlocked.push("lens-cyan");
    farm.companion.accessory = "sticker-meowth";
    farm.companion.stickers = [
      { id: "sticker-meowth", slot: 0, rotation: 0.1 },
    ];
    await p.addInitScript((f) => {
      if (!localStorage.getItem("farmscript-v1"))
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
    }, farm);
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.waitForFunction(
      () =>
        document.querySelector(".gui-companion")?.dataset.model ===
        "utility-robot",
    );
    for (const [name, id] of [
      ["Ange", "legend-angel"],
      ["Démon", "legend-demon"],
    ]) {
      await p
        .getByRole("button", { name: "Session et sauvegarde", exact: true })
        .click();
      const panel = p.getByRole("region", { name: "Votre compagne Luma" });
      assert.equal(await panel.locator(".legendary-badge").count(), 2);
      await panel
        .getByRole("button", {
          name: `Débloquer et équiper ${name}`,
          exact: true,
        })
        .click();
      await p.waitForFunction(() =>
        document
          .querySelector(".companion-intro .companion-avatar")
          .getAttribute("src")
          .startsWith("data:image/png"),
      );
      await p
        .getByRole("button", { name: "Fermer le panneau", exact: true })
        .click();
      await p.waitForFunction(
        (id) => document.querySelector(".gui-companion").dataset.skin === id,
        id,
      );
      assert.equal(
        await p.locator(".gui-companion").getAttribute("data-lens"),
        "lens-cyan",
      );
      assert.equal(
        JSON.parse(
          await p.locator(".gui-companion").getAttribute("data-stickers"),
        )[0].id,
        "sticker-meowth",
      );
      await p.screenshot({ path: `/tmp/${id}-game.png` });
    }
    await p.reload();
    await p.waitForFunction(
      () =>
        document.querySelector(".gui-companion")?.dataset.skin ===
        "legend-demon",
    );
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.waitForFunction(
      () => document.querySelector(".gui-companion").dataset.motion === "rest",
    );
    await p.setViewportSize({ width: 390, height: 844 });
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    const panel = p.getByRole("region", { name: "Votre compagne Luma" });
    await panel
      .getByRole("button", { name: "Équipé Démon", exact: true })
      .scrollIntoViewIfNeeded();
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Legendary skins: both unlocks, rarity badges, GPU effects, lens and stickers preserved, reload, reduced motion and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
