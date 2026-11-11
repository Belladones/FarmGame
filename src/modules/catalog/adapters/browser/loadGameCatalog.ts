import { installCatalog } from "../../application/catalogRegistry";
import {
  defaultCatalog,
  validateCatalog,
} from "../../../../shared/domain/gameCatalog";
const CACHE = "farmscript-catalog-v1";
export async function loadGameCatalog(): Promise<boolean> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("/api/catalog", {
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw Error("Catalogue indisponible.");
    const data: unknown = await response.json();
    validateCatalog(data);
    installCatalog(data);
    try {
      localStorage.setItem(CACHE, JSON.stringify(data));
    } catch {
      /* Cache quota must not prevent play. */
    }
    return true;
  } catch {
    try {
      const cached: unknown = JSON.parse(localStorage.getItem(CACHE) || "null");
      validateCatalog(cached);
      installCatalog(cached);
    } catch {
      installCatalog(defaultCatalog);
    }
    return false;
  } finally {
    clearTimeout(timer);
  }
}
