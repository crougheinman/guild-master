import { EFFECTS, type Item, type ItemStats, type Rarity } from "@/store/useGuildStore";

export const RARITY_STYLE: Record<Rarity, string> = {
  common: "text-gray-400 border-slate-700",
  uncommon: "text-green-400 border-green-500/30",
  rare: "text-blue-400 border-blue-500/30",
  epic: "text-purple-400 border-purple-500/30",
  legendary: "text-yellow-400 border-yellow-500/40",
};

// filled gear-slot square tint
export const RARITY_BG: Record<Rarity, string> = {
  common: "bg-gray-500",
  uncommon: "bg-green-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
};

const STAT_LABEL: Record<keyof ItemStats, string> = {
  power: "Power",
  speed: "Speed",
  max_fortitude: "Fortitude",
  scavenge: "Scavenge",
};

// "+5 Power" / "+0.2 Speed" — an item's stat line
export function statLine(item: Item): string {
  const [key, value] =
    (Object.entries(item.base_stats)[0] as [keyof ItemStats, number]) ?? ["power", 0];
  return `+${value} ${STAT_LABEL[key]}`;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function rarityBlurb(item: Item): string {
  const parts = [`${cap(item.rarity)} ${item.subType} — ${item.rarity_tier}× base stats.`];
  if (item.specialEffect) parts.push(EFFECTS[item.specialEffect].blurb);
  else if (item.prefix) parts.push(`"${item.prefix}" marks a rare-or-better roll.`);
  return parts.join(" ");
}
