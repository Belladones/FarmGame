import type { GameCatalog } from "../../../../src/shared/domain/gameCatalog.js";
export interface CatalogRepository {
  read(): Promise<GameCatalog>;
}
