"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { avatarFor, ICONS } from "@/components/assets";
import CountdownBar from "@/components/CountdownBar";
import { RARITY_BG, rarityBlurb, statLine } from "@/components/rarity";
import Tooltip from "@/components/Tooltip";
import {
  GEAR_SLOTS,
  HEAL_COST,
  RETIRE_REP_PER_LEVEL,
  totalStats,
  useGuildStore,
  type Hero,
  type HeroStatus,
} from "@/store/useGuildStore";

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

// compact always-visible stat strip (1) — totals include gear
function QuickStats({ hero }: { hero: Hero }) {
  const t = totalStats(hero);
  const powerBonus = t.power - hero.stats.power;
  return (
    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      <div className="flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
        <img src={ICONS.power} alt="Power" width={14} height={14} className="pixel size-3.5 object-contain" />
        <dt className="sr-only">Power</dt>
        <dd className="font-mono tabular-nums text-slate-300">
          {hero.stats.power}
          {powerBonus !== 0 && (
            <span className={powerBonus > 0 ? "text-emerald-400" : "text-rose-400"}>
              {" "}
              {powerBonus > 0 ? `+${powerBonus}` : powerBonus}
            </span>
          )}
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
        <img src={ICONS.speed} alt="Speed" width={14} height={14} className="pixel size-3.5 object-contain" />
        <dt className="sr-only">Speed</dt>
        <dd className="font-mono tabular-nums text-slate-300">{t.speed}</dd>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-rose-400/80">Greed</span>
        <dd className="font-mono tabular-nums text-slate-300">
          {Math.round(hero.attr.greed * 100)}%
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
        <img src={ICONS.gold} alt="Wealth" width={14} height={14} className="pixel size-3.5 object-contain" />
        <dd className="font-mono tabular-nums text-amber-400">{hero.personal_wealth}g</dd>
      </div>
    </dl>
  );
}

// 5 gear-slot squares, rarity-tinted, tooltip per item
function GearSlots({ hero }: { hero: Hero }) {
  return (
    <div className="mt-2 flex gap-1.5" aria-label="Equipped gear">
      {GEAR_SLOTS.map((slot) => {
        const item = hero.gear[slot];
        return (
          <Tooltip
            key={slot}
            text={
              item
                ? `${item.prefix ? `${item.prefix} ` : ""}${item.name} — ${statLine(item)}. ${rarityBlurb(item)}`
                : `${slot}: empty`
            }
          >
            <span
              className={`block size-4 rounded-sm border ${
                item
                  ? `${RARITY_BG[item.rarity]} border-slate-950/40`
                  : "border-slate-700 bg-slate-800/60"
              }`}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}

// full breakdown, reused by click-expand (2) and hover tooltip (3)
function StatSheet({ hero }: { hero: Hero }) {
  const t = totalStats(hero);
  const equipped = GEAR_SLOTS.filter((s) => hero.gear[s]).length;
  const rows: [string, string][] = [
    ["Power", `${t.power}${t.power !== hero.stats.power ? ` (base ${hero.stats.power})` : ""}`],
    ["Fortitude", `${hero.stats.fortitude}/${t.maxFortitude}`],
    ["Speed", `${t.speed}`],
    ["Greed", `${Math.round(hero.attr.greed * 100)}%`],
    ["Scavenge", `${t.scavenge}×`],
    ["Wealth", `${hero.personal_wealth}g`],
    ["Gear", `${equipped}/5 equipped`],
    ["XP", `${hero.exp}/${hero.expToNext}`],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="col-span-2 grid grid-cols-subgrid">
          <dt className="text-slate-500">{k}</dt>
          <dd className="text-right font-mono tabular-nums text-slate-200">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function RightPanel() {
  const heroes = useGuildStore((s) => s.heroes);
  const gold = useGuildStore((s) => s.ledger.gold);
  const eventLog = useGuildStore((s) => s.eventLog);
  const healHero = useGuildStore((s) => s.healHero);
  const activeQuests = useGuildStore((s) => s.activeQuests);
  const dungeons = useGuildStore((s) => s.dungeons);
  const floatingTexts = useGuildStore((s) => s.floatingTexts);
  const removeFloatingText = useGuildStore((s) => s.removeFloatingText);
  const retireHero = useGuildStore((s) => s.retireHero);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            const { fortitude } = hero.stats;
            const maxFort = totalStats(hero).maxFortitude; // armor counts
            const pct = Math.round((fortitude / maxFort) * 100);
            const hurt = fortitude < maxFort;
            const canAfford = gold >= HEAL_COST;
            const status = STATUS_LABEL[hero.status];
            const quest = activeQuests.find((q) => q.heroId === hero.id);
            const questDungeon = quest
              ? dungeons.find((d) => d.id === quest.dungeonId)
              : undefined;
            const expanded = expandedId === hero.id;

            return (
              <li
                key={hero.id}
                className="relative rounded-md border border-slate-800 bg-slate-800/40 p-3"
              >
                {/* floating quest-result text, drifts up and fades */}
                {floatingTexts
                  .filter((f) => f.heroId === hero.id)
                  .map((f) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: -20 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      onAnimationComplete={() => removeFloatingText(f.id)}
                      className={`pointer-events-none absolute right-3 top-2 z-10 font-mono text-sm font-bold ${f.color}`}
                    >
                      {f.text}
                    </motion.div>
                  ))}
                {/* header: click toggles full sheet (2), hover shows tooltip (3) */}
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((cur) => (cur === hero.id ? null : hero.id))
                    }
                    aria-expanded={expanded}
                    aria-label={`${hero.name} stats`}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                  >
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
                    <span
                      className={`shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-90" : ""}`}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </button>

                  {/* hover tooltip (3) — hidden while expanded to avoid double sheet */}
                  {!expanded && (
                    <div className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-full rounded-md border border-slate-700 bg-slate-900 p-2.5 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                      <StatSheet hero={hero} />
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <div
                    role="meter"
                    aria-label={`${hero.name} fortitude`}
                    aria-valuenow={fortitude}
                    aria-valuemin={0}
                    aria-valuemax={maxFort}
                    className="h-2 overflow-hidden rounded-full bg-slate-700"
                  >
                    <motion.div
                      className={`h-full rounded-full ${hpBarColor(pct)}`}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-xs tabular-nums text-slate-400">
                      {fortitude}/{maxFort}
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

                {/* always-visible compact stats (1) */}
                <QuickStats hero={hero} />
                <GearSlots hero={hero} />

                {/* click-expanded full sheet (2) */}
                {expanded && (
                  <div className="mt-2 rounded-md border border-slate-700 bg-slate-900/60 p-2.5">
                    <StatSheet hero={hero} />
                  </div>
                )}

                {quest && questDungeon && (
                  <CountdownBar
                    completionTime={quest.completionTime}
                    duration={questDungeon.base_duration_ms / totalStats(hero).speed}
                  />
                )}

                <div className="mt-2 flex gap-1.5">
                  {hurt && hero.status !== "on_quest" && (
                    <button
                      type="button"
                      onClick={() => healHero(hero.id)}
                      disabled={!canAfford}
                      title={canAfford ? undefined : `Need ${HEAL_COST} gold`}
                      className="min-h-9 flex-1 cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Heal ({HEAL_COST}g)
                    </button>
                  )}
                  {hero.status === "idle" && (
                    <Tooltip
                      text={`Retire ${hero.name} for +${hero.level * RETIRE_REP_PER_LEVEL} reputation. Permanent.`}
                    >
                      <button
                        type="button"
                        onClick={() => retireHero(hero.id)}
                        className="min-h-9 w-full cursor-pointer rounded-md border border-rose-500/40 bg-rose-500/10 px-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
                      >
                        Retire
                      </button>
                    </Tooltip>
                  )}
                </div>
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
