import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  cropProgress,
  placedSites,
  slotCount,
  type Farm,
  type Crop,
} from "./engine";
import { farmViewport, cameraInclination } from "./camera";
import { buildings, type Model } from "./catalog";
interface Props {
  farm: Farm;
  paused: boolean;
  running: boolean;
  zoom: number;
  resetView: number;
  editorOpen: boolean;
}
const STEP = 1.28;
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
  const pose = useRef<{ azimuth: number; polar: number; zoom: number } | null>(
      null,
    ),
    [failed, setFailed] = useState(false);
  const sceneKey = `${farm.width}:${farm.height}:${JSON.stringify(placedSites(farm))}:${farm.buildings.map((b) => `${b.id},${b.kind},${b.x},${b.y}`).join(";")}:${farm.robots.map((r) => `${r.id},${r.model},${r.destroyed},${r.deployed}`).join(";")}`;
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
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x718994, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      `Ferme 3D : ${farm.width * farm.height} parcelles, ${farm.robots.filter((r) => !r.destroyed && r.deployed).length} robots. Le premier robot est un fermier terrestre.`,
    );
    const scene = new THREE.Scene(),
      camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100),
      controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minPolarAngle = cameraInclination.min;
    controls.maxPolarAngle = cameraInclination.max;
    controls.rotateSpeed = 0.5;
    controls.minZoom = 0.7;
    controls.maxZoom = 2;
    controls.zoomSpeed = 0.7;
    const sites = placedSites(farm);
    const minX = Math.min(0, ...sites.map((p) => p.x)),
      maxX = Math.max(farm.width - 1, ...sites.map((p) => p.x));
    const minY = Math.min(0, ...sites.map((p) => p.y)),
      maxY = Math.max(farm.height - 1, ...sites.map((p) => p.y));
    const targetX = ((minX + maxX) / 2 - (farm.width - 1) / 2) * STEP;
    const targetZ = ((farm.height - 1) / 2 - (minY + maxY) / 2) * STEP;
    function home() {
      controls.enableDamping = false;
      controls.update();
      camera.up.set(0, 1, 0);
      controls.target.set(targetX, 0, targetZ);
      camera.position.set(targetX + 12, 14, targetZ + 12);
      camera.zoom = state.current.zoom;
      camera.updateProjectionMatrix();
      controls.update();
      controls.enableDamping = true;
    }
    home();
    if (pose.current) {
      const p = pose.current;
      camera.position
        .setFromSpherical(new THREE.Spherical(18.3, p.polar, p.azimuth))
        .add(controls.target);
      camera.zoom = p.zoom;
      camera.updateProjectionMatrix();
      controls.update();
    }
    scene.add(new THREE.HemisphereLight(0xf7f1d7, 0x516149, 2.4));
    const sun = new THREE.DirectionalLight(0xffedc4, 3.3);
    sun.position.set(-8, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -14;
    sun.shadow.camera.right = sun.shadow.camera.top = 14;
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    const materials = new Set<THREE.Material>(),
      textures: THREE.Texture[] = [];
    const mat = (color: number) => {
      const m = new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 1,
      });
      materials.add(m);
      return m;
    };
    const dirt = mat(0x9d642b),
      edge = mat(0xbe883c),
      green = mat(0x7c8629),
      soil = mat(0x94612b),
      wood = mat(0x614015),
      leaf = mat(0x939f30),
      leafLight = mat(0xa9ae3c),
      gold = mat(0xd6b448),
      dark = mat(0x3e4836),
      purple = mat(0x975575),
      rubber = mat(0x303a32),
      steel = mat(0x9b9d77),
      glass = mat(0x3e6f63),
      carrotMat = mat(0xd7a035),
      pumpkinMat = mat(0xc78531),
      wall = mat(0xb59960),
      roof = mat(0x76503a),
      waterMat = mat(0x387863),
      wreck = mat(0x5e5a48);
    const boxGeo = new THREE.BoxGeometry(1, 1, 1),
      stemGeo = new THREE.CylinderGeometry(0.012, 0.017, 1, 4),
      grainGeo = new THREE.ConeGeometry(0.045, 0.15, 4),
      crownGeo = new THREE.IcosahedronGeometry(0.35, 0),
      wheelGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.12, 10),
      potGeo = new THREE.CylinderGeometry(0.36, 0.3, 0.46, 8, 1, true);
    const island = new THREE.Group();
    scene.add(island);
    const width = farm.width,
      height = farm.height,
      cx = (x: number) => (x - (width - 1) / 2) * STEP,
      cz = (y: number) => ((height - 1) / 2 - y) * STEP;
    function mesh(
      parent: THREE.Object3D,
      geometry: THREE.BufferGeometry,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) {
      const o = new THREE.Mesh(geometry, m);
      o.position.set(x, y, z);
      o.castShadow = o.receiveShadow = true;
      parent.add(o);
      return o;
    }
    function box(
      parent: THREE.Object3D,
      m: THREE.Material,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
    ) {
      const o = mesh(parent, boxGeo, m, x, y, z);
      o.scale.set(w, h, d);
      return o;
    }
    function label(
      parent: THREE.Object3D,
      text: string,
      x: number,
      y: number,
      z: number,
    ) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.font = "24px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#e8e4c9";
      ctx.fillText(text, 128, 40);
      const texture = new THREE.CanvasTexture(canvas);
      textures.push(texture);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      materials.add(material);
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, z);
      sprite.scale.set(1.1, 0.275, 1);
      parent.add(sprite);
      return sprite;
    }
    box(
      island,
      dirt,
      width * STEP + 0.04,
      0.65,
      height * STEP + 0.04,
      0,
      -0.38,
      0,
    );
    box(
      island,
      edge,
      width * STEP + 0.04,
      0.1,
      height * STEP + 0.04,
      0,
      -0.04,
      0,
    );
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
    gradient.addColorStop(0, "rgba(30,47,49,.25)");
    gradient.addColorStop(1, "rgba(30,47,49,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    textures.push(shadowTexture);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    materials.add(shadowMaterial);
    const shadow = mesh(
      scene,
      new THREE.PlaneGeometry(width * STEP + 4, height * STEP + 3),
      shadowMaterial,
      0,
      -1.4,
      0,
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.castShadow = false;
    const dummy = new THREE.Object3D();
    function wheat(parent: THREE.Object3D, seed: number) {
      const group = new THREE.Group();
      parent.add(group);
      const stems = new THREE.InstancedMesh(stemGeo, gold, 44),
        heads = new THREE.InstancedMesh(grainGeo, gold, 132);
      stems.castShadow = heads.castShadow = true;
      group.add(stems, heads);
      for (let i = 0; i < 44; i++) {
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
      return group;
    }
    function plantModels(parent: THREE.Object3D, index: number) {
      const result = {} as Record<Crop, THREE.Group>;
      result.Wheat = wheat(parent, index);
      const grassGroup = new THREE.Group();
      parent.add(grassGroup);
      result.Grass = grassGroup;
      const grassMaterial = mat(0x8bbf52);
      const blades = new THREE.InstancedMesh(
        new THREE.ConeGeometry(0.025, 0.22, 3),
        grassMaterial,
        28,
      );
      blades.castShadow = blades.receiveShadow = true;
      grassGroup.add(blades);
      for (let i = 0; i < 28; i++) {
        dummy.position.set(
          ((i * 17) % 29) / 29 - 0.48,
          0.11,
          ((i * 11) % 31) / 31 - 0.48,
        );
        dummy.rotation.set(0, 0, ((i % 3) - 1) * 0.2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        blades.setMatrixAt(i, dummy.matrix);
      }
      for (const kind of ["Bush", "Tree", "Carrot", "Pumpkin"] as Crop[]) {
        const group = new THREE.Group();
        parent.add(group);
        result[kind] = group;
        if (kind === "Tree") {
          const trunk = mesh(
            group,
            new THREE.CylinderGeometry(0.08, 0.12, 0.8, 5),
            wood,
            0,
            0.4,
            0,
          );
          trunk.castShadow = true;
          for (let i = 0; i < 4; i++) {
            const c = mesh(
              group,
              crownGeo,
              i % 2 ? leaf : leafLight,
              i === 1 ? -0.22 : i === 2 ? 0.23 : 0,
              0.85 + (i === 3 ? 0.4 : i * 0.06),
              (i % 2) * 0.12,
            );
            c.scale.setScalar(1.2);
            c.rotation.y = i;
          }
        } else if (kind === "Bush") {
          for (let i = 0; i < 4; i++) {
            const c = mesh(
              group,
              crownGeo,
              i % 2 ? leaf : leafLight,
              (i % 2) * 0.3 - 0.15,
              0.25,
              Math.floor(i / 2) * 0.3 - 0.15,
            );
            c.scale.setScalar(0.8);
          }
        } else
          for (let i = 0; i < 4; i++) {
            const x = (i % 2) * 0.5 - 0.25,
              z = Math.floor(i / 2) * 0.5 - 0.25;
            if (kind === "Pumpkin") {
              const p = mesh(
                group,
                new THREE.SphereGeometry(0.2, 7, 4),
                pumpkinMat,
                x,
                0.17,
                z,
              );
              p.scale.y = 0.8;
              box(group, leaf, 0.04, 0.12, 0.04, x, 0.35, z);
            } else {
              const c = mesh(
                group,
                new THREE.ConeGeometry(0.11, 0.3, 4),
                carrotMat,
                x,
                0.12,
                z,
              );
              c.rotation.z = Math.PI;
              const l = mesh(group, crownGeo, leaf, x, 0.3, z);
              l.scale.set(0.28, 0.42, 0.28);
            }
          }
      }
      return result;
    }
    const grounds: THREE.Mesh[] = [],
      plants: Record<Crop, THREE.Group>[] = [];
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xe8ce70 });
    materials.add(lineMaterial);
    const lineGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(STEP - 0.05, 0.045, STEP - 0.05),
    );
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const g = new THREE.Group();
        g.position.set(cx(x), 0.02, cz(y));
        island.add(g);
        grounds.push(box(g, green, STEP - 0.035, 0.035, STEP - 0.035, 0, 0, 0));
        plants.push(plantModels(g, y * width + x));
        const line = new THREE.LineSegments(lineGeo, lineMaterial);
        line.position.y = 0.05;
        g.add(line);
      }
    container.dataset.plotCount = String(grounds.length);
    container.dataset.cellWidth = String(grounds[0].scale.x);
    container.dataset.cellHeight = String(grounds[0].scale.z);
    container.dataset.starterModel =
      farm.robots.find((r) => r.id === "f1")?.model ?? "Farmer";
    const concrete = mat(0x8998a0),
      concreteEdge = mat(0x596971),
      bolt = mat(0x414e56);
    container.dataset.siteCount = String(sites.length);
    container.dataset.siteMaterial = "concrete";
    for (const p of sites) {
      box(
        island,
        concreteEdge,
        STEP - 0.035,
        0.24,
        STEP - 0.035,
        cx(p.x),
        -0.12,
        cz(p.y),
      );
      box(
        island,
        concrete,
        STEP - 0.055,
        0.055,
        STEP - 0.055,
        cx(p.x),
        0.025,
        cz(p.y),
      );
      for (const dx of [-0.46, 0.46])
        for (const dz of [-0.46, 0.46])
          box(
            island,
            bolt,
            0.055,
            0.018,
            0.055,
            cx(p.x) + dx,
            0.06,
            cz(p.y) + dz,
          );
    }
    const buildingObjects = new Map<
      string,
      { group: THREE.Group; rotor?: THREE.Group; water?: THREE.Mesh }
    >();
    for (const b of farm.buildings) {
      const group = new THREE.Group();
      group.position.set(cx(b.x), 0.05, cz(b.y));
      island.add(group);
      box(group, wood, 0.98, 0.08, 0.98, 0, 0, 0);
      const entry: {
        group: THREE.Group;
        rotor?: THREE.Group;
        water?: THREE.Mesh;
      } = { group };
      if (b.kind === "Well" || b.kind === "Cistern") {
        mesh(group, potGeo, wood, 0, 0.25, 0);
        const fluid = mesh(
          group,
          new THREE.CylinderGeometry(0.31, 0.31, 0.025, 8),
          waterMat,
          0,
          0.47,
          0,
        );
        entry.water = fluid;
        for (const yy of [0.08, 0.34]) {
          const ring = mesh(
            group,
            new THREE.TorusGeometry(0.335, 0.025, 4, 8),
            dark,
            0,
            yy,
            0,
          );
          ring.rotation.x = Math.PI / 2;
        }
        if (b.kind === "Well") {
          box(group, wood, 0.07, 0.75, 0.07, -0.4, 0.38, 0);
          box(group, wood, 0.07, 0.75, 0.07, 0.4, 0.38, 0);
          box(group, roof, 1.05, 0.09, 0.52, 0, 0.8, 0);
        }
      } else if (b.kind === "Composter") {
        box(group, wood, 0.7, 0.35, 0.65, 0, 0.2, 0);
        box(group, leaf, 0.6, 0.08, 0.55, 0, 0.41, 0);
        for (let k = 0; k < 3; k++)
          box(group, gold, 0.73, 0.035, 0.035, 0, 0.12 + k * 0.1, 0.33);
      } else {
        box(group, wall, 0.75, 0.48, 0.65, 0, 0.24, 0);
        box(group, dark, 0.24, 0.31, 0.02, 0, 0.16, 0.34);
        const roofObject = mesh(
          group,
          new THREE.CylinderGeometry(0.56, 0.56, 0.85, 3),
          b.kind === "Oven" ? dirt : roof,
          0,
          0.64,
          0,
        );
        roofObject.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        if (b.kind === "Depot") {
          box(group, gold, 0.15, 0.18, 0.2, 0.39, 0.1, 0.2);
          box(group, gold, 0.15, 0.15, 0.2, 0.42, 0.09, -0.08);
        }
        if (b.kind === "Oven")
          box(group, dark, 0.15, 0.6, 0.15, 0.25, 0.85, -0.17);
        if (b.kind === "Mill") {
          const rotor = new THREE.Group();
          rotor.position.set(0, 0.65, 0.42);
          group.add(rotor);
          for (let i = 0; i < 4; i++) {
            const blade = box(rotor, gold, 0.07, 0.57, 0.025, 0, 0, 0);
            blade.rotation.z = (i * Math.PI) / 2;
            blade.position.set(
              Math.sin((i * Math.PI) / 2) * 0.25,
              Math.cos((i * Math.PI) / 2) * 0.25,
              0,
            );
          }
          entry.rotor = rotor;
        }
        if (b.kind === "Sawmill") {
          for (let i = 0; i < 3; i++)
            box(group, gold, 0.65, 0.06, 0.12, -0.45, 0.1 + i * 0.065, 0.2);
          mesh(
            group,
            new THREE.CylinderGeometry(0.18, 0.18, 0.025, 12),
            steel,
            -0.28,
            0.35,
            0.3,
          ).rotation.x = Math.PI / 2;
        }
        if (b.kind === "Workshop") {
          box(group, steel, 0.35, 0.055, 0.06, 0.02, 0.48, 0.37).rotation.z =
            0.7;
        }
      }
      label(group, buildings[b.kind].name.toUpperCase(), 0, 0.85, 0.62);
      buildingObjects.set(b.id, entry);
    }
    function createRobot(model: Model) {
      const group = new THREE.Group(),
        wheels: THREE.Mesh[] = [],
        rotors: THREE.Mesh[] = [];
      let tool: THREE.Mesh | undefined;
      if (model === "Drone") {
        const body = mesh(
          group,
          new THREE.CylinderGeometry(0.25, 0.28, 0.19, 8),
          purple,
          0,
          0.23,
          0,
        );
        body.castShadow = true;
        box(group, gold, 0.24, 0.16, 0.21, 0, 0.37, 0);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          const arm = box(
            group,
            wood,
            0.07,
            0.055,
            0.64,
            Math.sin(a) * 0.2,
            0.21,
            Math.cos(a) * 0.2,
          );
          arm.rotation.y = a;
          const rotor = box(
            group,
            dark,
            0.42,
            0.018,
            0.055,
            Math.sin(a) * 0.46,
            0.26,
            Math.cos(a) * 0.46,
          );
          rotors.push(rotor);
        }
      } else {
        const transporter = model === "Transporter";
        box(group, dark, 0.58, 0.11, transporter ? 0.83 : 0.6, 0, 0.17, 0);
        box(
          group,
          transporter ? gold : leafLight,
          0.48,
          0.17,
          0.5,
          0,
          0.29,
          -0.02,
        );
        box(
          group,
          transporter ? wall : leafLight,
          0.32,
          0.23,
          0.27,
          0,
          0.44,
          -0.13,
        );
        box(group, glass, 0.27, 0.13, 0.015, 0, 0.47, 0.015);
        box(group, gold, 0.33, 0.07, 0.25, 0, 0.39, 0.16);
        for (const x of [-0.3, 0.3])
          for (const z of [-0.22, 0.22]) {
            const wheel = mesh(group, wheelGeo, rubber, x, 0.14, z);
            wheel.rotation.z = Math.PI / 2;
            wheels.push(wheel);
            mesh(
              group,
              new THREE.CylinderGeometry(0.055, 0.055, 0.125, 8),
              steel,
              x,
              0.14,
              z,
            ).rotation.z = Math.PI / 2;
          }
        if (transporter) {
          box(group, wood, 0.51, 0.28, 0.35, 0, 0.35, 0.3);
          box(group, gold, 0.54, 0.04, 0.38, 0, 0.52, 0.3);
        } else {
          box(group, wood, 0.06, 0.08, 0.32, -0.2, 0.16, 0.34);
          box(group, wood, 0.06, 0.08, 0.32, 0.2, 0.16, 0.34);
          tool = mesh(
            group,
            new THREE.CylinderGeometry(0.065, 0.065, 0.68, 8),
            steel,
            0,
            0.12,
            0.5,
          );
          tool.rotation.z = Math.PI / 2;
          for (let i = 0; i < 5; i++)
            box(group, steel, 0.035, 0.12, 0.1, -0.28 + i * 0.14, 0.09, 0.51);
          box(group, dark, 0.035, 0.24, 0.035, 0.15, 0.58, -0.22);
          box(group, gold, 0.09, 0.055, 0.035, -0.17, 0.32, 0.27);
          box(group, gold, 0.09, 0.055, 0.035, 0.17, 0.32, 0.27);
        }
      }
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xedd989,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
      materials.add(ringMaterial);
      const ring = mesh(
        group,
        new THREE.RingGeometry(0.49, 0.52, 32),
        ringMaterial,
        0,
        0.045,
        0,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.castShadow = false;
      return { group, wheels, rotors, tool, ring };
    }
    const robotObjects = new Map<string, ReturnType<typeof createRobot>>();
    for (const r of farm.robots) {
      if (!r.deployed && !r.destroyed) continue;
      const entry = createRobot(r.model);
      island.add(entry.group);
      if (r.destroyed) {
        entry.group.rotation.z = 0.6;
        entry.group.traverse((o) => {
          if (o instanceof THREE.Mesh) o.material = wreck;
        });
      }
      label(
        entry.group,
        r.id + (r.destroyed ? " ×" : ""),
        0,
        r.model === "Drone" ? 0.65 : 0.75,
        -0.4,
      );
      robotObjects.set(r.id, entry);
    }
    container.dataset.deployedRobots = farm.robots
      .filter((r) => r.deployed && !r.destroyed)
      .map((r) => r.id)
      .join(",");
    let lastEditor = state.current.editorOpen,
      lastView = state.current.resetView,
      lastZoom = state.current.zoom,
      frame = 0,
      lastFrame = 0,
      lastShadow = 0,
      disposed = false;
    const resize = () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const view = farmViewport(
        w,
        h,
        (maxX - minX + 1) * STEP,
        (maxY - minY + 1) * STEP,
        state.current.editorOpen,
      );
      camera.left = view.left;
      camera.right = view.right;
      camera.top = view.top;
      camera.bottom = view.bottom;
      camera.setViewOffset(w, h, view.offsetX, view.offsetY, w, h);
      container.dataset.projectionAspect = String(
        (camera.right - camera.left) / (camera.top - camera.bottom),
      );
      container.dataset.viewportAspect = String(w / h);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const syncCamera = () => {
      const next = {
        azimuth: controls.getAzimuthalAngle(),
        polar: controls.getPolarAngle(),
        zoom: camera.zoom,
      };
      pose.current = next;
      container.dataset.cameraAzimuth = String(next.azimuth);
      container.dataset.cameraPolar = String(next.polar);
    };
    controls.addEventListener("change", syncCamera);
    syncCamera();
    const draw = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(draw);
      if (now - lastFrame < 1000 / 30) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const { farm: s, paused: pause, zoom: z, resetView: v } = state.current;
      // React can publish a loaded farm before the old scene's effect is disposed.
      // Leave this frame unchanged until the scene for the new dimensions exists.
      if (
        s.width !== width ||
        s.height !== height ||
        s.tiles.length !== grounds.length
      )
        return;
      if (state.current.editorOpen !== lastEditor) {
        resize();
        lastEditor = state.current.editorOpen;
      }
      if (v !== lastView) {
        home();
        lastView = v;
      }
      if (z !== lastZoom) {
        camera.zoom = z;
        camera.updateProjectionMatrix();
        lastZoom = z;
      }
      for (let i = 0; i < s.tiles.length; i++) {
        const t = s.tiles[i];
        grounds[i].material = t.ground === "Soil" ? soil : green;
        const p = cropProgress(s, t);
        for (const kind of Object.keys(plants[i]) as Crop[]) {
          const g = plants[i][kind];
          g.visible = t.planted !== null && (t.entity ?? "Wheat") === kind;
          if (g.visible) {
            g.scale.y = 0.15 + 0.85 * p;
            g.scale.x = g.scale.z = 0.6 + 0.4 * p;
          }
        }
      }
      for (const r of s.robots) {
        const entry = robotObjects.get(r.id);
        if (!entry) continue;
        entry.group.visible = r.deployed || r.destroyed;
        if (!entry.group.visible) continue;
        let x = r.x,
          y = r.y;
        if (r.moving) {
          const m = r.moving,
            u = THREE.MathUtils.clamp(
              (s.time - m.started) / (m.ends - m.started),
              0,
              1,
            );
          x = m.fromX + (m.x - m.fromX) * u;
          y = m.fromY + (m.y - m.fromY) * u;
          entry.group.rotation.y = Math.atan2(m.x - m.fromX, -(m.y - m.fromY));
        }
        entry.group.position.set(
          cx(x),
          r.model === "Drone" && !r.destroyed
            ? 0.8 + (!pause ? Math.sin(now * 0.003) * 0.02 : 0)
            : 0.025,
          cz(y),
        );
        entry.ring.visible = !r.destroyed && r.id === s.activeRobotId;
        for (const wheel of entry.wheels)
          if (r.moving && !pause) wheel.rotation.x -= dt * 4;
        for (const rotor of entry.rotors)
          if (!r.destroyed && !pause) rotor.rotation.y += dt * 30;
        if (entry.tool && !pause && r.readyAt > s.time)
          entry.tool.rotation.x += dt * 7;
      }
      for (const b of s.buildings) {
        const entry = buildingObjects.get(b.id);
        if (entry?.rotor && b.cycle && !pause) entry.rotor.rotation.z += dt;
        if (entry?.water)
          entry.water.position.y =
            0.12 +
            0.35 *
              Math.min(
                1,
                b.water /
                  (b.kind === "Well" ? 100 : 400) /
                  (s.unlocks.includes("reservoir2") ? 3 : 1),
              );
      }
      controls.update();
      if (now - lastShadow > 300) {
        renderer.shadowMap.needsUpdate = true;
        lastShadow = now;
      }
      renderer.render(scene, camera);
    };
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
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [sceneKey]);
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
