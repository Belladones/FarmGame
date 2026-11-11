import type { Connection, Definitions } from "../connection.js";
export async function seedRecipes(db: Connection, d: Definitions) {
  for (const [position, [id, r]] of Object.entries(d.recipes).entries()) {
    await db.query(
      "INSERT INTO game_recipes(building_type_id,duration_seconds,position) VALUES($1,$2,$3)",
      [id, r.duration, position],
    );
    for (const [resource, n] of Object.entries(r.input))
      await db.query(
        "INSERT INTO game_recipe_inputs(building_type_id,resource_id,amount) VALUES($1,$2,$3)",
        [id, resource, n],
      );
    for (const [resource, n] of Object.entries(r.output))
      await db.query(
        "INSERT INTO game_recipe_outputs(building_type_id,resource_id,amount) VALUES($1,$2,$3)",
        [id, resource, n],
      );
  }
}
export async function readRecipes(db: Connection) {
  const rows = (
    await db.query(`SELECT r.building_type_id AS id,r.duration_seconds::float8 AS duration,
 COALESCE((SELECT jsonb_object_agg(resource_id,amount) FROM game_recipe_inputs i WHERE i.building_type_id=r.building_type_id),'{}') AS input,
 COALESCE((SELECT jsonb_object_agg(resource_id,amount) FROM game_recipe_outputs o WHERE o.building_type_id=r.building_type_id),'{}') AS output
 FROM game_recipes r ORDER BY position,building_type_id`)
  ).rows;
  return Object.fromEntries(
    rows.map(({ id, ...r }) => [id, r]),
  ) as Definitions["recipes"];
}
