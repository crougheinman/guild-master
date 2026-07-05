"use client";

import { AnimatePresence, motion } from "framer-motion";
import { avatarFor } from "@/components/assets";
import { useGuildStore } from "@/store/useGuildStore";

// Desktop: speech bubble anchored over a hero's roster card.
// Render inside the card (which is position:relative). Hidden on mobile —
// the global overlay handles chats there.
export function RosterChatBubble({ heroId }: { heroId: string }) {
  const chats = useGuildStore((s) => s.activeChats);
  const mine = chats.filter((c) => c.heroId === heroId);

  return (
    <div className="pointer-events-none absolute -top-2 left-10 z-20 hidden md:block">
      <AnimatePresence>
        {mine.map((chat) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            className={`relative mb-1 w-max max-w-[200px] rounded-xl rounded-bl-sm border px-2.5 py-1.5 text-xs shadow-lg ${
              chat.type === "combat"
                ? "border-sky-500/40 bg-sky-950 text-sky-200"
                : "border-slate-600 bg-slate-800 text-slate-100"
            }`}
          >
            {chat.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Mobile: global Messenger-style bubbles fixed above the bottom nav —
// visible regardless of the active tab.
export function MobileChatOverlay() {
  const chats = useGuildStore((s) => s.activeChats);

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex flex-col items-start gap-2 md:hidden">
      <AnimatePresence>
        {chats.map((chat) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="flex items-end gap-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
            <img
              src={avatarFor(chat.heroId)}
              alt=""
              width={32}
              height={32}
              className="pixel size-8 shrink-0 rounded-full border border-slate-600 bg-slate-800"
            />
            <div
              className={`max-w-[75vw] rounded-2xl rounded-bl-sm border px-3 py-2 shadow-xl ${
                chat.type === "combat"
                  ? "border-sky-500/40 bg-sky-950"
                  : "border-slate-600 bg-slate-800"
              }`}
            >
              <p className="text-[10px] font-medium text-slate-400">
                {chat.heroName}
              </p>
              <p className="text-sm text-slate-100">{chat.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
