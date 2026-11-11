import type { Connection, Definitions } from "../connection.js";
export async function seedTradeOrders(db: Connection, d: Definitions) {
  for (const [position, r] of d.tradeOrders.entries())
    await db.query(
      "INSERT INTO game_trade_orders(id,name,resource_id,quantity,payment,unlock_research_id,position) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [r.id, r.name, r.item, r.quantity, r.payment, r.unlock, position],
    );
}
export async function readTradeOrders(db: Connection) {
  return (
    await db.query(
      "SELECT id,name,resource_id AS item,quantity::float8 AS quantity,payment::float8 AS payment,unlock_research_id AS unlock FROM game_trade_orders ORDER BY position,id",
    )
  ).rows as Definitions["tradeOrders"];
}
