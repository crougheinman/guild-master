"use client";

import { avatarFor } from "@/components/assets";
import CountdownBar from "@/components/CountdownBar";
import { HEAL_COST, useGuildStore, type HeroStatus } from "@/store/useGuildStore";

const STATUS_LABEL: Record<HeroStatus, { text: string; className: string }> = {
  idle: { text: "idle", className: "text-emerald-400" },
  on_quest: { text: "questing", className: "text-sky-400" },
  injured: { text: "resting", className: "text-rose-400" },
};

function hpBarColor(pct: number) {
  if (pct > 50) return "bg-emerald-500";
  if (pct > 25) return "bg-amber-500";
  return "bg-rose-500";
}

export default function RightPanel() {
  const heroes = useGuildStore((s) => s.heroes);
  const gold = useGuildStore((s) => s.ledger.gold);
  const eventLog = useGuildStore((s) => s.eventLog);
  const healHero = useGuildStore((s) => s.healHero);
  const activeQuests = useGuildStore((s) => s.activeQuests);
  const dungeons = useGuildStore((s) => s.dungeons);

  return (
    <div className="flex h-full flex-col">
      {/* ── Roster (60%) ── */}
      <section
        aria-label="Hero roster"
        className="flex h-[60%] flex-col border-b border-slate-800"
      >
        <h2 className="border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Roster
        </h2>
        <ul className="flex-1 space-y-2 overflow-y-auto p-3">
          {heroes.map((hero) => {
            const { fortitude, max_fortitude } = hero.stats;
            const pct = Math.round((fortitude / max_fortitude) * 100);
            const hurt = fortitude < max_fortitude;
            const canAfford = gold >= HEAL_COST;
            const status = STATUS_LABEL[hero.status];
            const quest = activeQuests.find((q) => q.heroId === hero.id);
            const questDungeon = quest
              ? dungeons.find((d) => d.id === quest.dungeonId)
              : undefined;

            return (
              <li
                key={hero.id}
                className="rounded-md border border-slate-800 bg-slate-800/40 p-3"
              >
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                  <img
                    src={avatarFor(hero.id)}
                    alt=""
                    width={36}
                    height={36}
                    className="pixel size-9 shrink-0 rounded-md border border-slate-700 bg-slate-800"
                  />
                  <span className="truncate text-sm font-medium text-slate-100">
                    {hero.name}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-slate-500">
                    Lv {hero.level} · {hero.job}
                  </span>
                </div>

                <div className="mt-2">
                  <div
                    role="meter"
                    aria-label={`${hero.name} fortitude`}
                    aria-valuenow={fortitude}
                    aria-valuemin={0}
                    aria-valuemax={max_fortitude}
                    className="h-2 overflow-hidden rounded-full bg-slate-700"
                  >
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${hpBarColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-xs tabular-nums text-slate-400">
                      {fortitude}/{max_fortitude}
                    </span>
                    <span className={`text-xs font-medium ${status.className}`}>
                      {status.text}
                    </span>
                  </div>
                </div>

                {/* EXP toward next level */}
                <div className="mt-1.5">
                  <div
                    role="meter"
                    aria-label={`${hero.name} experience`}
                    aria-valuenow={hero.exp}
                    aria-valuemin={0}
                    aria-valuemax={hero.expToNext}
                    className="h-1 overflow-hidden rounded-full bg-slate-700/70"
                  >
                    <div
                      className="h-full rounded-full bg-violet-500 transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, (hero.exp / hero.expToNext) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-right font-mono text-[10px] tabular-nums text-slate-500">
                    XP {hero.exp}/{hero.expToNext}
                  </p>
                </div>

                {quest && questDungeon && (
                  <CountdownBar
                    completionTime={quest.completionTime}
                    duration={questDungeon.base_duration_ms / hero.stats.speed}
                  />
                )}

                {hurt && hero.status !== "on_quest" && (
                  <button
                    type="button"
                    onClick={() => healHero(hero.id)}
                    disabled={!canAfford}
                    title={canAfford ? undefined : `Need ${HEAL_COST} gold`}
                    className="mt-2 min-h-9 w-full cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Heal ({HEAL_COST}g)
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Event Log (40%) ── */}
      <section aria-label="Event log" className="flex h-[40%] flex-col">
        <h2 className="border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Event Log
        </h2>
        {/* flex-col-reverse + newest-first array = newest at bottom, scroll auto-pinned */}
        <ol
          aria-live="polite"
          className="flex flex-1 flex-col-reverse overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed text-slate-300"
        >
          {eventLog.length === 0 && (
            <li className="text-slate-600">No events yet. Dispatch a hero.</li>
          )}
          {eventLog.map((entry) => (
            <li key={entry.id} className="py-0.5">
              <span className="mr-2 text-slate-600">
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  hour12: false,
                })}
              </span>
              {entry.message}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
