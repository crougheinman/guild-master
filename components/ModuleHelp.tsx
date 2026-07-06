"use client";

// Tap-to-reveal module explainer for first-time players. Uses native
// <details>/<summary> — works on tap everywhere, no JS state, no hover
// dependency (unlike Tooltip, which needs a pointer).
export default function ModuleHelp({ text }: { text: string }) {
  return (
    <details className="group/help relative inline-block align-middle">
      <summary
        className="flex size-5 cursor-pointer list-none items-center justify-center rounded-full border border-slate-600 text-[11px] font-semibold text-slate-400 marker:content-none hover:border-amber-400 hover:text-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 [&::-webkit-details-marker]:hidden"
        aria-label="What is this?"
      >
        ?
      </summary>
      <p className="absolute left-0 top-full z-30 mt-1.5 w-64 max-w-[70vw] rounded-md border border-slate-700 bg-slate-950 p-2.5 text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-300 shadow-xl">
        {text}
      </p>
    </details>
  );
}
