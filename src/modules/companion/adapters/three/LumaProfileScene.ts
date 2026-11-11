import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { loadCyberCompanion } from "./CyberCompanion";
import {
  attachProfileInteraction,
  type ProfileInteractionState,
} from "./profileInteraction";
import type { Companion } from "../../domain/companion";
export function createLumaProfileScene(
  host: HTMLDivElement,
  state: () => ProfileInteractionState & { appearance: Companion },
  onReady: (error?: string) => void,
) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute(
    "aria-label",
    "Luma en 3D : glisser pour faire tourner ou placer un sticker",
  );
  canvas.tabIndex = 0;
  canvas.style.touchAction = "none";
  host.appendChild(canvas);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(35, 1, 0.05, 20);
  camera.position.set(0, 1.15, 2.45);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.82, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.55;
  controls.maxDistance = 4;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI - 0.15;
  controls.update();
  scene.add(new THREE.HemisphereLight(0xe5f9ff, 0x4c5972, 2.8));
  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5accff, 2.6);
  rim.position.set(-3, 1, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffc390, 1.4);
  fill.position.set(3, 0, -1);
  scene.add(fill);
  let alive = true,
    model: Awaited<ReturnType<typeof loadCyberCompanion>> | undefined,
    removeInteraction: (() => void) | undefined,
    frame = 0,
    last = performance.now(),
    lastRender = 0;
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (width && height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }
  });
  resize.observe(host);
  const disposeModel = (m: NonNullable<typeof model>) => {
    m.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    m.dispose();
  };
  loadCyberCompanion()
    .then((m) => {
      if (!alive) {
        disposeModel(m);
        return;
      }
      model = m;
      scene.add(m.group);
      m.updatePreview(0, state().appearance);
      removeInteraction = attachProfileInteraction(
        canvas,
        camera,
        controls,
        m,
        state,
      );
      host.dataset.model = "utility-robot";
      onReady();
    })
    .catch(() => {
      if (alive)
        onReady(
          "Le modèle 3D n’a pas pu être chargé. Réessayez en rouvrant votre profil.",
        );
    });
  function render(now: number) {
    frame = requestAnimationFrame(render);
    if (now - lastRender < 33) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    lastRender = now;
    controls.enabled = state().mode === "orbit";
    controls.update();
    model?.updatePreview(dt, state().appearance);
    host.dataset.azimuth = String(controls.getAzimuthalAngle());
    host.dataset.stickers = JSON.stringify(state().appearance.stickers ?? []);
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(render);
  return {
    view(angle: number) {
      const distance = camera.position.distanceTo(controls.target),
        height = camera.position.y - controls.target.y,
        radius = Math.sqrt(
          Math.max(0.1, distance * distance - height * height),
        );
      camera.position.set(
        Math.sin(angle) * radius,
        controls.target.y + height,
        Math.cos(angle) * radius,
      );
      controls.update();
    },
    dispose() {
      alive = false;
      cancelAnimationFrame(frame);
      resize.disconnect();
      removeInteraction?.();
      controls.dispose();
      if (model) disposeModel(model);
      renderer.dispose();
      canvas.remove();
    },
  };
}
