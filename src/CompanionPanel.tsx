import { useState } from "react";
import type { Farm } from "./engine";
import { cosmetics, companionMissionCount } from "./companion";
export function CompanionAvatar({
  skin = "pearl",
  accessory = "ribbon",
}: {
  skin?: string;
  accessory?: string;
}) {
  const palette = cosmetics.find((c) => c.kind === "skin" && c.id === skin);
  const color = palette && "color" in palette ? palette.color : "#eee7dc",
    accent = palette && "accent" in palette ? palette.accent : "#bc86ed";
  return (
    <svg
      className="companion-avatar"
      viewBox="0 0 140 160"
      role="img"
      aria-label="Luma, votre petite robot compagne"
    >
      <ellipse cx="70" cy="151" rx="34" ry="5" fill="#0004" />
      <path
        d="M49 123v19h14v-19m14 0v19h14v-19"
        fill={color}
        stroke="#8195a5"
        strokeWidth="2"
      />
      <path d="M48 91L39 121Q70 139 101 121L92 91Z" fill={color} />
      <path
        d="M47 94L36 119m57-25 11 25"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <rect
        x="27"
        y="16"
        width="86"
        height="85"
        rx="26"
        fill={color}
        stroke="#8da1ad"
        strokeWidth="2"
      />
      <rect x="34" y="24" width="72" height="68" rx="19" fill={accent} />
      <rect x="40" y="30" width="60" height="56" rx="14" fill="#101d2c" />
      <path d="M48 48l4 3m36-3-4 3" stroke="#dbefff" strokeWidth="2" />
      <ellipse cx="57" cy="58" rx="5" ry="7" fill="#efffff" />
      <ellipse cx="83" cy="58" rx="5" ry="7" fill="#efffff" />
      <path d="M65 74q5 4 10 0" fill="none" stroke={accent} strokeWidth="2" />
      <circle cx="66" cy="108" r="3" fill={accent} />
      <circle cx="75" cy="108" r="3" fill="#7df0e6" />
      {accessory === "ribbon" && (
        <path
          d="M92 21Q70 2 78 30L91 25Q115 35 110 13Z"
          fill={accent}
          stroke="#e6cfff"
        />
      )}
      {accessory === "flower" && (
        <g fill="#f6c65f">
          <circle cx="99" cy="14" r="6" />
          <circle cx="108" cy="22" r="6" />
          <circle cx="102" cy="31" r="6" />
          <circle cx="91" cy="28" r="6" />
          <circle cx="90" cy="17" r="6" />
          <circle cx="99" cy="22" r="5" fill="#fff1c6" />
        </g>
      )}
      {accessory === "halo" && (
        <ellipse
          cx="70"
          cy="11"
          rx="34"
          ry="7"
          fill="none"
          stroke={accent}
          strokeWidth="4"
        />
      )}
    </svg>
  );
}
export function CompanionPanel({
  farm,
  onCustomize,
}: {
  farm: Farm;
  onCustomize: (id: string) => void;
}) {
  const [tab, setTab] = useState<"skin" | "accessory">("skin");
  const count = companionMissionCount(farm);
  return (
    <section className="companion-panel" aria-label="Votre compagne Luma">
      <div className="companion-intro">
        <CompanionAvatar {...farm.companion} />
        <div>
          <span className="overline">VOTRE COMPAGNE</span>
          <h3>Luma</h3>
          <p>Elle veille sur votre ferme et se promène à son rythme.</p>
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
          Apparences
        </button>
        <button
          className={tab === "accessory" ? "active" : ""}
          onClick={() => setTab("accessory")}
        >
          Accessoires
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
