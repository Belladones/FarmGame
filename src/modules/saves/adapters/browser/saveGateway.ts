import type { SaveGateway } from "../../ports/SavePorts";
import { request } from "./http";

/** Only this adapter knows the remote API protocol. */
export const saveGateway: SaveGateway = {
  session: () => request("/session"),
  authenticate: (kind, username, password) =>
    request("/auth/" + kind, "POST", { username, password }),
  readSave: async () =>
    (
      await request<{ save: Awaited<ReturnType<SaveGateway["readSave"]>> }>(
        "/save",
      )
    ).save,
  save: (write, keepalive) =>
    request("/save", "PUT", { schemaVersion: 1, ...write }, keepalive),
  listSlots: async () =>
    (
      await request<{ slots: Awaited<ReturnType<SaveGateway["listSlots"]>> }>(
        "/slots",
      )
    ).slots,
  saveSlot: (slot) => request("/slots", "POST", slot),
  deleteSlot: (id) => request("/slots/" + encodeURIComponent(id), "DELETE"),
  readSlot: async (id) =>
    (
      await request<{ farm: Awaited<ReturnType<SaveGateway["readSlot"]>> }>(
        "/slots/" + encodeURIComponent(id),
      )
    ).farm,
  logout: () => request("/auth/logout", "POST", {}),
};
