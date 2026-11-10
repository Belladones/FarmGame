import type { Farm } from "../../farm/domain/model";
import type { Robot } from "../domain/Robot";
import {
  actionDuration,
  robotSpeed,
  equipmentLevel,
} from "../domain/statistics";
import { models } from "../domain/catalog";
export type RobotRuntime = "starting" | "running";
export function robotStatus(
  farm: Farm,
  robot: Robot,
  runtime: RobotRuntime | undefined,
  paused: boolean,
) {
  if (robot.destroyed) return { label: "Détruit", tone: "destroyed" };
  if (!robot.deployed) return { label: "Au garage", tone: "garage" };
  if (paused && (runtime || robot.moving || robot.readyAt > farm.time))
    return { label: "En pause", tone: "paused" };
  if (robot.moving) return { label: "En déplacement", tone: "working" };
  if (robot.lastError) return { label: "Erreur du programme", tone: "error" };
  if (runtime === "starting")
    return { label: "Préparation du programme", tone: "working" };
  if (robot.readyAt > farm.time)
    return { label: "Action en cours", tone: "working" };
  if (runtime) return { label: "Programme en cours", tone: "working" };
  return { label: "À l’arrêt", tone: "idle" };
}
export function robotCapabilities(farm: Farm, robot: Robot) {
  const has = (id: string) => farm.unlocks.includes(id);
  const sensor = (id: string) =>
    has(id) &&
    (farm.assetProgression !== 1 || equipmentLevel(farm, robot, id) > 0);
  const list = [{ name: "Transport", enabled: true }];
  if (robot.model === "Farmer")
    list.push(
      { name: "Planter", enabled: farm.researchRevision !== 2 || has("plant") },
      { name: "Récolter", enabled: true },
      { name: "Labourer", enabled: has("till") },
    );
  if (robot.model !== "Transporter")
    list.push(
      {
        name: "Arroser",
        enabled:
          (farm.researchRevision === 2 || has("tank")) && has("watering"),
      },
      { name: "Engrais", enabled: has("consumables") && has("fertilizer") },
    );
  list.push(
    { name: "Détection", enabled: sensor("sensor") },
    { name: "Position", enabled: has("position") },
    { name: "Réservation", enabled: has("traffic2") && sensor("traffic") },
  );
  return list;
}
export const robotStats = (farm: Farm, robot: Robot) => ({
  speed: robotSpeed(farm, robot),
  baseSpeed: models[robot.model].speed,
  actionSeconds: actionDuration(farm, robot),
});
