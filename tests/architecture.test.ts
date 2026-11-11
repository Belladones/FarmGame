import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = dirname(fileURLToPath(import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

test("hexagonal boundaries: domain, ports and application never depend on UI or infrastructure", () => {
  const files = [
    ...walk(join(root, "modules")),
    ...walk(join(root, "shared")),
  ].filter((file) => /\.(ts|tsx)$/.test(file));
  const errors: string[] = [];
  for (const file of files) {
    const layer = file.match(/\/(domain|application|ports)\//)?.[1];
    if (!layer) continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node) => {
      let specifier: string | undefined;
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        specifier = node.moduleSpecifier.text;
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        specifier = node.arguments[0].text;
      if (specifier) {
        const target = resolve(dirname(file), specifier);
        const allowed =
          specifier.startsWith(".") &&
          target.startsWith(root + "/") &&
          (layer === "domain" || layer === "ports"
            ? target.includes("/domain/")
            : !/\/(adapters|app)\//.test(target));
        if (!allowed) errors.push(`${file}: ${layer} → ${specifier}`);
      }
      if (
        ts.isIdentifier(node) &&
        [
          "window",
          "document",
          "localStorage",
          "sessionStorage",
          "fetch",
          "XMLHttpRequest",
        ].includes(node.text)
      )
        errors.push(`${file}: browser global ${node.text}`);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.deepEqual(errors, []);
});
