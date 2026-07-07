"use client";

import { avatarFor } from "@/components/assets";
import ModuleHelp from "@/components/ModuleHelp";
import { MAX_HERO_LEVEL, useGuildStore } from "@/store/useGuildStore";

// Trophy room for retired Legends — heroes who hit the level cap and were
// retired. Each one permanently buffs the whole guild forever.
export default function HallOfFame() {
  const retiredHeroes = useGuildStore((s) => s.retiredHeroes);
  const prestigeBuffs = useGuildStore((s) => s.prestigeBuffs);

  return (
    <div className="p-4 pt-0">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-100">
        Hall of Fame
        <ModuleHelp text={`Heroes who reach the Lv ${MAX_HERO_LEVEL} cap can retire as Legends. Each Legend permanently grants +2% attack to the whole guild and raises the starting level of every future recruit by 1 — progression that outlives any single hero.`} />
      </h2>

      {/* current account-wide prestige totals */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-center">
          <p className="font-mono text-xl font-bold tabular-nums text-yellow-400">
            +{Math.round(prestigeBuffs.globalAttackBonus * 100)}%
          </p>
          <p className="text-xs text-slate-400">Guild attack bonus</p>
        </div>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-center">
          <p className="font-mono text-xl font-bold tabular-nums text-yellow-400">
            Lv {prestigeBuffs.startingLevel}
          </p>
          <p className="text-xs text-slate-400">Recruit starting level</p>
        </div>
      </div>

      {retiredHeroes.length === 0 ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-500">
          No Legends yet. Level a hero to {MAX_HERO_LEVEL} and retire them to
          enshrine them here.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {retiredHeroes.map((h) => (
            <li
              key={h.id}
              className="flex flex-col items-center rounded-lg border border-yellow-500/30 bg-slate-900 p-3 text-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
              <img
                src={avatarFor(h.id)}
                alt=""
                width={48}
                height={48}
                className="pixel size-12 rounded-md border border-yellow-500/40 bg-slate-800"
              />
              <p className="mt-2 truncate text-sm font-semibold text-yellow-300">
                {h.name}
              </p>
              <p className="text-xs text-slate-400">
                Lv {h.level} {h.class}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
