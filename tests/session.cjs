require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { fresh, buy, purchase } = require("../src/engine.ts");
const { research } = require("../src/catalog.ts");
const base = process.env.FARM_URL || "http://localhost:5173";
const headers = { "X-FarmScript-Request": "1" };
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const fixture = fresh();
    fixture.unlocks = ["construction", "storage2"];
    fixture.stock = 300;
    fixture.resources = { Wood: 50 };
    buy(fixture, "extension");
    buy(fixture, "extension3");
    fixture.unlocks = research.map((r) => r.id);
    fixture.stock = 100;
    fixture.resources = { Wood: 50, Carrot: 20, Fertilizer: 2 };
    fixture.gold = 3000;
    purchase(fixture, "Farmer");
    purchase(fixture, "Mill", 1, { x: 0, y: -1 });
    fixture.robots[1].code =
      "// programme du deuxième robot\nwhile (true) { harvest(); plant(Entities.Bush); }";
    await page.addInitScript((f) => {
      if (sessionStorage.getItem("account-fixture")) return;
      localStorage.setItem(
        "farmscript-v1",
        JSON.stringify({ version: 1, farm: f }),
      );
      sessionStorage.setItem("account-fixture", "1");
    }, fixture);
    await page.goto(base);
    await page.locator(".session-loading").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Créer un compte", exact: true })
      .click();
    const username = "pg_" + randomUUID().replaceAll("-", "").slice(0, 14),
      password = "test-only-" + randomUUID();
    await page.getByLabel("Pseudo", { exact: true }).fill(username);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    const firstSave = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/save") &&
        r.request().method() === "PUT" &&
        r.status() === 200,
    );
    await page
      .getByRole("button", {
        name: "Créer mon compte et sauvegarder",
        exact: true,
      })
      .click();
    await firstSave;
    let data = await (await context.request.get(base + "/api/save")).json();
    assert.equal(data.save.farm.robots.length, 2);
    assert.equal(data.save.farm.buildings.length, 2);
    assert.equal(data.save.farm.tiles.length, 9);
    assert.equal(data.save.farm.robots[1].code, fixture.robots[1].code);
    const cookies = await context.cookies();
    const cookie = cookies.find((c) => c.name === "farmscript_session");
    assert.ok(cookie?.httpOnly);
    assert.equal(cookie.sameSite, "Lax");
    assert.equal(
      await page.evaluate(() => document.cookie.includes("farmscript_session")),
      false,
    );
    assert.equal(
      await page.evaluate(
        (password) => JSON.stringify(localStorage).includes(password),
        password,
      ),
      false,
    );
    await page.screenshot({ path: "/tmp/farm-session-saved.png" });
    await page.reload();
    await page.locator(".session-loading").waitFor({ state: "hidden" });
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.tiles.length ===
        9,
    );
    assert.equal(
      await page
        .locator(".sync-badge")
        .innerText()
        .then((t) => t.includes(username)),
      true,
    );
    assert.equal(
      await page
        .locator(".sync-badge")
        .evaluate((el) => el.classList.contains("conflict")),
      false,
    );
    await context.close();
    const second = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      p = await second.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base);
    await p.locator(".session-loading").waitFor({ state: "hidden" });
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    await p.getByLabel("Pseudo", { exact: true }).fill(username);
    await p.getByLabel("Mot de passe", { exact: true }).fill(password);
    await p
      .getByRole("button", { name: "Ouvrir ma session", exact: true })
      .click();
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.tiles.length ===
        9,
    );
    await p.getByRole("button", { name: "Fermer le panneau" }).click();
    await p.getByRole("button", { name: "Shop", exact: true }).click();
    await p
      .getByRole("button", {
        name: "Mettre la simulation en pause",
        exact: true,
      })
      .click();
    await p.getByRole("button", { name: "Fermer le panneau" }).click();
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Enregistrer maintenant", exact: true })
      .click();
    await p.waitForTimeout(300);
    data = await (await second.request.get(base + "/api/save")).json();
    const before = data.save.farm,
      external = structuredClone(before);
    external.gold += 7;
    const write = await second.request.put(base + "/api/save", {
      headers,
      data: { schemaVersion: 1, farm: external, revision: data.save.revision },
    });
    assert.equal(write.status(), 200);
    await p.getByRole("button", { name: "Fermer le panneau" }).click();
    await p.getByRole("button", { name: "Shop", exact: true }).click();
    await p.getByLabel("Quantité de Blé", { exact: true }).fill("1");
    await p.getByRole("button", { name: "Vendre · 1 or", exact: true }).click();
    await p.getByRole("button", { name: "Fermer le panneau" }).click();
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Enregistrer maintenant", exact: true })
      .click();
    await p
      .getByRole("button", {
        name: "Reprendre la sauvegarde du compte",
        exact: true,
      })
      .waitFor();
    await p.reload();
    await p.locator(".session-loading").waitFor({ state: "hidden" });
    assert.equal(
      await p
        .locator(".sync-badge")
        .getAttribute("class")
        .then((s) => s.includes("conflict")),
      true,
    );
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    await p
      .getByRole("button", {
        name: "Reprendre la sauvegarde du compte",
        exact: true,
      })
      .click();
    await p.waitForFunction(
      (expected) =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.gold ===
        expected,
      external.gold,
    );
    assert.equal(
      await p.evaluate(
        () => JSON.parse(localStorage.getItem("farmscript-v1")).farm.gold,
      ),
      external.gold,
    );
    await p.route("**/api/save", async (route) => {
      await route.fetch();
      await route.abort();
    });
    await p.getByRole("button", { name: "Fermer le panneau" }).click();
    await p.getByRole("button", { name: "Shop", exact: true }).click();
    await p.getByLabel("Quantité de Blé", { exact: true }).fill("1");
    await p.getByRole("button", { name: "Vendre · 1 or", exact: true }).click();
    await p.getByRole("button", { name: "Fermer le panneau" }).click();
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Enregistrer maintenant", exact: true })
      .click();
    await p
      .getByRole("button", {
        name: "Réessayer la connexion au serveur",
        exact: true,
      })
      .waitFor();
    const localGold = await p.evaluate(
      () => JSON.parse(localStorage.getItem("farmscript-v1")).farm.gold,
    );
    assert.equal(localGold, external.gold + 1);
    await p.unroute("**/api/save");
    // Autosave may already be retrying and remove this button once it succeeds.
    // Click only an available retry; verify the persisted result either way.
    await p.evaluate(() => {
      const retry = [...document.querySelectorAll("button")].find(
        (button) => button.textContent === "Réessayer la connexion au serveur",
      );
      if (retry && !retry.disabled) retry.click();
    });
    await p.waitForFunction(() =>
      document.querySelector(".sync-badge").classList.contains("saved"),
    );
    data = await (await second.request.get(base + "/api/save")).json();
    assert.equal(data.save.farm.gold, localGold);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: "/tmp/farm-session-mobile.png" });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await p
      .getByRole("button", { name: "Se déconnecter", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Ouvrir ma session", exact: true })
      .waitFor();
    assert.equal(
      (await second.cookies()).some((c) => c.name === "farmscript_session"),
      false,
    );
    assert.equal(
      await p.evaluate(
        () => JSON.parse(localStorage.getItem("farmscript-v1")).farm.gold,
      ),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Sessions PostgreSQL : inscription, import, reconnexion multi-appareils, conflit persistant, panne réseau, reprise, logout et mobile OK.",
    );
    await second.close();
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
