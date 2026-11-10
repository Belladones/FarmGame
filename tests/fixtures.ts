import { fresh } from "../src/modules/farm/application/engine";
/** Established farms keep the pre-tutorial wheat behavior; new-start tests use fresh(). */
export function legacyFarm() {
  const s = fresh();
  s.progressionVersion = 1;
  s.researchRevision = 1;
  delete s.assetProgression;
  s.unlocks = [];
  s.tiles = [
    { planted: null, yield: 1, ground: "Grassland", water: 0, progress: 0 },
  ];
  s.robots[0].code =
    "while (true) { harvest(); plant(Entities.Wheat); deposit(); }";
  return s;
}
