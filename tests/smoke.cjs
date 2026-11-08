const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    const openEditor = async () => {
      await page.locator(".workspace").waitFor({ state: "attached" });
      if (!(await page.locator(".workspace .editor").isVisible()))
        await page
          .getByRole("button", { name: "Afficher le code", exact: true })
          .click();
      await page.locator(".monaco-editor").waitFor();
    };
    const errors = [];
    const replaceSavedCode = async (source, key) => {
      await page.addInitScript(
        ({ source, key }) => {
          if (sessionStorage.getItem(key)) return;
          const saved = JSON.parse(localStorage.getItem("farmscript-v1"));
          saved.farm.robots.find(
            (r) => r.id === saved.farm.activeRobotId,
          ).code = source;
          localStorage.setItem("farmscript-v1", JSON.stringify(saved));
          localStorage.setItem("farmscript-code", source);
          sessionStorage.setItem(key, "1");
        },
        { source, key },
      );
    };
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.FARM_URL || "http://localhost:5173");
    await openEditor();
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: "▶ Exécuter", exact: true }).click();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.deposited >= 2,
      null,
      { timeout: 60000 },
    );
    console.log("resources", await page.locator(".resources").innerText());
    console.log("logs", await page.locator(".log-lines").innerText());
    await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
    const before = await page.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm.time,
    );
    await page.waitForTimeout(600);
    const after = await page.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm.time,
    );
    if (before !== after) throw Error("Pause did not suspend time");
    await page.getByRole("button", { name: "Arrêter le programme" }).click();
    const state = await page.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    if (state.deposited < 2) throw Error("No automated harvest");
    await page
      .getByRole("button", { name: "Ouvrir les missions", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Missions", exact: true })
      .getByRole("button", { name: "Récupérer la récompense", exact: true })
      .click();
    await page.reload();
    await openEditor();
    const restored = await page.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    if (!restored.claimed.includes("first")) throw Error("Save not restored");
    await page.locator(".farm-scene canvas").waitFor();
    if (await page.locator(".scene-error").count())
      throw Error("WebGL rendering failed");
    await page.getByRole("button", { name: "Recherches", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Recherches", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Fermer le panneau" }).click();
    await page.screenshot({
      path: "/tmp/farmscript-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Afficher le code", exact: true })
      .click();
    await page.screenshot({
      path: "/tmp/farmscript-mobile.png",
      fullPage: true,
    });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Mobile overflow");
    await replaceSavedCode(
      'const quantite: number = "texte";',
      "test-type-error",
    );
    await page.reload();
    await openEditor();
    await page.getByRole("button", { name: "▶ Exécuter", exact: true }).click();
    await page.waitForFunction(() =>
      document
        .querySelector(".log-lines")
        .textContent.includes("Erreur TypeScript"),
    );
    await replaceSavedCode("while (true) {}", "test-empty-loop");
    await page.reload();
    await openEditor();
    await page.getByRole("button", { name: "▶ Exécuter", exact: true }).click();
    await page.waitForFunction(() =>
      document
        .querySelector(".log-lines")
        .textContent.includes("Programme lancé"),
    );
    await page.getByRole("button", { name: "Arrêter le programme" }).click();
    await page
      .getByRole("button", { name: "▶ Exécuter", exact: true })
      .waitFor();
    console.log({
      deposited: state.deposited,
      pause: true,
      persistence: true,
      typeErrors: true,
      infiniteLoopStop: true,
      errors,
    });
    if (errors.length) throw Error(errors.join("\n"));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
