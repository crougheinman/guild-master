"use client";

import { useEffect, useRef, useState } from "react";
import { ICONS } from "@/components/assets";
import { useGuildStore, type Rarity } from "@/store/useGuildStore";

const RARITY_STYLE: Record<Rarity, string> = {
  common: "text-gray-400 border-slate-700",
  uncommon: "text-green-400 border-green-500/30",
  rare: "text-blue-400 border-blue-500/30",
  epic: "text-purple-400 border-purple-500/30",
  legendary: "text-yellow-400 border-yellow-500/40",
};

export default function Market() {
  const heroes = useGuildStore((s) => s.heroes);
  const inventory = useGuildStore((s) => s.inventory);
  const heroBuyItem = useGuildStore((s) => s.heroBuyItem);

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
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {item.prefix ? `${item.prefix} ` : ""}
                    {item.name}
                  </p>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-amber-400">
                    {item.price}g
                  </span>
                </div>
                <p className="mt-1 text-xs capitalize opacity-75">{item.rarity}</p>
                <p className="mt-1 font-mono text-xs tabular-nums text-slate-300">
                  Power +{item.base_stats.power}
                </p>

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
