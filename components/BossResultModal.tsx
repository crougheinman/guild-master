"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ICONS } from "@/components/assets";
import { useGuildStore, type MaterialKey } from "@/store/useGuildStore";

const MAT_ICON: Record<MaterialKey, string> = {
  organics: ICONS.organics,
  minerals: ICONS.minerals,
  botanicals: ICONS.botanicals,
};

// Post-raid summary — win/lose, gold/reputation/exp/supplies gained.
// Mounted globally (like MobileChatOverlay) so it surfaces over any tab.
export default function BossResultModal() {
  const bossResult = useGuildStore((s) => s.bossResult);
  const dismissBossResult = useGuildStore((s) => s.dismissBossResult);

  useEffect(() => {
    if (!bossResult) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissBossResult();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bossResult, dismissBossResult]);

  const materialEntries = bossResult
    ? (Object.entries(bossResult.materials) as [MaterialKey, number][]).filter(
        ([, v]) => v > 0,
      )
    : [];

  return (
    <AnimatePresence>
      {bossResult && (
        <motion.div
          key="boss-result-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissBossResult}
          className="fixed inset-0 z-50 bg-black/60"
        />
      )}
      {bossResult && (
        <motion.div
          key="boss-result-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={`${bossResult.bossName} raid result`}
          initial={{ opacity: 0, y: 80, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-slate-900 pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[380px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border"
        >
          <div className="p-5 text-center">
            <p
              className={`text-2xl font-bold tracking-widest ${
                bossResult.win ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {bossResult.win ? "VICTORY" : "DEFEAT"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              vs <span className="text-slate-200">{bossResult.bossName}</span>
            </p>

            {bossResult.win ? (
              <>
                <ul className="mt-4 space-y-2 text-left">
                  <li className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                      <img src={ICONS.gold} alt="" width={16} height={16} className="pixel size-4 object-contain" />
                      Gold
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-amber-400">
                      +{bossResult.gold}
                    </span>
                  </li>
                  <li className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-2">
                    <span className="text-sm text-slate-300">Reputation</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-sky-400">
                      +{bossResult.reputation}
                    </span>
                  </li>
                  <li className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-2">
                    <span className="text-sm text-slate-300">Experience</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-violet-400">
                      +{bossResult.exp}
                    </span>
                  </li>
                </ul>

                {materialEntries.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {materialEntries.map(([key, amount]) => (
                      <span
                        key={key}
                        className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1.5"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                        <img src={MAT_ICON[key]} alt={key} width={16} height={16} className="pixel size-4 object-contain" />
                        <span className="font-mono text-xs tabular-nums text-slate-200">+{amount}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-4 rounded-md bg-slate-800/60 px-3 py-3 text-sm text-slate-400">
                No loot — the party was overwhelmed and limped home empty-handed.
              </p>
            )}

            <p className="mt-4 text-xs text-slate-500">
              {bossResult.win ? "Fought by" : "Fallen"}: {bossResult.heroNames.join(", ")}
            </p>

            <button
              type="button"
              onClick={dismissBossResult}
              className="mt-5 min-h-12 w-full cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              Continue
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
