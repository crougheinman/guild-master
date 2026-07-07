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
  const tickTavernRegen = useGuildStore((s) => s.tickTavernRegen);
  const tickExpedition = useGuildStore((s) => s.tickExpedition);
  const tickShadyMerchant = useGuildStore((s) => s.tickShadyMerchant);

  useEffect(() => {
    tickQuests(); // offline progress
    tickExpedition(); // expeditions that finished while the tab was closed
    tickShadyMerchant(); // expire a merchant who left while the tab was closed
    rollMarket(); // fresh prices on load
    let seconds = 0;
    const id = setInterval(() => {
      tickQuests();
      tickBossFight(); // no-op unless a raid is running
      tickTavernRegen(); // no-op unless the Tavern facility is leveled
      tickExpedition(); // no-op unless an expedition just completed
      tickShadyMerchant(); // rare spawn roll / expiry check
      if (++seconds % 60 === 0) rollMarket(); // market shifts every minute
    }, 1000);
    return () => clearInterval(id);
  }, [tickQuests, rollMarket, tickBossFight, tickTavernRegen, tickExpedition, tickShadyMerchant]);

  return null;
}
