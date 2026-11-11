import bootstrap from "../../../shared/domain/bootstrap.json";
import {
  missionProgress,
  type MissionRule,
} from "../../../shared/domain/missionRules";
import type { Farm } from "../../farm/domain/model";
export const careerRanks = structuredClone(bootstrap.definitions.ranks);
export const careerThresholds = structuredClone(
  bootstrap.definitions.thresholds,
);
export const chapters = structuredClone(bootstrap.chapters);
export type MissionDestination = "code" | "Recherches" | "Magasin" | "Robots";
export interface Mission {
  id: string;
  chapter: number;
  title: string;
  text: string;
  target: number;
  progress: (s: Farm) => number;
  reward: number;
  gold: number;
  xp: number;
  hint: string;
  code?: string;
  destination: MissionDestination;
  action: string;
}
type StoredMission = Omit<Mission, "progress"> & { condition: MissionRule };
const compile = (entries: StoredMission[]): Mission[] =>
  entries.map(({ condition, ...entry }) => ({
    ...entry,
    progress: (s) => missionProgress(condition, s),
  }));
export const missions: Mission[] = [];
const modernMissions: Mission[] = [],
  legacyAssetMissions: Mission[] = [];
export function installMissions(campaigns: Record<string, StoredMission[]>) {
  missions.splice(0, missions.length, ...compile(campaigns.legacy));
  modernMissions.splice(0, modernMissions.length, ...compile(campaigns.modern));
  legacyAssetMissions.splice(
    0,
    legacyAssetMissions.length,
    ...compile(campaigns.assets),
  );
}
installMissions(
  bootstrap.campaigns as unknown as Record<string, StoredMission[]>,
);
export const missionsFor = (s: Farm): Mission[] =>
  s.progressionVersion === 2
    ? modernMissions
    : s.assetProgression === 1
      ? legacyAssetMissions
      : missions;
export const currentMission = (s: Farm) =>
  missionsFor(s).find((m) => !s.claimed.includes(m.id));
export const completedMissions = (s: Farm) =>
  missionsFor(s).filter((m) => s.claimed.includes(m.id)).length;
export function career(s: Farm) {
  const xp = missionsFor(s)
    .filter((m) => s.claimed.includes(m.id))
    .reduce((n, m) => n + m.xp, 0);
  const ranks = careerRanks,
    thresholds = careerThresholds;
  const level = thresholds.filter((t) => xp >= t).length;
  return {
    xp,
    level,
    title: ranks[level - 1],
    floor: thresholds[level - 1],
    next: thresholds[level],
  };
}
