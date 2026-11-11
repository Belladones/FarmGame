require("tsx/cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const { fresh } = require("../src/modules/farm/application/engine.ts");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    p.setDefaultTimeout(45000);
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const farm = fresh();
    await p.addInitScript((f) => {
      if (!localStorage.getItem("farmscript-v1"))
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
    }, farm);
    await p.goto(process.env.FARM_URL || "http://localhost:3001");
    const open = async () => {
      await p
        .getByRole("button", { name: "Profil de Luma", exact: true })
        .click();
      await p.waitForFunction(
        () =>
          document.querySelector(".luma-stage")?.dataset.model ===
          "utility-robot",
      );
    };
    await open();
    const stage = p.locator(".luma-stage");
    const rect = await stage.boundingBox();
    assert.ok(rect.width > 500);
    await p.getByRole("button", { name: "Vue de dos", exact: true }).click();
    await p.waitForFunction(
      () =>
        Math.abs(
          Number(document.querySelector(".luma-stage").dataset.azimuth),
        ) > 3,
    );
    await p.getByRole("button", { name: "Vue de face", exact: true }).click();
    await p.waitForFunction(
      () =>
        Math.abs(
          Number(document.querySelector(".luma-stage").dataset.azimuth),
        ) < 0.05,
    );
    await p
      .getByRole("button", { name: "Déplacer le sticker", exact: true })
      .click();
    const canvas = stage.locator("canvas"),
      r = await canvas.boundingBox();
    await p.mouse.click(r.x + r.width * 0.47, r.y + r.height * 0.3);
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
          .stickers[0].surface,
    );
    const stored = () =>
      p.evaluate(
        () =>
          JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
            .stickers[0],
      );
    const first = await stored();
    assert.ok(first.surface.mesh);
    await p.mouse.move(r.x + r.width * 0.47, r.y + r.height * 0.3);
    await p.mouse.down();
    await p.mouse.move(r.x + r.width * 0.43, r.y + r.height * 0.31, {
      steps: 8,
    });
    await p.mouse.up();
    await p.waitForFunction(
      (before) =>
        JSON.stringify(
          JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
            .stickers[0].surface,
        ) !== before,
      JSON.stringify(first.surface),
    );
    await p
      .getByRole("button", { name: "Tourner le sticker", exact: true })
      .click();
    await p.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.4);
    await p.mouse.down();
    await p.mouse.move(r.x + r.width * 0.4, r.y + r.height * 0.45, {
      steps: 8,
    });
    await p.mouse.up();
    await p.waitForFunction(
      () =>
        Math.abs(
          JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
            .stickers[0].rotation,
        ) > 0.1,
    );
    const rotate = p.getByRole("slider", {
      name: "Rotation du sticker",
      exact: true,
    });
    await rotate.focus();
    await rotate.press("End");
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
          .stickers[0].rotation > 3,
    );
    const size = p.getByRole("slider", {
      name: "Taille du sticker",
      exact: true,
    });
    await size.focus();
    await size.press("End");
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
          .stickers[0].scale === 2,
    );
    const saved = await stored();
    await p.screenshot({ path: "/tmp/profile-desktop.png" });
    await p.reload();
    await open();
    assert.deepEqual(await stored(), saved);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: "/tmp/profile-mobile.png" });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await p
      .getByRole("button", {
        name: "Rétablir l’emplacement initial",
        exact: true,
      })
      .click();
    await p.waitForFunction(
      () =>
        !JSON.parse(localStorage.getItem("farmscript-v1")).farm.companion
          .stickers[0].surface,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Profile: orbit, surface placement, rotation, scale, persistence and mobile passed.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
