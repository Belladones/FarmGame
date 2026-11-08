import { useState, type ReactNode } from "react";
import type { SyncStatus } from "./persistence";
export type SessionAction =
  | {
      type: "auth";
      kind: "login" | "register";
      username: string;
      password: string;
    }
  | { type: "save" | "retry" | "cloud" | "local" | "logout" | "export" };
export function SessionPanel({
  status,
  onAction,
  children,
}: {
  children?: ReactNode;
  status: SyncStatus;
  onAction: (action: SessionAction) => Promise<void>;
}) {
  const [kind, setKind] = useState<"login" | "register">("login"),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const act = async (action: SessionAction) => {
    setBusy(true);
    setError("");
    try {
      await onAction(action);
      if (action.type === "auth") setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="session-panel">
      <span className="overline">VOTRE FERME, RETROUVÉE</span>
      <h2>Session et sauvegarde</h2>
      <p className="session-intro">
        Un compte pour retrouver votre ferme, vos robots et tous leurs
        programmes sur plusieurs appareils. Les processus reprennent seulement
        lorsque vous les relancez.
      </p>
      <div className={"sync-message " + status.mode} role="status">
        <strong>
          {status.player ? `Compte : ${status.player.username}` : "Mode local"}
        </strong>
        <span>{status.message}</span>
        {status.lastSavedAt && (
          <small>
            Dernier enregistrement serveur :{" "}
            {new Date(status.lastSavedAt).toLocaleString("fr-FR")}
          </small>
        )}
        {status.dirty && status.player && (
          <small>Des changements locaux restent à synchroniser.</small>
        )}
      </div>
      {!status.player || status.mode === "expired" ? (
        <>
          <div className="auth-tabs">
            <button
              disabled={busy}
              className={kind === "login" ? "active" : ""}
              onClick={() => setKind("login")}
            >
              Se connecter
            </button>
            <button
              disabled={busy}
              className={kind === "register" ? "active" : ""}
              onClick={() => setKind("register")}
            >
              Créer un compte
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act({ type: "auth", kind, username, password });
            }}
          >
            <label>
              Pseudo
              <input
                aria-label="Pseudo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_\-]{3,24}"
                required
                disabled={busy}
              />
              <small>3 à 24 caractères : lettres, chiffres, _ ou -.</small>
            </label>
            <label>
              Mot de passe
              <input
                aria-label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  kind === "login" ? "current-password" : "new-password"
                }
                minLength={10}
                maxLength={128}
                required
                disabled={busy}
              />
              <small>
                10 caractères minimum. Non inclus dans vos sauvegardes.
              </small>
            </label>
            <button className="session-primary" disabled={busy} type="submit">
              {busy
                ? "Connexion…"
                : kind === "login"
                  ? "Ouvrir ma session"
                  : "Créer mon compte et sauvegarder"}
            </button>
          </form>
          <p className="session-note">
            Sans compte, le jeu continue avec une sauvegarde locale. La création
            d’un compte importe cette ferme si le compte n’a pas encore de
            sauvegarde.
          </p>
        </>
      ) : status.mode === "conflict" ? (
        <div className="conflict-actions">
          <p>
            Ces versions ne sont pas fusionnables automatiquement. La version
            écartée est conservée temporairement en copie de secours dans ce
            navigateur.
          </p>
          <button
            className="session-primary"
            disabled={busy}
            onClick={() => void act({ type: "cloud" })}
          >
            Reprendre la sauvegarde du compte
          </button>
          <button disabled={busy} onClick={() => void act({ type: "local" })}>
            Enregistrer cette version à la place
          </button>
        </div>
      ) : (
        <div className="session-actions">
          <button
            className="session-primary"
            disabled={busy || status.mode === "saving"}
            onClick={() => void act({ type: "save" })}
          >
            Enregistrer maintenant
          </button>
          <button disabled={busy} onClick={() => void act({ type: "cloud" })}>
            Recharger la sauvegarde du compte
          </button>
          <button disabled={busy} onClick={() => void act({ type: "logout" })}>
            Se déconnecter
          </button>
        </div>
      )}
      {status.mode === "offline" && (
        <button disabled={busy} onClick={() => void act({ type: "retry" })}>
          Réessayer la connexion au serveur
        </button>
      )}
      <div className="session-backup">
        <button disabled={busy} onClick={() => void act({ type: "export" })}>
          Exporter la ferme en JSON
        </button>
        <span>La copie locale est conservée en cas de panne du serveur.</span>
      </div>
      {children}
      {error && (
        <p className="session-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
