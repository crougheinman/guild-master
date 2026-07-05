"use client";

import { ICONS } from "@/components/assets";
import { UPGRADE_IDS, useGuildStore } from "@/store/useGuildStore";

const UPGRADES = [
  {
    id: UPGRADE_IDS.beds,
    name: "Bigger Beds",
    desc: "+1 max roster size.",
    gold: 500,
    reputation: 100,
  },
  {
    id: UPGRADE_IDS.sharpening,
    name: "Sharpening Stones",
    desc: "+5 base power to all heroes.",
    gold: 1000,
    reputation: 300,
  },
  {
    id: UPGRADE_IDS.taxLoophole,
    name: "Tax Loophole",
    desc: "Heroes take 2% less greed cut.",
    gold: 2000,
    reputation: 500,
  },
] as const;

export default function Upgrades() {
  const gold = useGuildStore((s) => s.ledger.gold);
  const reputation = useGuildStore((s) => s.ledger.reputation);
  const upgrades = useGuildStore((s) => s.upgrades);
  const buyUpgrade = useGuildStore((s) => s.buyUpgrade);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Guild Hall</h2>
        <p className="text-sm text-slate-400">
          Reputation:{" "}
          <span className="font-mono font-semibold tabular-nums text-violet-400">
            {reputation.toLocaleString()}
          </span>
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {UPGRADES.map((u) => {
          const owned = upgrades.includes(u.id);
          const affordable = gold >= u.gold && reputation >= u.reputation;
          return (
            <li
              key={u.id}
              className={`flex flex-col rounded-lg border p-4 ${
                owned
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <h3 className="font-medium text-slate-100">{u.name}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-400">{u.desc}</p>

              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                  <img src={ICONS.gold} alt="Gold" width={14} height={14} className="pixel size-3.5 object-contain" />
                  <span className={`font-mono tabular-nums ${gold >= u.gold ? "text-slate-200" : "text-rose-400"}`}>
                    {u.gold.toLocaleString()}
                  </span>
                </span>
                <span className={`font-mono tabular-nums ${reputation >= u.reputation ? "text-violet-300" : "text-rose-400"}`}>
                  {u.reputation} rep
                </span>
              </div>

              <button
                type="button"
                onClick={() => buyUpgrade(u.id, { gold: u.gold, reputation: u.reputation })}
                disabled={owned || !affordable}
                title={owned ? undefined : affordable ? undefined : "Not enough gold or reputation"}
                className={`mt-3 min-h-10 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                  owned
                    ? "cursor-default border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "cursor-pointer border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                }`}
              >
                {owned ? "Owned" : "Purchase"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
