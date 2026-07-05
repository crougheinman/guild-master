"use client";

// Reusable hover tooltip — pure Tailwind group-hover, no JS state.
export default function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group/tip relative block">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[240px] -translate-x-1/2 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs leading-relaxed text-slate-200 opacity-0 shadow-xl transition-opacity duration-150 group-hover/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
