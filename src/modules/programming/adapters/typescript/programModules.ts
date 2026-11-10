import ts from "typescript";

/** Local robot files only: no network or package resolution. */
export function resolveProgramFile(_from: string, specifier: string): string {
  if (!/^\.\/[a-zA-Z0-9_-]+(?:\.ts)?$/.test(specifier))
    throw new Error('Import local attendu : import { fonction } from "./f2".');
  return specifier.slice(2).replace(/\.ts$/, "");
}
export function inspectProgramModule(code: string, id: string) {
  const source = ts.createSourceFile(
    `${id}.ts`,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const imports: { file: string; local: string; exported: string }[] = [];
  const exports: string[] = [];
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const bindings = statement.importClause?.namedBindings;
      if (
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !bindings ||
        !ts.isNamedImports(bindings) ||
        statement.importClause?.name ||
        statement.importClause?.isTypeOnly ||
        bindings.elements.some((e) => e.isTypeOnly)
      )
        throw new Error(
          'Utilisez un import nommé : import { fonction } from "./f2".',
        );
      const file = resolveProgramFile(id, statement.moduleSpecifier.text);
      for (const entry of bindings.elements)
        imports.push({
          file,
          local: entry.name.text,
          exported: (entry.propertyName ?? entry.name).text,
        });
    }
    const modifiers = ts.canHaveModifiers(statement)
      ? ts.getModifiers(statement)
      : undefined;
    if (modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (
        !ts.isFunctionDeclaration(statement) ||
        !statement.name ||
        modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
      )
        throw new Error(
          "Seules les fonctions nommées peuvent être exportées : export function recolter() { ... }",
        );
      exports.push(statement.name.text);
    }
    if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement))
      throw new Error("Utilisez export function pour partager une fonction.");
  }
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      throw new Error(
        "Les imports dynamiques ne sont pas disponibles. Utilisez un import nommé en haut du fichier.",
      );
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { source, imports, exports };
}
export function programDependencies(
  entry: string,
  files: Record<string, string>,
) {
  const done = new Set<string>(),
    visiting = new Set<string>(),
    order: string[] = [];
  const visit = (id: string) => {
    if (visiting.has(id))
      throw new Error(`Import circulaire : ${[...visiting, id].join(" → ")}`);
    if (done.has(id)) return;
    if (!Object.hasOwn(files, id))
      throw new Error(
        `Fichier introuvable : ${id}.ts. Choisissez un fichier de robot existant.`,
      );
    visiting.add(id);
    const module = inspectProgramModule(files[id], id);
    for (const dependency of module.imports) {
      visit(dependency.file);
      if (
        !inspectProgramModule(
          files[dependency.file],
          dependency.file,
        ).exports.includes(dependency.exported)
      )
        throw new Error(
          `${dependency.file}.ts n’exporte pas la fonction « ${dependency.exported} ».`,
        );
    }
    visiting.delete(id);
    done.add(id);
    order.push(id);
  };
  visit(entry);
  return order;
}

/** Bundle in dependency order; each file has its own scope and executes once. */
export function bundlePrograms(
  entry: string,
  files: Record<string, string>,
  importsUnlocked: boolean,
  validate: (source: ts.SourceFile) => void,
) {
  const order = programDependencies(entry, files);
  const modules = order.map((id) => inspectProgramModule(files[id], id));
  if (!importsUnlocked && modules.some((m) => m.imports.length))
    throw new Error(
      "Recherchez Imports de fonctions avant d’importer un autre fichier.",
    );
  modules.forEach((m) => validate(m.source));
  let prefix = "__farmModule";
  while (Object.values(files).some((code) => code.includes(prefix)))
    prefix += "_";
  const names = modules.flatMap((m) => m.imports.map((i) => i.local));
  const printer = ts.createPrinter();
  const code =
    modules
      .map((module, index) => {
        const body = module.source.statements
          .filter((s) => !ts.isImportDeclaration(s))
          .map((s) => {
            if (ts.isFunctionDeclaration(s))
              s = ts.factory.updateFunctionDeclaration(
                s,
                s.modifiers?.filter(
                  (m) => m.kind !== ts.SyntaxKind.ExportKeyword,
                ),
                s.asteriskToken,
                s.name,
                s.typeParameters,
                s.parameters,
                s.type,
                s.body,
              );
            return printer.printNode(ts.EmitHint.Unspecified, s, module.source);
          })
          .join("\n");
        const bindings = module.imports
          .map(
            (i) =>
              `const { ${i.exported}: ${i.local} } = ${prefix}${order.indexOf(i.file)}();`,
          )
          .join("\n");
        return `let ${prefix}Cache${index};\nfunction ${prefix}${index}() { return ${prefix}Cache${index} ??= ${prefix}Body${index}(); }\nfunction ${prefix}Body${index}() {\n${bindings}\n${body}\nreturn { ${module.exports.join(", ")} };\n}`;
      })
      .join("\n") + `\n${prefix}${order.indexOf(entry)}();`;
  return { code, names };
}
