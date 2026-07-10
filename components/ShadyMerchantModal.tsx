"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ItemIcon from "@/components/ItemIcon";
import { EFFECTS, useGuildStore } from "@/store/useGuildStore";

// mm:ss until the merchant vanishes — ticks every second while mounted
function useCountdown(expiresAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, expiresAt - now);
  const m = Math.floor(remaining / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MerchantCountdown({ expiresAt }: { expiresAt: number }) {
  const label = useCountdown(expiresAt);
  return (
    <span className="animate-pulse font-mono text-lg font-bold tabular-nums text-purple-400">
      {label}
    </span>
  );
}

// Shady Merchant — rare timed event. Sells cursed gear into the guild armory;
// heroes pick it up through the normal Market flow, curses fire in boss combat.
export default function ShadyMerchantModal() {
  const active = useGuildStore((s) => s.shadyMerchantActive);
  const expiresAt = useGuildStore((s) => s.shadyMerchantExpiresAt);
  const stock = useGuildStore((s) => s.shadyMerchantInventory);
  const gold = useGuildStore((s) => s.ledger.gold);
  const buyShadyItem = useGuildStore((s) => s.buyShadyItem);
  const seenVisit = useGuildStore((s) => s.shadyMerchantSeenVisit);
  const setSeen = useGuildStore((s) => s.setShadyMerchantSeen);

  // dismissing hides the modal for THIS visit only — keyed on expiresAt so
  // the next merchant spawn re-opens it automatically; the Market banner
  // resets it to let the player back in before time runs out
  const open = active && seenVisit !== expiresAt;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="shady-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSeen(expiresAt)}
            className="fixed inset-0 z-50 bg-black/80"
          />
          <motion.div
            key="shady-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="The Shady Merchant"
            initial={{ opacity: 0, y: 80, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-purple-500/40 bg-gray-900 pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-purple-400">
                    A Shady Merchant appears...
                  </p>
                  <p className="mt-0.5 text-sm text-gray-400">
                    &ldquo;Rare wares, keen prices. Don&apos;t ask where they came
                    from. I leave when the sand runs out.&rdquo;
                  </p>
                </div>
                <MerchantCountdown expiresAt={expiresAt} />
              </div>

              {stock.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  Sold out. The merchant grins and counts your gold.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {stock.map((item) => {
                    const affordable = gold >= item.price;
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 rounded-md border border-purple-500/25 bg-gray-950/60 px-3 py-2.5"
                      >
                        <ItemIcon subType={item.subType} size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-purple-300">
                            {item.name}
                          </p>
                          <p className="text-xs leading-snug text-gray-400">
                            {item.specialEffect ? EFFECTS[item.specialEffect].blurb : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!affordable}
                          onClick={() => buyShadyItem(item.id)}
                          title={affordable ? undefined : "Not enough gold"}
                          className="min-h-10 shrink-0 cursor-pointer rounded-md border border-purple-500/50 bg-purple-500/10 px-3 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {item.price}g
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-3 text-xs text-gray-500">
                Purchases land in your Armory — heroes buy them like any other
                gear.
              </p>
              <p className="mt-1.5 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300">
                ⚠ All sales final. All curses permanent.
              </p>

              <button
                type="button"
                onClick={() => setSeen(expiresAt)}
                className="mt-4 min-h-11 w-full cursor-pointer rounded-md border border-gray-700 text-sm text-gray-400 transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
              >
                Walk away
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// pulsing re-entry banner for the Market tab while the merchant lingers —
// lets a player who walked away change their mind before time runs out
export function ShadyMerchantBanner() {
  const active = useGuildStore((s) => s.shadyMerchantActive);
  const expiresAt = useGuildStore((s) => s.shadyMerchantExpiresAt);
  const setSeen = useGuildStore((s) => s.setShadyMerchantSeen);
  const label = useCountdown(active ? expiresAt : 0);
  if (!active) return null;
  return (
    <button
      type="button"
      onClick={() => setSeen(0)}
      className="mb-4 flex w-full cursor-pointer items-center justify-between rounded-lg border border-purple-500/40 bg-gray-900 px-4 py-3 text-left transition-colors hover:bg-purple-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
    >
      <span className="text-sm font-semibold text-purple-400">
        🕯 The shady merchant lingers nearby...
      </span>
      <span className="animate-pulse font-mono text-sm font-bold tabular-nums text-purple-400">
        {label}
      </span>
    </button>
  );
}
