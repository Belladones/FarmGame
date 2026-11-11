import { validateCatalog } from "../../../../src/shared/domain/gameCatalog.js";
import type { CatalogRepository } from "../ports/CatalogRepository.js";
/** Validate a complete release, never expose half an edited research tree. */
export async function loadCatalog(repository: CatalogRepository) {
  const catalog = await repository.read();
  validateCatalog(catalog);
  return catalog;
}
