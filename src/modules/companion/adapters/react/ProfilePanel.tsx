import { useEffect, useRef, useState } from "react";
import type { Farm } from "../../../farm/domain/model";
import { cosmetics, companionMissionCount } from "../../domain/companion";
import type { StickerPlacement } from "../../domain/stickerPlacements";
import type { ProfileMode } from "../three/profileInteraction";
import { CompanionPanel } from "./CompanionPanel";
import { ProfileCanvas } from "./ProfileCanvas";
import "./profile.css";
export function ProfilePanel({
  farm,
  username,
  onCustomize,
  onStickerChange,
  onAccount,
}: {
  farm: Farm;
  username?: string;
  onCustomize: (id: string) => void;
  onStickerChange: (sticker: StickerPlacement) => void;
  onAccount: () => void;
}) {
  const [slot, setSlot] = useState<number | undefined>(
      farm.companion.stickers?.[0]?.slot,
    ),
    [mode, setMode] = useState<ProfileMode>("orbit"),
    [draft, setDraft] = useState<StickerPlacement | null>(null);
  const previous = useRef(farm.companion.stickers ?? []),
    stickers = farm.companion.stickers ?? [];
  useEffect(() => {
    const added = stickers.find(
      (s) => !previous.current.some((p) => p.slot === s.slot),
    );
    if (added) setSlot(added.slot);
    else if (!stickers.some((s) => s.slot === slot)) setSlot(stickers[0]?.slot);
    previous.current = stickers;
  }, [JSON.stringify(stickers), slot]);
  const selected = stickers.find((s) => s.slot === slot),
    editing = draft?.slot === slot ? draft : selected;
  const preview = {
    ...farm.companion,
    stickers: stickers.map((s) => (draft?.slot === s.slot ? draft : s)),
  };
  const commit = (sticker: StickerPlacement) => {
    onStickerChange(sticker);
    setDraft(null);
  };
  return (
    <section className="profile-panel" aria-label="Profil de Luma">
      <header className="profile-heading">
        <div>
          <span className="overline">VOTRE PROFIL</span>
          <h2>{username ?? "Votre compagne, votre style."}</h2>
          <p>
            {companionMissionCount(farm)} missions récompensées · Vos
            personnalisations sont sauvegardées avec votre ferme.
          </p>
        </div>
        <button onClick={onAccount}>Compte et sauvegardes ↗</button>
      </header>
      <div className="profile-layout">
        <div className="profile-preview-column">
          <ProfileCanvas
            appearance={preview}
            mode={mode}
            selected={selected}
            onMode={(m) => {
              setDraft(null);
              setMode(m);
            }}
            onSelect={(s) => {
              setDraft(null);
              setSlot(s);
            }}
            onPreview={setDraft}
            onCommit={commit}
          />
          {editing && (
            <section
              className="profile-sticker-transform"
              aria-label="Réglages du sticker sélectionné"
            >
              <div>
                <strong>
                  {cosmetics.find((c) => c.id === editing.id)?.name}
                </strong>
                <span>
                  {editing.surface
                    ? "Position libre sur la coque"
                    : "Emplacement initial"}
                </span>
              </div>
              <label>
                Rotation{" "}
                <output>
                  {Math.round((editing.rotation * 180) / Math.PI)}°
                </output>
                <input
                  aria-label="Rotation du sticker"
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={Math.round((editing.rotation * 180) / Math.PI)}
                  onChange={(e) =>
                    setDraft({
                      ...editing,
                      rotation: (Number(e.target.value) * Math.PI) / 180,
                    })
                  }
                  onPointerUp={() => draft && commit(draft)}
                  onKeyUp={() => draft && commit(draft)}
                  onBlur={() => draft && commit(draft)}
                />
              </label>
              <label>
                Taille{" "}
                <output>{Math.round((editing.scale ?? 1) * 100)} %</output>
                <input
                  aria-label="Taille du sticker"
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={Math.round((editing.scale ?? 1) * 100)}
                  onChange={(e) =>
                    setDraft({
                      ...editing,
                      scale: Number(e.target.value) / 100,
                    })
                  }
                  onPointerUp={() => draft && commit(draft)}
                  onKeyUp={() => draft && commit(draft)}
                  onBlur={() => draft && commit(draft)}
                />
              </label>
              <button
                onClick={() => {
                  commit({ id: editing.id, slot: editing.slot, rotation: 0 });
                  setMode("orbit");
                }}
              >
                Rétablir l’emplacement initial
              </button>
            </section>
          )}
        </div>
        <div className="profile-customization">
          <CompanionPanel
            farm={farm}
            onCustomize={onCustomize}
            selectedSlot={slot}
            onSelectSticker={(s) => {
              setDraft(null);
              setSlot(s);
              setMode("move");
            }}
          />
        </div>
      </div>
    </section>
  );
}
