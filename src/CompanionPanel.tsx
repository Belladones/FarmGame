import { lumaHeadPath } from "./lumaHead";
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
      <path
        d="M57 115l-6 24 9 4 9-24m8-4 9 18 9-3-8-20"
        fill={color}
        stroke="#8195a5"
        strokeWidth="2"
      />
      <path d="M59 87L54 109Q70 121 86 109L81 87Z" fill={color} />
      <path
        d="M56 94L43 116m41-22 12 22"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M38 29L34 7l10 18m52-1 9-21-2 30" fill="#304651" />
      <path
        d={lumaHeadPath}
        transform="translate(70 55) scale(82)"
        fill={color}
        stroke="#8da1ad"
        strokeWidth=".022"
      />
      <path
        d={lumaHeadPath}
        transform="translate(70 55) scale(73.8)"
        fill={accent}
      />
      <path
        d={lumaHeadPath}
        transform="translate(70 55) scale(67.2)"
        fill="#101d2c"
      />
      <path
        d="M49 42Q53 32 63 31"
        fill="none"
        stroke="#d4f6ff"
        strokeWidth="1.5"
        opacity=".3"
        strokeLinecap="round"
      />
      <path
        d="M49 59q-3-20 8-20t9 20q-8 6-17 0m25 0q-3-20 8-20t9 20q-8 6-17 0"
        fill="#48e9ed"
      />
      <path d="M66 71q4 4 8 0" fill="none" stroke="#48e9ed" strokeWidth="2" />
      <path
        d="M36 66q-14-17-15-4 0 9 15 4m0 2q-9 16-13 5 0-8 13-5"
        fill="#679e70"
      />
      <g fill="#f294a9">
        <circle cx="34" cy="61" r="5" />
        <circle cx="39" cy="66" r="5" />
        <circle cx="34" cy="71" r="5" />
        <circle cx="29" cy="66" r="5" />
        <circle cx="34" cy="66" r="3" fill="#ffda79" />
      </g>
      <circle cx="70" cy="100" r="2.5" fill="#48e9ed" />
      <path d="M70 92v15" stroke={accent} strokeWidth="2" />
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
          <p>
            Elle flotte près de vos menus, cligne des yeux et vous fait des
            petits coucous.
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
