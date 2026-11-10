export type Model = "Farmer" | "Transporter" | "Drone";
export const models = {
  Farmer: {
    name: "Fermier",
    price: 500,
    speed: 1,
    capacity: 20,
    research: "fleet",
    medium: "ground",
    description:
      "Robot terrestre sur roues. Plante, récolte, laboure, transporte, arrose et utilise des consommables selon vos recherches.",
  },
  Transporter: {
    name: "Transporteur",
    price: 500,
    speed: 0.75,
    capacity: 100,
    research: "transporter",
    medium: "ground",
    description:
      "Robot terrestre à grande soute. Charge, transporte et dépose. Ne plante pas, ne récolte pas et ne laboure pas.",
  },
  Drone: {
    name: "Drone",
    price: 1000,
    speed: 2,
    capacity: 10,
    research: "drone",
    medium: "air",
    description:
      "Unité aérienne. Transport léger, arrosage et engrais. Ne plante pas, ne laboure pas et ne récolte pas. Peut survoler les robots terrestres.",
  },
} as const;
