require("tsx/cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const { createPool, migrate } = require("../server/db.ts");
const { createApp } = require("../server/app.ts");
const { fresh } = require("../src/modules/farm/domain/factories.ts");
(async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  const admin = createPool(databaseUrl),
    schema = "browser_catalog_" + randomUUID().replaceAll("-", "");
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(databaseUrl);
  url.searchParams.set("options", "-c search_path=" + schema);
  const db = createPool(url.toString());
  let server, browser;
  try {
    await migrate(db);
    await db.query(
      "INSERT INTO game_resources(id,name,sale_price,position) VALUES('Pear','Poire',8,9)",
    );
    await db.query(
      "UPDATE game_research_costs SET amount=7 WHERE research_id='loops' AND resource_id='Hay'",
    );
    await db.query(
      "UPDATE game_missions SET title='Mission depuis PostgreSQL',target=2 WHERE campaign='modern' AND id='first'",
    );
    await db.query(
      "UPDATE game_robot_models SET capacity=30 WHERE id='Farmer'",
    );
    server = await new Promise((resolve) => {
      const s = createApp(db, {
        serveFrontend: true,
        secureCookies: false,
        authLimit: 1000,
      }).listen(0, "127.0.0.1", () => resolve(s));
    });
    const base = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
    });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(45000);
    const farm = fresh();
    farm.resources.Hay = 20;
    farm.buildings[0].inventory.Hay = 20;
    farm.unlocks.push("print");
    farm.robots[0].code =
      "print(get_stock(Resources.Pear));\nprint(get_capacity());\nharvest();\ndeposit();";
    await page.addInitScript((f) => {
      if (!localStorage.getItem("catalog-browser-init")) {
        localStorage.setItem("catalog-browser-init", "1");
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
      }
    }, farm);
    await page.goto(base);
    await page.locator(".workspace .monaco-editor").waitFor();
    await page
      .getByText("Mission depuis PostgreSQL", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Recherches", exact: true }).click();
    await page.getByRole("button", { name: /Programmation/ }).click();
    await page.locator('[data-skill="loops"]').click();
    await page
      .getByRole("button", { name: "Rechercher · 7 foins", exact: true })
      .click();
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("farmscript-v1")).farm.unlocks.includes(
        "loops",
      ),
    );
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("farmscript-v1")).farm.resources.Hay,
      ),
      13,
    );
    await page
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await page.getByLabel("Vitesse de simulation").selectOption("5");
    for (let i = 0; i < 2; i++) {
      await page
        .getByRole("button", { name: "▶ Exécuter", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector(".program-state")?.textContent === "Arrêté",
      );
    }
    assert.match(await page.locator(".log-lines").innerText(), /30/);
    await page
      .getByRole("button", { name: "Récupérer la récompense", exact: true })
      .click();
    const credentials = {
      username: "catalog_browser",
      password: "test-only-" + randomUUID(),
    };
    const registration = await page.evaluate(async (body) => {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FarmScript-Request": "1",
        },
        body: JSON.stringify(body),
      });
      return { status: r.status, data: await r.json() };
    }, credentials);
    assert.equal(registration.status, 201);
    await page.reload();
    await page.waitForFunction(() =>
      document.querySelector(".workspace .monaco-editor"),
    );
    await page.waitForFunction(async () => {
      const r = await fetch("/api/save");
      if (!r.ok) return false;
      return !!(await r.json()).save;
    });
    const progress = await page.evaluate(async () => {
      const r = await fetch("/api/progress");
      return r.json();
    });
    assert.ok(progress.research.includes("loops"));
    assert.equal(progress.missions.find((m) => m.id === "first").claimed, true);
    const owner = registration.data.player.id;
    assert.equal(
      (
        await db.query(
          "SELECT data->>'code' AS code FROM game_saved_robots WHERE player_id=$1 AND save_key='active' AND robot_id='f1'",
          [owner],
        )
      ).rows[0].code,
      farm.robots[0].code,
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM game_saved_research WHERE player_id=$1 AND save_key='active' AND research_id='loops'",
          [owner],
        )
      ).rows[0].n,
      1,
    );
    await db.query(
      "UPDATE game_missions SET title='Mission après édition SQL' WHERE campaign='modern' AND id='deposit'",
    );
    await page.reload();
    await page
      .getByText("Mission après édition SQL", { exact: true })
      .waitFor();
    await page.route("**/api/catalog", (route) => route.abort());
    await page.reload();
    await page
      .getByText("Mode hors ligne · règles enregistrées localement", {
        exact: true,
      })
      .waitFor();
    await page
      .getByText("Mission après édition SQL", { exact: true })
      .waitFor();
    await page.unroute("**/api/catalog");
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Database catalogue: live mission/cost edits, extra resource TypeScript enum, robot parameters in Worker, PostgreSQL progress, relational robot programs, reload, cached offline release and mobile passed.",
    );
  } finally {
    if (browser) await browser.close();
    if (server)
      await new Promise((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    await db.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
