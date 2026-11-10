import { stickerContours } from "../../domain/stickerContours";
import { stickerArt, stickerAtlas } from "../../domain/stickerLibrary";
import type { StickerPlacement } from "../../domain/stickerPlacements";
import { stickerMounts, MAX_STICKERS } from "../../domain/stickerPlacements";
import { useEffect, useState } from "react";
import type { Farm } from "../../../farm/application/engine";
import { cosmetics, companionMissionCount } from "../../domain/companion";
export function CompanionAvatar({
  skin = "pearl",
  accessory = "ribbon",
  lens = "lens-red",
  stickers,
}: {
  skin?: string;
  accessory?: string;
  lens?: string;
  stickers?: StickerPlacement[];
}) {
  const [image, setImage] = useState<string>();
  const placementKey = JSON.stringify(stickers);
  useEffect(() => {
    let active = true;
    setImage(undefined);
    import("../three/companionPortrait")
      .then((m) =>
        m.companionPortrait({ skin, accessory, lens, stickers, unlocked: [] }),
      )
      .then((url) => {
        if (active) setImage(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [skin, accessory, lens, placementKey]);
  return (
    <img
      className="companion-avatar"
      src={image ?? `/models/luma/previews/${skin}-none-${lens}.png`}
      alt="Luma, votre robot compagne"
      style={{ objectFit: "contain" }}
    />
  );
}

function StickerThumbnail({ id }: { id: string }) {
  const art = stickerArt(id)!;
  const [x, y, width, height] = art.rect;
  const scale = Math.min(108 / width, 96 / height);
  return (
    <div
      className="sticker-thumbnail"
      role="img"
      aria-label={`Sticker ${art.name}`}
    >
      <span
        style={{
          width: width * scale,
          height: height * scale,
          backgroundImage: `url(${stickerAtlas.url})`,
          backgroundSize: `${stickerAtlas.width * scale}px ${stickerAtlas.height * scale}px`,
          backgroundPosition: `${-x * scale}px ${-y * scale}px`,
          clipPath: stickerContours[id]
            ? `polygon(${stickerContours[id].map(([x, y]) => `${x * 100}% ${y * 100}%`).join(",")})`
            : undefined,
        }}
      />
    </div>
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
            Choisissez la peinture de sa coque, ajoutez jusqu’à trois stickers
            et personnalisez la couleur de sa lentille.
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
      {tab === "accessory" && (
        <div className="sticker-loadout">
          <strong>
            Stickers posés · {farm.companion.stickers?.length ?? 0} /{" "}
            {MAX_STICKERS}
          </strong>
          <p>
            L’emplacement et l’inclinaison sont tirés au sort à l’ajout, puis
            conservés dans la sauvegarde.
          </p>
          {(farm.companion.stickers ?? []).map((sticker) => (
            <div key={sticker.slot}>
              <span>
                {cosmetics.find((c) => c.id === sticker.id)?.name} ·{" "}
                {stickerMounts[sticker.slot]?.name}
              </span>
              <button
                aria-label={`Retirer le sticker ${sticker.slot + 1}`}
                onClick={() => onCustomize(`sticker:remove:${sticker.slot}`)}
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            disabled={!farm.companion.stickers?.length}
            onClick={() => onCustomize("sticker:shuffle")}
          >
            Redistribuer les stickers
          </button>
        </div>
      )}
      <div className="cosmetic-grid">
        {cosmetics
          .filter((c) => c.kind === tab)
          .sort(
            (a, b) => Number(!!stickerArt(b.id)) - Number(!!stickerArt(a.id)),
          )
          .map((c) => {
            const owned = farm.companion.unlocked.includes(c.id),
              equipped =
                c.kind === "accessory"
                  ? c.id === "none" && !farm.companion.stickers?.length
                  : farm.companion[c.kind] === c.id,
              full =
                c.kind === "accessory" &&
                c.id !== "none" &&
                (farm.companion.stickers?.length ?? 0) >= MAX_STICKERS,
              available = count >= c.missions,
              verb = c.kind === "accessory" ? "Ajouter" : "Équiper",
              unlockVerb =
                c.kind === "accessory"
                  ? "Débloquer et ajouter"
                  : "Débloquer et équiper";
            return (
              <article
                className={
                  "cosmetic-card " +
                  (equipped ? "equipped " : "") +
                  ("legendary" in c
                    ? `legendary-card legendary-${c.legendary}`
                    : "")
                }
                key={c.id}
              >
                {stickerArt(c.id) ? (
                  <StickerThumbnail id={c.id} />
                ) : (
                  <CompanionAvatar
                    stickers={
                      c.kind === "accessory"
                        ? c.id === "none"
                          ? []
                          : [{ id: c.id, slot: 1, rotation: 0 }]
                        : farm.companion.stickers
                    }
                    lens={c.kind === "lens" ? c.id : farm.companion.lens}
                    skin={c.kind === "skin" ? c.id : farm.companion.skin}
                    accessory={
                      c.kind === "accessory" ? c.id : farm.companion.accessory
                    }
                  />
                )}
                {"rarity" in c && c.rarity === "legendary" && (
                  <span className="legendary-badge">LÉGENDAIRE</span>
                )}
                <strong>{c.name}</strong>
                <p>{c.description}</p>
                <small>
                  {owned
                    ? "Débloqué"
                    : `${Math.min(count, c.missions)} / ${c.missions} missions récompensées`}
                </small>
                <button
                  disabled={full || equipped || (!owned && !available)}
                  aria-label={`${equipped ? "Équipé" : owned ? verb : available ? unlockVerb : "Verrouillé"} ${c.name}`}
                  onClick={() => onCustomize(c.id)}
                >
                  {full
                    ? "Maximum 3 stickers"
                    : equipped
                      ? "Équipé"
                      : owned
                        ? verb
                        : available
                          ? unlockVerb
                          : `Encore ${c.missions - count} mission${c.missions - count > 1 ? "s" : ""}`}
                </button>
              </article>
            );
          })}
      </div>
    </section>
  );
}
