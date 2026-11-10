import type { Farm } from "../../farm/domain/model";
export interface Player {
  id: string;
  username: string;
}
export interface Saved {
  farm: Farm;
  revision: number;
  updatedAt: string;
  writeId?: string | null;
}
export interface SessionResponse {
  player: Player;
  expiresAt: string;
  save: Saved | null;
}
export interface SyncStatus {
  mode:
    | "loading"
    | "guest"
    | "saved"
    | "saving"
    | "offline"
    | "conflict"
    | "expired";
  player: Player | null;
  dirty: boolean;
  lastSavedAt: string | null;
  message: string;
}
export interface FarmSlot {
  id: string;
  name: string;
  createdAt: string;
}
export interface LocalSlot extends FarmSlot {
  farm: Farm;
}
