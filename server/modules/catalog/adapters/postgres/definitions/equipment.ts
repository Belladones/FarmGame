import type { Connection, Definitions } from "../connection.js";
// Table names are fixed adapter constants; values and IDs always use SQL parameters.
const robot = {
  table: "game_robot_equipment",
  costs: "game_robot_equipment_costs",
  targets: "game_robot_equipment_models",
  column: "model_id",
  field: "models",
} as const;
const building = {
  table: "game_building_upgrades",
  costs: "game_building_upgrade_costs",
  targets: "game_building_upgrade_types",
  column: "building_type_id",
  field: "kinds",
} as const;
type Tables = typeof robot | typeof building;
type Spec = {
  id: string;
  name: string;
  initial: number;
  max: number;
  materials: object;
  gold?: number;
  research?: string;
  detail: string;
  models?: string[];
  kinds?: string[];
};
async function seed(db: Connection, t: Tables, specs: Spec[]) {
  for (const [position, s] of specs.entries()) {
    const id = s.id + ":" + position;
    await db.query(
      `INSERT INTO ${t.table}(id,equipment_key,name,initial_level,max_level,gold_cost,research_id,detail,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        s.id,
        s.name,
        s.initial,
        s.max,
        s.gold ?? null,
        s.research ?? null,
        s.detail,
        position,
      ],
    );
    for (const [resource, amount] of Object.entries(s.materials))
      await db.query(
        `INSERT INTO ${t.costs}(equipment_id,resource_id,amount) VALUES($1,$2,$3)`,
        [id, resource, amount],
      );
    for (const [i, target] of (s[t.field] ?? []).entries())
      await db.query(
        `INSERT INTO ${t.targets}(equipment_id,${t.column},position) VALUES($1,$2,$3)`,
        [id, target, i],
      );
  }
}
async function read(db: Connection, t: Tables) {
  const rows = (
    await db.query(`SELECT e.equipment_key AS id,e.name,e.initial_level AS initial,e.max_level AS max,e.gold_cost::float8 AS gold,e.research_id AS research,e.detail,
 COALESCE((SELECT jsonb_object_agg(resource_id,amount) FROM ${t.costs} c WHERE c.equipment_id=e.id),'{}') AS materials,
 COALESCE((SELECT jsonb_agg(${t.column} ORDER BY position) FROM ${t.targets} x WHERE x.equipment_id=e.id),'[]') AS ${t.field}
 FROM ${t.table} e ORDER BY position,e.id`)
  ).rows;
  return rows.map(({ gold, research, ...r }) => ({
    ...r,
    ...(gold === null ? {} : { gold }),
    ...(research === null ? {} : { research }),
  }));
}
export async function seedEquipment(db: Connection, d: Definitions) {
  await seed(db, robot, d.robotEquipment);
  await seed(db, building, d.buildingUpgrades);
}
export async function readEquipment(db: Connection) {
  return {
    robotEquipment: (await read(db, robot)) as Definitions["robotEquipment"],
    buildingUpgrades: (await read(
      db,
      building,
    )) as Definitions["buildingUpgrades"],
  };
}
