import ts from "typescript";
import { apiNames } from "./api";
import { cropData, items } from "./catalog";
const api = apiNames;
let serial = 0;
const pending = new Map<number, (v: any) => void>();
self.onmessage = async ({ data }) => {
  if (data.type === "result") {
    pending.get(data.id)?.(data);
    pending.delete(data.id);
    return;
  }
  if (data.type !== "run") return;
  const rpc = (name: string, args: unknown[]) =>
    new Promise((resolve, reject) => {
      const id = serial++;
      pending.set(id, (r) =>
        r.error ? reject(new Error(r.error)) : resolve(r.value),
      );
      self.postMessage({ type: "call", id, name, args });
    });
  try {
    const source = ts.createSourceFile(
      "player.ts",
      data.code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const functions = new Set<string>();
    const collect = (n: ts.Node) => {
      if (ts.isIfStatement(n) && !data.conditions)
        throw new Error("Débloquez Conditions avant d’utiliser if / else.");
      if (ts.isFunctionDeclaration(n) && n.name) functions.add(n.name.text);
      ts.forEachChild(n, collect);
    };
    collect(source);
    const transformer: ts.TransformerFactory<ts.SourceFile> =
      (context) => (root) => {
        const f = context.factory;
        const visit: ts.Visitor = (node) => {
          if (ts.isFunctionDeclaration(node)) {
            if (node.asteriskToken)
              throw new Error(
                "Les générateurs ne sont pas pris en charge dans ce prototype.",
              );
            const changed = ts.visitEachChild(node, visit, context);
            return f.updateFunctionDeclaration(
              changed,
              [
                ...(changed.modifiers ?? []).filter(
                  (m) => m.kind !== ts.SyntaxKind.AsyncKeyword,
                ),
                f.createModifier(ts.SyntaxKind.AsyncKeyword),
              ],
              changed.asteriskToken,
              changed.name,
              changed.typeParameters,
              changed.parameters,
              undefined,
              changed.body,
            );
          }
          if (ts.isArrowFunction(node) || ts.isFunctionExpression(node))
            throw new Error(
              "Utilisez une déclaration function dans ce prototype.",
            );
          if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            (api.includes(node.expression.text) ||
              functions.has(node.expression.text))
          )
            return f.createAwaitExpression(
              ts.visitEachChild(node, visit, context),
            );
          if (
            ts.isWhileStatement(node) ||
            ts.isForStatement(node) ||
            ts.isForOfStatement(node) ||
            ts.isDoStatement(node) ||
            ts.isForInStatement(node)
          ) {
            const changed = ts.visitEachChild(
              node,
              visit,
              context,
            ) as typeof node;
            const body = changed.statement;
            const block = f.createBlock(
              [
                f.createExpressionStatement(
                  f.createAwaitExpression(
                    f.createCallExpression(
                      f.createIdentifier("__step"),
                      undefined,
                      [],
                    ),
                  ),
                ),
                ...(ts.isBlock(body) ? body.statements : [body]),
              ],
              true,
            );
            if (ts.isWhileStatement(changed))
              return f.updateWhileStatement(changed, changed.expression, block);
            if (ts.isForStatement(changed))
              return f.updateForStatement(
                changed,
                changed.initializer,
                changed.condition,
                changed.incrementor,
                block,
              );
            if (ts.isForOfStatement(changed))
              return f.updateForOfStatement(
                changed,
                changed.awaitModifier,
                changed.initializer,
                changed.expression,
                block,
              );
            if (ts.isForInStatement(changed))
              return f.updateForInStatement(
                changed,
                changed.initializer,
                changed.expression,
                block,
              );
            return f.updateDoStatement(changed, block, changed.expression);
          }
          return ts.visitEachChild(node, visit, context);
        };
        return ts.visitNode(root, visit) as ts.SourceFile;
      };
    const out = ts.transpileModule(data.code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.None,
      },
      transformers: { before: [transformer] },
      reportDiagnostics: true,
    });
    const errors = out.diagnostics?.filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    );
    if (errors?.length)
      throw new Error(
        ts.flattenDiagnosticMessageText(errors[0].messageText, "\n"),
      );
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;
    await new AsyncFunction(
      ...api,
      "__step",
      "Entities",
      "Resources",
      "Direction",
      "Items",
      "Grounds",
      out.outputText,
    )(
      ...api.map(
        (name) =>
          (...args: unknown[]) =>
            rpc(name, args),
      ),
      () => rpc("__step", []),
      Object.fromEntries(Object.keys(cropData).map((k) => [k, k])),
      Object.fromEntries(
        items.filter((i) => i !== "Fertilizer").map((k) => [k, k]),
      ),
      { North: "North", South: "South", East: "East", West: "West" },
      { Fertilizer: "Fertilizer" },
      { Grassland: "Grassland", Soil: "Soil" },
    );
    self.postMessage({ type: "done" });
  } catch (e) {
    self.postMessage({
      type: "error",
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
