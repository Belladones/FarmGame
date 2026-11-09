import { useEffect, useState } from "react";
import type { FarmSlot, SyncStatus } from "./persistence";
export interface SlotActions {
  list: () => Promise<FarmSlot[]>;
  save: (name: string) => Promise<void>;
  open: (id: string | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
}
export function SaveSlotsPanel({
  status,
  actions,
  disabled = false,
}: {
  disabled?: boolean;
  status: SyncStatus;
  actions: SlotActions;
}) {
  const [slots, setSlots] = useState<FarmSlot[]>([]);
  const [name, setName] = useState("");
  const [working, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const busy = working || disabled;
  const available = ["guest", "saved"].includes(status.mode);
  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setSlots([]);
    if (status.mode === "loading") return;
    actions
      .list()
      .then((items) => {
        if (alive) {
          setSlots(items);
          setLoaded(true);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [status.player?.id, status.mode === "loading"]);
  const act = async (operation: () => Promise<void>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      setSlots(await actions.list());
      setLoaded(true);
      setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="save-slots" aria-label="Mes parties">
      <h3>Mes parties</h3>
      <p>
        La partie en cours est enregistrée automatiquement. Créez des
        sauvegardes nommées pour garder plusieurs progressions.
      </p>
      <small>
        {status.player
          ? "Sauvegardes du compte, disponibles sur vos appareils."
          : "Sauvegardes locales à ce navigateur. Elles restent ici après une connexion au compte."}
      </small>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act(() => actions.save(name), "Sauvegarde créée.");
        }}
      >
        <label>
          Nom de la sauvegarde
          <input
            aria-label="Nom de la sauvegarde"
            maxLength={60}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="Ma première ferme"
          />
        </label>
        <button disabled={busy || !available || !name.trim()}>
          Sauvegarder cette partie
        </button>
      </form>
      <button
        className="session-primary"
        disabled={busy || !available}
        onClick={() => {
          if (
            confirm(
              "Commencer une nouvelle partie ? La partie actuelle sera conservée dans Mes parties, avec ses robots et programmes.",
            )
          )
            void act(
              () => actions.open(null),
              "Nouvelle partie démarrée. Votre ancienne ferme est conservée.",
            );
        }}
      >
        Nouvelle partie
      </button>
      {!available && (
        <p>
          Attendez la synchronisation ou résolvez le conflit avant de changer de
          partie.
        </p>
      )}
      {loaded && !slots.length && (
        <p>Aucune sauvegarde nommée pour le moment.</p>
      )}
      <ul>
        {slots.map((slot) => (
          <li key={slot.id}>
            <div>
              <strong>{slot.name}</strong>
              <small>{new Date(slot.createdAt).toLocaleString("fr-FR")}</small>
            </div>
            <button
              disabled={busy || !available}
              onClick={() => {
                if (
                  confirm(
                    `Reprendre « ${slot.name} » ? La partie actuelle sera conservée avant le chargement.`,
                  )
                )
                  void act(
                    () => actions.open(slot.id),
                    "Partie chargée. Relancez les programmes lorsque vous êtes prêt.",
                  );
              }}
            >
              Reprendre
            </button>
            <button
              disabled={busy || !available}
              aria-label={`Supprimer ${slot.name}`}
              onClick={() => {
                if (
                  confirm(
                    `Supprimer définitivement la sauvegarde « ${slot.name} » ? La partie en cours reste ouverte.`,
                  )
                )
                  void act(
                    () => actions.remove(slot.id),
                    "Sauvegarde supprimée.",
                  );
              }}
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="session-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
