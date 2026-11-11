import { test } from "node:test";
import assert from "node:assert/strict";
import { SaveService } from "../src/modules/saves/application/SaveService";
import { SaveFailure, type SaveGateway } from "../src/modules/saves/ports/SavePorts";
import { fresh } from "../src/modules/farm/domain/factories";

const unavailable = async (): Promise<never> => {
  throw new SaveFailure("Guest", "expired");
};
const unavailableGateway: SaveGateway = {
  session: unavailable,
  authenticate: unavailable,
  readSave: unavailable,
  save: unavailable,
  listSlots: unavailable,
  saveSlot: unavailable,
  deleteSlot: unavailable,
  readSlot: unavailable,
  logout: unavailable,
};

function fixture(gateway: Partial<SaveGateway>) {
  let farm = fresh(),
    id = 0;
  const storage = new Map<string, string>();
  const service = new SaveService(
    {
      getFarm: () => farm,
      applyFarm: (next) => {
        farm = next;
      },
      onChange: () => {},
    },
    {
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
        removeItem: (key) => {
          storage.delete(key);
        },
      },
      gateway: { ...unavailableGateway, ...gateway },
      writeIdentifier: () => `write-${++id}`,
      now: () => new Date("2026-11-10T12:00:00Z"),
    },
  );
  return { service, storage, farm: () => farm };
}

test("save use cases run with memory ports: guest new game archives and restores its robot program", async () => {
  const f = fixture({});
  await f.service.bootstrap();
  f.farm().robots[0].code = "harvest();";
  await f.service.saveSlot("Première ferme");
  const [slot] = await f.service.listSlots();
  assert.equal(slot.createdAt, "2026-11-10T12:00:00.000Z");
  await f.service.openSlot(null);
  assert.notEqual(f.farm().robots[0].code, "harvest();");
  assert.equal((await f.service.listSlots()).length, 2);
  await f.service.openSlot(slot.id);
  assert.equal(f.farm().robots[0].code, "harvest();");
  f.service.dispose();
});

test("cloud conflict keeps local data and dirty metadata with an injected repository", async () => {
  const calls: string[] = [];
  const f = fixture({
    session: async () => {
      calls.push("session");
      return {
        player: { id: "player", username: "test" },
        save: { farm: fresh(), revision: 4, updatedAt: "2026-11-10T12:00:00Z" },
        expiresAt: "2026-12-10T12:00:00Z",
      };
    },
    save: async () => {
      calls.push("save");
      throw new SaveFailure("Concurrent save", "conflict");
    },
  });
  await f.service.bootstrap();
  f.farm().gold = 123;
  f.service.markDirty();
  await f.service.flush();
  assert.equal(f.service.status.mode, "conflict");
  assert.equal(f.service.status.dirty, true);
  assert.equal(f.farm().gold, 123);
  const meta = JSON.parse(f.storage.get("farmscript-sync-v1")!);
  assert.equal(meta.revision, 4);
  assert.equal(meta.pendingWriteId, "write-1");
  assert.equal(meta.conflict, true);
  assert.deepEqual(calls, ["session", "save"]);
  f.service.dispose();
});
