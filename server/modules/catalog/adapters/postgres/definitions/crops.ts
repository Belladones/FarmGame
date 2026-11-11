import type { Connection, Definitions } from "../connection.js";
export async function seedCrops(db: Connection, d: Definitions) {
  for (const [position, [id, c]] of Object.entries(d.crops).entries()) {
    await db.query(
      "INSERT INTO game_crop_types(id,resource_id,growth_seconds,required_soil,unlock_research_id,position) VALUES($1,$2,$3,$4,$5,$6)",
      [id, c.resource, c.seconds, c.soil, c.unlock, position],
    );
    for (const [resource, amount] of Object.entries(c.cost))
      await db.query(
        "INSERT INTO game_crop_costs(crop_id,resource_id,amount) VALUES($1,$2,$3)",
        [id, resource, amount],
      );
    for (const [i, amount] of c.yields.entries())
      await db.query(
        "INSERT INTO game_crop_yields(crop_id,level,amount) VALUES($1,$2,$3)",
        [id, i + 1, amount],
      );
  }
}
export async function readCrops(db: Connection) {
  const rows = (
    await db.query(`SELECT c.id,c.resource_id AS resource,c.growth_seconds::float8 AS seconds,c.required_soil AS soil,c.unlock_research_id AS unlock,
 COALESCE((SELECT jsonb_object_agg(resource_id,amount) FROM game_crop_costs k WHERE k.crop_id=c.id),'{}') AS cost,
 COALESCE((SELECT jsonb_agg(amount ORDER BY level) FROM game_crop_yields y WHERE y.crop_id=c.id),'[]') AS yields
 FROM game_crop_types c ORDER BY position,id`)
  ).rows;
  return Object.fromEntries(
    rows.map(({ id, ...c }) => [id, c]),
  ) as Definitions["crops"];
}
