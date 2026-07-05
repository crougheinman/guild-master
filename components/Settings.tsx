"use client";

import { useEffect, useRef, useState } from "react";
import { useGuildStore } from "@/store/useGuildStore";

export default function Settings() {
  const exportSave = useGuildStore((s) => s.exportSave);
  const importSave = useGuildStore((s) => s.importSave);
  const wipeSave = useGuildStore((s) => s.wipeSave);

  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<"idle" | "ok" | "error">("idle");
  const [armed, setArmed] = useState(false); // wipe confirm step
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(exportSave());
      setCopied(true);
      timers.current.push(setTimeout(() => setCopied(false), 2000));
    } catch {
      // clipboard blocked (permissions/insecure context) — surface the string instead
      setImportText(exportSave());
      setImportStatus("idle");
    }
  };

  const handleImport = () => {
    const ok = importSave(importText);
    setImportStatus(ok ? "ok" : "error");
    if (ok) setImportText("");
    timers.current.push(setTimeout(() => setImportStatus("idle"), 3000));
  };

  const handleWipe = () => {
    if (!armed) {
      setArmed(true);
      timers.current.push(setTimeout(() => setArmed(false), 4000)); // disarm if hesitant
      return;
    }
    wipeSave();
    setArmed(false);
  };

  return (
    <div className="max-w-xl p-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Settings</h2>

      {/* ── Export ── */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-medium text-slate-200">Export Save</h3>
        <p className="mt-1 text-xs text-slate-500">
          Copies your full save as a Base64 string — paste it on another device.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="mt-3 min-h-10 cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          {copied ? "Copied!" : "Export Save to Clipboard"}
        </button>
      </section>

      {/* ── Import ── */}
      <section className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-medium text-slate-200">Import Save</h3>
        <label htmlFor="import-save" className="mt-1 block text-xs text-slate-500">
          Paste a save string. Overwrites current progress.
        </label>
        <textarea
          id="import-save"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={4}
          spellCheck={false}
          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleImport}
            disabled={importText.trim() === ""}
            className="min-h-10 cursor-pointer rounded-md border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Import Save
          </button>
          {importStatus === "error" && (
            <p role="alert" className="text-xs text-rose-400">
              Invalid Save Data
            </p>
          )}
          {importStatus === "ok" && (
            <p className="text-xs text-emerald-400">Save imported!</p>
          )}
        </div>
      </section>

      {/* ── Danger Zone ── */}
      <section className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
        <h3 className="text-sm font-medium text-rose-400">Danger Zone</h3>
        <p className="mt-1 text-xs text-slate-500">
          Wipes all progress and restarts the guild from scratch. No undo.
        </p>
        <button
          type="button"
          onClick={handleWipe}
          className="mt-3 min-h-10 cursor-pointer rounded-md border border-rose-500/40 bg-rose-500/10 px-4 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
        >
          {armed ? "Are you sure? Click again to wipe" : "Hard Reset / Wipe Save"}
        </button>
      </section>
    </div>
  );
}
