require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { fresh } = require("../src/engine.ts");
const base = process.env.FARM_URL || "http://localhost:5173";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const fixture = fresh();
    fixture.resources.Hay = 41;
    fixture.robots[0].code = "// Mon programme personnel\nharvest();";
    await page.addInitScript((f) => {
      if (localStorage.getItem("slots-fixture")) return;
      localStorage.setItem(
        "farmscript-v1",
        JSON.stringify({ version: 1, farm: f }),
      );
      localStorage.setItem("slots-fixture", "1");
    }, fixture);
    const open = async (p) => {
      await p
        .getByRole("button", { name: "Session et sauvegarde", exact: true })
        .click();
      await p
        .getByRole("heading", { name: "Mes parties", exact: true })
        .waitFor();
    };
    const farm = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
      );
    await page.goto(base);
    await page.locator(".session-loading").waitFor({ state: "hidden" });
    await open(page);
    page.on("dialog", (d) => d.accept());
    const panel = page.getByRole("region", { name: "Mes parties" });
    await panel.getByLabel("Nom de la sauvegarde").fill("Ferme locale");
    await panel
      .getByRole("button", { name: "Sauvegarder cette partie", exact: true })
      .click();
    await panel.getByText("Sauvegarde créée.", { exact: true }).waitFor();
    await panel
      .getByRole("button", { name: "Nouvelle partie", exact: true })
      .click();
    await panel
      .getByText(
        "Nouvelle partie démarrée. Votre ancienne ferme est conservée.",
        { exact: true },
      )
      .waitFor();
    assert.equal((await farm()).resources.Hay ?? 0, 0);
    await panel
      .locator("li")
      .filter({ hasText: "Ferme locale" })
      .getByRole("button", { name: "Reprendre", exact: true })
      .click();
    await panel
      .getByText(
        "Partie chargée. Relancez les programmes lorsque vous êtes prêt.",
        { exact: true },
      )
      .waitFor();
    assert.equal((await farm()).resources.Hay, 41);
    assert.equal((await farm()).robots[0].code, fixture.robots[0].code);
    await page.reload();
    await page.locator(".session-loading").waitFor({ state: "hidden" });
    await open(page);
    assert.equal(await panel.locator("li").count(), 3);
    // Register: local snapshots stay private to this browser, remote slots begin empty.
    const username = "slots_" + randomUUID().replaceAll("-", "").slice(0, 12),
      password = "test-only-" + randomUUID();
    await page
      .getByRole("button", { name: "Créer un compte", exact: true })
      .click();
    await page.getByLabel("Pseudo", { exact: true }).fill(username);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await page
      .getByRole("button", {
        name: "Créer mon compte et sauvegarder",
        exact: true,
      })
      .click();
    await panel.getByText("Aucune sauvegarde nommée pour le moment.").waitFor();
    await panel.getByLabel("Nom de la sauvegarde").fill("Ferme du compte");
    await panel
      .getByRole("button", { name: "Sauvegarder cette partie", exact: true })
      .click();
    await panel.getByText("Sauvegarde créée.", { exact: true }).waitFor();
    await panel
      .getByRole("button", { name: "Nouvelle partie", exact: true })
      .click();
    await panel
      .getByText(
        "Nouvelle partie démarrée. Votre ancienne ferme est conservée.",
        { exact: true },
      )
      .waitFor();
    assert.equal((await farm()).resources.Hay ?? 0, 0);
    const second = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const other = await second.newPage();
    other.setDefaultTimeout(30000);
    other.on("dialog", (d) => d.accept());
    await other.goto(base);
    await other.locator(".session-loading").waitFor({ state: "hidden" });
    await open(other);
    await other.getByLabel("Pseudo", { exact: true }).fill(username);
    await other.getByLabel("Mot de passe", { exact: true }).fill(password);
    await other
      .getByRole("button", { name: "Ouvrir ma session", exact: true })
      .click();
    const remotePanel = other.getByRole("region", { name: "Mes parties" });
    const row = remotePanel
      .locator("li")
      .filter({ hasText: "Ferme du compte" });
    await row.getByRole("button", { name: "Reprendre", exact: true }).click();
    await remotePanel
      .getByText(
        "Partie chargée. Relancez les programmes lorsque vous êtes prêt.",
        { exact: true },
      )
      .waitFor();
    const restored = await other.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm,
    );
    assert.equal(restored.resources.Hay, 41);
    assert.equal(restored.robots[0].code, fixture.robots[0].code);
    assert.equal(
      await other.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await other.screenshot({
      path: "/tmp/save-slots-mobile.png",
      fullPage: true,
    });
    await row
      .getByRole("button", { name: "Supprimer Ferme du compte", exact: true })
      .click();
    await remotePanel
      .getByText("Sauvegarde supprimée.", { exact: true })
      .waitFor();
    assert.equal(restored.resources.Hay, 41);
    await other.reload();
    await other.locator(".session-loading").waitFor({ state: "hidden" });
    await open(other);
    assert.equal(
      await other
        .getByRole("region", { name: "Mes parties" })
        .locator("li")
        .filter({ hasText: "Ferme du compte" })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    await second.close();
    await context.close();
    console.log(
      "Named saves: guest persistence, safe new game, robot/code restore, PostgreSQL second device, deletion and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
