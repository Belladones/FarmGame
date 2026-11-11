import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { createPool, migrate } from "./db.js";
import { defaultCatalog } from "../src/shared/domain/gameCatalog.js";
import { readDefinitions } from "./modules/catalog/adapters/postgres/definitionsRepository.js";
import { fresh } from "../src/modules/farm/domain/factories.ts";

test("existing JSON definitions migrate to typed tables without resetting edits", async (t) => {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  assert.ok(url);
  const admin = createPool(url),
    schema = "relational_test_" + randomUUID().replaceAll("-", "");
  await admin.query(`CREATE SCHEMA ${schema}`);
  const isolated = new URL(url);
  isolated.searchParams.set("options", "-c search_path=" + schema);
  const db = createPool(isolated.toString());
  try {
    await db.query(
      "CREATE TABLE schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (
      await readdir(new URL("./migrations/", import.meta.url))
    )
      .filter((n) => /^00[1-5].*\.sql$/.test(n))
      .sort()) {
      await db.query(
        await readFile(
          new URL("./migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
      await db.query("INSERT INTO schema_migrations(name) VALUES($1)", [name]);
    }
    // Simulate a catalogue already installed by the previous application release.
    for (const [i, r] of defaultCatalog.resources.entries())
      await db.query("INSERT INTO game_resources VALUES($1,$2,$3,$4)", [
        r.id,
        r.name,
        r.salePrice,
        i,
      ]);
    for (const [i, r] of defaultCatalog.research.entries())
      await db.query(
        "INSERT INTO game_research(id,name,category,gold_cost,detail,local_only,position,compatibility_cost) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          r.id,
          r.name,
          r.category,
          r.goldCost ?? 0,
          r.detail,
          r.localOnly ?? false,
          i,
          r.cost,
        ],
      );
    const source = structuredClone(defaultCatalog.definitions);
    source.models.Farmer.capacity = 33.5;
    source.models.Farmer.price = 765.25;
    source.models.Farmer.name = "Fermier personnalisé";
    source.buildings.Workshop.price = 321;
    source.crops.Carrot.seconds = 8.75;
    source.crops.Carrot.cost.Wood = 5.25;
    source.crops.Grass.yields = [3, 7.5];
    source.recipes.Oven.duration = 17.5;
    source.recipes.Oven.input.Wood = 3.5;
    source.recipes.Oven.output.Bread = 4.25;
    Object.assign(source.robotEquipment[0], { gold: 0 });
    source.robotEquipment[0].materials.Wood = 123.5;
    source.robotEquipment[0].models = ["Drone", "Farmer"];
    source.buildingUpgrades[5].materials.Plank = 777;
    source.tradeOrders[0].quantity = 111.5;
    source.tradeOrders[0].payment = 222.75;
    source.cosmetics.find((c) => c.id === "rose")!.name = "Rose personnalisée";
    const rose = source.cosmetics.find((c) => c.id === "rose")!;
    if ("color" in rose) rose.color = "#123456";
    source.storageCapacities[0] = 250.5;
    source.constructionSlots.reverse();
    source.ranks[0] = "Apprenti personnalisé";
    source.thresholds[1] = 180;
    const objects = ["models", "buildings", "recipes", "crops"] as const,
      arrays = [
        "robotEquipment",
        "buildingUpgrades",
        "tradeOrders",
        "cosmetics",
      ] as const,
      settings = [
        "storageCapacities",
        "constructionSlots",
        "ranks",
        "thresholds",
      ] as const;
    for (const section of [...objects, ...arrays]) {
      const value = source[section];
      const entries = Array.isArray(value)
        ? value.map((v, i) => [v.id + ":" + i, v])
        : Object.entries(value);
      for (const [position, [id, data]] of entries.entries())
        await db.query("INSERT INTO game_definitions VALUES($1,$2,$3,$4)", [
          section,
          id,
          position,
          JSON.stringify(data),
        ]);
    }
    for (const key of settings)
      await db.query("INSERT INTO game_definitions VALUES($1,$2,$3,$4)", [
        "settings",
        key,
        0,
        JSON.stringify(source[key]),
      ]);
    await db.query("INSERT INTO game_catalog(id,version) VALUES(1,17)");
    const owner = randomUUID(),
      state = fresh();
    state.robots[0].code = "// programme à conserver\nharvest();";
    await db.query(
      "INSERT INTO players(id,username,username_key,password_hash) VALUES($1,$2,$2,$3)",
      [owner, "migration_player", "hash"],
    );
    await db.query(
      "INSERT INTO farm_saves(player_id,state,revision) VALUES($1,$2,5)",
      [owner, JSON.stringify(state)],
    );
    await t.test(
      "an unrepresented custom field aborts without deleting the legacy catalogue",
      async () => {
        await db.query(
          "UPDATE game_definitions SET data=jsonb_set(data,'{customField}','true') WHERE section='models' AND id='Farmer'",
        );
        await assert.rejects(migrate(db), /Unsupported field/);
        assert.ok(
          (await db.query("SELECT to_regclass('game_definitions') AS t"))
            .rows[0].t,
        );
        assert.equal(
          (await db.query("SELECT to_regclass('game_robot_models') AS t"))
            .rows[0].t,
          null,
        );
        assert.equal(
          (
            await db.query(
              "SELECT 1 FROM schema_migrations WHERE name LIKE '006%'",
            )
          ).rowCount,
          0,
        );
        await db.query(
          "UPDATE game_definitions SET data=data-'customField' WHERE section='models' AND id='Farmer'",
        );
      },
    );
    await t.test(
      "a constraint failure also rolls back all new tables and keeps source values",
      async () => {
        await db.query(
          "UPDATE game_definitions SET data=jsonb_set(data,'{research}','\"unknown-research\"') WHERE section='models' AND id='Farmer'",
        );
        await assert.rejects(
          migrate(db),
          (e) => (e as { code?: string }).code === "23503",
        );
        assert.equal(
          (await db.query("SELECT to_regclass('game_robot_models') AS t"))
            .rows[0].t,
          null,
        );
        assert.equal(
          (
            await db.query(
              "SELECT (data->>'capacity')::float8 AS capacity FROM game_definitions WHERE section='models' AND id='Farmer'",
            )
          ).rows[0].capacity,
          33.5,
        );
        await db.query(
          "UPDATE game_definitions SET data=jsonb_set(data,'{research}','\"fleet\"') WHERE section='models' AND id='Farmer'",
        );
      },
    );
    const version = Number(
      (await db.query("SELECT version FROM game_catalog")).rows[0].version,
    );
    await migrate(db);
    await t.test(
      "all sections roundtrip, including decimal edits, ordering, optional fields and multiple production upgrades",
      async () => {
        assert.deepEqual(await readDefinitions(db), source);
        assert.equal(
          Number(
            (await db.query("SELECT version FROM game_catalog")).rows[0]
              .version,
          ),
          version + 1,
        );
        assert.deepEqual(
          (
            await db.query("SELECT game_restore_save($1,'active') AS state", [
              owner,
            ])
          ).rows[0].state,
          state,
        );
        const robot = (
          await db.query(
            "SELECT capacity::float8 AS capacity,price::float8 AS price FROM game_robot_models WHERE id='Farmer'",
          )
        ).rows[0];
        assert.deepEqual(robot, { capacity: 33.5, price: 765.25 });
        const input = (
          await db.query(
            "SELECT amount::float8 AS amount FROM game_recipe_inputs WHERE building_type_id='Oven' AND resource_id='Wood'",
          )
        ).rows[0];
        assert.equal(input.amount, 3.5);
        const levels = (
          await db.query(
            "SELECT amount::float8 AS amount FROM game_crop_yields WHERE crop_id='Grass' ORDER BY level",
          )
        ).rows.map((r) => r.amount);
        assert.deepEqual(levels, [3, 7.5]);
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS n FROM game_building_upgrades WHERE equipment_key='production'",
            )
          ).rows[0].n,
          4,
        );
      },
    );
    await t.test(
      "JSON storage is removed and all replacement tables have scalar columns",
      async () => {
        assert.equal(
          (await db.query("SELECT to_regclass('game_definitions') AS t"))
            .rows[0].t,
          null,
        );
        const columns = await db.query(
          "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name IN ('game_robot_models','game_building_types','game_crop_types','game_crop_costs','game_crop_yields','game_recipes','game_recipe_inputs','game_recipe_outputs','game_robot_equipment','game_robot_equipment_costs','game_robot_equipment_models','game_building_upgrades','game_building_upgrade_costs','game_building_upgrade_types','game_trade_orders','game_cosmetics','game_storage_tiers','game_construction_slots','game_career_ranks') AND data_type IN ('json','jsonb','ARRAY')",
          [schema],
        );
        assert.equal(columns.rowCount, 0);
      },
    );
    await t.test(
      "typed SQL edits are read by the repository and survive a second migration run",
      async () => {
        await db.query(
          "UPDATE game_robot_models SET capacity=41 WHERE id='Farmer'",
        );
        await db.query(
          "UPDATE game_crop_yields SET amount=11 WHERE crop_id='Grass' AND level=1",
        );
        await db.query(
          "UPDATE game_robot_equipment_costs SET amount=80 WHERE equipment_id='hold:0' AND resource_id='Hay'",
        );
        await migrate(db);
        const data = await readDefinitions(db);
        assert.equal(data.models.Farmer.capacity, 41);
        assert.equal(data.crops.Grass.yields[0], 11);
        assert.equal(data.robotEquipment[0].materials.Hay, 80);
        await assert.rejects(
          db.query(
            "INSERT INTO game_crop_costs VALUES('Grass','unknown-resource',1)",
          ),
          (e) => (e as { code?: string }).code === "23503",
        );
        await assert.rejects(
          db.query(
            "UPDATE game_robot_models SET capacity=-1 WHERE id='Farmer'",
          ),
          (e) => (e as { code?: string }).code === "23514",
        );
      },
    );
  } finally {
    await db.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
