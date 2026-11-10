import { ProductArt } from "../../../../shared/adapters/react/ProductArt";
export { ProductArt } from "../../../../shared/adapters/react/ProductArt";
import { AssetUpgradesPanel } from "../../../equipment/adapters/react/AssetUpgradesPanel";
import { useState } from "react";
import {
  assetBlocker,
  buildingStatus,
  capacity,
  freeSlots,
  getStock,
  shopBlocker,
  inventoryPurchaseBlocker,
  slotCount,
  stockCapacity,
  totalStock,
  type Farm,
} from "../../../farm/application/engine";
import {
  buildings,
  type BuildingKind,
} from "../../../construction/domain/catalog";
import {
  formatCost,
  itemNames,
  items,
  sum,
  type Item,
} from "../../../../shared/domain/resources";
import { models, type Model } from "../../../robots/domain/catalog";
import { research } from "../../../research/domain/catalog";
import { salePrices, tradeOrders } from "../../domain/catalog";
import { ResourceIcon } from "../../../../shared/adapters/react/Icons";
export type ShopAction =
  | { type: "upgrade"; id: string; upgrade: string }
  | {
      type: "buy";
      kind: Model | BuildingKind | "Fertilizer";
      quantity: number;
      store?: boolean;
      site?: { x: number; y: number };
    }
  | { type: "sell"; item: Item; quantity: number }
  | { type: "order"; id: string }
  | { type: "resell" | "repair" | "select"; id: string }
  | { type: "relocate"; id: string; site: { x: number; y: number } };
const inventoryText = (inventory: Partial<Record<Item, number>>) =>
  items
    .filter((i) => (inventory[i] ?? 0) > 0)
    .map((i) => `${inventory[i]} ${itemNames[i].toLowerCase()}`)
    .join(" · ") || "Vide";
export function Shop({
  farm,
  paused,
  onPause,
  onAction,
  onInventory,
}: {
  farm: Farm;
  paused: boolean;
  onPause: () => void;
  onAction: (action: ShopAction) => boolean;
  onInventory?: () => void;
}) {
  const [tab, setTab] = useState("Vendre"),
    [amounts, setAmounts] = useState<Record<string, number>>({}),
    [siteIndex, setSiteIndex] = useState(0),
    [delivery, setDelivery] = useState("inventory"),
    [message, setMessage] = useState("");
  const sites = freeSlots(farm),
    site = sites[siteIndex] ?? sites[0];
  const amount = (id: string, fallback = 1) => amounts[id] ?? fallback;
  const setAmount = (id: string, n: number) =>
    setAmounts((a) => ({ ...a, [id]: n }));
  const act = (action: ShopAction, label: string) => {
    setMessage(
      onAction(action)
        ? label
        : "Action impossible : vérifiez les prérequis, la place disponible et l’état de l’objet.",
    );
  };
  return (
    <div className="shop-pages">
      <header className="shop-header">
        <div>
          <span className="overline">LE COMPTOIR DE VOTRE FERME</span>
          <h2>Le magasin</h2>
          <p>Produisez. Vendez. Équipez votre exploitation.</p>
        </div>
        <div className="shop-wallet">
          {onInventory && (
            <button onClick={onInventory}>Ouvrir l’inventaire →</button>
          )}
          <strong>
            ◈ {farm.gold.toLocaleString("fr-FR")} <small>or</small>
          </strong>
          <span>
            Dépôts : {totalStock(farm)} / {stockCapacity(farm)} unités
          </span>
          <button className="shop-pause" onClick={onPause}>
            {paused
              ? "Reprendre la simulation"
              : "Mettre la simulation en pause"}
          </button>
        </div>
      </header>
      {(tab === "Robots" || tab === "Bâtiments") && (
        <label className="delivery-choice">
          Livraison des achats
          <select
            aria-label="Livraison des achats"
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
          >
            <option value="inventory">
              Dans l’inventaire · poser plus tard
            </option>
            <option value="field">Installer immédiatement</option>
          </select>
          <small>
            {delivery === "inventory"
              ? "Les équipements achetés attendront dans Inventaire."
              : "Un emplacement libre est requis."}
          </small>
        </label>
      )}
      <nav className="shop-tabs" aria-label="Rayons du magasin">
        {[
          "Vendre",
          "Robots",
          "Bâtiments",
          "Consommables",
          "Mon exploitation",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => {
              setTab(t);
              setMessage("");
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="shop-body">
        {tab === "Vendre" && (
          <>
            <div className="shop-section-heading">
              <h3>Vos stocks déposés</h3>
              <p>
                Tarifs fixes. La cargaison des robots et les tampons des
                machines ne sont jamais vendus ici.
              </p>
            </div>
            <div className="sale-list">
              {items.map((item) => {
                const n = amount(item, 10),
                  available = getStock(farm, item),
                  valid = Number.isSafeInteger(n) && n > 0 && n <= available;
                return (
                  <article className="sale-row" key={item}>
                    <ProductArt kind={item} />
                    <div className="sale-name">
                      <strong>{itemNames[item]}</strong>
                      <span>
                        {available} disponible{available > 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="unit-price">
                      {salePrices[item]} or<small>/ unité</small>
                    </span>
                    <label className="quantity">
                      <span>Quantité</span>
                      <input
                        aria-label={`Quantité de ${itemNames[item]}`}
                        type="number"
                        min="1"
                        max={available || 1}
                        step="1"
                        value={Number.isNaN(n) ? "" : n}
                        onChange={(e) =>
                          setAmount(item, e.target.valueAsNumber)
                        }
                      />
                    </label>
                    <button
                      className="sell-all"
                      disabled={!available}
                      onClick={() => setAmount(item, available)}
                    >
                      Tout
                    </button>
                    <button
                      className="shop-buy"
                      disabled={!valid}
                      onClick={() =>
                        act(
                          { type: "sell", item, quantity: n },
                          `${n} ${itemNames[item].toLowerCase()} vendu(s).`,
                        )
                      }
                    >
                      Vendre · {valid ? n * salePrices[item] : 0} or
                    </button>
                  </article>
                );
              })}
            </div>
            <p className="shop-note">
              Les récoltes et marchandises ne s’achètent pas. L’eau n’est pas
              vendable.
            </p>
            <div className="shop-section-heading orders-heading">
              <h3>Commandes du village</h3>
              <p>
                Une livraison de chaque type par période de 10 minutes de
                simulation. Prochaine période dans{" "}
                {Math.ceil(600 - (farm.time % 600))} s.
              </p>
            </div>
            <div className="order-grid">
              {tradeOrders
                .filter((o) => !o.unlock || farm.unlocks.includes(o.unlock))
                .map((o) => {
                  const delivered =
                    farm.orderPeriods[o.id] === Math.floor(farm.time / 600);
                  return (
                    <article className="order-card" key={o.id}>
                      <ProductArt kind={o.item} />
                      <div>
                        <h4>{o.name}</h4>
                        <p>
                          {o.quantity} {itemNames[o.item].toLowerCase()}{" "}
                          retiré(s) des dépôts
                        </p>
                        <strong>◈ {o.payment} or</strong>
                        <button
                          disabled={
                            delivered || getStock(farm, o.item) < o.quantity
                          }
                          onClick={() =>
                            act({ type: "order", id: o.id }, "Commande livrée.")
                          }
                        >
                          {delivered
                            ? "Livrée pour cette période"
                            : "Livrer la commande"}
                        </button>
                      </div>
                    </article>
                  );
                })}
            </div>
          </>
        )}
        {tab === "Robots" && (
          <>
            <div className="shop-section-heading">
              <h3>Une équipe à votre mesure</h3>
              <p>
                Votre premier fermier terrestre est offert. Les modèles se
                débloquent par recherche, puis s’achètent en or. Une case libre
                est nécessaire au départ.
              </p>
            </div>
            <div className="product-grid robot-products">
              {(Object.keys(models) as Model[]).map((kind) => {
                const spec = models[kind],
                  blocker =
                    delivery === "inventory"
                      ? inventoryPurchaseBlocker(farm, kind)
                      : shopBlocker(farm, kind);
                return (
                  <article
                    className={"product-card " + (blocker ? "locked" : "")}
                    key={kind}
                  >
                    <div className="product-visual">
                      <ProductArt kind={kind} />
                      <span>
                        {spec.medium === "ground" ? "TERRESTRE" : "AÉRIEN"}
                      </span>
                    </div>
                    <div className="product-content">
                      <div className="product-heading">
                        <h3>{spec.name}</h3>
                        <strong>◈ {spec.price} or</strong>
                      </div>
                      <p>{spec.description}</p>
                      <div className="robot-specs">
                        <span>{spec.speed.toLocaleString("fr-FR")} case/s</span>
                        <span>Soute {spec.capacity} unités</span>
                      </div>
                      <small>
                        {
                          farm.robots.filter(
                            (r) =>
                              r.model === kind && !r.destroyed && r.deployed,
                          ).length
                        }{" "}
                        en service · Recherche :{" "}
                        {research.find((r) => r.id === spec.research)?.name}
                      </small>
                      <button
                        className="shop-buy"
                        disabled={!!blocker}
                        title={blocker ?? ""}
                        onClick={() =>
                          act(
                            {
                              type: "buy",
                              kind,
                              quantity: 1,
                              store: delivery === "inventory",
                            },
                            delivery === "inventory"
                              ? `${spec.name} ajouté à l’inventaire.`
                              : `${spec.name} acheté et déployé.`,
                          )
                        }
                      >
                        Acheter {spec.name} · {spec.price} or
                      </button>
                      {blocker && (
                        <span className="purchase-blocker">{blocker}</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="shop-note">
              Fermiers et transporteurs se percutent entre eux ; les drones
              peuvent les survoler. Après la perte du dernier fermier, un unique
              fermier de secours est prêté, deux fois plus lent et non vendable.
            </p>
          </>
        )}
        {tab === "Bâtiments" && (
          <>
            <div className="shop-section-heading">
              <h3>Construisez votre chaîne de production</h3>
              <p>
                Un bâtiment = une case constructible de 1 × 1. Après la
                recherche, payez uniquement le prix en or, sans deuxième
                paiement de matériaux.
              </p>
            </div>
            <div className="placement-picker" hidden={delivery === "inventory"}>
              <div>
                <strong>
                  {farm.buildings.length} / {slotCount(farm)} emplacements
                  occupés
                </strong>
                <span>
                  Les emplacements se débloquent dans Technologie → Terrain
                  constructible.
                </span>
              </div>
              <label>
                Placer le prochain bâtiment
                <select
                  aria-label="Emplacement du bâtiment"
                  value={Math.min(siteIndex, Math.max(0, sites.length - 1))}
                  disabled={!sites.length}
                  onChange={(e) => setSiteIndex(+e.target.value)}
                >
                  {sites.length ? (
                    sites.map((p, i) => (
                      <option key={p.x + "," + p.y} value={i}>
                        Case ({p.x}, {p.y})
                      </option>
                    ))
                  ) : (
                    <option>Aucun emplacement libre</option>
                  )}
                </select>
              </label>
            </div>
            <div className="product-grid building-products">
              {(Object.keys(buildings) as BuildingKind[]).map((kind) => {
                const spec = buildings[kind],
                  blocker =
                    delivery === "inventory"
                      ? inventoryPurchaseBlocker(farm, kind)
                      : shopBlocker(farm, kind, 1, site);
                return (
                  <article
                    className={"product-card " + (blocker ? "locked" : "")}
                    key={kind}
                  >
                    <div className="product-visual">
                      <ProductArt kind={kind} />
                      <span>CONSTRUCTION · 1 × 1</span>
                    </div>
                    <div className="product-content">
                      <div className="product-heading">
                        <h3>{spec.name}</h3>
                        <strong>◈ {spec.price} or</strong>
                      </div>
                      <p>{spec.description}</p>
                      <small>
                        Recherche :{" "}
                        {research.find((r) => r.id === spec.research)?.name}
                      </small>
                      <button
                        className="shop-buy"
                        disabled={!!blocker}
                        title={blocker ?? ""}
                        onClick={() =>
                          act(
                            {
                              type: "buy",
                              kind,
                              quantity: 1,
                              site,
                              store: delivery === "inventory",
                            },
                            delivery === "inventory"
                              ? `${spec.name} ajouté à l’inventaire.`
                              : `${spec.name} acheté et déployé.`,
                          )
                        }
                      >
                        Acheter {spec.name} · {spec.price} or
                      </button>
                      {blocker && (
                        <span className="purchase-blocker">{blocker}</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === "Consommables" && (
          <>
            <div className="shop-section-heading">
              <h3>Un coup de pouce aux cultures</h3>
              <p>
                Les achats arrivent dans les dépôts. Chargez-les dans la soute
                avant de quitter le dépôt.
              </p>
            </div>
            <article className="consumable-card">
              <ProductArt kind="Fertilizer" />
              <div>
                <span className="overline">ITEMS.FERTILIZER</span>
                <h3>Engrais</h3>
                <p>
                  25 or à l’achat, 18 or à la revente. L’effet nécessite la
                  recherche Engrais : +20 / 35 / 50 points de croissance selon
                  le niveau. Un engrais n’est pas consommé sur une plante mûre
                  ou une case vide.
                </p>
                <label className="quantity">
                  <span>Quantité</span>
                  <input
                    aria-label="Quantité d’engrais à acheter"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      Number.isNaN(amount("buy-fertilizer"))
                        ? ""
                        : amount("buy-fertilizer")
                    }
                    onChange={(e) =>
                      setAmount("buy-fertilizer", e.target.valueAsNumber)
                    }
                  />
                </label>
                <button
                  className="shop-buy"
                  disabled={
                    !!shopBlocker(farm, "Fertilizer", amount("buy-fertilizer"))
                  }
                  onClick={() =>
                    act(
                      {
                        type: "buy",
                        kind: "Fertilizer",
                        quantity: amount("buy-fertilizer"),
                      },
                      "Engrais acheté.",
                    )
                  }
                >
                  Acheter Engrais ·{" "}
                  {Number.isSafeInteger(amount("buy-fertilizer"))
                    ? 25 * amount("buy-fertilizer")
                    : 0}{" "}
                  or
                </button>
                <span className="purchase-blocker">
                  {shopBlocker(farm, "Fertilizer", amount("buy-fertilizer"))}
                </span>
              </div>
            </article>
          </>
        )}
        {tab === "Mon exploitation" && (
          <>
            <div className="shop-section-heading">
              <h3>Robots et bâtiments possédés</h3>
              <p>
                Chaque robot a son propre programme. La revente rapporte 50 % du
                prix payé ; videz d’abord la soute ou le bâtiment. L’atelier
                consomme une carcasse pour la reconstruire.
              </p>
            </div>
            <div className="asset-grid">
              {farm.robots.map((r) => (
                <article className="asset-card" key={r.id}>
                  <ProductArt kind={r.model} />
                  <div>
                    <h3>
                      {r.id} · {models[r.model].name}{" "}
                      {r.destroyed
                        ? "· Carcasse"
                        : r.loan
                          ? "· Prêt de secours"
                          : ""}
                    </h3>
                    <p>
                      {r.destroyed
                        ? "Le programme est conservé. La soute a été perdue."
                        : `${r.deployed ? "Déployé" : "Au garage"} · ${inventoryText(r.inventory)} · Soute ${sum(r.inventory)} / ${capacity(farm, r)} · Eau ${r.water.toFixed(1)} / 10`}
                    </p>
                    <div className="asset-actions">
                      {r.destroyed ? (
                        <button
                          disabled={
                            !farm.buildings.some(
                              (b) => b.kind === "Workshop",
                            ) || farm.gold < models[r.model].price * 0.4
                          }
                          onClick={() =>
                            act(
                              { type: "repair", id: r.id },
                              "Robot reconstruit.",
                            )
                          }
                        >
                          Reconstruire · {models[r.model].price * 0.4} or
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              onAction({ type: "select", id: r.id })
                            }
                          >
                            Programmer {r.id}
                          </button>
                          <button
                            disabled={!!assetBlocker(farm, r.id)}
                            title={assetBlocker(farm, r.id) ?? ""}
                            onClick={() =>
                              act(
                                { type: "resell", id: r.id },
                                "Robot revendu.",
                              )
                            }
                          >
                            Revendre · {r.paid / 2} or
                          </button>
                        </>
                      )}
                    </div>
                    {!r.destroyed && assetBlocker(farm, r.id) && (
                      <small>{assetBlocker(farm, r.id)}</small>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="asset-grid">
              {farm.buildings.map((b) => (
                <article
                  className="asset-card"
                  key={b.id}
                  data-building-id={b.id}
                >
                  <ProductArt kind={b.kind} />

                  <div>
                    <h3>
                      {buildings[b.kind].name} · ({b.x}, {b.y})
                    </h3>
                    <details className="building-upgrade-menu">
                      <summary>Améliorer {buildings[b.kind].name}</summary>
                      <AssetUpgradesPanel
                        farm={farm}
                        kind="building"
                        id={b.id}
                        onUpgrade={(upgrade) =>
                          act(
                            { type: "upgrade", id: b.id, upgrade },
                            "Bâtiment amélioré.",
                          )
                        }
                      />
                    </details>
                    <p>
                      {b.kind === "Depot"
                        ? inventoryText(b.inventory)
                        : b.kind === "Well" || b.kind === "Cistern"
                          ? `${b.water.toFixed(1)} eau`
                          : `Entrée : ${inventoryText(b.input)} · Sortie : ${inventoryText(b.output)}`}
                    </p>
                    {buildingStatus(b) && (
                      <small>
                        État : {buildingStatus(b)}
                        {b.cycle
                          ? ` · ${Math.ceil(b.cycle.ends - farm.time)} s`
                          : ""}
                      </small>
                    )}
                    <div className="asset-actions">
                      <button
                        disabled={!!assetBlocker(farm, b.id)}
                        title={assetBlocker(farm, b.id) ?? ""}
                        onClick={() =>
                          act({ type: "resell", id: b.id }, "Bâtiment revendu.")
                        }
                      >
                        Revendre · {b.paid / 2} or
                      </button>
                      <button
                        disabled={
                          !paused ||
                          !!(
                            sum(b.inventory) +
                            sum(b.input) +
                            sum(b.output) +
                            b.water
                          ) ||
                          !!b.cycle ||
                          !sites.length
                        }
                        title="Pendant une pause, bâtiment vide et sans cycle. L’emplacement se choisit dans Bâtiments."
                        onClick={() =>
                          site &&
                          act(
                            { type: "relocate", id: b.id, site },
                            "Bâtiment déplacé.",
                          )
                        }
                      >
                        Déplacer vers{" "}
                        {site ? `(${site.x}, ${site.y})` : "une case libre"}
                      </button>
                    </div>
                    <small>{assetBlocker(farm, b.id)}</small>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      <footer className="shop-footer">
        <span role="status">
          {message ||
            "Les recherches consomment des matériaux. Le magasin consomme de l’or."}
        </span>
        <span>◈ {farm.gold.toLocaleString("fr-FR")} or</span>
      </footer>
    </div>
  );
}
