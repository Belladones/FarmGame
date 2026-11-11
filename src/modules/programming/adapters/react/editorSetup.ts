import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { createDeclarations } from "../../domain/api";
(self as any).MonacoEnvironment = {
  getWorker: (_: unknown, label: string) =>
    label === "typescript" || label === "javascript"
      ? new TsWorker()
      : new EditorWorker(),
};
loader.config({ monaco });
monaco.editor.defineTheme("farmscript-command", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "8297A6" },
    { token: "keyword", foreground: "FF9A55" },
    { token: "number", foreground: "E8BF7E" },
    { token: "string", foreground: "9BC9C3" },
  ],
  colors: {
    "editor.background": "#0D151E",
    "editor.foreground": "#E7EEF4",
    "editorLineNumber.foreground": "#667E90",
    "editorLineNumber.activeForeground": "#FF9A55",
    "editorCursor.foreground": "#FF8B3D",
    "editor.selectionBackground": "#385166",
    "editor.lineHighlightBackground": "#172330",
    "editorIndentGuide.background1": "#253744",
  },
});
monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
  strict: true,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  allowImportingTsExtensions: true,
  // Separate scripts may reuse variable names without sharing a TypeScript scope.
  moduleDetection: 3,
  noEmit: true,
});
monaco.languages.typescript.typescriptDefaults.addExtraLib(
  createDeclarations(),
  "file:///farm-api.d.ts",
);
