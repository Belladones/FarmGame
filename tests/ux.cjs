const { chromium } = require("playwright");
const assert = require("node:assert/strict");
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
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.locator(".farm-scene canvas").waitFor();
    await p
      .getByRole("complementary", { name: "Conseils de départ" })
      .waitFor();
    assert.equal(
      await p.locator(".dock-button > span").first().isVisible(),
      true,
    );
    assert.equal(await p.locator(".command-top-nav").count(), 0);
    assert.equal(await p.locator(".dock-button").count(), 6);
    await p
      .getByRole("button", { name: "Ouvrir les missions", exact: true })
      .click();
    assert.equal(
      await p.locator('.progression-nav [aria-label^="Aller à"]').count(),
      3,
    );
    await p
      .getByRole("button", { name: "Retour à la ferme", exact: true })
      .click();
    assert.match(
      await p
        .getByRole("complementary", {
          name: "Statistiques du robot sélectionné",
          exact: true,
        })
        .innerText(),
      /0 \/ 10/,
    );
    await p.screenshot({ path: "/tmp/farm-ux-desktop.png" });
    await p.setViewportSize({ width: 1024, height: 720 });
    const layout = await p.evaluate(() => {
      const dock = document.querySelector(".dock").getBoundingClientRect();
      const mission = document
        .querySelector(".mission-peek")
        .getBoundingClientRect();
      return {
        fits: dock.top >= 0 && dock.bottom <= innerHeight,
        noOverlap: dock.right <= mission.left || dock.bottom <= mission.top,
      };
    });
    assert.equal(layout.fits, true);
    assert.equal(layout.noOverlap, true);
    await p.screenshot({ path: "/tmp/farm-theme-compact.png" });
    await p.setViewportSize({ width: 320, height: 740 });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );

    await p.setViewportSize({ width: 390, height: 844 });
    if (await p.locator(".workspace .editor").isVisible())
      await p
        .getByRole("button", { name: "Afficher le code", exact: true })
        .click();
    await p.screenshot({ path: "/tmp/farm-ux-mobile.png" });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await p
      .getByRole("button", {
        name: "Masquer les conseils de départ",
        exact: true,
      })
      .click();
    await p.reload();
    assert.equal(await p.locator(".start-hint").count(), 0);
    await p.getByRole("button", { name: "API et aide", exact: true }).click();
    const guide = p.getByRole("dialog", { name: "API & aide", exact: true });
    await guide.waitFor();
    const search = p.getByRole("searchbox", {
      name: "Rechercher une commande",
      exact: true,
    });
    await search.fill("get_pos");
    assert.equal(await p.locator(".help-api article").count(), 1);
    await p.keyboard.press("Alt+Digit4");
    await guide.waitFor(); // Typing a shortcut in a field must not navigate away.
    await p.keyboard.press("Tab");
    assert.equal(
      await p.evaluate(
        () => !!document.activeElement.closest('[role="dialog"]'),
      ),
      true,
    );
    await search.fill("introuvablexyz");
    await p.getByText("Aucune commande trouvée.", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Effacer la recherche", exact: true })
      .click();
    assert.ok((await p.locator(".help-api article").count()) > 10);
    await p.getByRole("button", { name: "harvest()", exact: true }).click();
    assert.match(
      await p.locator(".help-result").innerText(),
      /harvest\(\) → true|Aucune entité/,
    );
    await p.screenshot({ path: "/tmp/farm-ux-guide-mobile.png" });
    assert.equal(
      await p.locator('.workspace-nav [aria-label^="Aller à"]').count(),
      0,
    );
    await p
      .getByRole("button", { name: "Retour à la ferme", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Ouvrir les missions", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Aller à Robots", exact: true })
      .click();
    await p.locator(".fleet-panel").waitFor();
    await p
      .getByRole("button", { name: "Retour à la ferme", exact: true })
      .click();
    await p.evaluate(() => document.activeElement.blur());
    await p.keyboard.press("Alt+Digit4");
    await p.getByRole("dialog", { name: "Magasin", exact: true }).waitFor();
    await p.keyboard.press("Escape");
    await p
      .getByRole("button", { name: "Voir les stocks des dépôts", exact: true })
      .click();
    await p.getByRole("dialog", { name: "Magasin", exact: true }).waitFor();
    assert.equal(
      await p.locator('.workspace-nav [aria-label^="Aller à"]').count(),
      0,
    );
    await p
      .getByRole("button", { name: "Retour à la ferme", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Session et sauvegarde", exact: true })
      .click();
    await p
      .getByRole("dialog", { name: "Session et sauvegarde", exact: true })
      .waitFor();
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await p.keyboard.press("Escape");
    await p.waitForFunction(
      () =>
        document.activeElement?.getAttribute("aria-label") ===
        "Session et sauvegarde",
    );
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.evaluate(() => document.activeElement.blur());
    await p.keyboard.press("Control+Enter");
    await p.locator(".action-notice").waitFor({ timeout: 60000 });
    assert.match(
      await p.locator(".action-notice").innerText(),
      /Programme de f1 lancé/,
    );
    await p
      .getByRole("button", { name: "Fermer la notification", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Arrêter le programme", exact: true })
      .click();
    assert.deepEqual(errors, []);
    console.log(
      "UX: first steps, readable navigation, mobile, guide search, focus, shortcuts, menu switching and notifications passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
