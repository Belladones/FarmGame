import type { Farm, Robot, Building } from "../engine";
import { research, sum, type Item } from "../catalog";
import {
  robotEquipment,
  buildingUpgrades,
  upgradeCost,
  upgradeLevel,
} from "../assetProgression";
interface UpgradeServices {
  syncBefore: (farm: Farm) => void;
  sync: (farm: Farm) => void;
  getStock: (farm: Farm, item: Item) => number;
  stockCapacity: (farm: Farm) => number;
  removeStock: (farm: Farm, item: Item, amount: number) => unknown;
}
/** Business rules and purchase transaction, independent of React and scene rendering. */
export function createAssetUpgradeService({
  syncBefore,
  sync,
  getStock,
  stockCapacity,
  removeStock,
}: UpgradeServices) {
  function assetUpgradeSpec(
    s: Farm,
    kind: "robot" | "building",
    id: string,
    upgrade: string,
  ) {
    const asset =
      kind === "robot"
        ? s.robots.find((r) => r.id === id)
        : s.buildings.find((b) => b.id === id);
    if (!asset) return undefined;
    const spec =
      kind === "robot"
        ? robotEquipment.find(
            (e) =>
              e.id === upgrade && e.models?.includes((asset as Robot).model),
          )
        : buildingUpgrades.find(
            (e) =>
              e.id === upgrade && e.kinds?.includes((asset as Building).kind),
          );
    if (!spec) return undefined;
    return {
      asset,
      spec,
      current: upgradeLevel(
        kind === "robot"
          ? (asset as Robot).equipment
          : (asset as Building).upgrades,
        spec,
      ),
    };
  }
  function assetUpgradeBlocker(
    s: Farm,
    kind: "robot" | "building",
    id: string,
    upgrade: string,
    workshopId?: string,
  ): string | null {
    const item = assetUpgradeSpec(s, kind, id, upgrade);
    if (!item) return "Équipement incompatible ou objet indisponible.";
    const { asset, spec, current } = item;
    if (current >= spec.max) return "Niveau maximum atteint.";
    if (kind === "robot") {
      const r = asset as Robot;
      if (r.destroyed || r.loan)
        return "Équipez un robot permanent en état de marche.";
      if (r.moving || r.readyAt > s.time)
        return "Arrêtez le robot et attendez la fin de son action.";
      const workshops = s.buildings.filter(
        (b) => b.kind === "Workshop" && (!workshopId || b.id === workshopId),
      );
      if (!workshops.length)
        return "Construisez un atelier pour installer cet équipement.";
      const max = Math.max(
        ...workshops.map((b) => Math.min(5, 2 * (b.upgrades?.workshop ?? 1))),
      );
      if (current + 1 > max)
        return "Améliorez votre atelier pour installer ce niveau d’équipement.";
    }
    if (spec.research && !s.unlocks.includes(spec.research))
      return (
        "Recherchez d’abord : " +
        (research.find((r) => r.id === spec.research)?.name ?? spec.research)
      );
    const cost = upgradeCost(spec, current);
    if (s.gold < cost.gold) return "Or insuffisant.";
    if (sum(cost.materials) > stockCapacity(s))
      return "Capacité de stockage insuffisante : améliorez ou ajoutez des dépôts.";
    if (
      Object.entries(cost.materials).some(
        ([id, n]) => getStock(s, id as Item) < n!,
      )
    )
      return "Ressources déposées insuffisantes.";
    return null;
  }
  function upgradeAsset(
    s: Farm,
    kind: "robot" | "building",
    id: string,
    upgrade: string,
    workshopId?: string,
  ): boolean {
    syncBefore(s);
    if (assetUpgradeBlocker(s, kind, id, upgrade, workshopId)) return false;
    const { asset, spec, current } = assetUpgradeSpec(s, kind, id, upgrade)!;
    const cost = upgradeCost(spec, current);
    for (const [id, n] of Object.entries(cost.materials))
      removeStock(s, id as Item, n!);
    s.gold -= cost.gold;
    if (kind === "robot") {
      const r = asset as Robot;
      r.equipment = { ...r.equipment, [upgrade]: current + 1 };
    } else {
      const b = asset as Building;
      b.upgrades = { ...b.upgrades, [upgrade]: current + 1 };
    }
    sync(s);
    return true;
  }

  return { assetUpgradeSpec, assetUpgradeBlocker, upgradeAsset };
}
