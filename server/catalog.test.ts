import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createPool, migrate } from "./db.js";
import { readCatalog } from "./modules/catalog/adapters/postgres/catalogRepository.js";
import { createApp } from "./app.js";
import { fresh } from "../src/modules/farm/domain/factories.ts";
import {
  defaultCatalog,
  validateCatalog,
} from "../src/shared/domain/gameCatalog.js";
import { missionProgress } from "../src/shared/domain/missionRules.js";
import type { Server } from "node:http";

test("database catalogue, migration and normalized games", async (t) => {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  assert.ok(url);
  const admin = createPool(url),
    schema = "catalog_test_" + randomUUID().replaceAll("-", "");
  await admin.query(`CREATE SCHEMA ${schema}`);
  const isolated = new URL(url);
  isolated.searchParams.set("options", "-c search_path=" + schema);
  const db = createPool(isolated.toString());
  let server: Server | undefined;
  try {
    // Build a real pre-migration database to prove existing autosaves and named slots survive.
    await db.query(
      "CREATE TABLE schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const { readdir } = await import("node:fs/promises");
    for (const name of (
      await readdir(new URL("./migrations/", import.meta.url))
    )
      .filter((n) => /^00[1-3].*\.sql$/.test(n))
      .sort()) {
      await db.query(
        await readFile(
          new URL("./migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
      await db.query("INSERT INTO schema_migrations(name) VALUES($1)", [name]);
    }
    const owner = randomUUID(),
      slot = randomUUID(),
      state = fresh();
    state.resources = { Hay: 135, Wood: 65 };
    state.gold = 42;
    state.unlocks.push("loops", "extension", "legacy-unknown");
    state.claimed = ["first", "deposit"];
    state.harvestedItems.Hay = 12;
    state.depositedItems.Hay = 10;
    state.robots[0].code = "harvest();\ndeposit();";
    state.robots[0].equipment = { hold: 2, sensor: 1 };
    state.robots[0].inventory = { Wood: 3 };
    state.buildings[0].inventory = { Hay: 135, Wood: 65 };
    state.storedBuildings = [
      {
        ...structuredClone(state.buildings[0]),
        id: "b2",
        kind: "Workshop",
        inventory: {},
      },
    ];
    await db.query("INSERT INTO players VALUES($1,$2,$2,$3,now())", [
      owner,
      "migration_player",
      "hash",
    ]);
    await db.query(
      "INSERT INTO farm_saves(player_id,state,revision) VALUES($1,$2,7)",
      [owner, JSON.stringify(state)],
    );
    await db.query(
      "INSERT INTO farm_slots(player_id,id,name,state) VALUES($1,$2,$3,$4)",
      [owner, slot, "Avant migration", JSON.stringify(state)],
    );
    await migrate(db);
    await t.test(
      "backfill reconstructs every field and preserves named saves, programs, unknown unlocks and equipment",
      async () => {
        for (const key of ["active", slot])
          assert.deepEqual(
            (
              await db.query("SELECT game_restore_save($1,$2) AS state", [
                owner,
                key,
              ])
            ).rows[0].state,
            state,
          );
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS n FROM game_saved_robots WHERE player_id=$1",
              [owner],
            )
          ).rows[0].n,
          2,
        );
        assert.equal(
          (
            await db.query(
              "SELECT amount::float8 AS amount FROM game_inventory_balances WHERE player_id=$1 AND save_key='active' AND owner='f1' AND resource_id='Wood'",
              [owner],
            )
          ).rows[0].amount,
          3,
        );
        assert.equal(
          (
            await db.query(
              "SELECT level FROM game_equipment_levels WHERE player_id=$1 AND save_key='active' AND asset_id='f1' AND equipment_id='hold'",
              [owner],
            )
          ).rows[0].level,
          2,
        );
      },
    );
    await t.test(
      "SQL and TypeScript mission predicates agree for every campaign",
      async () => {
        for (const missions of Object.values(defaultCatalog.campaigns))
          for (const m of missions) {
            const result = await db.query(
              "SELECT game_mission_value($1,$2)::float8 AS value",
              [m.condition, state],
            );
            assert.equal(
              result.rows[0].value,
              missionProgress(m.condition, state),
              m.id,
            );
          }
        const rows = (
          await db.query(
            "SELECT * FROM game_mission_progress WHERE player_id=$1 AND save_key='active' ORDER BY position",
            [owner],
          )
        ).rows;
        assert.equal(rows.length, defaultCatalog.campaigns.modern.length);
        assert.equal(rows[0].claimed, true);
        assert.equal(Number(rows[0].progress), 12);
      },
    );
    const first = await readCatalog(db);
    validateCatalog(first);
    await t.test(
      "all database definitions roundtrip without losing compatible historical campaigns",
      async () => {
        assert.equal(first.research.length, 147);
        assert.equal(first.resources.length, 9);
        assert.deepEqual(first.campaigns, defaultCatalog.campaigns);
        assert.deepEqual(first.definitions, defaultCatalog.definitions);
        for (const r of first.research) {
          const expected = defaultCatalog.research.find((e) => e.id === r.id)!;
          assert.deepEqual(r.materials, expected.materials);
          assert.equal(r.cost, expected.cost);
          assert.deepEqual(
            [...r.prerequisites].sort(),
            [...expected.prerequisites].sort(),
          );
        }
      },
    );
    await t.test(
      "edits to costs, links, mission targets and resource names survive restart and migrate",
      async () => {
        await db.query(
          "UPDATE game_resources SET name='Foin modifié' WHERE id='Hay'",
        );
        await db.query(
          "UPDATE game_research_costs SET amount=7 WHERE research_id='loops' AND resource_id='Hay'",
        );
        await db.query(
          "DELETE FROM game_research_links WHERE research_id='loops'",
        );
        await db.query(
          "INSERT INTO game_research_links VALUES('loops','till')",
        );
        await db.query(
          "UPDATE game_missions SET title='Premiers foins édités',target=2 WHERE campaign='modern' AND id='first'",
        );
        await migrate(db);
        const c = await readCatalog(db);
        assert.ok(c.version > first.version);
        assert.equal(
          c.resources.find((r) => r.id === "Hay")!.name,
          "Foin modifié",
        );
        assert.equal(
          c.research.find((r) => r.id === "loops")!.materials.Hay,
          7,
        );
        assert.deepEqual(
          c.research.find((r) => r.id === "loops")!.prerequisites,
          ["till"],
        );
        assert.equal(c.campaigns.modern[0].target, 2);
      },
    );
    await t.test(
      "invalid research cycles are rejected rather than installing a broken catalogue",
      async () => {
        await db.query(
          "INSERT INTO game_research_links VALUES('till','loops')",
        );
        await assert.rejects(readCatalog(db), /Cycle/);
        await db.query(
          "DELETE FROM game_research_links WHERE research_id='till' AND prerequisite_id='loops'",
        );
      },
    );
    server = await new Promise<Server>((resolve) => {
      const s = createApp(db, { secureCookies: false }).listen(
        0,
        "127.0.0.1",
        () => resolve(s),
      );
    });
    const base =
      "http://127.0.0.1:" + (server.address() as { port: number }).port;
    await t.test(
      "catalogue is public, progression is protected and APIs restore relational rows",
      async () => {
        const response = await fetch(base + "/api/catalog");
        assert.equal(response.status, 200);
        const c = await response.json();
        assert.equal(c.resources[0].name, "Foin modifié");
        assert.equal((await fetch(base + "/api/progress")).status, 401);
        // Exercise the same SELECT used by API saves: normalized rows are consumed, not an unused projection.
        await db.query(
          "UPDATE game_saved_resources SET amount=136 WHERE player_id=$1 AND save_key='active' AND resource_id='Hay'",
          [owner],
        );
        const restored = (
          await db.query(
            "SELECT COALESCE(game_restore_save(player_id,'active'),state) AS state FROM farm_saves WHERE player_id=$1",
            [owner],
          )
        ).rows[0].state;
        assert.equal(restored.resources.Hay, 136);
      },
    );
    await t.test(
      "revisions and immutable snapshots update normalized rows atomically and delete cascades",
      async () => {
        const next = { ...state, gold: 100 };
        await db.query(
          "UPDATE farm_saves SET state=$2,revision=revision+1 WHERE player_id=$1 AND revision=7",
          [owner, next],
        );
        const stale = await db.query(
          "UPDATE farm_saves SET state=$2 WHERE player_id=$1 AND revision=7",
          [owner, { ...state, gold: 0 }],
        );
        assert.equal(stale.rowCount, 0);
        assert.equal(
          (
            await db.query(
              "SELECT core->>'gold' AS gold FROM game_saved_games WHERE player_id=$1 AND save_key='active'",
              [owner],
            )
          ).rows[0].gold,
          "100",
        );
        assert.deepEqual(
          (
            await db.query("SELECT game_restore_save($1,$2) AS state", [
              owner,
              slot,
            ])
          ).rows[0].state,
          state,
        );
        await db.query("DELETE FROM farm_slots WHERE player_id=$1 AND id=$2", [
          owner,
          slot,
        ]);
        assert.equal(
          (
            await db.query(
              "SELECT 1 FROM game_saved_games WHERE player_id=$1 AND save_key=$2",
              [owner, slot],
            )
          ).rowCount,
          0,
        );
        await db.query("DELETE FROM players WHERE id=$1", [owner]);
        assert.equal(
          (
            await db.query(
              "SELECT 1 FROM game_saved_games WHERE player_id=$1",
              [owner],
            )
          ).rowCount,
          0,
        );
      },
    );
  } finally {
    if (server)
      await new Promise<void>((resolve, reject) =>
        server!.close((e) => (e ? reject(e) : resolve())),
      );
    await db.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
