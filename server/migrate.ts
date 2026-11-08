import { createPool, migrate } from "./db.js";
const pool = createPool();
try {
  await migrate(pool);
  console.log("Migrations PostgreSQL appliquées.");
} catch {
  console.error(
    "Migration impossible. Vérifiez la connexion PostgreSQL et les droits du compte.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
