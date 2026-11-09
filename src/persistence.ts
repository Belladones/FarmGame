import { DEFAULT_PROGRAM, fresh, type Farm } from "./engine";
export interface Player {
  id: string;
  username: string;
}
interface Saved {
  farm: Farm;
  revision: number;
  updatedAt: string;
  writeId?: string | null;
}
interface SessionResponse {
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
interface Meta {
  playerId: string;
  revision: number;
  dirty: boolean;
  conflict?: boolean;
  pendingWriteId?: string;
}
const META = "farmscript-sync-v1",
  BACKUP = "farmscript-backup-v1";
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  keepalive = false,
): Promise<T> {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-FarmScript-Request": "1",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      keepalive,
    });
    if (response.status === 204) return undefined as T;
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(
        "API indisponible. La copie locale est conservée.",
        503,
      );
    }
    if (!response.ok)
      throw new ApiError(
        data.error ?? "Connexion au serveur impossible.",
        response.status,
        data.code,
      );
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      "Serveur inaccessible. La copie locale est conservée.",
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
}
// getRandomValues also works on local HTTP/LAN development origins.
const writeIdentifier = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
export function hasLocalProgress(farm: Farm): boolean {
  const baseline = fresh();
  const hasItems = (inventory: Record<string, number | undefined>) =>
    Object.values(inventory).some((n) => (n ?? 0) > 0);
  return (
    !!farm.previousProgram ||
    farm.planted > 0 ||
    farm.harvested > 0 ||
    farm.gold > 0 ||
    farm.stock > 0 ||
    farm.unlocks.some((id) => !baseline.unlocks.includes(id)) ||
    hasItems(farm.resources) ||
    farm.width !== baseline.width ||
    farm.height !== baseline.height ||
    farm.claimed.length > 0 ||
    farm.robots.length > 1 ||
    farm.buildings.length > 1 ||
    farm.storedBuildings.length > 0 ||
    farm.robots.some(
      (r) =>
        r.code !== DEFAULT_PROGRAM ||
        !r.deployed ||
        r.destroyed ||
        hasItems(r.inventory),
    ) ||
    farm.tiles.some(
      (t) =>
        (t.ground ?? "Grassland") !== "Grassland" ||
        (t.entity !== undefined && t.entity !== "Grass"),
    ) ||
    farm.companion.skin !== baseline.companion.skin ||
    farm.companion.accessory !== baseline.companion.accessory ||
    farm.companion.unlocked.some(
      (id) => !baseline.companion.unlocked.includes(id),
    )
  );
}

export interface FarmSlot {
  id: string;
  name: string;
  createdAt: string;
}
interface LocalSlot extends FarmSlot {
  farm: Farm;
}
const SLOTS = "farmscript-slots-v1";
function localSlots(): LocalSlot[] {
  const value = JSON.parse(localStorage.getItem(SLOTS) || "[]");
  if (!Array.isArray(value))
    throw new Error("La liste des sauvegardes locales est illisible.");
  return value;
}

export class CloudSave {
  status: SyncStatus = {
    mode: "loading",
    player: null,
    dirty: false,
    lastSavedAt: null,
    message: "Recherche de votre session…",
  };
  private revision = 0;
  private changes = 0;
  private epoch = 0;
  private inFlight: Promise<void> | null = null;
  private disposed = false;
  private pendingWriteId: string | undefined;
  private recovering: Promise<void> | null = null;
  constructor(
    private options: {
      getFarm: () => Farm;
      applyFarm: (farm: Farm) => void;
      onChange: (status: SyncStatus) => void;
    },
  ) {}
  private emit(patch: Partial<SyncStatus>) {
    if (this.disposed) return;
    this.status = { ...this.status, ...patch };
    this.options.onChange({ ...this.status });
  }
  private meta(): Meta | null {
    try {
      return JSON.parse(localStorage.getItem(META) || "null");
    } catch {
      return null;
    }
  }
  private storeMeta() {
    if (this.status.player)
      localStorage.setItem(
        META,
        JSON.stringify({
          playerId: this.status.player.id,
          revision: this.revision,
          dirty: this.status.dirty,
          conflict: this.status.mode === "conflict",
          pendingWriteId: this.pendingWriteId,
        } satisfies Meta),
      );
  }
  private backup(farm: Farm) {
    try {
      localStorage.setItem(
        BACKUP,
        JSON.stringify({
          version: 1,
          farm,
          createdAt: new Date().toISOString(),
        }),
      );
    } catch {
      /* The normal local save remains available even if the backup quota is full. */
    }
  }
  private fail(error: unknown) {
    const e = error as ApiError;
    const mode =
      e.status === 409 ? "conflict" : e.status === 401 ? "expired" : "offline";
    this.emit({ mode, message: e.message || "Sauvegarde indisponible." });
    this.storeMeta();
  }
  markDirty() {
    this.changes++;
    if (this.status.player && !this.status.dirty) {
      this.emit({ dirty: true });
      this.storeMeta();
    }
  }
  async bootstrap() {
    try {
      const result = await request<SessionResponse>("/session");
      if (!this.disposed) await this.accept(result, false);
    } catch (error) {
      if ((error as ApiError).status === 401)
        this.emit({
          mode: "guest",
          player: null,
          message:
            "Mode local. Connectez-vous pour sauvegarder sur votre compte.",
        });
      else this.fail(error);
    }
  }
  private async accept(result: SessionResponse, interactive: boolean) {
    const oldMeta = this.meta(),
      remote = result.save;
    this.pendingWriteId = oldMeta?.pendingWriteId;
    this.revision = remote?.revision ?? 0;
    this.emit({
      player: result.player,
      lastSavedAt: remote?.updatedAt ?? null,
    });
    if (remote && oldMeta?.playerId === result.player.id && oldMeta.dirty) {
      if (
        oldMeta.conflict ||
        (oldMeta.revision !== remote.revision &&
          (!oldMeta.pendingWriteId ||
            oldMeta.pendingWriteId !== remote.writeId))
      ) {
        this.emit({
          mode: "conflict",
          dirty: true,
          message:
            "Une autre session a enregistré une version différente. Choisissez laquelle conserver.",
        });
        this.storeMeta();
        return;
      }
      this.pendingWriteId = undefined;
      this.emit({
        mode: "saved",
        dirty: true,
        message: "Reprise des changements locaux non synchronisés.",
      });
      this.storeMeta();
      await this.flush();
      return;
    }
    if (
      remote &&
      interactive &&
      oldMeta?.playerId !== result.player.id &&
      hasLocalProgress(this.options.getFarm())
    ) {
      this.emit({
        mode: "conflict",
        dirty: true,
        message:
          "Ce compte possède déjà une ferme. Reprenez-la ou importez explicitement votre ferme locale.",
      });
      this.storeMeta();
      return;
    }
    if (remote) {
      this.pendingWriteId = undefined;
      this.backup(this.options.getFarm());
      this.options.applyFarm(remote.farm);
      this.changes = 0;
      this.emit({
        mode: "saved",
        dirty: false,
        message: "Sauvegarde du compte chargée.",
      });
      this.storeMeta();
    } else {
      this.emit({
        mode: "saved",
        dirty: true,
        message: "Import de la ferme locale dans votre compte…",
      });
      this.storeMeta();
      await this.flush();
    }
  }
  async authenticate(
    kind: "login" | "register",
    username: string,
    password: string,
  ) {
    const result = await request<SessionResponse>("/auth/" + kind, "POST", {
      username,
      password,
    });
    this.epoch++;
    await this.accept(result, true);
  }
  flush(keepalive = false): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this.status.mode === "offline" && this.status.player) {
      if (this.recovering) return this.recovering;
      const recovery = this.bootstrap().finally(() => {
        if (this.recovering === recovery) this.recovering = null;
      });
      this.recovering = recovery;
      return recovery;
    }
    if (
      !this.status.player ||
      !this.status.dirty ||
      ["loading", "conflict", "expired", "guest"].includes(this.status.mode)
    )
      return Promise.resolve();
    const epoch = this.epoch,
      change = this.changes,
      revision = this.revision,
      farm = structuredClone(this.options.getFarm());
    this.pendingWriteId = writeIdentifier();
    this.storeMeta();
    this.emit({ mode: "saving", message: "Enregistrement sur votre compte…" });
    const flight = request<{ revision: number; updatedAt: string }>(
      "/save",
      "PUT",
      { schemaVersion: 1, farm, revision, writeId: this.pendingWriteId },
      keepalive,
    )
      .then((saved) => {
        if (epoch !== this.epoch || this.disposed) return;
        this.revision = saved.revision;
        this.pendingWriteId = undefined;
        this.emit({
          mode: "saved",
          dirty: change !== this.changes,
          lastSavedAt: saved.updatedAt,
          message: "Sauvegarde du compte enregistrée.",
        });
        this.storeMeta();
      })
      .catch((error) => {
        if (epoch === this.epoch && !this.disposed) this.fail(error);
      })
      .finally(() => {
        if (this.inFlight === flight) this.inFlight = null;
      });
    this.inFlight = flight;
    return flight;
  }
  async retry() {
    await this.bootstrap();
  }
  async useCloud() {
    if (!this.status.player) return;
    const { save } = await request<{ save: Saved | null }>("/save");
    if (!save) throw new Error("Aucune sauvegarde enregistrée pour ce compte.");
    this.epoch++;
    this.backup(this.options.getFarm());
    this.revision = save.revision;
    this.pendingWriteId = undefined;
    this.options.applyFarm(save.farm);
    this.changes = 0;
    this.emit({
      mode: "saved",
      dirty: false,
      lastSavedAt: save.updatedAt,
      message: "Version du compte chargée.",
    });
    this.storeMeta();
  }
  async useLocal() {
    if (!this.status.player) return;
    const { save } = await request<{ save: Saved | null }>("/save");
    if (save) this.backup(save.farm);
    this.epoch++;
    this.revision = save?.revision ?? 0;
    this.pendingWriteId = undefined;
    this.emit({
      mode: "saved",
      dirty: true,
      message: "Enregistrement de la version choisie…",
    });
    this.storeMeta();
    await this.flush();
  }
  async listSlots(): Promise<FarmSlot[]> {
    if (this.status.player)
      return (await request<{ slots: FarmSlot[] }>("/slots")).slots;
    return localSlots().map(({ id, name, createdAt }) => ({
      id,
      name,
      createdAt,
    }));
  }
  private async readyForSlotChange() {
    if (!["guest", "saved", "saving"].includes(this.status.mode))
      throw new Error(
        "Attendez la connexion ou résolvez le conflit de sauvegarde avant de changer de partie.",
      );
    await this.flush();
    if (this.status.dirty) await this.flush();
    if (
      this.status.player &&
      (this.status.dirty || this.status.mode !== "saved")
    )
      throw new Error(
        "La partie en cours n’a pas pu être synchronisée. Elle reste ouverte.",
      );
  }
  async saveSlot(name: string): Promise<void> {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 60)
      throw new Error("Saisissez un nom de 1 à 60 caractères.");
    await this.readyForSlotChange();
    const slot: LocalSlot = {
      id: writeIdentifier(),
      name: cleanName,
      createdAt: new Date().toISOString(),
      farm: structuredClone(this.options.getFarm()),
    };
    if (this.status.player) await request("/slots", "POST", slot);
    else localStorage.setItem(SLOTS, JSON.stringify([slot, ...localSlots()]));
  }
  async deleteSlot(id: string): Promise<void> {
    if (this.status.player)
      await request("/slots/" + encodeURIComponent(id), "DELETE");
    else
      localStorage.setItem(
        SLOTS,
        JSON.stringify(localSlots().filter((slot) => slot.id !== id)),
      );
  }
  async openSlot(id: string | null): Promise<void> {
    await this.readyForSlotChange();
    let next: Farm;
    if (id === null) next = fresh();
    else if (this.status.player)
      next = (await request<{ farm: Farm }>("/slots/" + encodeURIComponent(id)))
        .farm;
    else {
      const slot = localSlots().find((slot) => slot.id === id);
      if (!slot) throw new Error("Sauvegarde introuvable.");
      next = structuredClone(slot.farm);
    }
    // Archive succeeds before replacing anything, including for a new game.
    await this.saveSlot(
      "Avant " +
        (id === null ? "nouvelle partie" : "chargement") +
        " · " +
        new Date().toLocaleString("fr-FR"),
    );
    this.epoch++;
    this.pendingWriteId = undefined;
    this.backup(this.options.getFarm());
    this.options.applyFarm(next);
    this.markDirty();
    this.storeMeta();
    await this.flush();
    if (this.status.player && this.status.mode !== "saved")
      throw new Error(
        "Partie chargée localement ; synchronisation à reprendre avant de continuer.",
      );
  }
  async logout() {
    await this.flush();
    if (this.status.dirty && this.status.mode === "saved") await this.flush();
    if (this.status.dirty)
      throw new Error(
        "Enregistrez ou résolvez le conflit avant de vous déconnecter.",
      );
    await request("/auth/logout", "POST", {});
    this.epoch++;
    this.revision = 0;
    this.pendingWriteId = undefined;
    localStorage.removeItem(META);
    localStorage.removeItem(BACKUP);
    this.options.applyFarm(fresh());
    this.emit({
      mode: "guest",
      player: null,
      dirty: false,
      lastSavedAt: null,
      message: "Déconnecté. La ferme du compte reste sur votre compte.",
    });
  }
  dispose() {
    this.disposed = true;
    this.epoch++;
  }
}
export function downloadFarm(farm: Farm) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ version: 1, farm }, null, 2)], {
      type: "application/json",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "farmscript-sauvegarde.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
