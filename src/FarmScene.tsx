import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Farm } from "./engine";
interface Props {
  farm: Farm;
  paused: boolean;
  running: boolean;
  zoom: number;
  resetView: number;
  editorOpen: boolean;
}
// Original procedural models: no downloaded assets or textures.
const STEP = 1.28;
function material(color: number) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
  });
}
export function FarmScene({
  farm,
  paused,
  running,
  zoom,
  resetView,
  editorOpen,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    state = useRef({ farm, paused, running, zoom, resetView, editorOpen });
  state.current = { farm, paused, running, zoom, resetView, editorOpen };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x718994, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Ferme en 3D : parcelles, blé, dépôt et robot",
    );
    renderer.domElement.setAttribute("role", "img");
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.rotateSpeed = 0.5;
    controls.minZoom = 0.7;
    controls.maxZoom = 2;
    controls.zoomSpeed = 0.7;
    function home() {
      // Flush damping before restoring the initial camera pose.
      controls.enableDamping = false;
      controls.update();
      camera.up.set(0, 1, 0);
      camera.position.set(-STEP * 0.65 + 1.2, 12, 13.8);
      controls.target.set(-STEP * 0.65, 0, 0);
      camera.zoom = state.current.zoom;
      camera.updateProjectionMatrix();
      controls.update();
      controls.enableDamping = true;
    }
    home();
    scene.add(new THREE.HemisphereLight(0xf7f1d7, 0x516149, 2.4));
    const sun = new THREE.DirectionalLight(0xffedc4, 3.3);
    sun.position.set(-8, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -11;
    sun.shadow.camera.right = 11;
    sun.shadow.camera.top = 11;
    sun.shadow.camera.bottom = -11;
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    const width = state.current.farm.width;
    const center = (x: number) => (x - (width - 1) / 2) * STEP;
    const dirt = material(0x9d642b),
      edge = material(0xbe883c),
      green = material(0x7c8629),
      trunk = material(0x614015),
      leafLight = material(0xa9ae3c),
      gold = material(0xd6b448),
      dark = material(0x45482e),
      purple = material(0x975575);
    const island = new THREE.Group();
    scene.add(island);
    const boxGeo = new THREE.BoxGeometry(1, 1, 1),
      stemGeo = new THREE.CylinderGeometry(0.012, 0.017, 1, 4),
      grainGeo = new THREE.ConeGeometry(0.045, 0.15, 4);
    const allMaterials = new Set<THREE.Material>([
      dirt,
      edge,
      green,
      trunk,
      leafLight,
      gold,
      dark,
      purple,
    ]);
    function box(
      parent: THREE.Object3D,
      mat: THREE.Material,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
    ) {
      const m = new THREE.Mesh(boxGeo, mat);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    }
    box(island, dirt, width * STEP + 0.04, 0.65, STEP + 0.04, 0, -0.38, 0);
    box(island, edge, width * STEP + 0.04, 0.1, STEP + 0.04, 0, -0.04, 0);
    const bottom = material(0x855a32);
    allMaterials.add(bottom);
    box(island, bottom, width * STEP, 0.16, STEP, 0, -0.77, 0);
    // A softly fading shadow anchors the floating island in the blue-gray void.
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
    grad.addColorStop(0, "rgba(30,47,49,.28)");
    grad.addColorStop(1, "rgba(30,47,49,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    allMaterials.add(shadowMat);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(width * STEP + 3, 4),
      shadowMat,
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.7;
    scene.add(shadow);
    const grounds: THREE.Mesh[] = [],
      crops: THREE.Group[] = [];
    const dummy = new THREE.Object3D();
    function wheat(parent: THREE.Object3D, seed: number, count = 40) {
      const g = new THREE.Group();
      parent.add(g);
      const stems = new THREE.InstancedMesh(stemGeo, material(0xb59938), count);
      allMaterials.add(stems.material as THREE.Material);
      const heads = new THREE.InstancedMesh(grainGeo, gold, count * 3);
      stems.castShadow = true;
      heads.castShadow = true;
      g.add(stems, heads);
      for (let i = 0; i < count; i++) {
        const x = (((i * 37 + seed * 13) % 97) / 97) * 0.99 - 0.49,
          z = (((i * 53 + seed * 7) % 89) / 89) * 0.99 - 0.49,
          h = 0.45 + ((i * 19) % 17) / 50;
        dummy.position.set(x, h / 2, z);
        dummy.rotation.set(0.07, 0, 0.03);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        stems.setMatrixAt(i, dummy.matrix);
        for (let j = 0; j < 3; j++) {
          dummy.position.set(x + (j % 2 ? 0.025 : -0.025), h + j * 0.065, z);
          dummy.rotation.set(0, j, j % 2 ? 0.45 : -0.45);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          heads.setMatrixAt(i * 3 + j, dummy.matrix);
        }
      }
      return g;
    }
    for (let x = 0; x < width; x++) {
      const g = new THREE.Group();
      g.position.set(center(x), 0.02, 0);
      island.add(g);
      grounds.push(box(g, green, STEP - 0.035, 0.035, STEP - 0.035, 0, 0, 0));
      crops.push(wheat(g, x, 54));
    }
    // Expose the actual rendered plot count for accessibility and browser validation.
    container.dataset.plotCount = String(grounds.length);
    renderer.domElement.setAttribute(
      "aria-label",
      `Ferme : ${grounds.length} parcelle${grounds.length > 1 ? "s" : ""} carrée${grounds.length > 1 ? "s" : ""}, dépôt adjacent et robot`,
    );
    // The warehouse sits one tile west of the origin, exactly as deposit() expects.
    const warehouse = new THREE.Group();
    warehouse.position.set(center(0) - STEP * 1.1, 0.08, 0);
    island.add(warehouse);
    const wall = material(0xb59960),
      roof = material(0x76503a);
    allMaterials.add(wall);
    allMaterials.add(roof);
    box(warehouse, wall, 0.75, 0.48, 0.65, 0, 0.24, 0);
    box(warehouse, dark, 0.24, 0.31, 0.02, 0, 0.16, 0.34);
    const roofMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.56, 0.85, 3),
      roof,
    );
    roofMesh.rotation.z = Math.PI / 2;
    roofMesh.rotation.x = Math.PI / 2;
    roofMesh.position.y = 0.64;
    roofMesh.castShadow = true;
    warehouse.add(roofMesh);
    box(warehouse, gold, 0.15, 0.18, 0.2, 0.39, 0.1, 0.2);
    box(warehouse, gold, 0.15, 0.15, 0.2, 0.42, 0.09, -0.08);
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const labelContext = labelCanvas.getContext("2d")!;
    labelContext.font = "24px monospace";
    labelContext.textAlign = "center";
    labelContext.fillStyle = "#e8e4c9";
    labelContext.fillText("DÉPÔT", 128, 40);
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelMaterial = new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthTest: false,
    });
    allMaterials.add(labelMaterial);
    const label = new THREE.Sprite(labelMaterial);
    label.scale.set(1.1, 0.275, 1);
    label.position.set(warehouse.position.x, 0.8, 0.65);
    island.add(label);
    // Original four-rotor farming bot, with a purple shell and visible cargo.
    const robot = new THREE.Group();
    island.add(robot);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.28, 0.19, 8),
      purple,
    );
    body.position.y = 0.23;
    body.castShadow = true;
    robot.add(body);
    box(robot, gold, 0.24, 0.16, 0.21, 0, 0.37, 0.015);
    box(robot, dark, 0.15, 0.055, 0.02, 0, 0.27, 0.26);
    box(robot, leafLight, 0.05, 0.025, 0.025, -0.04, 0.28, 0.275);
    const rotors: THREE.Mesh[] = [];
    for (let j = 0; j < 4; j++) {
      const angle = (j * Math.PI) / 2 + Math.PI / 4;
      const arm = box(
        robot,
        trunk,
        0.07,
        0.055,
        0.64,
        Math.sin(angle) * 0.2,
        0.21,
        Math.cos(angle) * 0.2,
      );
      arm.rotation.y = angle;
      const r = box(
        robot,
        dark,
        0.42,
        0.018,
        0.055,
        Math.sin(angle) * 0.46,
        0.26,
        Math.cos(angle) * 0.46,
      );
      rotors.push(r);
      const leg = box(
        robot,
        dark,
        0.025,
        0.2,
        0.025,
        Math.sin(angle) * 0.18,
        0.05,
        Math.cos(angle) * 0.18,
      );
      leg.rotation.z = 0.2;
    }
    const outlineMat = new THREE.LineBasicMaterial({ color: 0xe8ce70 });
    allMaterials.add(outlineMat);
    const outlineGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(STEP - 0.05, 0.045, STEP - 0.05),
    );
    for (let x = 0; x < width; x++) {
      const line = new THREE.LineSegments(outlineGeo, outlineMat);
      line.position.set(center(x), 0.065, 0);
      island.add(line);
    }
    let lastEditor = state.current.editorOpen,
      lastView = state.current.resetView,
      lastZoom = state.current.zoom,
      disposed = false,
      frame = 0,
      lastFrame = 0,
      lastShadow = 0,
      shadowRevision = "";
    const resize = () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      const available = w >= 900 && state.current.editorOpen ? 0.57 : 0.88;
      const extent = Math.max(
        3.1,
        ((width + 1.8) * STEP * h) / (2 * w * available),
      );
      camera.left = (-extent * w) / h;
      camera.right = (extent * w) / h;
      camera.top = extent;
      camera.bottom = -extent;
      // Reserve the right part of the desktop view for the floating editor.
      camera.setViewOffset(
        w,
        h,
        w >= 900 && state.current.editorOpen ? w * 0.15 : 0,
        w < 700 ? -h * 0.045 : 0,
        w,
        h,
      );
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      // Geometry dimensions stay equal even when the viewing angle changes.
      container.dataset.cellWidth = String(grounds[0].scale.x);
      container.dataset.cellHeight = String(grounds[0].scale.z);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const syncCamera = () => {
      container.dataset.cameraAzimuth = String(controls.getAzimuthalAngle());
      container.dataset.cameraPolar = String(controls.getPolarAngle());
    };
    controls.addEventListener("change", syncCamera);
    syncCamera();
    const draw = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(draw);
      if (now - lastFrame < 1000 / 30) return;
      lastFrame = now;
      const {
        farm: s,
        paused: pause,
        running: run,
        zoom: z,
        resetView: r,
      } = state.current;
      if (state.current.editorOpen !== lastEditor) {
        resize();
        lastEditor = state.current.editorOpen;
      }
      if (r !== lastView) {
        home();
        lastView = r;
      }
      if (z !== lastZoom) {
        camera.zoom = z;
        camera.updateProjectionMatrix();
        lastZoom = z;
      }
      for (let x = 0; x < width; x++) {
        const crop = crops[x],
          tile = s.tiles[x];
        crop.visible = !!tile && tile.planted !== null;
        if (crop.visible && tile) {
          const p = Math.min(1, (s.time - tile.planted!) / 5);
          crop.scale.y = 0.15 + 0.85 * p;
          crop.scale.x = crop.scale.z = 0.6 + 0.4 * p;
        }
      }
      const targetX = center(s.x);
      robot.position.x += (targetX - robot.position.x) * 0.15;
      robot.position.z = 0;
      robot.position.y = 0.12 + (!pause ? Math.sin(now * 0.003) * 0.025 : 0);
      for (const rotor of rotors) if (run && !pause) rotor.rotation.y += 0.9;
      controls.update();
      const revision = `${s.planted}:${s.harvested}:${s.width}:${s.x}`;
      const growing = s.tiles.some(
        (t) => t.planted !== null && s.time - t.planted < 5,
      );
      if (
        revision !== shadowRevision ||
        (!pause && (run || growing) && now - lastShadow > 250)
      ) {
        renderer.shadowMap.needsUpdate = true;
        lastShadow = now;
        shadowRevision = revision;
      }
      renderer.render(scene, camera);
    };
    robot.position.set(center(state.current.farm.x), 0.12, 0);
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener("change", syncCamera);
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments)
          o.geometry.dispose();
      });
      allMaterials.forEach((m) => m.dispose());
      shadowTexture.dispose();
      labelTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [farm.width]);
  return (
    <div ref={host} className="farm-scene" data-testid="farm-scene">
      {failed && (
        <div className="scene-error">
          La vue 3D nécessite WebGL. Activez l’accélération graphique du
          navigateur ; l’éditeur et la simulation restent disponibles.
        </div>
      )}
    </div>
  );
}
