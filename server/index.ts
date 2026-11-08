import { createPool, migrate } from "./db.js";
import { createApp } from "./app.js";
const pool = createPool();
try {
  await migrate(pool);
  const app = createApp(pool, {
    serveFrontend: true,
  });
  const server = app.listen(
    Number(process.env.PORT ?? 3001),
    process.env.HOST ?? "127.0.0.1",
    () =>
      console.log(
        "API FarmScript démarrée sur le port " + (process.env.PORT ?? 3001),
      ),
  );
  const shutdown = () => {
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch {
  console.error(
    "Impossible de démarrer l’API. Vérifiez PostgreSQL et DATABASE_URL.",
  );
  await pool.end();
  process.exitCode = 1;
}
