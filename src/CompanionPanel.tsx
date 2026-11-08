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
      aria-label="Luma, androïde aux cheveux blancs et aux yeux bleus"
    >
      <path
        d="M59 121l-8 26 12 4 9-27m5-3 10 21 10-5-11-21"
        fill={color}
        stroke="#8c90ba"
        strokeWidth="1.5"
      />
      <path
        d="M55 95Q48 107 61 118L63 129Q70 135 78 127L81 117Q92 105 83 95Z"
        fill={color}
        stroke="#8c90ba"
        strokeWidth="1"
      />
      <path
        d="M53 100l-15 20 3 17m45-37 14 13 14 8"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M38 121l3 16"
        stroke="#7471de"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M69 87v10" stroke="#283346" strokeWidth="8" />
      <path
        d="M29 77Q20 25 47 16Q86-2 108 29L115 82Q95 96 86 84H41Z"
        fill="#f9f9ff"
        stroke="#b9b9dd"
        strokeWidth="1.5"
      />
      <ellipse cx="70" cy="54" rx="26" ry="32" fill="#f4f4fc" />
      {[55, 83].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="59" rx="9" ry="11" fill="white" />
          <ellipse cx={x + 1} cy="60" rx="7" ry="9" fill="#268be1" />
          <ellipse cx={x + 1} cy="61" rx="3.5" ry="6" fill="#20316d" />
          <circle cx={x - 2} cy="56" r="2.5" fill="white" />
          <path
            d={`M${x - 9} 55q7-10 17-2`}
            fill="none"
            stroke="#34345e"
            strokeWidth="2"
          />
        </g>
      ))}
      <path d="M65 77q5 3 9 0" fill="none" stroke="#c292b8" strokeWidth="1" />
      <path
        d="M48 19Q38 36 34 83L46 88Q42 56 54 30Q48 49 62 49L71 22Q62 49 77 48L84 25Q82 45 93 48L101 35Q97 65 102 88L113 81Q110 34 94 20Q73 6 48 19Z"
        fill="#fafaff"
        stroke="#c1c0e4"
        strokeWidth="1"
      />
      <ellipse cx="30" cy="36" rx="10" ry="14" fill="#433b9a" />
      <ellipse cx="30" cy="36" rx="7" ry="10" fill="#44e1f3" />
      <circle cx="61" cy="104" r="8" fill="#293650" />
      <circle cx="61" cy="104" r="5.5" fill="#31c8ef" />
      <circle cx="60" cy="103" r="2.5" fill="#a3fcff" />
      <path
        d="M81 97l3 13-8 12m-20-9 6 8"
        fill="none"
        stroke={accent}
        strokeWidth="1.2"
      />
      {accessory === "ribbon" && (
        <path
          d="M34 27Q17 8 24 31L34 30Q48 17 39 13Z"
          fill="#fafaff"
          stroke="#c2c1e7"
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
            Elle flotte près de vos menus, vous regarde et vous fait des petits
            coucous.
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
