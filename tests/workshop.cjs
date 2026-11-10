require("tsx/cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const { fresh } = require("../src/engine.ts"),
  { research } = require("../src/catalog.ts");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    p.setDefaultTimeout(45000);
    p.on("pageerror", (e) => errors.push(e.message));
    const f = fresh();
    f.unlocks = research.filter((r) => !r.localOnly).map((r) => r.id);
    f.buildings[0].upgrades = { storage: 3 };
    f.resources = { Wood: 1000, Hay: 1000, Carrot: 500 };
    f.sites.push({ x: 0, y: -1 });
    f.buildings.push({
      ...structuredClone(f.buildings[0]),
      id: "atelier",
      kind: "Workshop",
      x: 0,
      y: -1,
      inventory: {},
      upgrades: { workshop: 1 },
    });
    f.robots.push({
      ...structuredClone(f.robots[0]),
      id: "f2",
      deployed: false,
    });
    await p.addInitScript((f) => {
      if (!localStorage.getItem("farmscript-v1"))
        localStorage.setItem(
          "farmscript-v1",
          JSON.stringify({ version: 1, farm: f }),
        );
    }, f);
    await p.goto(process.env.FARM_URL || "http://localhost:5173");
    const hotspot = p.getByRole("button", {
      name: "Ouvrir l’atelier atelier",
      exact: true,
    });
    await hotspot.waitFor();
    const box = await hotspot.boundingBox();
    // Click the actual roof below the floating label, exercising the scene raycast.
    await p.mouse.click(box.x + box.width / 2, box.y + box.height + 14);
    const dialog = p.getByRole("dialog", { name: "Atelier", exact: true });
    await dialog
      .getByRole("heading", { name: "Atelier de robotique", exact: true })
      .waitFor();
    const gear = p.getByRole("region", { name: "Équipement f1", exact: true });
    await gear.locator('[data-upgrade="hold"] button').click();
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.robots[0]
          .equipment?.hold === 2,
    );
    assert.equal(
      await gear.locator('[data-upgrade="hold"] button').isDisabled(),
      true,
    );
    await dialog.getByRole("button", { name: /^f2 ·/ }).click();
    assert.match(
      await p
        .getByRole("region", { name: "Équipement f2", exact: true })
        .locator('[data-upgrade="hold"] h4')
        .innerText(),
      /1 \/ 5/,
    );
    await dialog
      .getByRole("button", { name: "Améliorer cet atelier", exact: true })
      .click();
    await dialog.locator('[data-upgrade="workshop"] button').click();
    await p.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("farmscript-v1")).farm.buildings.find(
          (b) => b.id === "atelier",
        ).upgrades.workshop === 2,
    );
    await dialog
      .getByText("Équipements jusqu’au niveau 4", { exact: true })
      .waitFor();
    await p.screenshot({ path: "/tmp/workshop-interface.png" });
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p.getByRole("button", { name: "Robots", exact: true }).click();
    assert.equal(
      await p.getByRole("button", { name: "Équipement", exact: true }).count(),
      0,
    );
    await p
      .getByRole("button", { name: "Améliorer f1 à l’atelier", exact: true })
      .click();
    await p
      .getByRole("region", { name: "Équipement f1", exact: true })
      .waitFor();
    await p.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: "/tmp/workshop-mobile.png" });
    await p
      .getByRole("button", { name: "Fermer le panneau", exact: true })
      .click();
    await p.setViewportSize({ width: 1440, height: 1000 });
    const camera = await p
      .locator(".farm-scene")
      .getAttribute("data-camera-azimuth");
    await p.mouse.move(650, 480);
    await p.mouse.down();
    await p.mouse.move(780, 520, { steps: 12 });
    await p.mouse.up();
    assert.equal(
      await p.getByRole("dialog", { name: "Atelier", exact: true }).count(),
      0,
    );
    await p.waitForFunction(
      (a) =>
        Math.abs(
          Number(document.querySelector(".farm-scene").dataset.cameraAzimuth) -
            Number(a),
        ) > 0.1,
      camera,
    );
    await p.screenshot({ path: "/tmp/workshop-building.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Workshop: building click, robot selection, individual upgrades, local workshop level, building upgrade, fleet redirect, mobile and camera drag passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
