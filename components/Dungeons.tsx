"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DUNGEON_ART } from "@/components/assets";
import HeroPicker from "@/components/HeroPicker";
import { useGuildStore, type Dungeon } from "@/store/useGuildStore";

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
  const [pickerDungeon, setPickerDungeon] = useState<Dungeon | null>(null);

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Dungeons</h2>
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
