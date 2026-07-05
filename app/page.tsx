"use client";

import { useEffect, useState } from "react";
import { ICONS } from "@/components/assets";
import CombatVisualizer from "@/components/CombatVisualizer";
import Dungeons from "@/components/Dungeons";
import Forge from "@/components/Forge";
import GameTicker from "@/components/GameTicker";
import Market from "@/components/Market";
import RightPanel from "@/components/RightPanel";
import Tavern from "@/components/Tavern";
import { useGuildStore, type MaterialKey } from "@/store/useGuildStore";

type Tab = "tavern" | "dungeons" | "forge" | "market";

const NAV_TABS: { id: Tab; label: string }[] = [
  { id: "tavern", label: "Tavern" },
  { id: "dungeons", label: "Dungeons" },
  { id: "forge", label: "Forge" },
  { id: "market", label: "Market" },
];

const RESOURCES: {
  key: MaterialKey | "gold";
  label: string;
  icon: string;
}[] = [
  { key: "gold", label: "Gold", icon: ICONS.gold },
  { key: "organics", label: "Organics", icon: ICONS.organics },
  { key: "minerals", label: "Minerals", icon: ICONS.minerals },
  { key: "botanicals", label: "Botanicals", icon: ICONS.botanicals },
];

export default function Dashboard() {
  const ledger = useGuildStore((s) => s.ledger);
  const [activeTab, setActiveTab] = useState<Tab>("tavern");

  // persist middleware hydrates from localStorage on client only —
  // render values after mount to avoid SSR hydration mismatch
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <div className="grid h-dvh w-full grid-cols-[20%_55%_25%] overflow-hidden bg-slate-950 text-slate-200">
      <GameTicker />
      {/* ── Left: Command Center ── */}
      <aside className="flex flex-col overflow-y-auto border-r border-slate-800 bg-slate-900">
        <header className="border-b border-slate-800 px-4 py-5">
          <h1 className="font-semibold tracking-wide text-amber-400">
            Micro-Guildmaster
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">Command Center</p>
        </header>

        <section aria-label="Treasury" className="border-b border-slate-800 px-4 py-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Treasury
          </h2>
          <ul className="space-y-2">
            {RESOURCES.map((r) => (
              <li
                key={r.key}
                className="flex items-center gap-2.5 rounded-md bg-slate-800/50 px-3 py-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- pixel art: next/image resampling would blur it */}
                <img
                  src={r.icon}
                  alt=""
                  width={22}
                  height={22}
                  className="pixel size-[22px] object-contain"
                />
                <span className="text-sm text-slate-400">{r.label}</span>
                <span className="ml-auto font-mono text-sm tabular-nums text-slate-100">
                  {hydrated
                    ? (r.key === "gold"
                        ? ledger.gold
                        : ledger.materials[r.key]
                      ).toLocaleString()
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="Guild navigation" className="px-4 py-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Navigation
          </h2>
          <div className="space-y-1.5">
            {NAV_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={`block min-h-11 w-full cursor-pointer rounded-md border px-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                    active
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* ── Center: Main Stage ── */}
      <main className="flex flex-col overflow-y-auto">
        {/* permanent combat stage — live PixiJS duels while heroes quest */}
        <div className="h-[22%] min-h-[150px] shrink-0 border-b border-slate-800 bg-slate-900/50">
          {hydrated && <CombatVisualizer />}
        </div>
        <div className="flex-1 overflow-y-auto">
          {!hydrated ? null : activeTab === "tavern" ? (
            <Tavern />
          ) : activeTab === "dungeons" ? (
            <Dungeons />
          ) : activeTab === "forge" ? (
            <Forge />
          ) : (
            <Market />
          )}
        </div>
      </main>

      {/* ── Right: Roster & Log ── */}
      <aside className="overflow-hidden border-l border-slate-800 bg-slate-900">
        {/* gate on hydration: roster/log read persisted state */}
        {hydrated && <RightPanel />}
      </aside>
    </div>
  );
}
