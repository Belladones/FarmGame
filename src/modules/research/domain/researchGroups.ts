import bootstrap from "../../../shared/domain/bootstrap.json";
import { research, type Research } from "./catalog";
export interface ResearchGroup {
  id: string;
  title: string;
  steps: string[];
  initialLevel: number;
}
export const researchGroups: ResearchGroup[] = [];
const byResearch = new Map<string, ResearchGroup>();
const entries = new Map<string, Research>();
export function installResearchGroups(groups: ResearchGroup[]) {
  researchGroups.splice(0, researchGroups.length, ...structuredClone(groups));
  byResearch.clear();
  entries.clear();
  research.forEach((r) => entries.set(r.id, r));
  researchGroups.forEach((g) => g.steps.forEach((id) => byResearch.set(id, g)));
}
installResearchGroups(bootstrap.groups);
export const researchGroupFor = (id: string) => byResearch.get(id);
export function groupProgress(
  group: ResearchGroup,
  unlocks: readonly string[],
) {
  // Older saves can contain only their highest acquired tier.
  const reached = group.steps.reduce(
    (highest, id, index) => (unlocks.includes(id) ? index + 1 : highest),
    0,
  );
  return {
    level: group.initialLevel + reached,
    max: group.initialLevel + group.steps.length,
    next: entries.get(group.steps[reached]) as Research | undefined,
    current: reached ? entries.get(group.steps[reached - 1]) : undefined,
  };
}
export function hasResearchLevel(
  unlocks: readonly string[],
  id: string,
): boolean {
  if (unlocks.includes(id)) return true;
  const group = researchGroupFor(id);
  return (
    !!group &&
    groupProgress(group, unlocks).level >=
      group.initialLevel + group.steps.indexOf(id) + 1
  );
}
