import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./Icons";
const progression: { name: string; icon: IconName }[] = [
  { name: "Missions", icon: "flag" },
  { name: "Recherches", icon: "research" },
  { name: "Robots", icon: "robots" },
];
export function WorkspaceNav({
  current,
  onNavigate,
}: {
  current: string;
  onNavigate: (name: string | null) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const grouped = progression.some((d) => d.name === current);
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <nav
      className={
        "workspace-nav " + (grouped ? "progression-nav" : "standalone-nav")
      }
      aria-label={grouped ? "Progression de la ferme" : "Retour à la ferme"}
    >
      <button className="back-to-farm" onClick={() => onNavigate(null)}>
        <Icon name="arrow" size={16} />
        <span>Retour à la ferme</span>
      </button>
      {grouped ? (
        <div ref={list}>
          {progression.map((d) => (
            <button
              key={d.name}
              aria-label={`Aller à ${d.name}`}
              aria-current={current === d.name ? "page" : undefined}
              className={current === d.name ? "selected" : ""}
              onClick={() => onNavigate(d.name)}
            >
              <Icon name={d.icon} size={17} />
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <span className="menu-section-label">
          {current === "Profil"
            ? "PROFIL & PERSONNALISATION"
            : current === "Atelier"
              ? "ATELIER & ROBOTIQUE"
              : current === "Inventaire"
                ? "INVENTAIRE & CONSTRUCTION"
                : current === "Magasin"
                  ? "COMMERCE & ÉQUIPEMENT"
                  : current === "API & aide"
                    ? "DOCUMENTATION & APPRENTISSAGE"
                    : "COMPTE & SAUVEGARDE"}
        </span>
      )}
    </nav>
  );
}
