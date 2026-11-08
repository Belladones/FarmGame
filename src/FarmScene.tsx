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
const SIDE = 6,
  STEP = 1.28;
const center = (n: number) => (n - (SIDE - 1) / 2) * STEP;
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
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = 1.18;
    controls.minZoom = 0.7;
    controls.maxZoom = 2;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.7;
    function home() {
      camera.position.set(1.2, 12, 13.8);
      controls.target.set(0, 0, 0);
      camera.zoom = state.current.zoom;
      camera.updateProjectionMatrix();
      controls.update();
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
    const dirt = material(0x9d642b),
      edge = material(0xbe883c),
      green = material(0x7c8629),
      soil = material(0x94612b),
      trunk = material(0x614015),
      leaf = material(0x939f30),
      leafLight = material(0xa9ae3c),
      rock = material(0xbbbaa0),
      gold = material(0xd6b448),
      dark = material(0x45482e),
      purple = material(0x975575);
    const island = new THREE.Group();
    scene.add(island);
    const boxGeo = new THREE.BoxGeometry(1, 1, 1),
      stemGeo = new THREE.CylinderGeometry(0.012, 0.017, 1, 4),
      grainGeo = new THREE.ConeGeometry(0.045, 0.15, 4),
      crownGeo = new THREE.IcosahedronGeometry(0.35, 0),
      cylinderGeo = new THREE.CylinderGeometry(0.1, 0.13, 1, 5);
    const allMaterials = new Set<THREE.Material>([
      dirt,
      edge,
      green,
      soil,
      trunk,
      leaf,
      leafLight,
      rock,
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
    box(
      island,
      dirt,
      SIDE * STEP + 0.08,
      0.65,
      SIDE * STEP + 0.08,
      0,
      -0.38,
      0,
    );
    box(island, edge, SIDE * STEP + 0.1, 0.1, SIDE * STEP + 0.1, 0, -0.04, 0);
    const bottom = material(0x855a32);
    allMaterials.add(bottom);
    box(island, bottom, SIDE * STEP, 0.16, SIDE * STEP, 0, -0.77, 0);
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
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(13, 11), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.7;
    scene.add(shadow);
    const grounds: THREE.Mesh[] = [],
      growth: THREE.Group[] = [],
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
    function tree(parent: THREE.Object3D, seed: number) {
      const g = new THREE.Group();
      parent.add(g);
      const t = new THREE.Mesh(cylinderGeo, trunk);
      t.scale.set(0.8, 0.8, 0.8);
      t.position.y = 0.4;
      t.castShadow = true;
      g.add(t);
      for (let k = 0; k < 4; k++) {
        const c = new THREE.Mesh(crownGeo, k % 2 ? leaf : leafLight);
        c.position.set(
          k === 1 ? -0.22 : k === 2 ? 0.23 : 0,
          0.85 + (k === 3 ? 0.4 : k * 0.06),
          k === 0 ? -0.1 : 0.08,
        );
        c.scale.setScalar(k === 3 ? 1.1 : 1.25);
        c.rotation.set(seed * 0.7, k, 0.3);
        c.castShadow = true;
        g.add(c);
      }
      g.rotation.y = seed;
      return g;
    }
    for (let z = 0; z < SIDE; z++)
      for (let x = 0; x < SIDE; x++) {
        const index = z * SIDE + x,
          g = new THREE.Group();
        g.position.set(center(x), 0.02, center(z));
        island.add(g);
        const tile = box(g, green, STEP - 0.035, 0.035, STEP - 0.035, 0, 0, 0);
        grounds.push(tile);
        const plants = new THREE.Group();
        g.add(plants);
        growth.push(plants);
        if (z === 3 && x >= 2 && x <= 4) {
          const crop = wheat(g, index, 54);
          crops.push(crop);
          continue;
        }
        // Untamed surroundings are scenery; only outlined central plots produce stock.
        if ((x + z * 3) % 5 === 0 || (x * 2 + z) % 7 === 0) {
          const t = tree(plants, index);
          t.scale.setScalar(0.83 + (index % 3) * 0.09);
        } else if ((x + z) % 3 !== 0) {
          wheat(plants, index, 32);
        } else {
          for (let j = 0; j < 3; j++) {
            const r = new THREE.Mesh(crownGeo, j === 1 ? leaf : rock);
            r.scale.setScalar(0.19 + j * 0.08);
            r.position.set(j * 0.27 - 0.3, 0.08, (j % 2) * 0.32 - 0.15);
            r.rotation.y = j;
            r.castShadow = true;
            plants.add(r);
          }
        }
      }
    // The warehouse sits one tile west of the origin, exactly as deposit() expects.
    const warehouse = new THREE.Group();
    warehouse.position.set(center(1), 0.08, center(3));
    island.add(warehouse);
    growth[3 * SIDE + 1].visible = false;
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
    const outlines: THREE.LineSegments[] = [];
    for (let x = 0; x < 3; x++) {
      const line = new THREE.LineSegments(outlineGeo, outlineMat);
      line.position.set(center(x + 2), 0.065, center(3));
      island.add(line);
      outlines.push(line);
    }
    let lastWidth = 0,
      lastEditor = state.current.editorOpen,
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
      const extent = w < 700 ? Math.max(8.4, (4.9 * h) / w) : 7.6;
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
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
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
      if (s.width !== lastWidth) {
        for (let x = 0; x < 3; x++) {
          outlines[x].visible = x < s.width;
          grounds[3 * SIDE + x + 2].material = x < s.width ? soil : green;
        }
        lastWidth = s.width;
      }
      for (let x = 0; x < 3; x++) {
        const crop = crops[x],
          tile = s.tiles[x];
        crop.visible = !!tile && tile.planted !== null;
        if (crop.visible && tile) {
          const p = Math.min(1, (s.time - tile.planted!) / 5);
          crop.scale.y = 0.15 + 0.85 * p;
          crop.scale.x = crop.scale.z = 0.6 + 0.4 * p;
        }
      }
      const targetX = center(2 + s.x);
      robot.position.x += (targetX - robot.position.x) * 0.15;
      robot.position.z = center(3);
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
    robot.position.set(center(2 + state.current.farm.x), 0.12, center(3));
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments)
          o.geometry.dispose();
      });
      allMaterials.forEach((m) => m.dispose());
      shadowTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
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
