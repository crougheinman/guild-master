"use client";

import { useEffect, useRef, useState } from "react";
import { ICONS } from "@/components/assets";
import ItemIcon from "@/components/ItemIcon";
import { RARITY_STYLE, rarityBlurb, statLine } from "@/components/rarity";
import Tooltip from "@/components/Tooltip";
import {
  MATERIAL_BASE_PRICE,
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
  const materials = useGuildStore((s) => s.ledger.materials);
  const marketRates = useGuildStore((s) => s.marketRates);
  const sellMaterial = useGuildStore((s) => s.sellMaterial);

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
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Guild Shop</h2>

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
            {inventory.map((item) => (
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

                <button
                  type="button"
                  onClick={() => handleSell(item.id)}
                  className="mt-3 min-h-9 w-full cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  Sell to Guild ({item.price}g)
                </button>
                {errors[item.id] && (
                  <p role="alert" className="mt-1.5 text-xs text-rose-400">
                    {errors[item.id]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
