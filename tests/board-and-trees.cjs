const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.locator(".farm-scene canvas").waitFor();
    await p.waitForTimeout(1000);
    let d = await p
      .locator(".farm-scene")
      .evaluate((el) => ({ ...el.dataset }));
    console.log("initial", d);
    if (d.plotCount !== "1" || Math.abs(d.cellWidth / d.cellHeight - 1) > 0.001)
      throw Error("Initial board not one square");
    const initialAzimuth = Number(d.cameraAzimuth),
      initialPolar = Number(d.cameraPolar);
    await p.mouse.move(470, 480);
    await p.mouse.down();
    await p.mouse.move(650, 550, { steps: 12 });
    await p.mouse.up();
    await p.waitForFunction(
      (initial) =>
        Math.abs(
          Number(document.querySelector(".farm-scene").dataset.cameraAzimuth) -
            initial,
        ) > 0.1,
      initialAzimuth,
    );
    await p.getByRole("button", { name: "Recentrer la vue" }).click();
    await p.waitForFunction(
      ({ azimuth, polar }) => {
        const d = document.querySelector(".farm-scene").dataset;
        return (
          Math.abs(Number(d.cameraAzimuth) - azimuth) < 0.01 &&
          Math.abs(Number(d.cameraPolar) - polar) < 0.01
        );
      },
      { azimuth: initialAzimuth, polar: initialPolar },
    );
    await p.screenshot({ path: "/tmp/farm-one-square.png" });
    await p.addInitScript(() => {
      if (!sessionStorage.getItem("test-stock-seeded")) {
        const s = JSON.parse(localStorage.getItem("farmscript-v1"));
        s.farm.stock = 100;
        s.farm.tiles[0].planted = s.farm.time;
        localStorage.setItem("farmscript-v1", JSON.stringify(s));
        sessionStorage.setItem("test-stock-seeded", "1");
      }
    });
    await p.reload();
    await p.getByRole("button", { name: "Recherches", exact: true }).click();
    await p.getByRole("button", { name: /Technologie/ }).click();
    await p.locator('[data-skill="position"]').click();
    if (
      !(await p
        .getByRole("button", { name: "Débloquez Trois parcelles" })
        .isDisabled())
    )
      throw Error("Position prerequisite not enforced");
    await p.getByRole("button", { name: /Agriculture/ }).click();
    await p.locator('[data-skill="extension"]').click();
    await p.screenshot({ path: "/tmp/farm-skill-tree.png" });
    await p
      .getByRole("button", { name: "Rechercher · 25 blés", exact: true })
      .click();
    await p.waitForFunction(
      () => document.querySelector(".farm-scene").dataset.plotCount === "3",
    );
    d = await p.locator(".farm-scene").evaluate((el) => ({ ...el.dataset }));
    if (Math.abs(d.cellWidth / d.cellHeight - 1) > 0.001)
      throw Error("Expanded cells distorted");
    await p.getByRole("button", { name: "Page suivante →" }).click();
    await p.locator('[data-skill="conditions"]').click();
    await p
      .getByRole("button", { name: "Rechercher · 10 blés", exact: true })
      .click();
    await p.getByRole("button", { name: "Page suivante →" }).click();
    await p.locator('[data-skill="position"]').click();
    await p
      .getByRole("button", { name: "Rechercher · 20 blés", exact: true })
      .click();
    await p.locator('[data-skill="analysis"]').click();
    if (
      !(await p
        .getByRole("button", { name: "Disponible ultérieurement" })
        .isDisabled())
    )
      throw Error("Future research purchasable");
    const saved = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    if (
      saved.stock !== 45 ||
      saved.tiles.length !== 3 ||
      saved.tiles[0].planted === null ||
      saved.tiles[1].planted !== null
    )
      throw Error("Purchase changed crops or charged incorrect amount");
    await p.getByRole("button", { name: "Fermer le panneau" }).click();
    await p.screenshot({ path: "/tmp/farm-three-squares.png" });
    await p.setViewportSize({ width: 390, height: 844 });
    await p
      .getByRole("button", { name: "Afficher le code", exact: true })
      .click();
    await p.screenshot({ path: "/tmp/farm-three-mobile.png" });
    await p.getByRole("button", { name: "Recherches", exact: true }).click();
    await p.getByRole("button", { name: /Technologie/ }).click();
    await p.locator('[data-skill="position"]').click();
    await p.screenshot({ path: "/tmp/farm-skill-mobile.png" });
    if (
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    )
      throw Error("Mobile page overflow");
    await p.getByRole("button", { name: "Fermer le panneau" }).click();
    await p.reload();
    await p.waitForFunction(
      () => document.querySelector(".farm-scene")?.dataset.plotCount === "3",
    );
    console.log("expanded", d, "errors", errors);
    if (errors.length) throw Error(errors.join("\n"));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
