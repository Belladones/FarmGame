import type { Farm } from "../../../farm/domain/model";
export function downloadFarm(farm: Farm) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ version: 1, farm }, null, 2)], {
      type: "application/json",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "farmscript-sauvegarde.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
