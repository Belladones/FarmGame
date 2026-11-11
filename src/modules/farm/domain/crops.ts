import bootstrap from "../../../shared/domain/bootstrap.json";
import type { Inventory, Item } from "../../../shared/domain/resources";
export const cropData = structuredClone(bootstrap.definitions.crops) as {
  [K in keyof typeof bootstrap.definitions.crops]: {
    resource: Item;
    seconds: number;
    soil: string;
    cost: Inventory;
    unlock: string | null;
    yields: number[];
  };
};
