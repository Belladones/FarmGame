import type { Farm } from "../../farm/domain/model";
import type {
  Saved,
  SessionResponse,
  FarmSlot,
  LocalSlot,
} from "../domain/model";
export class SaveFailure extends Error {
  constructor(
    message: string,
    public reason: "conflict" | "expired" | "offline",
  ) {
    super(message);
  }
}

/** Business operations, independent of URLs, HTTP methods and JSON transport. */
export interface SaveGateway {
  session(): Promise<SessionResponse | undefined>;
  authenticate(
    kind: "login" | "register",
    username: string,
    password: string,
  ): Promise<SessionResponse>;
  readSave(): Promise<Saved | null>;
  save(
    write: { farm: Farm; revision: number; writeId: string },
    keepalive: boolean,
  ): Promise<{ revision: number; updatedAt: string }>;
  listSlots(): Promise<FarmSlot[]>;
  saveSlot(slot: LocalSlot): Promise<void>;
  deleteSlot(id: string): Promise<void>;
  readSlot(id: string): Promise<Farm>;
  logout(): Promise<void>;
}
export interface SavePorts {
  storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
  gateway: SaveGateway;
  writeIdentifier(): string;
  now(): Date;
}
