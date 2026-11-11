import type { Connection, Definitions } from "../connection.js";
export async function seedProgression(db: Connection, d: Definitions) {
  for (const [i, capacity] of d.storageCapacities.entries())
    await db.query(
      "INSERT INTO game_storage_tiers(level,capacity) VALUES($1,$2)",
      [i + 1, capacity],
    );
  for (const [position, s] of d.constructionSlots.entries())
    await db.query(
      "INSERT INTO game_construction_slots(position,x,y) VALUES($1,$2,$3)",
      [position, s.x, s.y],
    );
  for (const [i, title] of d.ranks.entries())
    await db.query(
      "INSERT INTO game_career_ranks(level,title,xp_threshold) VALUES($1,$2,$3)",
      [i + 1, title, d.thresholds[i]],
    );
}
export async function readProgression(db: Connection) {
  const storage = (
    await db.query(
      "SELECT capacity::float8 AS capacity FROM game_storage_tiers ORDER BY level",
    )
  ).rows;
  const slots = (
    await db.query("SELECT x,y FROM game_construction_slots ORDER BY position")
  ).rows;
  const ranks = (
    await db.query(
      "SELECT title,xp_threshold::float8 AS xp FROM game_career_ranks ORDER BY level",
    )
  ).rows;
  return {
    storageCapacities: storage.map((r) => r.capacity) as number[],
    constructionSlots: slots as Definitions["constructionSlots"],
    ranks: ranks.map((r) => r.title) as string[],
    thresholds: ranks.map((r) => r.xp) as number[],
  };
}
