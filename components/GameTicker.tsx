"use client";

import { useEffect } from "react";
import { useGuildStore } from "@/store/useGuildStore";

/**
 * Global quest loop. Renders nothing.
 * - Mount: immediate tick — resolves quests that finished while the tab was
 *   closed (persist has already rehydrated from localStorage by then).
 * - Then a 1s interval catches live completions. completionTime is absolute
 *   (epoch ms), so a throttled background tab just resolves late, never wrong.
 */
export default function GameTicker() {
  const tickQuests = useGuildStore((s) => s.tickQuests);
  const rollMarket = useGuildStore((s) => s.rollMarket);
  const tickBossFight = useGuildStore((s) => s.tickBossFight);

  useEffect(() => {
    tickQuests(); // offline progress
    rollMarket(); // fresh prices on load
    let seconds = 0;
    const id = setInterval(() => {
      tickQuests();
      tickBossFight(); // no-op unless a raid is running
      if (++seconds % 60 === 0) rollMarket(); // market shifts every minute
    }, 1000);
    return () => clearInterval(id);
  }, [tickQuests, rollMarket, tickBossFight]);

  return null;
}
