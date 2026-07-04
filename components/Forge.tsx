"use client";

import { DAGGER_COST, useGuildStore, type Rarity } from "@/store/useGuildStore";
import { ICONS } from "@/components/assets";

const RARITY_STYLE: Record<Rarity, string> = {
  common: "text-gray-400 border-slate-700",
  uncommon: "text-green-400 border-green-500/30",
  rare: "text-blue-400 border-blue-500/30",
  epic: "text-purple-400 border-purple-500/30",
  legendary: "text-yellow-400 border-yellow-500/40",
};

export default function Forge() {
  const materials = useGuildStore((s) => s.ledger.materials);
  const inventory = useGuildStore((s) => s.inventory);
  const craftDagger = useGuildStore((s) => s.craftDagger);

  const canCraft =
    materials.organics >= DAGGER_COST.organics &&
    materials.minerals >= DAGGER_COST.minerals;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
        <img src={ICONS.forge} alt="" width={24} height={24} className="pixel size-6 object-contain" />
        <h2 className="text-lg font-semibold text-slate-100">Forge</h2>
      </div>

      {/* ── Crafting ── */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
              <img src={ICONS.organics} alt="Organics" width={18} height={18} className="pixel size-[18px] object-contain" />
              <span className={`font-mono tabular-nums ${materials.organics >= DAGGER_COST.organics ? "text-slate-200" : "text-rose-400"}`}>
                {materials.organics}/{DAGGER_COST.organics}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
              <img src={ICONS.minerals} alt="Minerals" width={18} height={18} className="pixel size-[18px] object-contain" />
              <span className={`font-mono tabular-nums ${materials.minerals >= DAGGER_COST.minerals ? "text-slate-200" : "text-rose-400"}`}>
                {materials.minerals}/{DAGGER_COST.minerals}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={craftDagger}
            disabled={!canCraft}
            title={canCraft ? undefined : `Need ${DAGGER_COST.organics} organics + ${DAGGER_COST.minerals} minerals`}
            className="min-h-10 cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Craft Dagger
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          60% Common · 25% Uncommon · 10% Rare · 4% Epic · 1% Legendary
        </p>
      </section>

      {/* ── Inventory ── */}
      <section className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Armory ({inventory.length})
        </h3>
        {inventory.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing forged yet. The anvil waits.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {inventory.map((item) => (
              <li
                key={item.id}
                className={`rounded-md border bg-slate-900 p-3 ${RARITY_STYLE[item.rarity]}`}
              >
                <p className="truncate text-sm font-medium">
                  {item.prefix ? `${item.prefix} ` : ""}
                  {item.name}
                </p>
                <p className="mt-1 text-xs capitalize opacity-75">{item.rarity}</p>
                <p className="mt-1 font-mono text-xs tabular-nums text-slate-300">
                  Power +{item.base_stats.power}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
