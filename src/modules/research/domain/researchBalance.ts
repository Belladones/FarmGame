import bootstrap from "../../../shared/domain/bootstrap.json";
/** Initial values only. PostgreSQL supplies the live catalogue at startup. */
export const storageCapacities = structuredClone(
  bootstrap.definitions.storageCapacities,
);
