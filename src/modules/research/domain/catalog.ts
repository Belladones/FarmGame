import bootstrap from "../../../shared/domain/bootstrap.json";
import { formatCost, type Inventory } from "../../../shared/domain/resources";
export interface Research {
  goldCost?: number;
  localOnly?: boolean;
  id: string;
  name: string;
  cost: number;
  materials: Inventory;
  prerequisites: string[];
  category: "Agriculture" | "Programmation" | "Technologie";
  detail: string;
}
export const research = structuredClone(bootstrap.research) as Research[];
export const formatResearchCost = (r: Research) =>
  [
    Object.keys(r.materials).length ? formatCost(r.materials) : "",
    r.goldCost ? `${r.goldCost.toLocaleString("fr-FR")} or` : "",
  ]
    .filter(Boolean)
    .join(" + ") || "Gratuit";
