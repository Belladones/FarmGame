import type pg from "pg";
/** Account-scoped read model; all three lists use the same database snapshot. */
export async function readProgress(pool: pg.Pool, owner: string) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const saved = await db.query(
      "SELECT revision,updated_at FROM game_saved_games WHERE player_id=$1 AND save_key='active'",
      [owner],
    );
    const missions = await db.query(
      "SELECT mission_id AS id,title,progress,target,claimed FROM game_mission_progress WHERE player_id=$1 AND save_key='active' ORDER BY position",
      [owner],
    );
    const research = await db.query(
      "SELECT research_id AS id FROM game_saved_research WHERE player_id=$1 AND save_key='active' ORDER BY position",
      [owner],
    );
    const inventory = await db.query(
      "SELECT owner,compartment,resource_id AS resource,amount FROM game_inventory_balances WHERE player_id=$1 AND save_key='active' ORDER BY owner,compartment,resource_id",
      [owner],
    );
    await db.query("COMMIT");
    return {
      revision: saved.rows[0]?.revision ?? 0,
      updatedAt: saved.rows[0]?.updated_at ?? null,
      missions: missions.rows.map((r) => ({
        ...r,
        progress: Number(r.progress),
        target: Number(r.target),
      })),
      research: research.rows.map((r) => r.id),
      inventory: inventory.rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
    };
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
