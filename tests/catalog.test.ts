import { createDeclarations } from "../src/modules/programming/domain/api";
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultCatalog, validateCatalog } from "../src/shared/domain/gameCatalog";
import {
  getCatalog,
  installCatalog,
} from "../src/modules/catalog/application/catalogRegistry";
import { research } from "../src/modules/research/domain/catalog";
import {
  researchGroupFor,
  groupProgress,
} from "../src/modules/research/domain/researchGroups";
import { missionsFor } from "../src/modules/missions/domain/missions";
import { fresh } from "../src/modules/farm/domain/factories";
import { depotCapacity } from "../src/modules/construction/domain/capacities";
import { capacity } from "../src/modules/robots/domain/statistics";
import { itemNames } from "../src/shared/domain/resources";
import { cropData } from "../src/modules/farm/domain/crops";
import { loadGameCatalog } from "../src/modules/catalog/adapters/browser/loadGameCatalog";

test("database release updates domain references, mission predicates, research indexes and robot/crop parameters", () => {
  const c = structuredClone(defaultCatalog);
  c.version = 37;
  c.resources.find((r) => r.id === "Hay")!.name = "Foin personnalisé";
  c.resources.push({ id: "Pear", name: "Poire", salePrice: 8 });
  c.research.find((r) => r.id === "loops")!.materials.Hay = 7;
  c.research.find((r) => r.id === "loops")!.prerequisites = ["till"];
  c.groups.find((g) => g.id === "extension")!.title = "Extension personnalisée";
  c.campaigns.modern[0].target = 3;
  c.campaigns.modern[0].condition = {
    type: "cap",
    max: 3,
    rule: { type: "counter", path: "harvestedItems.Hay" },
  };
  c.definitions.models.Farmer.capacity = 30;
  c.definitions.storageCapacities[0] = 250;
  c.definitions.crops.Grass.seconds = 0.75;
  try {
    installCatalog(c);
    const state = fresh();
    state.harvestedItems.Hay = 5;
    assert.equal(itemNames.Hay, "Foin personnalisé");
    assert.match(createDeclarations(), /"Pear"="Pear"/);
    assert.equal(research.find((r) => r.id === "loops")!.materials.Hay, 7);
    assert.deepEqual(research.find((r) => r.id === "loops")!.prerequisites, [
      "till",
    ]);
    assert.equal(
      researchGroupFor("extension")!.title,
      "Extension personnalisée",
    );
    const group = researchGroupFor("extension")!;
    assert.equal(groupProgress(group, ["extension"]).next?.id, group.steps[1]);
    assert.equal(missionsFor(state)[0].progress(state), 3);
    assert.equal(capacity(state), 30);
    assert.equal(depotCapacity(state), 250);
    assert.equal(cropData.Grass.seconds, 0.75);
    assert.equal(getCatalog().version, 37);
  } finally {
    installCatalog(defaultCatalog);
  }
});

test("invalid catalogue edits are rejected atomically without changing the current release", () => {
  const cases = [
    (c: typeof defaultCatalog) => {
      c.research.find((r) => r.id === "loops")!.prerequisites = [
        "does-not-exist",
      ];
    },
    (c: typeof defaultCatalog) => {
      c.research.find((r) => r.id === "loops")!.prerequisites = ["speed"];
    },
    (c: typeof defaultCatalog) => {
      c.research.find((r) => r.id === "loops")!.materials.Hay = -1;
    },
    (c: typeof defaultCatalog) => {
      c.resources[0].salePrice = Infinity;
    },
    (c: typeof defaultCatalog) => {
      (c.campaigns.modern[0] as any).condition = {
        type: "javascript",
        source: 'fetch("external")',
      };
    },
  ];
  for (const edit of cases) {
    const c = structuredClone(defaultCatalog);
    edit(c);
    assert.throws(() => installCatalog(c));
    assert.equal(getCatalog().version, defaultCatalog.version);
  }
});

test("browser loads server definitions, caches validated releases and keeps them during an outage or invalid response", async () => {
  const originalFetch = globalThis.fetch,
    descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage"),
    memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const c = structuredClone(defaultCatalog);
  c.version = 8;
  c.resources[0].name = "Foin du serveur";
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify(c), { status: 200 });
    assert.equal(await loadGameCatalog(), true);
    assert.equal(itemNames.Hay, "Foin du serveur");
    assert.ok(memory.get("farmscript-catalog-v1"));
    globalThis.fetch = async () => {
      throw Error("offline");
    };
    assert.equal(await loadGameCatalog(), false);
    assert.equal(getCatalog().version, 8);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ version: 999 }), { status: 200 });
    assert.equal(await loadGameCatalog(), false);
    assert.equal(getCatalog().version, 8);
    memory.clear();
    assert.equal(await loadGameCatalog(), false);
    assert.equal(getCatalog().version, defaultCatalog.version);
    validateCatalog(getCatalog());
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
    installCatalog(defaultCatalog);
  }
});
