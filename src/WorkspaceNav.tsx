import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./Icons";
const destinations: { name: string; label: string; icon: IconName }[] = [
  { name: "Missions", label: "Missions", icon: "flag" },
  { name: "Recherches", label: "Recherches", icon: "research" },
  { name: "Flotte", label: "Robots", icon: "robots" },
  { name: "Shop", label: "Shop", icon: "shop" },
  { name: "API & aide", label: "Guide", icon: "info" },
  { name: "Session et sauvegarde", label: "Sauvegarde", icon: "home" },
];
export function WorkspaceNav({
  current,
  onNavigate,
}: {
  current: string;
  onNavigate: (name: string | null) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <nav className="workspace-nav" aria-label="Navigation des menus">
      <button className="back-to-farm" onClick={() => onNavigate(null)}>
        <Icon name="arrow" size={16} />
        <span>Retour à la ferme</span>
      </button>
      <div ref={list}>
        {destinations.map((d) => (
          <button
            key={d.name}
            aria-label={`Aller à ${d.name}`}
            aria-current={current === d.name ? "page" : undefined}
            className={current === d.name ? "selected" : ""}
            onClick={() => onNavigate(d.name)}
          >
            <Icon name={d.icon} size={17} />
            <span>{d.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
