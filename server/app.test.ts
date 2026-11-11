import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import type { Server } from "node:http";
import { createPool, migrate } from "./db.js";
import { createApp } from "./app.js";
import { fresh } from "../src/modules/farm/application/engine.ts";

test("PostgreSQL accounts, sessions and save isolation", async (t) => {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  assert.ok(
    url,
    "TEST_DATABASE_URL ou DATABASE_URL est requis pour tester une vraie base PostgreSQL.",
  );
  const pool = createPool(url);
  await migrate(pool);
  await migrate(pool);
  const server = await new Promise<Server>((resolve) => {
    const s = createApp(pool, { secureCookies: false, authLimit: 1000 }).listen(
      0,
      "127.0.0.1",
      () => resolve(s),
    );
  });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const names = [
    `test_${randomUUID().replaceAll("-", "").slice(0, 15)}`,
    `test_${randomUUID().replaceAll("-", "").slice(0, 15)}`,
  ];
  const password = "test-only-" + randomUUID();
  let cookieA = "",
    cookieB = "",
    playerA = "",
    revision = 0;
  const req = (
    path: string,
    method = "GET",
    body?: unknown,
    cookie = "",
    extra: Record<string, string> = {},
  ) =>
    fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-FarmScript-Request": "1",
        ...(cookie ? { Cookie: cookie } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const capture = (res: Response) =>
    res.headers.getSetCookie()[0].split(";")[0];
  try {
    await t.test(
      "health performs a real PostgreSQL query and writes require authentication",
      async () => {
        assert.equal((await req("/api/health")).status, 200);
        assert.equal((await req("/api/session")).status, 204);
        assert.equal((await req("/api/save")).status, 401);
        assert.equal(
          (
            await req("/api/save", "PUT", {
              farm: fresh(),
              revision: 0,
              schemaVersion: 1,
            })
          ).status,
          401,
        );
      },
    );
    await t.test(
      "registration hashes passwords and stores only a hash of the HttpOnly session token",
      async () => {
        assert.equal(
          (
            await req("/api/auth/register", "POST", {
              username: names[0],
              password: "short",
            })
          ).status,
          400,
        );
        const response = await req("/api/auth/register", "POST", {
          username: names[0],
          password,
        });
        assert.equal(response.status, 201);
        const data = await response.json();
        playerA = data.player.id;
        assert.equal(data.save, null);
        assert.equal("password_hash" in data.player, false);
        cookieA = capture(response);
        const header = response.headers.getSetCookie()[0];
        assert.match(header, /HttpOnly/i);
        assert.match(header, /SameSite=Lax/i);
        assert.match(header, /Path=\/api/i);
        const row = (
          await pool.query("SELECT password_hash FROM players WHERE id=$1", [
            playerA,
          ])
        ).rows[0];
        assert.match(row.password_hash, /^scrypt-v1:/);
        assert.notEqual(row.password_hash, password);
        const token = cookieA.split("=")[1];
        const session = (
          await pool.query(
            "SELECT token_hash FROM player_sessions WHERE player_id=$1",
            [playerA],
          )
        ).rows[0];
        assert.equal(session.token_hash.length, 32);
        assert.deepEqual(
          session.token_hash,
          createHash("sha256").update(token).digest(),
        );
        assert.equal(
          (
            await req("/api/auth/register", "POST", {
              username: names[0].toUpperCase(),
              password,
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      "login verifies credentials and rotates only the current browser session",
      async () => {
        assert.equal(
          (
            await req("/api/auth/login", "POST", {
              username: names[0],
              password: "incorrect-password",
            })
          ).status,
          401,
        );
        const old = cookieA;
        const response = await req(
          "/api/auth/login",
          "POST",
          { username: names[0].toUpperCase(), password },
          cookieA,
        );
        assert.equal(response.status, 200);
        cookieA = capture(response);
        assert.notEqual(cookieA, old);
        assert.equal(
          (await req("/api/session", "GET", undefined, old)).status,
          401,
        );
        const session = await (
          await req("/api/session", "GET", undefined, cookieA)
        ).json();
        assert.equal(session.player.id, playerA);
      },
    );
    await t.test(
      "full farm snapshots roundtrip through JSONB with revisions",
      async () => {
        const farm = fresh();
        farm.companion = {
          skin: "rose",
          accessory: "flower",
          lens: "lens-cyan",
          stickers: [
            { id: "ribbon", slot: 0, rotation: 0.1 },
            { id: "flower", slot: 3, rotation: -0.15 },
          ],
          unlocked: [
            "pearl",
            "none",
            "ribbon",
            "rose",
            "flower",
            "lens-red",
            "lens-cyan",
          ],
        };
        farm.resources.Hay = 17;
        farm.robots[0].equipment = { hold: 3, motor: 2, sensor: 1 };
        farm.buildings[0].upgrades = { storage: 4 };
        farm.waterItems = 7;
        farm.waterRemainder = 0.3;
        farm.harvestedItems = { Hay: 23, Wheat: 4 };
        farm.depositedItems = { Hay: 17, Wheat: 3 };
        farm.harvested = 27;
        farm.deposited = 20;
        farm.stock = 42;
        farm.produced.Flour = 5;
        farm.storedBuildings.push({
          ...structuredClone(farm.buildings[0]),
          id: "stored-depot",
          paid: 100,
          inventory: {},
        });
        farm.unlocks.push("construction", "land");
        farm.sites.push({ x: 0, y: -1 });
        farm.robots[0].deployed = false;
        farm.robots[0].lastError = "Erreur conservée dans la flotte";
        const writeId = randomUUID();
        farm.robots[0].code = "// sauvegardé\nharvest();";
        const response = await req(
          "/api/save",
          "PUT",
          { farm, revision: 0, schemaVersion: 1, writeId },
          cookieA,
        );
        assert.equal(response.status, 200);
        revision = (await response.json()).revision;
        assert.equal(revision, 1);
        const saved = await (
          await req("/api/save", "GET", undefined, cookieA)
        ).json();
        assert.deepEqual(saved.save.farm, farm);
        assert.equal(saved.save.revision, 1);
        assert.equal(saved.save.writeId, writeId);
        const duplicate = await req(
          "/api/save",
          "PUT",
          { farm, revision: 0, schemaVersion: 1, writeId },
          cookieA,
        );
        assert.equal(duplicate.status, 200);
        assert.equal((await duplicate.json()).revision, 1);
      },
    );
    await t.test(
      "account progression API reads normalized mission, research and inventory data",
      async () => {
        const saved = await (
          await req("/api/save", "GET", undefined, cookieA)
        ).json();
        const response = await req(
          "/api/progress?playerId=" + randomUUID(),
          "GET",
          undefined,
          cookieA,
        );
        assert.equal(response.status, 200);
        const progress = await response.json();
        assert.equal(progress.revision, saved.save.revision);
        assert.deepEqual(progress.research, saved.save.farm.unlocks);
        assert.ok(
          progress.missions.some((m: { id: string }) => m.id === "first"),
        );
        assert.ok(
          progress.inventory.every((r: { amount: number }) =>
            Number.isFinite(r.amount),
          ),
        );
      },
    );
    await t.test(
      "another device with the same account recovers the same farm",
      async () => {
        const response = await req("/api/auth/login", "POST", {
          username: names[0],
          password,
        });
        const data = await response.json();
        cookieB = capture(response);
        assert.equal(data.save.farm.stock, 42);
        assert.equal(
          (await req("/api/save", "GET", undefined, cookieA)).status,
          200,
        );
      },
    );
    await t.test(
      "concurrent stale writes cannot overwrite a newer revision",
      async () => {
        const left = fresh(),
          right = fresh();
        left.gold = 10;
        right.gold = 20;
        const results = await Promise.all([
          req(
            "/api/save",
            "PUT",
            { farm: left, revision, schemaVersion: 1 },
            cookieA,
          ),
          req(
            "/api/save",
            "PUT",
            { farm: right, revision, schemaVersion: 1 },
            cookieB,
          ),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        const saved = await (
          await req("/api/save", "GET", undefined, cookieA)
        ).json();
        assert.equal(saved.save.revision, 2);
        assert.equal(saved.save.farm.gold, results[0].status === 200 ? 10 : 20);
        revision = 2;
        assert.equal(
          (
            await req(
              "/api/save",
              "PUT",
              { farm: fresh(), revision: 0, schemaVersion: 1 },
              cookieA,
            )
          ).status,
          409,
        );
      },
    );
    await t.test(
      "accounts cannot address another player save through URL or request fields",
      async () => {
        const response = await req("/api/auth/register", "POST", {
          username: names[1],
          password,
        });
        const other = capture(response);
        const own = await (
          await req("/api/save?playerId=" + playerA, "GET", undefined, other)
        ).json();
        assert.equal(own.save, null);
        const farm = fresh();
        farm.gold = 999;
        assert.equal(
          (
            await req(
              "/api/save",
              "PUT",
              { farm, revision: 0, schemaVersion: 1, playerId: playerA },
              other,
            )
          ).status,
          200,
        );
        const first = await (
          await req("/api/save", "GET", undefined, cookieA)
        ).json();
        assert.notEqual(first.save.farm.gold, 999);
      },
    );
    await t.test(
      "malformed states and cross-origin writes are rejected without altering the save",
      async () => {
        const invalid = fresh();
        invalid.tiles = [];
        assert.equal(
          (
            await req(
              "/api/save",
              "PUT",
              { farm: invalid, revision, schemaVersion: 1 },
              cookieA,
            )
          ).status,
          400,
        );
        const invalidEquipment = fresh();
        invalidEquipment.robots[0].equipment = { hold: 99 };
        assert.equal(
          (
            await req(
              "/api/save",
              "PUT",
              { farm: invalidEquipment, revision, schemaVersion: 1 },
              cookieA,
            )
          ).status,
          400,
        );
        const huge = fresh();
        huge.robots[0].code = "x".repeat(2100000);
        assert.equal(
          (
            await req(
              "/api/save",
              "PUT",
              { farm: huge, revision, schemaVersion: 1 },
              cookieA,
            )
          ).status,
          413,
        );
        assert.equal(
          (
            await req(
              "/api/save",
              "PUT",
              { farm: fresh(), revision, schemaVersion: 1 },
              cookieA,
              { Origin: "https://other.invalid" },
            )
          ).status,
          403,
        );
        const missing = await fetch(base + "/api/auth/logout", {
          method: "POST",
          headers: { Cookie: cookieA },
        });
        assert.equal(missing.status, 403);
        const saved = await (
          await req("/api/save", "GET", undefined, cookieA)
        ).json();
        assert.equal(saved.save.revision, revision);
      },
    );
    await t.test(
      "named saves persist independently, retry safely and remain private",
      async () => {
        const id = randomUUID();
        const farm = fresh();
        farm.resources.Hay = 37;
        assert.equal((await req("/api/slots")).status, 401);
        assert.equal(
          (await req("/api/slots", "POST", { id, name: " ", farm }, cookieA))
            .status,
          400,
        );
        assert.equal(
          (
            await req(
              "/api/slots",
              "POST",
              { id, name: "Ferme A", farm: {} },
              cookieA,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await req(
              "/api/slots",
              "POST",
              { id, name: "Ferme A", farm },
              cookieA,
            )
          ).status,
          201,
        );
        // A repeated write cannot replace the original snapshot.
        await req(
          "/api/slots",
          "POST",
          { id, name: "Retry", farm: fresh() },
          cookieA,
        );
        const list = await (
          await req("/api/slots", "GET", undefined, cookieA)
        ).json();
        assert.equal(list.slots.length, 1);
        assert.equal(list.slots[0].name, "Ferme A");
        assert.equal(
          (
            await (
              await req("/api/slots/" + id, "GET", undefined, cookieA)
            ).json()
          ).farm.resources.Hay,
          37,
        );
        const other = await req("/api/auth/login", "POST", {
          username: names[1],
          password,
        });
        assert.equal(other.status, 200);
        const otherCookie = capture(other);
        assert.equal(
          (
            await (
              await req("/api/slots", "GET", undefined, otherCookie)
            ).json()
          ).slots.length,
          0,
        );
        assert.equal(
          (await req("/api/slots/" + id, "GET", undefined, otherCookie)).status,
          404,
        );
        assert.equal(
          (await req("/api/slots/" + id, "DELETE", undefined, otherCookie))
            .status,
          404,
        );
        assert.equal(
          (await req("/api/slots/" + id, "DELETE", undefined, cookieA)).status,
          204,
        );
        assert.equal(
          (await req("/api/slots/" + id, "GET", undefined, cookieA)).status,
          404,
        );
      },
    );
    await t.test(
      "logout revokes one device session and preserves account data and other devices",
      async () => {
        assert.equal(
          (await req("/api/auth/logout", "POST", {}, cookieA)).status,
          204,
        );
        assert.equal(
          (await req("/api/save", "GET", undefined, cookieA)).status,
          401,
        );
        assert.equal(
          (await req("/api/save", "GET", undefined, cookieB)).status,
          200,
        );
      },
    );
    await t.test(
      "expired sessions cannot access their stored farm",
      async () => {
        await pool.query(
          "UPDATE player_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",
          [createHash("sha256").update(cookieB.split("=")[1]).digest()],
        );
        assert.equal(
          (await req("/api/save", "GET", undefined, cookieB)).status,
          401,
        );
        assert.equal(
          (
            await pool.query(
              "SELECT revision FROM farm_saves WHERE player_id=$1",
              [playerA],
            )
          ).rows[0].revision,
          revision,
        );
      },
    );
    await t.test(
      "a new application instance restores saves from PostgreSQL rather than process memory",
      async () => {
        const second = await new Promise<Server>((resolve) => {
          const s = createApp(pool, {
            secureCookies: true,
            authLimit: 1000,
          }).listen(0, "127.0.0.1", () => resolve(s));
        });
        try {
          const target = `http://127.0.0.1:${(second.address() as { port: number }).port}`;
          const response = await fetch(target + "/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-FarmScript-Request": "1",
            },
            body: JSON.stringify({ username: names[0], password }),
          });
          assert.equal(response.status, 200);
          assert.match(response.headers.getSetCookie()[0], /Secure/);
          const data = await response.json();
          assert.equal(data.save.revision, revision);
          assert.equal(data.player.id, playerA);
        } finally {
          await new Promise<void>((resolve) => second.close(() => resolve()));
        }
      },
    );
  } finally {
    await pool.query("DELETE FROM players WHERE username_key=ANY($1)", [names]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  }
});
