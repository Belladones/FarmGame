import ts from "typescript";
export function validateProgramProgression(
  source: ts.SourceFile,
  unlocks: { loops: boolean; conditions: boolean },
) {
  const visit = (node: ts.Node) => {
    if (
      !unlocks.loops &&
      (ts.isWhileStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isDoStatement(node))
    )
      throw new Error(
        "Recherchez « Boucle while » pour 5 foins avant d’utiliser une boucle.",
      );
    if (!unlocks.conditions && ts.isIfStatement(node))
      throw new Error("Débloquez Conditions avant d’utiliser if / else.");
    ts.forEachChild(node, visit);
  };
  visit(source);
}
