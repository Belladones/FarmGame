import { useEffect, useRef, useState } from "react";
import type { Companion } from "../../domain/companion";
import type { StickerPlacement } from "../../domain/stickerPlacements";
import type { ProfileMode } from "../three/profileInteraction";
import { createLumaProfileScene } from "../three/LumaProfileScene";
export function ProfileCanvas({
  appearance,
  mode,
  selected,
  onMode,
  onSelect,
  onPreview,
  onCommit,
}: {
  appearance: Companion;
  mode: ProfileMode;
  selected?: StickerPlacement;
  onMode: (mode: ProfileMode) => void;
  onSelect: (slot: number) => void;
  onPreview: (sticker: StickerPlacement | null) => void;
  onCommit: (sticker: StickerPlacement) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<ReturnType<typeof createLumaProfileScene> | undefined>(
      undefined,
    );
  const [status, setStatus] = useState("Chargement de Luma…");
  const latest = useRef({
    appearance,
    mode,
    selected,
    onSelect,
    onPreview,
    onCommit,
  });
  latest.current = {
    appearance,
    mode,
    selected,
    onSelect,
    onPreview,
    onCommit,
  };
  useEffect(() => {
    let alive = true;
    try {
      scene.current = createLumaProfileScene(
        host.current!,
        () => latest.current,
        (error) => {
          if (alive) setStatus(error ?? "");
        },
      );
    } catch {
      setStatus("Votre appareil ne permet pas d’afficher la vue 3D.");
    }
    return () => {
      alive = false;
      scene.current?.dispose();
    };
  }, []);
  return (
    <section className="luma-view" aria-label="Aperçu 3D de Luma">
      <div className="luma-view-heading">
        <span className="overline">APERÇU EN DIRECT</span>
        <span>LUMA / PERSONNALISATION</span>
      </div>
      <div
        ref={host}
        className={"luma-stage mode-" + mode}
        data-testid="luma-profile-stage"
      />
      {status && (
        <p className="luma-view-status" role="status">
          {status}
        </p>
      )}
      <div
        className="luma-view-tools"
        role="group"
        aria-label="Outils de la vue 3D"
      >
        {(
          [
            ["orbit", "Faire tourner"],
            ["move", "Déplacer le sticker"],
            ["rotate", "Tourner le sticker"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={mode === id}
            disabled={id !== "orbit" && !selected}
            onClick={() => onMode(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="luma-view-angles" role="group" aria-label="Angle de vue">
        {[
          ["Face", 0],
          ["Droite", Math.PI / 2],
          ["Dos", Math.PI],
          ["Gauche", -Math.PI / 2],
        ].map(([label, angle]) => (
          <button
            key={label}
            onClick={() => scene.current?.view(Number(angle))}
          >
            Vue de {String(label).toLowerCase()}
          </button>
        ))}
      </div>
      <p className="luma-view-hint">
        {mode === "orbit"
          ? "Glissez pour faire tourner Luma. Molette ou deux doigts pour zoomer."
          : mode === "move"
            ? "Cliquez sur la coque pour poser le sticker, puis glissez pour ajuster sa position."
            : "Glissez autour du sticker pour changer son orientation, ou utilisez le curseur."}
      </p>
    </section>
  );
}
