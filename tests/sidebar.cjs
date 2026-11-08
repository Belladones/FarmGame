require("tsx/cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { fresh, buy } = require("../src/engine.ts");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const fixture = fresh();
    fixture.stock = 25;
    buy(fixture, "extension");
    fixture.stock = 135;
    fixture.resources = { Wood: 65 };
    fixture.harvested = 100;
    fixture.visited = [0, 1, 2];
    fixture.claimed = ["first", "deposit", "routine", "explore"];
    fixture.unlocks.push("conditions", "sensor");
    const p = await browser.newPage({ viewport: { width: 1440, height: 872 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.addInitScript((f) => {
      if (sessionStorage.getItem("sidebar-fixture")) return;
      localStorage.setItem(
        "farmscript-v1",
        JSON.stringify({ version: 1, farm: f }),
      );
      sessionStorage.setItem("sidebar-fixture", "1");
    }, fixture);
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    await p.locator(".farm-scene canvas").waitFor();
    for (const [width, height] of [
      [1440, 872],
      [1280, 850],
      [1024, 720],
      [1100, 650],
      [1440, 1000],
      [390, 844],
      [320, 740],
    ]) {
      await p.setViewportSize({ width, height });
      if (width <= 1000 && (await p.locator(".workspace").isVisible()))
        await p
          .getByRole("button", { name: "Afficher le code", exact: true })
          .click();
      await p.locator(".sidebar-scroll").evaluate((el) => (el.scrollTop = 0));
      const before = await p.evaluate(() => {
        const r = (s) => document.querySelector(s).getBoundingClientRect();
        const store = r(".depot-summary"),
          title = r(".island-caption");
        return {
          titleClear: innerWidth <= 1000 || store.bottom + 4 <= title.top,
          width: document.documentElement.scrollWidth,
          viewport: innerWidth,
        };
      });
      assert.equal(
        before.titleClear,
        true,
        `${width}x${height}: full storage overlaps title`,
      );
      assert.ok(before.width <= before.viewport);
      const last = p.getByRole("button", {
        name: "Magasin",
        exact: true,
      });
      await last.scrollIntoViewIfNeeded();
      const hit = await last.evaluate((el) => {
        const r = el.getBoundingClientRect(),
          mission = document
            .querySelector(".mission-peek")
            .getBoundingClientRect();
        const target = document.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height / 2,
        );
        return {
          reachable: el.contains(target),
          inside: r.top >= 0 && r.bottom <= innerHeight,
          clear: innerWidth <= 1000 || r.bottom + 4 <= mission.top,
        };
      });
      assert.equal(
        hit.reachable,
        true,
        `${width}x${height}: last tool blocked`,
      );
      assert.equal(hit.inside, true);
      assert.equal(hit.clear, true);
      await last.click();
      await p.getByRole("dialog", { name: "Magasin", exact: true }).waitFor();
      await p
        .getByRole("button", { name: "Retour à la ferme", exact: true })
        .click();
      const claim = p
        .locator(".peek-footer")
        .getByRole("button", { name: "Récupérer la récompense", exact: true });
      assert.equal(
        await claim.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          );
        }),
        true,
        `${width}x${height}: mission reward blocked`,
      );
      if (width === 1440 && height === 872) {
        await p.locator(".sidebar-scroll").evaluate((el) => (el.scrollTop = 0));
        await p.screenshot({ path: "/tmp/farm-sidebar-fixed.png" });
      }
    }
    await p
      .locator(".peek-footer")
      .getByRole("button", { name: "Récupérer la récompense", exact: true })
      .click();
    await p.waitForFunction(() =>
      JSON.parse(localStorage.getItem("farmscript-v1")).farm.claimed.includes(
        "observe",
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Sidebar: full storage, ready mission, all tools reachable, scrolling and reward claim passed at seven viewport sizes",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
