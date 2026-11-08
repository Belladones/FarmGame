const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.FARM_URL || "http://localhost:5173");
  await page.locator(".monaco-editor").waitFor();
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "▶ Exécuter", exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem("farmscript-v1")).farm.deposited >= 2,
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
    .getByRole("button", { name: "Récupérer la récompense", exact: true })
    .click();
  await page.reload();
  await page.locator(".monaco-editor").waitFor();
  const restored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
  );
  if (!restored.claimed.includes("first")) throw Error("Save not restored");
  await page.screenshot({
    path: "/tmp/farmscript-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/farmscript-mobile.png", fullPage: true });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Mobile overflow");
  await page.evaluate(() =>
    localStorage.setItem(
      "farmscript-code",
      'const quantite: number = "texte";',
    ),
  );
  await page.reload();
  await page.locator(".monaco-editor").waitFor();
  await page.getByRole("button", { name: "▶ Exécuter", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".log-lines")
      .textContent.includes("Erreur TypeScript"),
  );
  await page.evaluate(() =>
    localStorage.setItem("farmscript-code", "while (true) {}"),
  );
  await page.reload();
  await page.locator(".monaco-editor").waitFor();
  await page.getByRole("button", { name: "▶ Exécuter", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".log-lines")
      .textContent.includes("Programme lancé"),
  );
  await page.getByRole("button", { name: "Arrêter le programme" }).click();
  await page.getByRole("button", { name: "▶ Exécuter", exact: true }).waitFor();
  console.log({
    deposited: state.deposited,
    pause: true,
    persistence: true,
    typeErrors: true,
    infiniteLoopStop: true,
    errors,
  });
  if (errors.length) throw Error(errors.join("\n"));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
