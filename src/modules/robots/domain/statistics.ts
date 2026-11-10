import type { Farm } from "../../farm/domain/model";
import type { Robot } from "./Robot";
import { models } from "./catalog";
import { robotEquipment } from "../../equipment/domain/assetProgression";
import { level } from "../../research/domain/levels";
export const activeRobot = (s: Farm) =>
  s.robots.find((r) => r.id === s.activeRobotId && !r.destroyed) ??
  s.robots.find((r) => !r.destroyed)!;
export const equipmentLevel = (s: Farm, r: Robot, id: string) =>
  r.equipment?.[id] ?? robotEquipment.find((e) => e.id === id)?.initial ?? 0;
export const tankCapacity = (s: Farm, r: Robot) =>
  10 *
  2 **
    Math.max(
      0,
      (s.assetProgression === 1 ? equipmentLevel(s, r, "tank") : 1) - 1,
    );
export const capacity = (s: Farm, r: Robot = activeRobot(s)) =>
  (s.assetProgression === 1
    ? (r.baseCapacity ?? models[r.model].capacity)
    : r.model === "Farmer" && s.researchRevision !== 2
      ? 10
      : models[r.model].capacity) *
  (s.assetProgression === 1
    ? 2 ** Math.max(0, equipmentLevel(s, r, "hold") - 1)
    : ([1, 2, 4, 8][level(s, "hold")] ?? 1));
export const robotSpeed = (s: Farm, r: Robot = activeRobot(s)) =>
  (models[r.model].speed *
    (s.unlocks.includes("speed") ? 2 : 1) *
    (s.assetProgression === 1
      ? 1.25 ** Math.max(0, equipmentLevel(s, r, "motor") - 1)
      : ([1, 1.25, 1.5, 2][level(s, "motor")] ?? 1))) /
  (r.loan ? 2 : 1);
export const actionDuration = (s: Farm, r: Robot = activeRobot(s)) =>
  (s.assetProgression === 1
    ? Math.min(
        r.actionFloor ?? 1,
        1 / 1.25 ** Math.max(0, equipmentLevel(s, r, "tools") - 1),
      )
    : ([1, 0.8, 0.6, 0.4][level(s, "tools")] ?? 1)) *
  (s.unlocks.includes("speed") ? 0.5 : 1) *
  (r.loan ? 2 : 1);
