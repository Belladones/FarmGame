import { SaveService } from "../../application/SaveService";
import { saveGateway } from "./saveGateway";
import { writeIdentifier } from "./writeIdentifier";
/** Browser composition: application use cases receive their concrete side-effect adapters. */
export class CloudSave extends SaveService {
  constructor(options: ConstructorParameters<typeof SaveService>[0]) {
    super(options, {
      storage: {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        removeItem: (key) => localStorage.removeItem(key),
      },
      gateway: saveGateway,
      writeIdentifier,
      now: () => new Date(),
    });
  }
}
export { downloadFarm } from "./downloadFarm";
export { hasLocalProgress } from "../../application/hasLocalProgress";
export type { FarmSlot, Player, SyncStatus } from "../../domain/model";
