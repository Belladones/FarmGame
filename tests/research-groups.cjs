require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { fresh } = require("../src/modules/farm/application/engine.ts");
const { research } = require("./catalog.ts");
const base = process.env.FARM_URL || "http://localhost:5173";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const fixture = fresh();
    fixture.unlocks.push("loops", "speed", "plant", "bush");
    fixture.resources = { Hay: 30, Wood: 20 };
    await p.addInitScript((f) => {
      if (!localStorage.getItem("farmscript-v1"))
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
    }, fixture);
    await p.goto(base);
    await p.getByRole("button", { name: "Recherches", exact: true }).click();
    const expansion = p.locator('[data-skill="extension"]');
    await expansion.click();
    assert.equal(await expansion.locator(".node-level").innerText(), "0 / 9");
    assert.equal(await p.locator('[data-skill="extension3"]').count(), 0);
    await expansion.evaluate((el) => (el.dataset.identity = "same-card"));
    await p
      .getByRole("button", { name: "Rechercher · 30 foins", exact: true })
      .click();
    await p
      .locator(".research-level-detail")
      .getByText("Niveau 1 / 9", { exact: true })
      .waitFor();
    assert.equal(await expansion.getAttribute("data-identity"), "same-card");
    assert.equal(
      await expansion.locator(".node-status").innerText(),
      "20 bois",
    );
    assert.equal(await expansion.getAttribute("aria-pressed"), "true");
    await p
      .getByRole("button", { name: "Rechercher · 20 bois", exact: true })
      .click();
    await p
      .locator(".research-level-detail")
      .getByText("Niveau 2 / 9", { exact: true })
      .waitFor();
    assert.equal(await expansion.getAttribute("data-identity"), "same-card");
    assert.equal(
      await expansion.locator(".node-status").innerText(),
      "100 bois + 50 carottes",
    );
    assert.equal(
      await p
        .getByRole("button", { name: "Prérequis manquants", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await p.locator('[data-skill="bush"] .node-level').innerText(),
      "1 / 10",
    );
    await p.locator('[data-skill="grass-base"]').click();
    await p
      .getByRole("button", {
        name: "Voir le prérequis Construction",
        exact: true,
      })
      .click();
    assert.equal(
      await p.locator(".skill-detail h3").innerText(),
      "Construction",
    );
    assert.equal(await p.locator('[data-skill="storage2"]').count(), 0);
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p.reload();
    await p.getByRole("button", { name: "Recherches", exact: true }).click();
    assert.equal(
      await p.locator('[data-skill="extension"] .node-level').innerText(),
      "2 / 9",
    );
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    assert.equal(
      await p.getByRole("button", { name: "Équipement", exact: true }).count(),
      0,
    );
    assert.equal(
      await p
        .getByRole("button", { name: "Ouvrir l’atelier", exact: true })
        .isDisabled(),
      true,
    );
    const max = fresh();
    max.width = 9;
    max.height = 9;
    max.tiles = Array.from({ length: 81 }, () => structuredClone(max.tiles[0]));
    max.unlocks = research
      .filter((r) => r.id !== "extension10")
      .map((r) => r.id);
    max.buildings[0].upgrades = { storage: 10 };
    max.resources = {
      ...research.find((r) => r.id === "extension10").materials,
    };
    const maxContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mobile = await maxContext.newPage();
    await mobile.addInitScript((f) => {
      if (!localStorage.getItem("farmscript-v1"))
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
    }, max);
    await mobile.goto(base);
    await mobile
      .getByRole("button", { name: "Recherches", exact: true })
      .click();
    const card = mobile.locator('[data-skill="extension"]');
    await card.click();
    assert.equal(await card.locator(".node-level").innerText(), "8 / 9");
    await mobile.locator(".purchase-skill").click();
    await mobile
      .locator(".research-level-detail")
      .getByText("Niveau 9 / 9", { exact: true })
      .waitFor();
    assert.equal(
      await mobile
        .getByRole("button", { name: "✓ Niveau maximum atteint", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(await card.locator(".node-status").innerText(), "✓ Maximum");
    assert.match(
      await mobile.locator(".skill-price").innerText(),
      /Niveau maximum atteint/,
    );
    await mobile.screenshot({ path: "/tmp/research-groups-mobile.png" });
    assert.equal(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await maxContext.close();
    console.log(
      "Grouped research: same DOM card across 2 upgrades, next costs/prerequisites, reload, cross-tree links, robot groups, maximum tier and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
