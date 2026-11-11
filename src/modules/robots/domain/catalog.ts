import bootstrap from "../../../shared/domain/bootstrap.json";
export type Model = "Farmer" | "Transporter" | "Drone";
export const models = structuredClone(bootstrap.definitions.models);
