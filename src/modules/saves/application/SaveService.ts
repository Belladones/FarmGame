import { fresh } from "../../farm/domain/factories";
import type { Farm } from "../../farm/domain/model";
import type {
  SessionResponse,
  SyncStatus,
  FarmSlot,
  LocalSlot,
} from "../domain/model";
import { SaveFailure, type SavePorts } from "../ports/SavePorts";
import { hasLocalProgress } from "./hasLocalProgress";
const SLOTS = "farmscript-slots-v1";
interface Meta {
  playerId: string;
  revision: number;
  dirty: boolean;
  conflict?: boolean;
  pendingWriteId?: string;
}
const META = "farmscript-sync-v1",
  BACKUP = "farmscript-backup-v1";
export class SaveService {
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
    private ports: SavePorts,
  ) {}

  private localSlots(): LocalSlot[] {
    const value = JSON.parse(this.ports.storage.getItem(SLOTS) || "[]");
    if (!Array.isArray(value))
      throw new Error("La liste des sauvegardes locales est illisible.");
    return value;
  }

  private emit(patch: Partial<SyncStatus>) {
    if (this.disposed) return;
    this.status = { ...this.status, ...patch };
    this.options.onChange({ ...this.status });
  }
  private meta(): Meta | null {
    try {
      return JSON.parse(this.ports.storage.getItem(META) || "null");
    } catch {
      return null;
    }
  }
  private storeMeta() {
    if (this.status.player)
      this.ports.storage.setItem(
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
      this.ports.storage.setItem(
        BACKUP,
        JSON.stringify({
          version: 1,
          farm,
          createdAt: this.ports.now().toISOString(),
        }),
      );
    } catch {
      /* The normal local save remains available even if the backup quota is full. */
    }
  }
  private fail(error: unknown) {
    const e = error as SaveFailure;
    const mode = e.reason ?? "offline";
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
      const result = await this.ports.gateway.session();
      if (this.disposed) return;
      if (result) await this.accept(result, false);
      else
        this.emit({
          mode: "guest",
          player: null,
          message:
            "Mode local. Connectez-vous pour sauvegarder sur votre compte.",
        });
    } catch (error) {
      if ((error as SaveFailure).reason === "expired")
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
    const result = await this.ports.gateway.authenticate(
      kind,
      username,
      password,
    );
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
    this.pendingWriteId = this.ports.writeIdentifier();
    this.storeMeta();
    this.emit({ mode: "saving", message: "Enregistrement sur votre compte…" });
    const flight = this.ports.gateway
      .save({ farm, revision, writeId: this.pendingWriteId }, keepalive)
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
    const save = await this.ports.gateway.readSave();
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
    const save = await this.ports.gateway.readSave();
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
    if (this.status.player) return this.ports.gateway.listSlots();
    return this.localSlots().map(({ id, name, createdAt }) => ({
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
      id: this.ports.writeIdentifier(),
      name: cleanName,
      createdAt: this.ports.now().toISOString(),
      farm: structuredClone(this.options.getFarm()),
    };
    if (this.status.player) await this.ports.gateway.saveSlot(slot);
    else
      this.ports.storage.setItem(
        SLOTS,
        JSON.stringify([slot, ...this.localSlots()]),
      );
  }
  async deleteSlot(id: string): Promise<void> {
    if (this.status.player) await this.ports.gateway.deleteSlot(id);
    else
      this.ports.storage.setItem(
        SLOTS,
        JSON.stringify(this.localSlots().filter((slot) => slot.id !== id)),
      );
  }
  async openSlot(id: string | null): Promise<void> {
    await this.readyForSlotChange();
    let next: Farm;
    if (id === null) next = fresh();
    else if (this.status.player) next = await this.ports.gateway.readSlot(id);
    else {
      const slot = this.localSlots().find((slot) => slot.id === id);
      if (!slot) throw new Error("Sauvegarde introuvable.");
      next = structuredClone(slot.farm);
    }
    // Archive succeeds before replacing anything, including for a new game.
    await this.saveSlot(
      "Avant " +
        (id === null ? "nouvelle partie" : "chargement") +
        " · " +
        this.ports.now().toLocaleString("fr-FR"),
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
    await this.ports.gateway.logout();
    this.epoch++;
    this.revision = 0;
    this.pendingWriteId = undefined;
    this.ports.storage.removeItem(META);
    this.ports.storage.removeItem(BACKUP);
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
