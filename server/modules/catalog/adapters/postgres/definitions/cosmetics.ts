import type { Connection, Definitions } from "../connection.js";
export async function seedCosmetics(db: Connection, d: Definitions) {
  for (const [position, c] of d.cosmetics.entries())
    await db.query(
      "INSERT INTO game_cosmetics(id,kind,name,missions_required,color,accent,rarity,legendary_style,description,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        c.id,
        c.kind,
        c.name,
        c.missions,
        "color" in c ? c.color : null,
        "accent" in c ? c.accent : null,
        "rarity" in c ? c.rarity : null,
        "legendary" in c ? c.legendary : null,
        c.description,
        position,
      ],
    );
}
export async function readCosmetics(db: Connection) {
  const rows = (
    await db.query(
      "SELECT id,kind,name,missions_required AS missions,color,accent,rarity,legendary_style AS legendary,description FROM game_cosmetics ORDER BY position,id",
    )
  ).rows;
  return rows.map(({ color, accent, rarity, legendary, ...r }) => ({
    ...r,
    ...(color === null ? {} : { color }),
    ...(accent === null ? {} : { accent }),
    ...(rarity === null ? {} : { rarity }),
    ...(legendary === null ? {} : { legendary }),
  })) as Definitions["cosmetics"];
}
