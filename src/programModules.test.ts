import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import {
  bundlePrograms,
  programDependencies,
  resolveProgramFile,
} from "./modules/programming/adapters/typescript/programModules";
import { research } from "./modules/research/domain/catalog";

test("Programming research has an attainable ordered progression", () => {
  const get = (id: string) => research.find((r) => r.id === id)!;
  assert.ok(get("for").prerequisites.includes("loops"));
  assert.ok(get("for").prerequisites.includes("conditions"));
  assert.ok(get("lists").prerequisites.includes("for"));
  assert.ok(get("dictionaries").prerequisites.includes("lists"));
  assert.ok(get("imports").prerequisites.includes("functions"));
  assert.ok(get("imports").prerequisites.includes("dictionaries"));
  for (const id of ["for", "lists", "dictionaries", "imports"])
    assert.equal(get(id).category, "Programmation");
});
test("local function imports support aliases, isolated scopes and one initialization per file", () => {
  const files = {
    f1: 'import { value as first } from "./f2"; import { other } from "./f3.ts"; const shared = 7; result.push(first(), other(), shared);',
    f2: 'const shared = 3; result.push("init"); export function value() { return shared; }',
    f3: 'import { value } from "./f2"; export function other() { return value() + 1; }',
  };
  const bundle = bundlePrograms("f1", files, true, () => {});
  const js = ts.transpileModule(bundle.code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const result: unknown[] = [];
  new Function("result", js)(result);
  assert.deepEqual(result, ["init", 3, 4, 7]);
  assert.ok(bundle.names.includes("first"));
});
test("imports report locked research, missing functions/files, invalid paths and cycles", () => {
  assert.throws(
    () =>
      bundlePrograms(
        "f1",
        { f1: 'import { a } from "./f2";', f2: "export function a() {}" },
        false,
        () => {},
      ),
    /Recherchez Imports/,
  );
  assert.throws(
    () => programDependencies("f1", { f1: 'import { a } from "./f2";' }),
    /introuvable/,
  );
  assert.throws(
    () =>
      programDependencies("f1", {
        f1: 'import { a } from "./f2";',
        f2: "function a() {}",
      }),
    /n’exporte pas/,
  );
  assert.throws(
    () =>
      programDependencies("f1", {
        f1: 'import { a } from "./f2";',
        f2: 'import { b } from "./f1"; export function a() {}',
      }),
    /circulaire/,
  );
  for (const name of ["https://example.com", "../f2", "lodash"])
    assert.throws(() => resolveProgramFile("f1", name), /Import local/);
  assert.throws(
    () => programDependencies("f1", { f1: 'import("./f2");' }),
    /dynamiques/,
  );
});
