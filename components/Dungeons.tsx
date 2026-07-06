"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { BOSS_ART, DUNGEON_ART } from "@/components/assets";
import BossPrepScreen from "@/components/BossPrepScreen";
import HeroPicker from "@/components/HeroPicker";
import { BOSSES, useGuildStore, type Dungeon } from "@/store/useGuildStore";

const formatDuration = (ms: number) =>
  ms >= 60_000 ? `${Math.round(ms / 60_000)}m` : `${Math.round(ms / 1000)}s`;

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
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Dungeons</h2>

      {/* ── Boss raids ── */}
      <section className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Boss Raids
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
