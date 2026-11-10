import {
  robotEquipment,
  buildingUpgrades,
  upgradeLevel,
  upgradeCost,
} from "../../domain/assetProgression";
import {
  assetUpgradeBlocker,
  capacity,
  depotCapacity,
  robotSpeed,
  tankCapacity,
  type Farm,
} from "../../../farm/application/engine";
import { formatCost } from "../../../../shared/domain/resources";
import { models } from "../../../robots/domain/catalog";
import { buildings } from "../../../construction/domain/catalog";
export function AssetUpgradesPanel({
  farm,
  kind,
  id,
  onUpgrade,
  workshopId,
}: {
  farm: Farm;
  kind: "robot" | "building";
  id: string;
  onUpgrade: (upgrade: string) => void;
  workshopId?: string;
}) {
  const robot =
    kind === "robot" ? farm.robots.find((r) => r.id === id) : undefined;
  const building =
    kind === "building" ? farm.buildings.find((b) => b.id === id) : undefined;
  if (!robot && !building) return <p>Sélectionnez un équipement possédé.</p>;
  const specs = robot
    ? robotEquipment.filter((e) => e.models?.includes(robot.model))
    : buildingUpgrades.filter((e) => e.kinds?.includes(building!.kind));
  return (
    <section
      className="asset-upgrades"
      aria-label={robot ? `Équipement ${id}` : `Améliorations ${id}`}
    >
      <h3>
        {robot
          ? `Équipement de ${id} · ${models[robot.model].name}`
          : `${buildings[building!.kind].name} · ${id}`}
      </h3>
      <p>
        {robot
          ? "Ces installations améliorent uniquement ce robot. Un atelier construit est nécessaire. Arrêtez le robot avant de l’équiper."
          : "Ces améliorations concernent uniquement ce bâtiment, y compris après son rangement ou déplacement."}
      </p>
      <p className="asset-current-stats">
        {robot
          ? `Soute : ${capacity(farm, robot)} · Déplacement : ${robotSpeed(farm, robot).toFixed(2)} case/s${robot.model !== "Transporter" ? ` · Réservoir : ${tankCapacity(farm, robot)} eau` : ""}`
          : building?.kind === "Depot"
            ? `Capacité de ce dépôt : ${depotCapacity(farm, building).toLocaleString("fr-FR")} unités`
            : ""}
      </p>
      <div className="asset-upgrade-grid">
        {specs.map((spec) => {
          const current = upgradeLevel(
              robot?.equipment ?? building?.upgrades,
              spec,
            ),
            max = current >= spec.max;
          const cost = upgradeCost(spec, current),
            blocker = assetUpgradeBlocker(farm, kind, id, spec.id, workshopId);
          const price = [
            Object.keys(cost.materials).length
              ? formatCost(cost.materials)
              : "",
            cost.gold ? `${cost.gold.toLocaleString("fr-FR")} or` : "",
          ]
            .filter(Boolean)
            .join(" + ");
          return (
            <article key={spec.id} data-upgrade={spec.id}>
              <h4>
                {spec.name}{" "}
                <span>
                  {current} / {spec.max}
                </span>
              </h4>
              <progress
                aria-label={`${spec.name} niveau`}
                value={current}
                max={spec.max}
              />
              <p>{spec.detail}</p>
              {!max && <strong>Prochain niveau : {price}</strong>}
              <button
                disabled={!!blocker}
                title={blocker ?? ""}
                onClick={() => onUpgrade(spec.id)}
              >
                {max ? "Niveau maximum atteint" : `Améliorer · ${price}`}
              </button>
              {blocker && !max && <small>{blocker}</small>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
