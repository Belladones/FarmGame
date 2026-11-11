import "dotenv/config";
import pg from "pg";
import { seedCatalog } from "./modules/catalog/adapters/postgres/catalogRepository.js";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString)
    throw new Error(
      "DATABASE_URL manque. Copiez .env.example vers .env et démarrez PostgreSQL.",
    );
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL n’est pas une URL PostgreSQL valide.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL doit désigner PostgreSQL.");
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });
  pool.on("error", () =>
    console.error(
      "Connexion PostgreSQL interrompue ; reconnexion à la prochaine requête.",
    ),
  );
  return pool;
}
export async function migrate(pool: pg.Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(718349201)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const dir = fileURLToPath(new URL("./migrations/", import.meta.url));
    for (const name of (await readdir(dir))
      .filter((n) => /^\d+.*\.sql$/.test(n))
      .sort()) {
      const found = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (found.rowCount) continue;
      await client.query(
        await readFile(
          new URL("./migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
      await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [
        name,
      ]);
    }
    await seedCatalog(client);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
