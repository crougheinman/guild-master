"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

let popSeq = 0;

interface Pop {
  id: number;
  delta: number;
}

interface Props {
  value: number;
  active: boolean; // gate on hydration so the localStorage rehydrate doesn't fire a pop
}

// Floating "+N"/"-N" that pops and fades over a gold coin/number whenever it changes.
export default function GoldPopup({ value, active }: Props) {
  const prevRef = useRef<number | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);

  useEffect(() => {
    if (!active) return;
    if (prevRef.current === null) {
      prevRef.current = value;
      return;
    }
    const delta = value - prevRef.current;
    prevRef.current = value;
    if (delta === 0) return;

    const id = popSeq++;
    setPops((p) => [...p, { id, delta }]);
    const timer = setTimeout(() => {
      setPops((p) => p.filter((pop) => pop.id !== id));
    }, 1200);
    return () => clearTimeout(timer);
  }, [value, active]);

  return (
    <span className="pointer-events-none absolute inset-x-0 -top-1 flex justify-center overflow-visible">
      <AnimatePresence>
        {pops.map((pop) => (
          <motion.span
            key={pop.id}
            initial={{ opacity: 0, y: 0, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], y: -20, scale: 1.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className={`absolute font-mono text-xs font-bold drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] ${
              pop.delta > 0 ? "text-amber-300" : "text-rose-400"
            }`}
          >
            {pop.delta > 0 ? `+${pop.delta.toLocaleString()}` : pop.delta.toLocaleString()}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}
