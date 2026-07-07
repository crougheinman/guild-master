"use client";

import { ICONS } from "@/components/assets";
import ModuleHelp from "@/components/ModuleHelp";
import {
  FACILITY_MAX_LEVEL,
  facilityUpgradeCost,
  useGuildStore,
  type FacilityKey,
} from "@/store/useGuildStore";

const FACILITIES: { key: FacilityKey; name: string; buff: (level: number) => string }[] = [
  {
    key: "tavern",
    name: "Tavern",
    buff: (level) =>
      level === 0
        ? "No passive regen yet."
        : `Idle heroes regen ${(0.5 * level).toFixed(1)}% max HP/sec.`,
  },
  {
    key: "forge",
    name: "Forge",
    buff: (level) =>
      level === 0
        ? "No crafting bonus yet."
        : `+${5 * level} rarity roll bonus on crafted gear.`,
  },
  {
    key: "bountyBoard",
    name: "Bounty Board",
    buff: (level) =>
      level === 0
        ? "Locked — reach Lv 1 to unlock Offline Expeditions (coming soon)."
        : "Offline Expeditions unlocked (coming soon).",
  },
];

export default function GuildHallScreen() {
  const gold = useGuildStore((s) => s.ledger.gold);
  const guildFacilities = useGuildStore((s) => s.guildFacilities);
  const upgradeFacility = useGuildStore((s) => s.upgradeFacility);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          Facilities
          <ModuleHelp text="Leveled guild facilities, upgraded repeatedly with gold. Each level compounds its passive buff — Tavern heals idle roster heroes over time, Forge biases crafted gear toward higher rarity, and the Bounty Board unlocks future offline play once leveled." />
        </h2>
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {FACILITIES.map((f) => {
          const levelKey = `${f.key}Level` as const;
          const level = guildFacilities[levelKey];
          const maxed = level >= FACILITY_MAX_LEVEL;
          const cost = facilityUpgradeCost(f.key, level);
          const affordable = gold >= cost;

          return (
            <li
              key={f.key}
              className={`flex flex-col rounded-lg border p-4 ${
                level > 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800 bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-100">{f.name}</h3>
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  Lv {level}/{FACILITY_MAX_LEVEL}
                </span>
              </div>
              <p className="mt-1 flex-1 text-sm text-slate-400">{f.buff(level)}</p>

              {!maxed && (
                <div className="mt-3 flex items-center gap-1 text-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                  <img src={ICONS.gold} alt="Gold" width={14} height={14} className="pixel size-3.5 object-contain" />
                  <span className={`font-mono tabular-nums ${affordable ? "text-slate-200" : "text-rose-400"}`}>
                    {cost.toLocaleString()}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => upgradeFacility(f.key, cost)}
                disabled={maxed || !affordable}
                title={maxed ? undefined : affordable ? undefined : "Not enough gold"}
                className={`mt-3 min-h-10 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                  maxed
                    ? "cursor-default border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "cursor-pointer border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                }`}
              >
                {maxed ? "Max Level" : "Upgrade"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
