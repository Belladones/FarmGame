import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const directory = "public/models/luma/previews";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/luma-preview.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body></body></html>",
    }),
  );
  await page.goto(
    `${process.env.FARM_URL || "http://localhost:5173"}/luma-preview.html`,
  );
  await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { loadCyberCompanion } = await import("/src/modules/companion/adapters/three/CyberCompanion.ts");
    const scene = new THREE.Scene(),
      camera = new THREE.OrthographicCamera(-0.4, 0.4, 0.6, -0.6, 0.1, 20);
    camera.position.set(0, 1.2, 6);
    camera.lookAt(0, 0.83, 0);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(128, 192);
    renderer.setClearColor(0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4e7286, 2.6));
    const light = new THREE.DirectionalLight(0xffffff, 2.4);
    light.position.set(-3, 4, 5);
    scene.add(light);
    const model = await loadCyberCompanion();
    scene.add(model.group);
    renderer.domElement.id = "luma-preview";
    Object.assign(renderer.domElement.style, {
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 1000,
    });
    document.body.appendChild(renderer.domElement);
    window.renderLumaPreview = (skin, accessory, lens) => {
      const legendary = skin.startsWith("legend-");
      camera.left = legendary ? -0.46 : -0.4;
      camera.right = -camera.left;
      camera.top = legendary ? 0.69 : 0.6;
      camera.bottom = -camera.top;
      camera.lookAt(0, legendary ? 0.87 : 0.83, 0);
      camera.updateProjectionMatrix();
      model.update(0, { skin, accessory, lens, unlocked: [] }, camera.position);
      renderer.render(scene, camera);
    };
  });
  for (const skin of [
    "pearl",
    "rose",
    "mint",
    "cosmic",
    "legend-angel",
    "legend-demon",
  ])
    for (const accessory of skin.startsWith("legend-")
      ? ["none"]
      : ["none", "ribbon", "flower", "halo"])
      for (const lens of [
        "lens-red",
        "lens-cyan",
        "lens-violet",
        "lens-green",
      ]) {
        await page.evaluate(
          ({ skin, accessory, lens }) =>
            window.renderLumaPreview(skin, accessory, lens),
          { skin, accessory, lens },
        );
        await page.locator("#luma-preview").screenshot({
          path: `${directory}/${skin}-${accessory}-${lens}.png`,
          omitBackground: true,
        });
      }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "Rendered 72 cosmetic previews from the supplied utility robot mesh.",
  );
} finally {
  await browser.close();
}
