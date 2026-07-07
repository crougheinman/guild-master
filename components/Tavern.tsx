"use client";

import { useEffect, useRef, useState } from "react";
import { avatarFor, ICONS } from "@/components/assets";
import ModuleHelp from "@/components/ModuleHelp";
import { hireCost, rosterCap, useGuildStore } from "@/store/useGuildStore";

const STAT_ROWS = [
  { key: "power", label: "Power", icon: ICONS.power },
  { key: "fortitude", label: "Fortitude", icon: ICONS.fortitude },
  { key: "speed", label: "Speed", icon: ICONS.speed },
] as const;

export default function Tavern() {
  const candidates = useGuildStore((s) => s.tavernCandidates);
  const gold = useGuildStore((s) => s.ledger.gold);
  const heroes = useGuildStore((s) => s.heroes);
  const upgrades = useGuildStore((s) => s.upgrades);
  const refreshTavern = useGuildStore((s) => s.refreshTavern);
  const hireHero = useGuildStore((s) => s.hireHero);

  // first visit: roll candidates client-side (SSR stays deterministic)
  useEffect(() => {
    if (candidates.length === 0) refreshTavern();
  }, [candidates.length, refreshTavern]);

  const cap = rosterCap(upgrades);
  const rosterFull = heroes.length >= cap;

  // transient "roster full" feedback on a failed hire attempt, same pattern
  // as Market's per-item sell error
  const [fullError, setFullError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleHire = (candidateId: string) => {
    if (hireHero(candidateId)) return;
    if (rosterFull) {
      setFullError(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFullError(false), 3000);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          Tavern
          <ModuleHelp text="Hire heroes here for gold. Each candidate has random stats and a job class — check Power, Fortitude, and Speed before hiring. Your roster has a size cap, shown on the Roster panel; retire a hero or buy the Bigger Beds upgrade in the Guild Hall to make room." />
        </h2>
        <button
          type="button"
          onClick={refreshTavern}
          className="min-h-9 cursor-pointer rounded-md border border-slate-700 px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          Refresh Candidates
        </button>
      </div>

      {rosterFull && (
        <p
          role="alert"
          className={`mb-4 rounded-md border px-3 py-2 text-sm transition-colors ${
            fullError
              ? "border-rose-500/60 bg-rose-500/15 text-rose-300"
              : "border-rose-500/30 bg-rose-500/5 text-rose-400"
          }`}
        >
          Guild roster is full ({heroes.length}/{cap}). Retire a hero or upgrade Bigger Beds to hire more.
        </p>
      )}

      {candidates.length === 0 ? (
        <p className="text-sm text-slate-500">The tavern is empty tonight.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => {
            const base = hireCost(heroes.length);
            const cost = c.traits.negative === "glutton" ? base * 2 : base;
            const canAffordThis = gold >= cost;
            return (
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
                onClick={() => handleHire(c.id)}
                disabled={!canAffordThis}
                title={
                  rosterFull
                    ? `Roster full (${heroes.length}/${cap})`
                    : canAffordThis
                      ? undefined
                      : `Need ${cost} gold`
                }
                className="mt-4 min-h-10 cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Hire ({cost}g)
              </button>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
