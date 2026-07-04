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

  useEffect(() => {
    tickQuests(); // offline progress
    const id = setInterval(tickQuests, 1000);
    return () => clearInterval(id);
  }, [tickQuests]);

  return null;
}
