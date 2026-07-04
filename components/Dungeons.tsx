"use client";

import { useState } from "react";
import { DUNGEON_ART } from "@/components/assets";
import CombatVisualizer from "@/components/CombatVisualizer";
import { useGuildStore, type Dungeon, type Hero } from "@/store/useGuildStore";

const formatDuration = (ms: number) =>
  ms >= 60_000 ? `${Math.round(ms / 60_000)}m` : `${Math.round(ms / 1000)}s`;

function DungeonCard({
  dungeon,
  idleHeroes,
}: {
  dungeon: Dungeon;
  idleHeroes: Hero[];
}) {
  const dispatchHero = useGuildStore((s) => s.dispatchHero);
  const [selectedId, setSelectedId] = useState("");

  // selected hero may have been dispatched elsewhere — treat stale pick as none
  const selection = idleHeroes.find((h) => h.id === selectedId);
  const selectId = `dispatch-${dungeon.id}`;

  const handleDispatch = () => {
    if (!selection) return;
    dispatchHero(selection.id, dungeon.id);
    setSelectedId("");
  };

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

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label
            htmlFor={selectId}
            className="mb-1 block text-xs font-medium text-slate-500"
          >
            Send hero
          </label>
          <select
            id={selectId}
            value={selection ? selectedId : ""}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={idleHeroes.length === 0}
            className="min-h-10 w-full cursor-pointer rounded-md border border-slate-700 bg-slate-800 px-2 text-sm text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <option value="">
              {idleHeroes.length === 0 ? "No idle heroes" : "Choose…"}
            </option>
            {idleHeroes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} (Pow {h.stats.power}, Spd {h.stats.speed})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleDispatch}
          disabled={!selection}
          className="min-h-10 cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Dispatch
        </button>
      </div>
      </div>
    </li>
  );
}

export default function Dungeons() {
  const dungeons = useGuildStore((s) => s.dungeons);
  const heroes = useGuildStore((s) => s.heroes);
  const idleHeroes = heroes.filter((h) => h.status === "idle");
  const anyQuesting = heroes.some((h) => h.status === "on_quest");

  return (
    <div className="p-4">
      {anyQuesting && (
        <div className="mb-4">
          <CombatVisualizer />
        </div>
      )}
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Dungeons</h2>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {dungeons.map((d) => (
          <DungeonCard key={d.id} dungeon={d} idleHeroes={idleHeroes} />
        ))}
      </ul>
    </div>
  );
}
