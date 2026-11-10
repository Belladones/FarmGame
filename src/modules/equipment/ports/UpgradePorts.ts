import type { Farm } from "../../farm/domain/model";
import type { Item } from "../../../shared/domain/resources";
export interface UpgradePorts {
  syncBefore: (farm: Farm) => void;
  sync: (farm: Farm) => void;
  getStock: (farm: Farm, item: Item) => number;
  stockCapacity: (farm: Farm) => number;
  removeStock: (farm: Farm, item: Item, amount: number) => unknown;
}
