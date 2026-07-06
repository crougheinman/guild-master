"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SEEN_KEY = "guild-master-welcome-seen";

const STEPS = [
  { label: "Tavern", desc: "Hire heroes for gold. Each has random stats and a job." },
  { label: "Dungeons", desc: "Send idle heroes to quest for gold and materials, or raid a boss as a party." },
  { label: "Forge", desc: "Turn materials into gear — rarity and stats roll at random." },
  { label: "Guild Shop", desc: "Sell materials for gold, buy raid potions, or sell gear to your own heroes." },
  { label: "Roster", desc: "Manage your heroes: heal, check stats, equip gear, or retire for reputation." },
];

// One-time first-launch overview of the game loop. Every module also has its
// own tap-to-reveal "?" (ModuleHelp) for details once you're in it.
export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="welcome-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 z-50 bg-black/70"
          />
          <motion.div
            key="welcome-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Micro-Guildmaster"
            initial={{ opacity: 0, y: 80, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-slate-900 pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[420px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border"
          >
            <div className="p-5">
              <p className="text-lg font-bold text-amber-400">Welcome, Guildmaster!</p>
              <p className="mt-1 text-sm text-slate-400">
                Run a fantasy guild: hire heroes, send them questing, gear them up, and
                grow your treasury. Here&apos;s the loop:
              </p>

              <ol className="mt-4 space-y-2.5">
                {STEPS.map((s, i) => (
                  <li key={s.label} className="flex gap-3 rounded-md bg-slate-800/60 px-3 py-2">
                    <span className="shrink-0 font-mono text-sm font-semibold text-amber-400">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-100">{s.label}</span>
                      <span className="block text-xs text-slate-400">{s.desc}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-3 text-xs text-slate-500">
                Look for the <span className="rounded-full border border-slate-600 px-1.5">?</span> next
                to any section header for more detail.
              </p>

              <button
                type="button"
                onClick={dismiss}
                className="mt-5 min-h-12 w-full cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                Let&apos;s go
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
