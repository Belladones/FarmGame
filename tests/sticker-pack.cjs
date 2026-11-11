require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { fresh } = require("../src/modules/farm/application/engine.ts");
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
    farm.companion.stickers = [];
    farm.companion.accessory = "none";
    await p.addInitScript((farm) => {
      if (!localStorage.getItem("farmscript-v1"))
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm }),
        );
    }, farm);
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.waitForFunction(
      () =>
        document.querySelector(".gui-companion")?.dataset.model ===
        "utility-robot",
    );
    await p
      .getByRole("button", { name: "Profil de Luma", exact: true })
      .click();
    const panel = p.getByRole("region", { name: "Votre compagne Luma" });
    await panel.getByRole("button", { name: "Stickers", exact: true }).click();
    assert.equal(await panel.locator(".sticker-thumbnail").count(), 35);
    for (const name of ["Miaouss", "Rocabot", "Raichu"])
      await panel
        .getByRole("button", { name: `Ajouter ${name}`, exact: true })
        .click();
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
          .stickers.length === 3,
    );
    assert.ok(
      await panel
        .getByRole("button", { name: "Ajouter Bocal", exact: true })
        .isDisabled(),
    );
    const beforeShuffle = await p.evaluate(() =>
      JSON.stringify(
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
          .stickers,
      ),
    );
    await panel
      .getByRole("button", { name: "Redistribuer les stickers", exact: true })
      .click();
    await p.waitForFunction(
      (before) =>
        JSON.stringify(
          JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
            .stickers,
        ) !== before,
      beforeShuffle,
    );
    const saved = await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
          .stickers,
    );
    assert.equal(saved.length, 3);
    assert.equal(new Set(saved.map((s) => s.slot)).size, 3);
    await p.waitForFunction(() =>
      document
        .querySelector(".companion-intro .companion-avatar")
        .getAttribute("src")
        .startsWith("data:image/png"),
    );
    await panel
      .getByText("Stickers posés · 3 / 3", { exact: true })
      .scrollIntoViewIfNeeded();
    await p.screenshot({ path: "/tmp/sticker-pack-menu.png" });
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p.waitForFunction(
      () =>
        JSON.parse(document.querySelector(".gui-companion").dataset.stickers)
          .length === 3,
    );
    await p.reload();
    await p.waitForFunction(
      () =>
        document.querySelector(".gui-companion")?.dataset.model ===
        "utility-robot",
    );
    await p.waitForFunction(
      () =>
        JSON.parse(document.querySelector(".gui-companion").dataset.stickers)
          .length === 3,
    );
    assert.deepEqual(
      JSON.parse(
        await p.locator(".gui-companion").getAttribute("data-stickers"),
      ),
      saved,
    );
    await p.setViewportSize({ width: 390, height: 844 });
    await p
      .getByRole("button", { name: "Profil de Luma", exact: true })
      .click();
    await panel.getByRole("button", { name: "Stickers", exact: true }).click();
    assert.equal(await panel.locator(".sticker-thumbnail").count(), 35);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Sticker sheet: 35 individual thumbnails, textured 3D portraits, three-sticker cap, reshuffle, saved positions, reload and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
