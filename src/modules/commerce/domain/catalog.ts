import bootstrap from "../../../shared/domain/bootstrap.json";
import type { Item } from "../../../shared/domain/resources";
export const salePrices: Record<Item, number> = Object.fromEntries(
  bootstrap.resources.map((r) => [r.id, r.salePrice]),
) as Record<Item, number>;
export const tradeOrders = structuredClone(
  bootstrap.definitions.tradeOrders,
) as {
  id: string;
  name: string;
  item: Item;
  quantity: number;
  payment: number;
  unlock: string | null;
}[];
