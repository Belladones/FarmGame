import React from "react";
import { createRoot } from "react-dom/client";
import "../style.css";
import "../command-theme.css";
import { loadGameCatalog } from "../modules/catalog/adapters/browser/loadGameCatalog";

const root = createRoot(document.getElementById("root")!);
root.render(
  <p className="session-loading" role="status">
    Chargement de votre ferme…
  </p>,
);
async function start() {
  const online = await loadGameCatalog();
  const { App } = await import("./App");
  root.render(
    <>
      <App />
      {!online && (
        <aside
          role="status"
          style={{
            position: "fixed",
            bottom: 8,
            right: 8,
            zIndex: 1000,
            background: "#152330",
            color: "#ffe1aa",
            padding: "8px 12px",
            fontSize: 12,
          }}
        >
          Mode hors ligne · règles enregistrées localement
        </aside>
      )}
    </>,
  );
}
void start();
