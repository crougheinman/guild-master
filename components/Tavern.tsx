"use client";

import { useEffect } from "react";
import { avatarFor, ICONS } from "@/components/assets";
import { HIRE_COST, useGuildStore } from "@/store/useGuildStore";

const STAT_ROWS = [
  { key: "power", label: "Power", icon: ICONS.power },
  { key: "fortitude", label: "Fortitude", icon: ICONS.fortitude },
  { key: "speed", label: "Speed", icon: ICONS.speed },
] as const;

export default function Tavern() {
  const candidates = useGuildStore((s) => s.tavernCandidates);
  const gold = useGuildStore((s) => s.ledger.gold);
  const refreshTavern = useGuildStore((s) => s.refreshTavern);
  const hireHero = useGuildStore((s) => s.hireHero);

  // first visit: roll candidates client-side (SSR stays deterministic)
  useEffect(() => {
    if (candidates.length === 0) refreshTavern();
  }, [candidates.length, refreshTavern]);

  const canAfford = gold >= HIRE_COST;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Tavern</h2>
        <button
          type="button"
          onClick={refreshTavern}
          className="min-h-9 cursor-pointer rounded-md border border-slate-700 px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          Refresh Candidates
        </button>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-slate-500">The tavern is empty tonight.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <li
              key={c.id}
              className="flex flex-col rounded-lg border border-slate-800 bg-slate-900 p-4"
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                <img
                  src={avatarFor(c.id)}
                  alt=""
                  width={48}
                  height={48}
                  className="pixel size-12 shrink-0 rounded-md border border-slate-700 bg-slate-800"
                />
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-slate-100">{c.name}</h3>
                  <span className="text-xs text-slate-500">
                    Lv {c.level} · {c.job}
                  </span>
                </div>
              </div>

              <dl className="mt-3 flex-1 space-y-1.5">
                {STAT_ROWS.map((row) => (
                  <div key={row.key} className="flex items-center gap-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                    <img
                      src={row.icon}
                      alt=""
                      width={18}
                      height={18}
                      className="pixel size-[18px] object-contain"
                    />
                    <dt className="text-slate-400">{row.label}</dt>
                    <dd className="ml-auto font-mono tabular-nums text-slate-200">
                      {c.stats[row.key]}
                    </dd>
                  </div>
                ))}
              </dl>

              <button
                type="button"
                onClick={() => hireHero(c.id)}
                disabled={!canAfford}
                title={canAfford ? undefined : `Need ${HIRE_COST} gold`}
                className="mt-4 min-h-10 cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Hire ({HIRE_COST}g)
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
