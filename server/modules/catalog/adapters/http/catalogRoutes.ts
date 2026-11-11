import type { Express } from "express";
import { loadCatalog } from "../../application/loadCatalog.js";
import type { CatalogRepository } from "../../ports/CatalogRepository.js";
export function catalogRoutes(app: Express, repository: CatalogRepository) {
  app.get("/api/catalog", async (_req, res) =>
    res.json(await loadCatalog(repository)),
  );
}
