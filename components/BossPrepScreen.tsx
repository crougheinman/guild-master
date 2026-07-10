"use client";

import { useEffect, useMemo, useState } from "react";
import { avatarFor, BOSS_ART, ICONS } from "@/components/assets";
import { hpBarColor } from "@/components/RightPanel";
import {
  BOSSES,
  MAX_HERO_SLOTS,
  MAX_PARTY,
  relationshipKey,
  totalStats,
  useGuildStore,
  type ConsumableId,
  type Hero,
  type Relationship,
} from "@/store/useGuildStore";

const TYPE_BADGE: Record<string, string> = {
  potion: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  scroll: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

// one loadout slot square — filled shows the item, empty accepts the selection
function Slot({
  owner,
  index,
  selected,
  onAssigned,
}: {
  owner: string | "global";
  index: number; // nth slot for this owner
  selected: ConsumableId | null;
  onAssigned: () => void;
}) {
  const combatLoadout = useGuildStore((s) => s.combatLoadout);
  const consumables = useGuildStore((s) => s.consumables);
  const assignConsumable = useGuildStore((s) => s.assignConsumable);
  const unassignConsumable = useGuildStore((s) => s.unassignConsumable);

  // global index of the entry occupying this visual slot
  const ownerEntryIdxs = combatLoadout
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.heroId === owner);
  const entry = ownerEntryIdxs[index];
  const item = entry && consumables.find((c) => c.id === entry.l.itemId);

  return (
    <button
      type="button"
      onClick={() => {
        if (entry) return unassignConsumable(entry.i);
        if (selected && assignConsumable(owner, selected)) onAssigned();
      }}
      title={item ? `${item.name} — tap to remove` : "Empty slot"}
      className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md border text-xs transition-colors focus-visible:outline-2 focus-visible:outline-amber-400 ${
        item
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : selected
            ? "border-dashed border-emerald-500/60 bg-emerald-500/5 text-emerald-400"
            : "border-dashed border-slate-700 bg-slate-800/40 text-slate-600"
      }`}
    >
      {item ? item.name : selected ? "Tap to assign" : "Empty"}
    </button>
  );
}

// O(1) per-partner lookup regardless of roster size — relMap is memoized by
// the parent, rebuilt only when the relationships array reference changes
function partyBondStatus(heroId: string, partyIds: string[], relMap: Map<string, Relationship>) {
  let hasBonded = false;
  let hasRival = false;
  for (const otherId of partyIds) {
    if (otherId === heroId) continue;
    const status = relMap.get(relationshipKey(heroId, otherId))?.status;
    if (status === "bonded") hasBonded = true;
    else if (status === "rivals") hasRival = true;
  }
  return hasBonded ? "bonded" : hasRival ? "rivals" : "neutral";
}

function PartyHeroCard({
  hero,
  selected,
  onAssigned,
  partyIds,
  relMap,
}: {
  hero: Hero;
  selected: ConsumableId | null;
  onAssigned: () => void;
  partyIds: string[];
  relMap: Map<string, Relationship>;
}) {
  const t = totalStats(hero);
  const pct = Math.max(0, Math.min(100, (hero.stats.fortitude / t.maxFortitude) * 100));
  const bondStatus = partyBondStatus(hero.id, partyIds, relMap);
  const borderClass =
    bondStatus === "bonded"
      ? "border-emerald-500/60"
      : bondStatus === "rivals"
        ? "border-red-500/60"
        : "border-slate-800";
  return (
    <li className={`rounded-lg border ${borderClass} bg-slate-900 p-3`}>
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
        <img
          src={avatarFor(hero.id)}
          alt=""
          width={36}
          height={36}
          className="pixel size-9 shrink-0 rounded-md border border-slate-700 bg-slate-800"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100">{hero.name}</p>
          <p className="text-xs text-slate-400">
            Lv {hero.level} {hero.job} · Pow {t.power}
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-slate-400">
          {hero.stats.fortitude}/{t.maxFortitude}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full ${hpBarColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex gap-2">
        {Array.from({ length: MAX_HERO_SLOTS }, (_, i) => (
          <Slot key={i} owner={hero.id} index={i} selected={selected} onAssigned={onAssigned} />
        ))}
      </div>
    </li>
  );
}

export default function BossPrepScreen({
  bossId,
  onBack,
}: {
  bossId: string;
  onBack: () => void;
}) {
  const heroes = useGuildStore((s) => s.heroes);
  const consumables = useGuildStore((s) => s.consumables);
  const combatLoadout = useGuildStore((s) => s.combatLoadout);
  const bossFight = useGuildStore((s) => s.bossFight);
  const startBossFight = useGuildStore((s) => s.startBossFight);
  const relationships = useGuildStore((s) => s.relationships);
  const triggerHeroChat = useGuildStore((s) => s.triggerHeroChat);

  const [selected, setSelected] = useState<ConsumableId | null>(null);

  // falls back to the active fight's boss so reopening mid-raid stays correct
  const boss = BOSSES.find((b) => b.id === (bossFight?.bossId ?? bossId));

  const battleReady = (h: Hero) => h.status === "idle" && h.stats.fortitude > 0;
  const party = heroes.filter(battleReady).slice(0, MAX_PARTY);
  const partyIds = useMemo(() => party.map((h) => h.id), [party]);

  // rebuilds only when the relationships array reference changes (i.e. after
  // a raid resolves), not on every render — O(1) pair lookups during render
  const relMap = useMemo(() => {
    const m = new Map<string, Relationship>();
    for (const r of relationships) m.set(relationshipKey(r.heroAId, r.heroBId), r);
    return m;
  }, [relationships]);

  // auto-chat when the party's composition changes — keyed on a stable
  // string, not `party` itself, since that array is a fresh reference every
  // render and would refire on every re-render otherwise
  const partyKey = [...partyIds].sort().join(",");
  useEffect(() => {
    for (const hero of party) {
      const status = partyBondStatus(hero.id, partyIds, relMap);
      if (status === "bonded") triggerHeroChat(hero.id, "I've got your back!", "roster");
      else if (status === "rivals") triggerHeroChat(hero.id, "Stay out of my way this time.", "roster");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyKey]);

  // heroes barred from the raid, with the reason shown so the rule is explicit
  const benchReason = (h: Hero): string | null => {
    if (h.status === "on_quest") return "questing";
    if (h.status === "injured") return "resting";
    if (h.stats.fortitude <= 0) return "0 HP";
    if (!party.some((p) => p.id === h.id)) return "party full"; // beyond MAX_PARTY
    return null;
  };
  const benched = heroes.filter((h) => benchReason(h) !== null);

  const remaining = (id: ConsumableId) => {
    const stock = consumables.find((c) => c.id === id)?.quantity ?? 0;
    return stock - combatLoadout.filter((l) => l.itemId === id).length;
  };

  // a corrupted/imported save could carry an unknown bossId — bail instead of crashing
  if (!boss) {
    return (
      <div className="p-4 text-sm text-neutral-400">
        That boss couldn&apos;t be found.{" "}
        <button onClick={onBack} className="underline">
          Go back
        </button>
      </div>
    );
  }

  // ── live raid view ──
  if (bossFight) {
    const bossPct = Math.max(0, (bossFight.bossHp / boss.maxHp) * 100);
    const raiders = heroes.filter((h) => bossFight.heroIds.includes(h.id));
    return (
      <div className="p-4">
        <BackButton onBack={onBack} />
        <div className="rounded-lg border border-rose-500/30 bg-slate-900 p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- animated pixel gif */}
          <img src={BOSS_ART[boss.id]} alt={boss.name} className="pixel mx-auto h-24 w-auto" />
          <h3 className="mt-2 font-semibold text-rose-300">{boss.name}</h3>
          <div className="mx-auto mt-2 h-3 max-w-sm overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-rose-500 transition-[width] duration-500"
              style={{ width: `${bossPct}%` }}
            />
          </div>
          <p className="mt-1 font-mono text-xs tabular-nums text-slate-400">
            {Math.max(0, bossFight.bossHp)}/{boss.maxHp} · round {bossFight.round}
            {bossFight.hasteMul > 1 && (
              <span className="ml-2 text-sky-400">⚡ hasted</span>
            )}
          </p>
        </div>
        <ul className="mt-3 space-y-2">
          {raiders.map((h) => {
            const t = totalStats(h);
            const pct = Math.max(0, Math.min(100, (h.stats.fortitude / t.maxFortitude) * 100));
            return (
              <li key={h.id} className="flex items-center gap-2.5 rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                <img src={avatarFor(h.id)} alt="" width={28} height={28} className="pixel size-7 rounded-md border border-slate-700 bg-slate-800" />
                <span className={`w-24 truncate text-sm ${h.stats.fortitude > 0 ? "text-slate-200" : "text-rose-400 line-through"}`}>
                  {h.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
                  <div className={`h-full rounded-full transition-[width] duration-500 ${hpBarColor(pct)}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-xs tabular-nums text-slate-400">
                  {Math.max(0, h.stats.fortitude)}/{t.maxFortitude}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-center text-xs text-slate-500">
          Combat resolves automatically — consumables trigger on their own.
        </p>
      </div>
    );
  }

  // ── preparation view ──
  return (
    <div className="p-4 pb-6">
      <BackButton onBack={onBack} />

      {/* Boss stats */}
      <div className="flex items-center gap-4 rounded-lg border border-rose-500/30 bg-slate-900 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- animated pixel gif */}
        <img src={BOSS_ART[boss.id]} alt={boss.name} className="pixel h-20 w-auto shrink-0" />
        <div>
          <h3 className="font-semibold text-rose-300">{boss.name}</h3>
          <p className="mt-1 flex items-center gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
              <img src={ICONS.fortitude} alt="HP" width={14} height={14} className="pixel size-3.5" />
              <span className="font-mono tabular-nums">{boss.maxHp}</span>
            </span>
            <span className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
              <img src={ICONS.power} alt="Damage" width={14} height={14} className="pixel size-3.5" />
              <span className="font-mono tabular-nums">{boss.damage}/hit</span>
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Reward: {boss.rewardGold}g · +{boss.rewardRep} rep
          </p>
        </div>
      </div>

      {/* Global guild slot */}
      <section className="mt-4">
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Guild Slot (party-wide)
        </h4>
        <div className="flex">
          <Slot owner="global" index={0} selected={selected} onAssigned={() => setSelected(null)} />
        </div>
      </section>

      {/* Party */}
      <section className="mt-4">
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
          The Party ({party.length}/{MAX_PARTY})
        </h4>
        {party.length === 0 ? (
          <p className="text-sm text-slate-500">
            No battle-ready heroes — everyone is questing, resting, or at 0 HP.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {party.map((h) => (
              <PartyHeroCard
                key={h.id}
                hero={h}
                selected={selected}
                onAssigned={() => setSelected(null)}
                partyIds={partyIds}
                relMap={relMap}
              />
            ))}
          </ul>
        )}

        {/* barred heroes — questing/resting/downed can't raid */}
        {benched.length > 0 && (
          <ul className="mt-2 space-y-1">
            {benched.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-1.5 opacity-60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- pixel art */}
                <img src={avatarFor(h.id)} alt="" width={20} height={20} className="pixel size-5 rounded border border-slate-700 bg-slate-800" />
                <span className="text-xs text-slate-400">
                  {h.name} · Lv {h.level} {h.job}
                </span>
                <span className="ml-auto text-xs font-medium text-rose-400">
                  {benchReason(h)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Arsenal */}
      <section className="mt-4">
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Arsenal {selected && <span className="text-emerald-400">— now tap a slot</span>}
        </h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {consumables.map((c) => {
            const left = remaining(c.id);
            const isSel = selected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={left <= 0}
                onClick={() => setSelected(isSel ? null : c.id)}
                className={`min-w-40 shrink-0 cursor-pointer rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSel
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-slate-700 bg-slate-900 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100">{c.name}</span>
                  <span className="font-mono text-xs tabular-nums text-slate-400">×{left}</span>
                </div>
                <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase ${TYPE_BADGE[c.type]}`}>
                  {c.type}
                </span>
                <p className="mt-1 text-xs text-slate-400">{c.effect}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Begin Raid */}
      <button
        type="button"
        disabled={party.length === 0}
        onClick={() => startBossFight(boss.id, party.map((h) => h.id))}
        className="mt-4 min-h-14 w-full cursor-pointer rounded-lg border border-rose-500/50 bg-rose-500/10 text-base font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ⚔ Begin Raid
      </button>
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-3 min-h-9 cursor-pointer rounded-md border border-slate-700 px-3 text-sm text-slate-400 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-amber-400"
    >
      ← Dungeons
    </button>
  );
}
