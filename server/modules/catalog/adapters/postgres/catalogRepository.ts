import type pg from "pg";
import {
  defaultCatalog,
  validateCatalog,
  type GameCatalog,
} from "../../../../../src/shared/domain/gameCatalog.js";
type Connection = Pick<pg.PoolClient, "query">;
const arraySections = [
  "robotEquipment",
  "buildingUpgrades",
  "tradeOrders",
  "cosmetics",
];
const objectSections = ["models", "buildings", "recipes", "crops"];
const settings = [
  "storageCapacities",
  "constructionSlots",
  "ranks",
  "thresholds",
];
/** Initial installation only: restarting never overwrites catalogue edits. */
export async function seedCatalog(db: Connection) {
  if ((await db.query("SELECT 1 FROM game_catalog WHERE id=1")).rowCount)
    return;
  const c = defaultCatalog;
  validateCatalog(c);
  for (const [position, r] of c.resources.entries())
    await db.query(
      "INSERT INTO game_resources(id,name,sale_price,position) VALUES($1,$2,$3,$4)",
      [r.id, r.name, r.salePrice, position],
    );
  for (const [position, r] of c.research.entries())
    await db.query(
      "INSERT INTO game_research(id,name,category,gold_cost,detail,local_only,position,compatibility_cost) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        r.id,
        r.name,
        r.category,
        r.goldCost ?? 0,
        r.detail,
        r.localOnly ?? false,
        position,
        r.cost,
      ],
    );
  for (const r of c.research) {
    for (const [id, amount] of Object.entries(r.materials))
      await db.query("INSERT INTO game_research_costs VALUES($1,$2,$3)", [
        r.id,
        id,
        amount,
      ]);
    for (const id of r.prerequisites)
      await db.query("INSERT INTO game_research_links VALUES($1,$2)", [
        r.id,
        id,
      ]);
  }
  for (const [position, g] of c.groups.entries()) {
    await db.query("INSERT INTO game_research_groups VALUES($1,$2,$3,$4)", [
      g.id,
      g.title,
      g.initialLevel,
      position,
    ]);
    for (const [i, id] of g.steps.entries())
      await db.query("INSERT INTO game_research_steps VALUES($1,$2,$3)", [
        g.id,
        id,
        i,
      ]);
  }
  for (const [position, chapter] of c.chapters.entries())
    await db.query("INSERT INTO game_chapters VALUES($1,$2,$3,$4)", [
      position,
      chapter.title,
      chapter.subtitle,
      chapter.skill,
    ]);
  for (const [campaign, missions] of Object.entries(c.campaigns))
    for (const [position, m] of missions.entries())
      await db.query(
        "INSERT INTO game_missions(campaign,id,position,chapter,title,description,target,reward,gold,xp,condition,hint,code,destination,action) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
        [
          campaign,
          m.id,
          position,
          m.chapter,
          m.title,
          m.text,
          m.target,
          m.reward,
          m.gold,
          m.xp,
          JSON.stringify(m.condition),
          m.hint,
          m.code ?? null,
          m.destination,
          m.action,
        ],
      );
  for (const section of [...objectSections, ...arraySections]) {
    const value = (c.definitions as Record<string, unknown>)[section];
    const entries = Array.isArray(value)
      ? value.map((v, i) => [v.id + ":" + i, v])
      : Object.entries(value as Record<string, unknown>);
    for (const [position, [id, data]] of entries.entries())
      await db.query("INSERT INTO game_definitions VALUES($1,$2,$3,$4)", [
        section,
        id,
        position,
        JSON.stringify(data),
      ]);
  }
  for (const id of settings)
    await db.query("INSERT INTO game_definitions VALUES($1,$2,$3,$4)", [
      "settings",
      id,
      0,
      JSON.stringify((c.definitions as Record<string, unknown>)[id]),
    ]);
  await db.query("INSERT INTO game_catalog(id,version) VALUES(1,1)");
}
/** A repeatable-read transaction prevents partially reading a multi-table catalogue edit. */
export async function readCatalog(pool: pg.Pool): Promise<GameCatalog> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const metadata = await db.query(
      "SELECT version FROM game_catalog WHERE id=1",
    );
    if (!metadata.rowCount) throw Error("Catalogue non initialisé.");
    const resources = (
      await db.query(
        'SELECT id,name,sale_price AS "salePrice" FROM game_resources ORDER BY position,id',
      )
    ).rows.map((r) => ({ ...r, salePrice: Number(r.salePrice) }));
    const researchRows = (
      await db.query(
        `SELECT r.*,COALESCE((SELECT jsonb_object_agg(resource_id,amount) FROM game_research_costs c WHERE c.research_id=r.id),'{}') AS materials,COALESCE((SELECT jsonb_agg(prerequisite_id ORDER BY prerequisite_id) FROM game_research_links l WHERE l.research_id=r.id),'[]') AS prerequisites FROM game_research r ORDER BY position,id`,
      )
    ).rows;
    const research = researchRows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      materials: r.materials,
      prerequisites: r.prerequisites,
      detail: r.detail,
      cost: Number(r.compatibility_cost),
      ...(Number(r.gold_cost) ? { goldCost: Number(r.gold_cost) } : {}),
      localOnly: r.local_only,
    }));
    const groups = (
      await db.query(
        `SELECT g.id,g.title,g.initial_level AS "initialLevel",COALESCE((SELECT jsonb_agg(research_id ORDER BY position) FROM game_research_steps s WHERE s.group_id=g.id),'[]') AS steps FROM game_research_groups g ORDER BY position,id`,
      )
    ).rows;
    const chapters = (
      await db.query(
        "SELECT title,subtitle,skill FROM game_chapters ORDER BY position",
      )
    ).rows;
    const campaigns: Record<string, unknown[]> = {
      legacy: [],
      assets: [],
      modern: [],
    };
    for (const r of (
      await db.query("SELECT * FROM game_missions ORDER BY campaign,position")
    ).rows)
      campaigns[r.campaign].push({
        id: r.id,
        chapter: r.chapter,
        title: r.title,
        text: r.description,
        target: Number(r.target),
        reward: Number(r.reward),
        gold: Number(r.gold),
        xp: Number(r.xp),
        condition: r.condition,
        hint: r.hint,
        ...(r.code === null ? {} : { code: r.code }),
        destination: r.destination,
        action: r.action,
      });
    const definitions: Record<string, unknown> = {};
    for (const s of objectSections) definitions[s] = {};
    for (const s of arraySections) definitions[s] = [];
    for (const r of (
      await db.query(
        "SELECT * FROM game_definitions ORDER BY section,position,id",
      )
    ).rows) {
      if (r.section === "settings") definitions[r.id] = r.data;
      else if (arraySections.includes(r.section))
        (definitions[r.section] as unknown[]).push(r.data);
      else if (objectSections.includes(r.section))
        (definitions[r.section] as Record<string, unknown>)[r.id] = r.data;
    }
    const result = {
      version: Number(metadata.rows[0].version),
      resources,
      research,
      groups,
      chapters,
      campaigns,
      definitions,
    };
    validateCatalog(result);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
