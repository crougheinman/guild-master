"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { BOSS_ART, DUNGEON_ART } from "@/components/assets";
import BossPrepScreen from "@/components/BossPrepScreen";
import CountdownBar from "@/components/CountdownBar";
import HeroPicker from "@/components/HeroPicker";
import ModuleHelp from "@/components/ModuleHelp";
import {
  BOSSES,
  EXPEDITION_DURATIONS_MS,
  EXPEDITION_GOLD_PER_POWER_HOUR,
  EXPEDITION_LEVEL_GOLD_BONUS,
  MAX_PARTY,
  totalStats,
  useGuildStore,
  type Dungeon,
} from "@/store/useGuildStore";

const formatDuration = (ms: number) =>
  ms >= 60_000 ? `${Math.round(ms / 60_000)}m` : `${Math.round(ms / 1000)}s`;

const formatHours = (ms: number) => `${ms / 3_600_000}h`;

// Offline Expeditions — the Bounty Board's game loop. Zero-risk, hands-off,
// deliberately ~20-25% of an active quester's gold rate (see store constants).
function BountyBoard() {
  const heroes = useGuildStore((s) => s.heroes);
  const level = useGuildStore((s) => s.guildFacilities.bountyBoardLevel);
  const expedition = useGuildStore((s) => s.expedition);
  const startExpedition = useGuildStore((s) => s.startExpedition);
  const [duration, setDuration] = useState(EXPEDITION_DURATIONS_MS[0]);

  const party = heroes
    .filter((h) => h.status === "idle" && h.stats.fortitude > 0)
    .slice(0, MAX_PARTY);

  if (level < 1) {
    return (
      <section className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Bounty Board
        </h3>
        <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-500">
          Locked — upgrade the Bounty Board in the Guild Hall to unlock offline
          expeditions.
        </p>
      </section>
    );
  }

  if (expedition) {
    const members = heroes.filter((h) => expedition.heroIds.includes(h.id));
    return (
      <section className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Bounty Board
        </h3>
        <div className="rounded-lg border border-sky-500/30 bg-slate-900 p-4">
          <p className="text-sm font-medium text-sky-300">
            Expedition underway — {members.map((h) => h.name).join(", ")}
          </p>
          <CountdownBar
            completionTime={expedition.completionTime}
            duration={expedition.durationMs}
          />
          <p className="mt-1 text-xs text-slate-500">
            They&apos;ll return on their own — rewards collect automatically, even
            while the game is closed.
          </p>
        </div>
      </section>
    );
  }

  const hours = duration / 3_600_000;
  const levelBonus = 1 + EXPEDITION_LEVEL_GOLD_BONUS * Math.max(0, level - 1);
  const estGold = Math.round(
    party.reduce((sum, h) => sum + totalStats(h).power, 0) *
      EXPEDITION_GOLD_PER_POWER_HOUR *
      hours *
      levelBonus,
  );

  return (
    <section className="mb-4">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Bounty Board
        <ModuleHelp text="Send your idle heroes on a long offline expedition — no risk of injury beyond normal fatigue, and rewards collect automatically when the timer ends, even with the game closed. The gold rate is lower than active questing; it's for when you're away. Higher Bounty Board levels unlock longer expeditions and pay +5% gold each." />
      </h3>
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap gap-2">
          {EXPEDITION_DURATIONS_MS.map((ms, i) => {
            const unlocked = i < level;
            const active = duration === ms;
            return (
              <button
                key={ms}
                type="button"
                disabled={!unlocked}
                onClick={() => setDuration(ms)}
                title={unlocked ? undefined : `Requires Bounty Board Lv ${i + 1}`}
                className={`min-h-9 cursor-pointer rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {formatHours(ms)}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-sm text-slate-400">
          {party.length === 0
            ? "No battle-ready heroes — everyone is questing, resting, or at 0 HP."
            : `Party: ${party.map((h) => h.name).join(", ")} · est. ~${estGold}g + materials`}
        </p>

        <button
          type="button"
          disabled={party.length === 0}
          onClick={() => startExpedition(party.map((h) => h.id), duration)}
          className="mt-3 min-h-12 w-full cursor-pointer rounded-md border border-sky-500/40 bg-sky-500/10 px-4 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send Expedition ({formatHours(duration)})
        </button>
      </div>
    </section>
  );
}

function DungeonCard({
  dungeon,
  onSend,
}: {
  dungeon: Dungeon;
  onSend: () => void;
}) {
  const art = DUNGEON_ART[dungeon.id];

  return (
    <li className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
      {art && (
        <div className="flex h-28 items-end justify-center overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-800/60 to-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
          <img
            src={art}
            alt=""
            className="pixel h-24 w-auto translate-y-2 object-contain"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-medium text-slate-100">{dungeon.name}</h3>
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {formatDuration(dungeon.base_duration_ms)}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Threat level{" "}
          <span className="font-mono tabular-nums text-rose-400">
            {dungeon.threat_level}
          </span>
        </p>

        {/* stays enabled with 0 idle heroes — the picker shows WHY nobody can go */}
        <button
          type="button"
          onClick={onSend}
          className="mt-3 min-h-12 w-full cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          Send Hero
        </button>
      </div>
    </li>
  );
}

export default function Dungeons() {
  const dungeons = useGuildStore((s) => s.dungeons);
  const bossFight = useGuildStore((s) => s.bossFight);
  const [pickerDungeon, setPickerDungeon] = useState<Dungeon | null>(null);
  const [selectedBossId, setSelectedBossId] = useState<string | null>(null);

  if (selectedBossId) {
    return (
      <BossPrepScreen
        bossId={selectedBossId}
        onBack={() => setSelectedBossId(null)}
      />
    );
  }

  const activeBoss = bossFight && BOSSES.find((b) => b.id === bossFight.bossId);

  return (
    <div className="p-4">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
        Dungeons
        <ModuleHelp text="Send idle heroes on quests here. Success depends on hero Power vs the dungeon's Threat level — higher threat pays more gold and materials but risks injury on a loss. Injured heroes rest at 0 Fortitude until healed in the Roster panel." />
      </h2>

      {/* ── Boss raids ── */}
      <section className="mb-4">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Boss Raids
          <ModuleHelp text="Pick a boss, assign potions/scrolls to your party in the Prep screen, then Begin Raid. Combat resolves automatically over several rounds — consumables like Life Potions and Phoenix Vials trigger on their own to save heroes. Win for gold, reputation, exp, and materials." />
        </h3>
        {activeBoss ? (
          <button
            type="button"
            onClick={() => setSelectedBossId(activeBoss.id)}
            className="flex w-full cursor-pointer items-center gap-4 rounded-lg border border-rose-500/40 bg-gradient-to-r from-rose-500/10 to-slate-900 p-4 text-left transition-colors hover:bg-rose-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- animated pixel gif */}
            <img src={BOSS_ART[activeBoss.id]} alt="" className="pixel h-16 w-auto shrink-0" />
            <span className="min-w-0">
              <span className="block font-semibold text-rose-300">
                Raid in progress: {activeBoss.name}
              </span>
              <span className="block text-xs text-slate-400">Tap to watch the battle</span>
            </span>
          </button>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {BOSSES.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setSelectedBossId(b.id)}
                  className="flex w-full cursor-pointer items-center gap-4 rounded-lg border border-rose-500/40 bg-gradient-to-r from-rose-500/10 to-slate-900 p-4 text-left transition-colors hover:bg-rose-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- animated pixel gif */}
                  <img src={BOSS_ART[b.id]} alt="" className="pixel h-16 w-auto shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-rose-300">{b.name}</span>
                    <span className="block text-xs text-slate-400">
                      {b.maxHp} HP · {b.rewardGold}g · +{b.rewardRep} rep
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Offline expeditions (Bounty Board facility) ── */}
      <BountyBoard />

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {dungeons.map((d) => (
          <DungeonCard
            key={d.id}
            dungeon={d}
            onSend={() => setPickerDungeon(d)}
          />
        ))}
      </ul>
      <AnimatePresence>
        {pickerDungeon && (
          <HeroPicker
            dungeon={pickerDungeon}
            onClose={() => setPickerDungeon(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
