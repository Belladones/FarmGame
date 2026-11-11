import type pg from "pg";
import type { GameCatalog } from "../../../../../src/shared/domain/gameCatalog.js";
export type Connection = Pick<pg.PoolClient, "query">;
export type Definitions = GameCatalog["definitions"];
