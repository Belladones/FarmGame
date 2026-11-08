import { useState } from "react";
export function HelpPanel({
  docs,
  busy,
  garage,
  onCommand,
  onNavigate,
  onReset,
}: {
  docs: string[][];
  busy: boolean;
  garage: boolean;
  onCommand: (name: string) => string;
  onNavigate: (destination: string) => void;
  onReset: () => void;
}) {
  const [query, setQuery] = useState(""),
    [result, setResult] = useState("");
  const filtered = docs.filter((d) =>
    d
      .join(" ")
      .toLocaleLowerCase("fr")
      .includes(query.toLocaleLowerCase("fr").trim()),
  );
  return (
    <div className="help-panel">
      <header>
        <span className="overline">APPRENDRE EN CULTIVANT</span>
        <h2>Une commande, un pas de plus.</h2>
        <p>
          Retrouvez une fonction, testez une action ou reprenez votre
          apprentissage.
        </p>
      </header>
      <div className="help-start">
        <button onClick={() => onNavigate("Missions")}>
          <strong>01 · Suivre les missions</strong>
          <span>Des objectifs guidés, du premier semis à votre flotte.</span>
        </button>
        <button onClick={() => onNavigate("code")}>
          <strong>02 · Programmer mon robot</strong>
          <span>Le programme fourni plante, récolte et dépose en boucle.</span>
        </button>
        <button onClick={() => onNavigate("Flotte")}>
          <strong>03 · Comprendre ma flotte</strong>
          <span>Statut, soute, déploiement et améliorations.</span>
        </button>
      </div>
      <section className="help-practice">
        <h3>Essayer une action</h3>
        <p>
          {garage
            ? "Déployez ce robot depuis la flotte pour essayer une commande."
            : busy
              ? "Le robot agit déjà : attendez la fin de l’action, ou arrêtez son programme."
              : "Ces boutons agissent sur la case du robot sélectionné, sans modifier son programme."}
        </p>
        <div>
          {["plant", "harvest", "deposit"].map((name) => (
            <button
              disabled={busy || garage}
              key={name}
              onClick={() => setResult(onCommand(name))}
            >
              {name}()
            </button>
          ))}
        </div>
        <p className="help-result" role="status">
          {result}
        </p>
      </section>
      <label className="help-search">
        Rechercher dans l’API
        <input
          type="search"
          aria-label="Rechercher une commande"
          placeholder="Position, récolte, soute, move…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="help-results-heading">
        <h3>Les commandes du jeu</h3>
        <span>
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="help-api">
        {filtered.map(([name, text]) => (
          <article key={name}>
            <code>{name}</code>
            <p>{text}</p>
          </article>
        ))}
        {!filtered.length && (
          <div className="help-empty">
            <strong>Aucune commande trouvée.</strong>
            <p>Essayez un nom comme « harvest » ou un mot comme « dépôt ».</p>
            <button onClick={() => setQuery("")}>Effacer la recherche</button>
          </div>
        )}
      </div>
      <details className="help-shortcuts">
        <summary>Caméra et raccourcis clavier</summary>
        <p>
          Glissez sur le champ pour tourner autour. Utilisez la molette ou le
          bouton Zoom pour vous rapprocher. Ferme recentre la vue.
        </p>
        <dl>
          <dt>Ctrl / ⌘ + Entrée</dt>
          <dd>Lancer le programme depuis la ferme ou l’éditeur</dd>
          <dt>Alt + 1 à 5</dt>
          <dd>Missions, recherches, robots, shop, guide</dd>
          <dt>?</dt>
          <dd>Ouvrir le guide, hors d’un champ de saisie</dd>
          <dt>Échap</dt>
          <dd>Fermer le menu et revenir à la ferme</dd>
        </dl>
      </details>
      <details className="help-shortcuts">
        <summary>À savoir sur les programmes et les sauvegardes</summary>
        <p>
          Chaque robot possède son code. Les commandes du jeu sont attendues
          automatiquement : écrivez simplement plant(Entities.Wheat). Les
          callbacks, générateurs et imports ne sont pas encore pris en charge.
        </p>
        <p>
          La ferme est sauvegardée sur cet appareil. Connectez-vous pour
          synchroniser votre progression sur plusieurs appareils. Un robot
          rappellé au garage conserve son code et sa cargaison ; son programme
          se relance manuellement après déploiement.
        </p>
        <button onClick={() => onNavigate("Session et sauvegarde")}>
          Gérer ma sauvegarde →
        </button>
      </details>
      <details className="help-reset">
        <summary>Recommencer une partie</summary>
        <p>
          La ferme et sa progression seront réinitialisées. Le code du robot
          sélectionné sera conservé. Une confirmation est demandée avant
          d’effacer.
        </p>
        <button className="reset-farm" onClick={onReset}>
          Recommencer la ferme
        </button>
      </details>
    </div>
  );
}
