"use client";

import { useEffect, useState } from "react";
import { ICONS } from "@/components/assets";
import BossResultModal from "@/components/BossResultModal";
import CombatVisualizer from "@/components/CombatVisualizer";
import Dungeons from "@/components/Dungeons";
import Forge from "@/components/Forge";
import GameTicker from "@/components/GameTicker";
import GuildHallScreen from "@/components/GuildHallScreen";
import HallOfFame from "@/components/HallOfFame";
import GoldPopup from "@/components/GoldPopup";
import { MobileChatOverlay } from "@/components/HeroChatBubble";
import Market from "@/components/Market";
import RightPanel from "@/components/RightPanel";
import Settings from "@/components/Settings";
import ShadyMerchantModal from "@/components/ShadyMerchantModal";
import Tavern from "@/components/Tavern";
import Upgrades from "@/components/Upgrades";
import WelcomeModal from "@/components/WelcomeModal";
import { useGuildStore, type MaterialKey } from "@/store/useGuildStore";

type Tab =
  | "tavern"
  | "dungeons"
  | "forge"
  | "market"
  | "guild"
  | "settings"
  | "roster"; // mobile-only: renders RightPanel in the main area

const NAV_TABS: { id: Tab; label: string }[] = [
  { id: "tavern", label: "Tavern" },
  { id: "dungeons", label: "Dungeons" },
  { id: "forge", label: "Forge" },
  { id: "market", label: "Market" },
  { id: "guild", label: "Guild Hall" },
  { id: "settings", label: "Settings" },
];

// bottom bar: 6 fit at 375px; Settings lives in the mobile top bar gear
const MOBILE_TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "tavern", label: "Tavern", icon: ICONS.organics },
  { id: "dungeons", label: "Dungeons", icon: ICONS.power },
  { id: "forge", label: "Forge", icon: ICONS.forge },
  { id: "market", label: "Market", icon: ICONS.gold },
  { id: "guild", label: "Guild", icon: ICONS.fortitude },
  { id: "roster", label: "Roster", icon: ICONS.roster },
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
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-200 md:grid md:grid-cols-[20%_55%_25%]">
      <GameTicker />
      {hydrated && <MobileChatOverlay />}
      {hydrated && <BossResultModal />}
      {hydrated && <ShadyMerchantModal />}
      {hydrated && <WelcomeModal />}

      {/* ── Mobile top bar: treasury always visible + settings gear ── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900 px-3 py-2 md:hidden">
        {RESOURCES.map((r) => (
          <span key={r.key} className="relative flex items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
            <img src={r.icon} alt={r.label} width={16} height={16} className="pixel size-4 object-contain" />
            <span className="font-mono text-xs tabular-nums text-slate-200">
              {hydrated
                ? (r.key === "gold" ? ledger.gold : ledger.materials[r.key]).toLocaleString()
                : "—"}
            </span>
            {r.key === "gold" && <GoldPopup value={ledger.gold} active={hydrated} />}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          aria-label="Settings"
          aria-current={activeTab === "settings" ? "page" : undefined}
          className="ml-auto cursor-pointer rounded p-1 focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
          <img src={ICONS.settings} alt="" width={20} height={20} className="pixel size-5 object-contain" />
        </button>
      </header>

      {/* ── Left: Command Center (desktop only) ── */}
      <aside className="hidden flex-col overflow-y-auto border-r border-slate-800 bg-slate-900 md:flex">
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
                className="relative flex items-center gap-2.5 rounded-md bg-slate-800/50 px-3 py-2"
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
                {r.key === "gold" && <GoldPopup value={ledger.gold} active={hydrated} />}
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
      <main className="flex min-h-0 flex-1 flex-col md:min-h-full">
        {/* permanent combat stage — live PixiJS duels while heroes quest */}
        <div className="h-[26%] min-h-[130px] shrink-0 border-b border-slate-800 bg-slate-900/50 md:h-[32%] md:min-h-[220px]">
          {hydrated && <CombatVisualizer />}
        </div>
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {!hydrated ? null : activeTab === "tavern" ? (
            <Tavern />
          ) : activeTab === "dungeons" ? (
            <Dungeons />
          ) : activeTab === "forge" ? (
            <Forge />
          ) : activeTab === "market" ? (
            <Market />
          ) : activeTab === "guild" ? (
            <>
              <GuildHallScreen />
              <Upgrades />
              <HallOfFame />
            </>
          ) : activeTab === "roster" ? (
            // mobile: roster + logs take over the main area;
            // desktop already shows them in the right panel — show Tavern instead
            <>
              <div className="h-full overflow-hidden md:hidden">
                <RightPanel />
              </div>
              <div className="hidden md:block">
                <Tavern />
              </div>
            </>
          ) : (
            <Settings />
          )}
        </div>
      </main>

      {/* ── Right: Roster & Log (desktop only) ── */}
      <aside className="hidden overflow-hidden border-l border-slate-800 bg-slate-900 md:block">
        {/* gate on hydration: roster/log read persisted state */}
        {hydrated && <RightPanel />}
      </aside>

      {/* ── Mobile bottom navigation ── */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {MOBILE_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-400 ${
                active ? "text-amber-400" : "text-slate-400"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
              <img
                src={tab.icon}
                alt=""
                width={20}
                height={20}
                className={`pixel size-5 object-contain ${active ? "" : "opacity-60"}`}
              />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
