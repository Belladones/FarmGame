import type { Connection, Definitions } from "../connection.js";
export async function seedAssetTypes(db: Connection, d: Definitions) {
  for (const [position, [id, r]] of Object.entries(d.models).entries())
    await db.query(
      "INSERT INTO game_robot_models(id,name,price,speed,capacity,research_id,medium,description,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        id,
        r.name,
        r.price,
        r.speed,
        r.capacity,
        r.research,
        r.medium,
        r.description,
        position,
      ],
    );
  for (const [position, [id, b]] of Object.entries(d.buildings).entries())
    await db.query(
      "INSERT INTO game_building_types(id,name,price,research_id,description,position) VALUES($1,$2,$3,$4,$5,$6)",
      [id, b.name, b.price, b.research, b.description, position],
    );
}
export async function readAssetTypes(db: Connection) {
  const robots = (
    await db.query(
      "SELECT id,name,price::float8 AS price,speed::float8 AS speed,capacity::float8 AS capacity,research_id AS research,medium,description FROM game_robot_models ORDER BY position,id",
    )
  ).rows;
  const buildings = (
    await db.query(
      "SELECT id,name,price::float8 AS price,research_id AS research,description FROM game_building_types ORDER BY position,id",
    )
  ).rows;
  return {
    models: Object.fromEntries(
      robots.map(({ id, ...r }) => [id, r]),
    ) as Definitions["models"],
    buildings: Object.fromEntries(
      buildings.map(({ id, ...r }) => [id, r]),
    ) as Definitions["buildings"],
  };
}
