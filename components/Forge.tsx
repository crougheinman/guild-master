"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  RECIPES,
  useGuildStore,
  type MaterialKey,
  type SubType,
} from "@/store/useGuildStore";
import { ICONS } from "@/components/assets";
import ItemIcon from "@/components/ItemIcon";
import ModuleHelp from "@/components/ModuleHelp";
import { RARITY_STYLE, rarityBlurb, statLine } from "@/components/rarity";
import Tooltip from "@/components/Tooltip";

const LEGENDARY_GLOW = {
  boxShadow: [
    "0 0 4px 0 rgba(250, 204, 21, 0.2)",
    "0 0 14px 2px rgba(250, 204, 21, 0.45)",
    "0 0 4px 0 rgba(250, 204, 21, 0.2)",
  ],
};

const MAT_ICON: Record<MaterialKey, string> = {
  organics: ICONS.organics,
  minerals: ICONS.minerals,
  botanicals: ICONS.botanicals,
};

const SUBTYPES = Object.keys(RECIPES) as SubType[];

export default function Forge() {
  const materials = useGuildStore((s) => s.ledger.materials);
  const inventory = useGuildStore((s) => s.inventory);
  const craftItem = useGuildStore((s) => s.craftItem);
  const [selected, setSelected] = useState<SubType>("sword");

  const recipe = RECIPES[selected];
  const canCraft = (Object.entries(recipe.cost) as [MaterialKey, number][]).every(
    ([mat, need]) => materials[mat] >= need,
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
        <img src={ICONS.forge} alt="" width={24} height={24} className="pixel size-6 object-contain" />
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          Forge
          <ModuleHelp text="Spend materials (from quests) to craft gear. Pick a slot, then Craft — rarity and stat bonus roll randomly, higher tiers are rarer. Crafted items land in the Armory below and can be sold to heroes in the Market." />
        </h2>
      </div>

      {/* ── Crafting ── */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        {/* recipe picker */}
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Recipe">
          {SUBTYPES.map((st) => {
            const active = st === selected;
            return (
              <button
                key={st}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelected(st)}
                className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                  active
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <ItemIcon subType={st} size={20} />
                {st}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 text-sm">
            {(Object.entries(recipe.cost) as [MaterialKey, number][]).map(
              ([mat, need]) => (
                <span key={mat} className="flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                  <img src={MAT_ICON[mat]} alt={mat} width={18} height={18} className="pixel size-[18px] object-contain" />
                  <span
                    className={`font-mono tabular-nums ${materials[mat] >= need ? "text-slate-200" : "text-rose-400"}`}
                  >
                    {materials[mat]}/{need}
                  </span>
                </span>
              ),
            )}
          </div>
          <button
            type="button"
            onClick={() => craftItem(selected)}
            disabled={!canCraft}
            title={canCraft ? undefined : "Not enough materials"}
            className="min-h-10 cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium capitalize text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Craft {selected}
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {recipe.slot} slot · 60% Common · 25% Uncommon · 10% Rare · 4% Epic ·
          1% Legendary
          {recipe.slot === "accessory" &&
            " · may roll a rule-bending artifact effect"}
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
              <motion.li
                key={item.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  ...(item.rarity === "legendary" ? LEGENDARY_GLOW : {}),
                }}
                transition={{
                  duration: 0.25,
                  ...(item.rarity === "legendary"
                    ? { boxShadow: { duration: 1.8, repeat: Infinity } }
                    : {}),
                }}
                className={`rounded-md border bg-slate-900 ${RARITY_STYLE[item.rarity]}`}
              >
                <Tooltip text={rarityBlurb(item)}>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <ItemIcon subType={item.subType} size={24} />
                      <p className="truncate text-sm font-medium">
                        {item.prefix ? `${item.prefix} ` : ""}
                        {item.name}
                      </p>
                    </div>
                    <p className="mt-1 text-xs capitalize opacity-75">
                      {item.rarity} {item.subType}
                    </p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-slate-300">
                      {statLine(item)}
                    </p>
                    {item.specialEffect && (
                      <p className="mt-0.5 text-xs text-fuchsia-400">✦ artifact</p>
                    )}
                  </div>
                </Tooltip>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
