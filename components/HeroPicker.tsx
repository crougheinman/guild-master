"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { avatarFor, ICONS } from "@/components/assets";
import { hpBarColor, STATUS_LABEL } from "@/components/RightPanel";
import { totalStats, useGuildStore, type Dungeon } from "@/store/useGuildStore";

// Thumb-friendly hero picker: bottom sheet on mobile, centered card on desktop.
// Shows ALL heroes — only idle ones are tappable, busy/resting are greyed out.
export default function HeroPicker({
  dungeon,
  onClose,
}: {
  dungeon: Dungeon;
  onClose: () => void;
}) {
  const heroes = useGuildStore((s) => s.heroes);
  const dispatchHero = useGuildStore((s) => s.dispatchHero);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Send hero to ${dungeon.name}`}
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-slate-900 pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[420px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-100">
            Send hero to <span className="text-amber-400">{dungeon.name}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            ✕
          </button>
        </div>

        {heroes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            No heroes yet — hire in the Tavern.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {heroes.map((hero) => {
              const idle = hero.status === "idle";
              const t = totalStats(hero);
              const maxFort = t.maxFortitude;
              const pct = Math.max(
                0,
                Math.min(100, (hero.stats.fortitude / maxFort) * 100),
              );
              const status = STATUS_LABEL[hero.status];
              return (
                <li key={hero.id}>
                  <button
                    type="button"
                    disabled={!idle}
                    onClick={() => {
                      dispatchHero(hero.id, dungeon.id);
                      onClose();
                    }}
                    className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-400 ${
                      idle
                        ? "cursor-pointer hover:bg-slate-800/60 active:bg-slate-800"
                        : "cursor-not-allowed opacity-50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                    <img
                      src={avatarFor(hero.id)}
                      alt=""
                      width={40}
                      height={40}
                      className="pixel size-10 shrink-0 rounded-md border border-slate-700 bg-slate-800"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-100">
                          {hero.name}
                        </span>
                        <span
                          className={`shrink-0 text-xs font-medium ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                        <span>
                          Lv {hero.level} {hero.job}
                        </span>
                        <span className="flex items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                          <img src={ICONS.power} alt="Power" width={12} height={12} className="pixel size-3 object-contain" />
                          <span className="font-mono tabular-nums text-slate-300">{t.power}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                          <img src={ICONS.speed} alt="Speed" width={12} height={12} className="pixel size-3 object-contain" />
                          <span className="font-mono tabular-nums text-slate-300">{t.speed}</span>
                        </span>
                      </span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-700">
                        <span
                          className={`block h-full rounded-full ${hpBarColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-slate-500">
                        {hero.stats.fortitude}/{maxFort}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </>
  );
}
