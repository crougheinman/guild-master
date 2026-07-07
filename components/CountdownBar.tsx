"use client";

import { useEffect, useState } from "react";

interface Props {
  completionTime: number | null;
  duration: number; // total quest ms
}

export default function CountdownBar({ completionTime, duration }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (completionTime === null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [completionTime]);

  if (completionTime === null) return null;

  const remaining = Math.max(0, completionTime - now);
  const pct = Math.min(100, ((duration - remaining) / duration) * 100);
  const secs = Math.ceil(remaining / 1000);
  // hours-long expeditions share this bar with seconds-long quests
  const label =
    secs >= 3600
      ? `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
      : secs >= 60
        ? `${Math.floor(secs / 60)}m ${secs % 60}s`
        : `${secs}s`;

  return (
    <div className="mt-2">
      <div
        role="progressbar"
        aria-label="Quest progress"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-full bg-slate-700"
      >
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-[11px] tabular-nums text-sky-400">
        {remaining === 0 ? "returning…" : `${label} remaining`}
      </p>
    </div>
  );
}
