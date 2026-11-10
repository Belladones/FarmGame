import { useState } from "react";
import type { Farm } from "./engine";
import { cosmetics, companionMissionCount } from "./companion";
export function CompanionAvatar({
  skin = "pearl",
  accessory = "ribbon",
  lens = "lens-red",
}: {
  skin?: string;
  accessory?: string;
  lens?: string;
}) {
  return (
    <img
      className="companion-avatar"
      src={`/models/luma/previews/${skin}-${accessory}-${lens}.png`}
      alt="Luma, votre robot compagne"
      style={{ objectFit: "contain" }}
    />
  );
}

export function CompanionPanel({
  farm,
  onCustomize,
}: {
  farm: Farm;
  onCustomize: (id: string) => void;
}) {
  const [tab, setTab] = useState<"skin" | "accessory" | "lens">("skin");
  const count = companionMissionCount(farm);
  return (
    <section className="companion-panel" aria-label="Votre compagne Luma">
      <div className="companion-intro">
        <CompanionAvatar {...farm.companion} />
        <div>
          <span className="overline">VOTRE COMPAGNE</span>
          <h3>Luma</h3>
          <p>
            Choisissez la peinture de sa coque, ajoutez un sticker et
            personnalisez la couleur de sa lentille.
          </p>
          <small>
            Cosmétiques sans bonus de production · {count} mission
            {count > 1 ? "s" : ""} récompensée{count > 1 ? "s" : ""}
          </small>
        </div>
      </div>
      <div
        className="companion-tabs"
        role="group"
        aria-label="Catégories de cosmétiques"
      >
        <button
          className={tab === "skin" ? "active" : ""}
          onClick={() => setTab("skin")}
        >
          Coques
        </button>
        <button
          className={tab === "accessory" ? "active" : ""}
          onClick={() => setTab("accessory")}
        >
          Stickers
        </button>
        <button
          className={tab === "lens" ? "active" : ""}
          onClick={() => setTab("lens")}
        >
          Lentille
        </button>
      </div>
      <div className="cosmetic-grid">
        {cosmetics
          .filter((c) => c.kind === tab)
          .map((c) => {
            const owned = farm.companion.unlocked.includes(c.id),
              equipped = farm.companion[c.kind] === c.id,
              available = count >= c.missions;
            return (
              <article
                className={"cosmetic-card " + (equipped ? "equipped" : "")}
                key={c.id}
              >
                <CompanionAvatar
                  lens={c.kind === "lens" ? c.id : farm.companion.lens}
                  skin={c.kind === "skin" ? c.id : farm.companion.skin}
                  accessory={
                    c.kind === "accessory" ? c.id : farm.companion.accessory
                  }
                />
                <strong>{c.name}</strong>
                <p>{c.description}</p>
                <small>
                  {owned
                    ? "Débloqué"
                    : `${Math.min(count, c.missions)} / ${c.missions} missions récompensées`}
                </small>
                <button
                  disabled={equipped || (!owned && !available)}
                  aria-label={`${equipped ? "Équipé" : owned ? "Équiper" : available ? "Débloquer et équiper" : "Verrouillé"} ${c.name}`}
                  onClick={() => onCustomize(c.id)}
                >
                  {equipped
                    ? "Équipé"
                    : owned
                      ? "Équiper"
                      : available
                        ? "Débloquer et équiper"
                        : `Encore ${c.missions - count} mission${c.missions - count > 1 ? "s" : ""}`}
                </button>
              </article>
            );
          })}
      </div>
    </section>
  );
}
