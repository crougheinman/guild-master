"use client";

import { useEffect, useRef, useState } from "react";
import { ICONS } from "@/components/assets";
import ItemIcon from "@/components/ItemIcon";
import ModuleHelp from "@/components/ModuleHelp";
import { RARITY_STYLE, rarityBlurb, statLine } from "@/components/rarity";
import { ShadyMerchantBanner } from "@/components/ShadyMerchantModal";
import Tooltip from "@/components/Tooltip";
import {
  CONSUMABLE_PRICE,
  MATERIAL_BASE_PRICE,
  scrapRefund,
  useGuildStore,
  type MaterialKey,
} from "@/store/useGuildStore";

const MATERIALS: { key: MaterialKey; label: string; icon: string }[] = [
  { key: "organics", label: "Organics", icon: ICONS.organics },
  { key: "minerals", label: "Minerals", icon: ICONS.minerals },
  { key: "botanicals", label: "Botanicals", icon: ICONS.botanicals },
];

const demand = (rate: number) =>
  rate >= 1.2
    ? { text: "High Demand", className: "text-emerald-400" }
    : rate <= 0.8
      ? { text: "Low Demand", className: "text-rose-400" }
      : { text: "Stable", className: "text-slate-400" };

export default function Market() {
  const heroes = useGuildStore((s) => s.heroes);
  const inventory = useGuildStore((s) => s.inventory);
  const heroBuyItem = useGuildStore((s) => s.heroBuyItem);
  const scrapItem = useGuildStore((s) => s.scrapItem);
  const materials = useGuildStore((s) => s.ledger.materials);
  const marketRates = useGuildStore((s) => s.marketRates);
  const sellMaterial = useGuildStore((s) => s.sellMaterial);
  const gold = useGuildStore((s) => s.ledger.gold);
  const consumables = useGuildStore((s) => s.consumables);
  const buyConsumable = useGuildStore((s) => s.buyConsumable);

  // itemId -> inline "no buyer" error, auto-cleared
  const [errors, setErrors] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  const totalWealth = heroes.reduce((sum, h) => sum + h.personal_wealth, 0);

  const handleSell = (itemId: string) => {
    if (heroBuyItem(itemId)) return;
    setErrors((e) => ({
      ...e,
      [itemId]: "No idle hero can afford this / wants this!",
    }));
    clearTimeout(timers.current[itemId]);
    timers.current[itemId] = setTimeout(
      () =>
        setErrors(({ [itemId]: _dropped, ...rest }) => rest),
      3000,
    );
  };

  return (
    <div className="p-4">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
        Guild Shop
        <ModuleHelp text="Three things happen here: sell surplus materials for gold, buy raid consumables (potions/scrolls) from the Apothecary, and sell Forge-crafted gear — heroes buy it themselves using their own personal wealth, so gear only sells if an idle hero can afford it and wants that slot (they'll also pick it up on their own every few seconds without you clicking anything). Nobody biting? Scrap it back into half its crafting materials instead of letting it sit. Rarely, a shady merchant appears with powerful cursed gear — cheap, but every piece carries a permanent drawback." />
      </h2>

      {/* ── Shady Merchant re-entry (only while the event is live) ── */}
      <ShadyMerchantBanner />

      {/* ── The tease ── */}
      <section className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
        <img src={ICONS.gold} alt="" width={24} height={24} className="pixel size-6 object-contain" />
        <p className="text-sm text-slate-300">
          Total Hero Wealth:{" "}
          <span className="font-mono font-semibold tabular-nums text-amber-400">
            {totalWealth.toLocaleString()}g
          </span>
          <span className="ml-2 text-xs text-slate-500">
            — sell them gear to claw it back
          </span>
        </p>
      </section>

      {/* ── Commodity exchange: rates roll every 60s ── */}
      <section className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Commodity Exchange
        </h3>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {MATERIALS.map((m) => {
            const rate = marketRates[m.key];
            const d = demand(rate);
            const count = materials[m.key];
            const payout = Math.floor(count * MATERIAL_BASE_PRICE[m.key] * rate);
            return (
              <li key={m.key} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                  <img src={m.icon} alt="" width={18} height={18} className="pixel size-[18px] object-contain" />
                  <span className="text-sm text-slate-200">{m.label}</span>
                  <span className={`ml-auto text-xs font-medium ${d.className}`}>
                    {d.text} ({rate}×)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => sellMaterial(m.key)}
                  disabled={count === 0}
                  className="mt-2 min-h-9 w-full cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sell {count} for {payout}g
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Apothecary: buy boss-fight consumables (gold sink) ── */}
      <section className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Apothecary
        </h3>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {consumables.map((c) => {
            const price = CONSUMABLE_PRICE[c.id];
            return (
              <li key={c.id} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-200">{c.name}</span>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    owned ×{c.quantity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{c.effect}</p>
                <button
                  type="button"
                  onClick={() => buyConsumable(c.id)}
                  disabled={gold < price}
                  title={gold < price ? "Not enough gold" : undefined}
                  className="mt-2 min-h-9 w-full cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Buy ({price}g)
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Stock ── */}
      <section className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Shop Stock ({inventory.length})
        </h3>
        {inventory.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing in stock. Forge something first.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {inventory.map((item) => {
              const refundLabel = Object.entries(scrapRefund(item))
                .map(([mat, qty]) => `${qty} ${mat}`)
                .join(", ");
              return (
                <li
                  key={item.id}
                  className={`rounded-md border bg-slate-900 p-3 ${RARITY_STYLE[item.rarity]}`}
                >
                  <Tooltip text={rarityBlurb(item)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <ItemIcon subType={item.subType} size={24} />
                        <p className="truncate text-sm font-medium">
                          {item.prefix ? `${item.prefix} ` : ""}
                          {item.name}
                        </p>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-amber-400">
                        {item.price}g
                      </span>
                    </div>
                    <p className="mt-1 text-xs capitalize opacity-75">
                      {item.rarity} {item.subType}
                    </p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-slate-300">
                      {statLine(item)}
                    </p>
                  </Tooltip>

                  <div className="mt-3 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSell(item.id)}
                      className="min-h-9 flex-1 cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                    >
                      Sell to Guild ({item.price}g)
                    </button>
                    <Tooltip text="Returns half the materials it cost to craft. Instant, no buyer needed.">
                      <button
                        type="button"
                        onClick={() => scrapItem(item.id)}
                        className="min-h-9 w-full cursor-pointer rounded-md border border-slate-600 bg-slate-800/60 px-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                      >
                        Scrap (+{refundLabel})
                      </button>
                    </Tooltip>
                  </div>
                  {errors[item.id] && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-400">
                      {errors[item.id]}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
