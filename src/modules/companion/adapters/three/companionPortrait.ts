import * as THREE from "three";
import { loadCyberCompanion } from "./CyberCompanion";
import type { Companion } from "../../domain/companion";
/** One shared renderer and model for all static account portraits. Never animates. */
let ready:
  | Promise<{
      renderer: THREE.WebGLRenderer;
      scene: THREE.Scene;
      camera: THREE.OrthographicCamera;
      model: Awaited<ReturnType<typeof loadCyberCompanion>>;
    }>
  | undefined;
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<string>>();
export function companionPortrait(appearance: Companion) {
  const key = JSON.stringify(appearance);
  if (cache.has(key)) return cache.get(key)!;
  const snapshot = structuredClone(appearance);
  const result = queue
    .catch(() => {})
    .then(async () => {
      ready ??= (async () => {
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: "low-power",
        });
        renderer.setSize(128, 192);
        renderer.setClearColor(0, 0);
        const scene = new THREE.Scene(),
          camera = new THREE.OrthographicCamera(-0.4, 0.4, 0.6, -0.6, 0.1, 20);
        camera.position.set(0, 1.2, 6);
        camera.lookAt(0, 0.83, 0);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x4e7286, 2.6));
        const light = new THREE.DirectionalLight(0xffffff, 2.4);
        light.position.set(-3, 4, 5);
        scene.add(light);
        const model = await loadCyberCompanion();
        scene.add(model.group);
        return { renderer, scene, camera, model };
      })().catch((error) => {
        ready = undefined;
        throw error;
      });
      const { renderer, scene, camera, model } = await ready;
      const legendary = snapshot.skin.startsWith("legend-");
      camera.left = legendary ? -0.46 : -0.4;
      camera.right = -camera.left;
      camera.top = legendary ? 0.69 : 0.6;
      camera.bottom = -camera.top;
      camera.lookAt(0, legendary ? 0.87 : 0.83, 0);
      camera.updateProjectionMatrix();
      model.update(0, snapshot, camera.position);
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    });
  cache.set(key, result);
  queue = result;
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
  result.catch(() => cache.delete(key));
  return result;
}
