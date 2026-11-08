import { useState } from "react";
import {
  assetBlocker,
  buildingStatus,
  capacity,
  freeSlots,
  getStock,
  shopBlocker,
  slotCount,
  stockCapacity,
  totalStock,
  type Farm,
} from "./engine";
import {
  buildings,
  formatCost,
  itemNames,
  items,
  models,
  research,
  salePrices,
  sum,
  tradeOrders,
  type BuildingKind,
  type Item,
  type Model,
} from "./catalog";
import { ResourceIcon } from "./Icons";
export type ShopAction =
  | {
      type: "buy";
      kind: Model | BuildingKind | "Fertilizer";
      quantity: number;
      site?: { x: number; y: number };
    }
  | { type: "sell"; item: Item; quantity: number }
  | { type: "order"; id: string }
  | { type: "resell" | "repair" | "select"; id: string }
  | { type: "relocate"; id: string; site: { x: number; y: number } };
export function ProductArt({ kind }: { kind: string }) {
  if (["Wheat", "Wood", "Carrot"].includes(kind))
    return (
      <ResourceIcon kind={kind.toLowerCase() as "wheat" | "wood" | "carrot"} />
    );
  const isRobot = kind in models,
    drone = kind === "Drone",
    transporter = kind === "Transporter";
  return (
    <svg className="product-art" viewBox="0 0 160 120" aria-hidden="true">
      <ellipse cx="83" cy="103" rx="48" ry="8" fill="#293e43" opacity=".22" />
      {isRobot ? (
        <g stroke="#494a2a" strokeWidth="2" strokeLinejoin="round">
          {drone ? (
            <>
              <path
                d="M34 32l92 52M35 85l90-52"
                stroke="#6d6238"
                strokeWidth="8"
              />
              <ellipse cx="34" cy="32" rx="24" ry="5" fill="#485349" />
              <ellipse cx="126" cy="84" rx="24" ry="5" fill="#485349" />
              <ellipse cx="35" cy="85" rx="24" ry="5" fill="#485349" />
              <ellipse cx="125" cy="33" rx="24" ry="5" fill="#485349" />
              <path d="m55 46 32-9 23 22-10 21-33 6-21-19Z" fill="#bc9850" />
            </>
          ) : (
            <>
              <path d="m32 70 76-9 26 17-8 20-81 5-20-16Z" fill="#454d3c" />
              {[34, 107].map((x) => (
                <g key={x}>
                  <ellipse cx={x} cy="88" rx="14" ry="20" fill="#303b34" />
                  <ellipse cx={x} cy="88" rx="6" ry="10" fill="#8c9162" />
                </g>
              ))}
              <path
                d={
                  transporter
                    ? "m38 38 69-7 26 23-6 30-70 6-25-23Z"
                    : "m48 38 40-7 28 20-4 35-44 7-26-20Z"
                }
                fill={transporter ? "#b29459" : "#adb04e"}
              />
              <path
                d={
                  transporter
                    ? "m38 38 69-7 26 23-70 8Z"
                    : "m48 38 40-7 28 20-43 8Z"
                }
                fill="#d3c36f"
              />
              <path d="m74 58 30-5-1 13-28 5Z" fill="#3e645b" />
              {!transporter && (
                <>
                  <path d="m35 90-14 12h41l5-11" fill="#837949" />
                  <path
                    d="m21 102-4 10m18-10-2 10m18-10v9"
                    stroke="#454a38"
                    strokeWidth="4"
                  />
                </>
              )}
            </>
          )}
          <path d="m73 37 19-3 8 11-21 4Z" fill="#dbbf65" />
          <path d="m82 29 2-10" stroke="#555d3f" />
          <circle cx="84" cy="18" r="3" fill="#cadb7c" />
        </g>
      ) : kind in buildings ? (
        <g stroke="#5a4a30" strokeWidth="2" strokeLinejoin="round">
          <path
            d="m36 64 61-14 29 23v27l-63 10-27-22Z"
            fill={kind === "Cistern" || kind === "Well" ? "#8c5a2f" : "#bd9d67"}
          />
          <path d="m36 64 61-14 29 23-63 12Z" fill="#d0b775" />
          <path d="m63 85 63-12v27l-63 10Z" fill="#9d7e4b" />
          {kind === "Well" || kind === "Cistern" ? (
            <>
              <ellipse cx="81" cy="61" rx="36" ry="20" fill="#70502e" />
              <ellipse cx="81" cy="61" rx="28" ry="14" fill="#477c68" />
              <path
                d="M47 74q35 23 69-7M45 88q36 21 72-6"
                fill="none"
                stroke="#493c27"
                strokeWidth="4"
              />
              {kind === "Well" && (
                <path
                  d="M44 57V30l71-13v38M42 30l35-21 40 9-36 22Z"
                  fill="#a2a34a"
                />
              )}
            </>
          ) : (
            <>
              <path
                d="m27 59 42-33 67 19-18 34-54 11Z"
                fill={kind === "Oven" ? "#a5623c" : "#7e6844"}
              />
              <path d="m27 59 42-33-5 39Z" fill="#c3aa68" />
              <path d="M78 104V83l21-4v21" fill="#535841" />
              {kind === "Mill" && (
                <>
                  <path
                    d="m85 22-3 61m-29-41 61 22"
                    stroke="#e0cc87"
                    strokeWidth="8"
                  />
                  <circle cx="83" cy="53" r="6" fill="#6c673d" />
                </>
              )}
              {kind === "Oven" && <path d="M111 45V13h14v38" fill="#9c7656" />}
              {kind === "Sawmill" && (
                <path
                  d="m20 91 56-10m-52 16 56-10"
                  stroke="#cbaf65"
                  strokeWidth="8"
                />
              )}
              {kind === "Composter" && (
                <path d="m50 54 29-13 31 7-16 16-30 5Z" fill="#6a8540" />
              )}
              {kind === "Workshop" && (
                <path
                  d="m81 55 15-15m-4-6 8 3 3 8-9 3-6-6Z"
                  fill="#ccc591"
                  strokeWidth="4"
                />
              )}
            </>
          )}
        </g>
      ) : (
        <g stroke="#7b723d" strokeWidth="2" strokeLinejoin="round">
          {kind === "Bread" ? (
            <path d="M35 86q-4-38 44-46t49 37l-5 18-73 9Z" fill="#d9a54b" />
          ) : kind === "Pumpkin" ? (
            <>
              <path d="m76 45 7-20 10 2-6 22" fill="#718a3a" />
              <path
                d="M35 72q0-33 44-30t49 31q0 34-48 33T35 72Z"
                fill="#d38b31"
              />
              <path d="M67 44q-24 35 0 60m24-59q28 31 4 58" fill="none" />
            </>
          ) : kind === "Plank" ? (
            <path
              d="m27 61 80-24 26 21-80 26Zm0 15 80-24 26 21-80 26Z"
              fill="#c19a54"
            />
          ) : (
            <>
              <path
                d="m52 34 39-5 15 15 17 49-60 14-24-22 18-40Z"
                fill={kind === "Fertilizer" ? "#849943" : "#d3c49a"}
              />
              <path d="m53 34 38-5 5 12-41 7Z" fill="#aa9a69" />
              <path
                d="m67 65 22-5 9 15-20 9-15-9Z"
                fill={kind === "Fertilizer" ? "#c3ce72" : "#b2a173"}
              />
            </>
          )}
          {kind === "Bread" && (
            <path
              d="m65 53 7 22m13-27 8 21m10-19 8 17"
              stroke="#ae7c31"
              strokeWidth="4"
            />
          )}
        </g>
      )}
    </svg>
  );
}
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
}: {
  farm: Farm;
  paused: boolean;
  onPause: () => void;
  onAction: (action: ShopAction) => boolean;
}) {
  const [tab, setTab] = useState("Vendre"),
    [amounts, setAmounts] = useState<Record<string, number>>({}),
    [siteIndex, setSiteIndex] = useState(0),
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
          <h2>Le shop</h2>
          <p>Produisez. Vendez. Équipez votre exploitation.</p>
        </div>
        <div className="shop-wallet">
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
      <nav className="shop-tabs" aria-label="Catégories du shop">
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
                  blocker = shopBlocker(farm, kind);
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
                            { type: "buy", kind, quantity: 1 },
                            `${spec.name} acheté.`,
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
            <div className="placement-picker">
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
                  blocker = shopBlocker(farm, kind, 1, site);
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
                            { type: "buy", kind, quantity: 1, site },
                            `${spec.name} acheté.`,
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
                <article className="asset-card" key={b.id}>
                  <ProductArt kind={b.kind} />
                  <div>
                    <h3>
                      {buildings[b.kind].name} · ({b.x}, {b.y})
                    </h3>
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
            "Les recherches consomment des matériaux. Le shop consomme de l’or."}
        </span>
        <span>◈ {farm.gold.toLocaleString("fr-FR")} or</span>
      </footer>
    </div>
  );
}
