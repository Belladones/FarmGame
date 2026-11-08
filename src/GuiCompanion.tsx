import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createCompanion } from "./Companion3D";
import type { Companion } from "./companion";
import {
  guiSpots,
  guiPathClear,
  intersects,
  type GuiRect,
} from "./companionLayout";
export function GuiCompanion({
  appearance,
  hidden,
}: {
  appearance: Companion;
  hidden: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef({ appearance, hidden });
  latest.current = { appearance, hidden };
  useEffect(() => {
    const element = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setClearColor(0, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.OrthographicCamera(-0.52, 0.52, 0.78, -0.78, 0.1, 20);
    camera.position.set(0, 1.2, 6);
    camera.lookAt(0, 0.91, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4e7286, 2.6));
    const light = new THREE.DirectionalLight(0xffffff, 2.4);
    light.position.set(-3, 4, 5);
    scene.add(light);
    const companion = createCompanion();
    element.dataset.model = "classic";
    scene.add(companion.group);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let rect: GuiRect = { x: 0, y: 0, width: 96, height: 144 },
      target = { ...rect },
      initialized = false,
      nextPlan = 0,
      lastFrame = 0,
      frame = 0,
      wasHidden = false;
    const blockers = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          ".resources,.depot-summary,.island-caption,.start-hint,.dock,.campaign-peek,.robot-telemetry,.workspace,.control-hub,.plot-info,.game-brand,.notice,button,input,select,textarea,.monaco-editor",
        ),
      )
        .filter(
          (el) =>
            el.getClientRects().length &&
            !el.closest("[inert]") &&
            getComputedStyle(el).visibility !== "hidden",
        )
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.x - 7,
            y: r.y - 7,
            width: r.width + 14,
            height: r.height + 14,
          };
        })
        .filter((r) => r.width > 0 && r.height > 0);
    const plan = (now: number) => {
      const size =
        innerWidth < 700
          ? { width: 64, height: 96 }
          : { width: 96, height: 144 };
      renderer.setSize(size.width, size.height, false);
      Object.assign(element.style, {
        width: `${size.width}px`,
        height: `${size.height}px`,
      });
      const obstacles = blockers(),
        spots = guiSpots(innerWidth, innerHeight, size, obstacles);
      rect = { ...rect, ...size };
      const valid =
        initialized &&
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x + rect.width <= innerWidth &&
        rect.y + rect.height <= innerHeight &&
        !obstacles.some((o) => intersects(rect, o));
      if (!valid) {
        if (!spots.length) {
          element.style.visibility = "hidden";
          nextPlan = now + 1000;
          return;
        }
        rect = { ...spots[Math.floor(Math.random() * spots.length)] };
        target = { ...rect };
        initialized = true;
      }
      element.style.visibility = "visible";
      const candidates = reduced.matches
        ? []
        : spots.filter((p) => {
            const distance = Math.hypot(p.x - rect.x, p.y - rect.y);
            return (
              distance > 60 &&
              distance < 360 &&
              guiPathClear(rect, p, obstacles)
            );
          });
      target = {
        ...(candidates.length
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : rect),
      };
      nextPlan = now + 1800;
    };
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - lastFrame < 1000 / 30) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      if (latest.current.hidden) {
        element.style.visibility = "hidden";
        wasHidden = true;
        return;
      }
      if (wasHidden) {
        nextPlan = 0;
        wasHidden = false;
      }
      if (now >= nextPlan) plan(now);
      if (!initialized) return;
      if (!reduced.matches) {
        const dx = target.x - rect.x,
          dy = target.y - rect.y,
          distance = Math.hypot(dx, dy),
          step = Math.min(distance, dt * 32);
        if (distance > 0) {
          rect.x += (dx / distance) * step;
          rect.y += (dy / distance) * step;
        }
      }
      element.style.transform = `translate3d(${rect.x}px,${rect.y}px,0)`;
      const pose = companion.update(
        dt,
        latest.current.appearance,
        camera.position,
      );
      Object.assign(element.dataset, {
        x: String(rect.x),
        y: String(rect.y),
        blink: String(pose.blink),
        wave: String(pose.wave),
        skin: latest.current.appearance.skin,
        accessory: latest.current.appearance.accessory,
        space: "gui",
      });
      renderer.render(scene, camera);
    };
    const relayout = () => {
      nextPlan = 0;
    };
    window.addEventListener("resize", relayout);
    reduced.addEventListener("change", relayout);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", relayout);
      reduced.removeEventListener("change", relayout);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      companion.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      ref={host}
      className="gui-companion"
      role="img"
      aria-label="Luma, votre compagne flottante"
      aria-hidden={hidden}
      data-testid="gui-companion"
    />
  );
}
