import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------- Domain types ----------

export type MaterialKey = "organics" | "minerals" | "botanicals";

export interface HeroStats {
  power: number;
  fortitude: number; // current HP-like pool; healing restores it
  max_fortitude: number;
  speed: number; // divisor on quest duration
}

export interface HeroAttr {
  greed: number; // 0..1 — cut of quest gold the hero pockets
  scavenge_multiplier: number; // multiplies loot yield
}

export type HeroStatus = "idle" | "on_quest" | "injured";

export type Job = "Archer" | "Lancer" | "Monk" | "Pawn" | "Warrior";
export const JOBS: Job[] = ["Archer", "Lancer", "Monk", "Pawn", "Warrior"];

// light mechanical lean per job — a ~10% nudge, not a redesign; gear/level/
// trait progression still dominates. Keeps job from being sprite-only flavor.
export const JOB_STAT_BONUS: Record<
  Job,
  { power?: number; speed?: number; maxFortitude?: number; scavenge?: number }
> = {
  Warrior: { maxFortitude: 0.1 },
  Lancer: { power: 0.1 },
  Archer: { speed: 0.15 },
  Monk: { scavenge: 0.1 },
  Pawn: { maxFortitude: 0.1, power: 0.05 },
};

export type ItemSlot = "weapon" | "armor" | "boots" | "accessory";
export type GearSlot = "weapon" | "armor" | "boots" | "accessory1" | "accessory2";
export type SubType = "dagger" | "sword" | "staff" | "armor" | "boots" | "ring";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type EffectId =
  | "embezzler"
  | "insomniac"
  | "martyr"
  | "monocle"
  | "companyman"
  // cursed — only sold by the Shady Merchant, never rolled at the Forge
  | "hemorrhage"
  | "bloodpact"
  | "dread";

// accessory effects the Forge is allowed to roll — cursed ids stay out
export const CRAFTABLE_EFFECT_IDS: EffectId[] = [
  "embezzler",
  "insomniac",
  "martyr",
  "monocle",
  "companyman",
];

export const EFFECTS: Record<EffectId, { name: string; blurb: string }> = {
  embezzler: {
    name: "Ring of the Embezzler",
    blurb: "-10% Greed flat.",
  },
  insomniac: {
    name: "Amulet of the Insomniac",
    blurb: "No fortitude loss on successful runs.",
  },
  martyr: {
    name: "Martyr's Pendant",
    blurb: "Failed runs grant DOUBLE exp instead of 25%.",
  },
  monocle: {
    name: "The Golden Monocle",
    blurb: "+50% gold found, -25% base power.",
  },
  companyman: {
    name: "Company Man's Signet",
    blurb: "Pays 150% price when buying guild gear.",
  },
  hemorrhage: {
    name: "Cursed Sword",
    blurb: "Massive damage, but the bearer bleeds 5% max HP every combat round.",
  },
  bloodpact: {
    name: "Bloodpact Ring",
    blurb: "Great power, but Life Potions refuse to work for the bearer.",
  },
  dread: {
    name: "Dread Plate",
    blurb: "Enormous fortitude, but the boss always strikes the wearer first.",
  },
};

export type PositiveTraitId = "resilient" | "thrifty" | "lucky";
export type NegativeTraitId = "coward" | "greedy" | "glutton";

export const POSITIVE_TRAITS: Record<PositiveTraitId, { name: string; blurb: string }> = {
  resilient: { name: "Resilient", blurb: "+10% max HP." },
  thrifty: { name: "Thrifty", blurb: "Pays 20% less for shop gear." },
  lucky: { name: "Lucky", blurb: "+10% scavenging yield." },
};

export const NEGATIVE_TRAITS: Record<NegativeTraitId, { name: string; blurb: string }> = {
  coward: { name: "Coward", blurb: "Flees boss fights below 40% HP, ignoring potions." },
  greedy: { name: "Greedy", blurb: "Refuses shop gear priced under 200g." },
  glutton: { name: "Glutton", blurb: "Costs 2x gold to hire and to heal." },
};

// stat bonuses an item can carry (scavenge adds to attr.scavenge_multiplier)
export interface ItemStats {
  power?: number;
  speed?: number;
  max_fortitude?: number;
  scavenge?: number;
}

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  subType: SubType;
  base_stats: ItemStats;
  rarity: Rarity;
  rarity_tier: number; // 1..3 — multiplier on base_stats
  prefix: string | null;
  suffix: string | null;
  specialEffect?: EffectId;
  price: number;
}

export interface Hero {
  id: string;
  name: string;
  job: Job;
  level: number;
  exp: number;
  expToNext: number;
  // note: currentFortitude/maxFortitude live on stats as fortitude/max_fortitude
  stats: HeroStats;
  attr: HeroAttr; // greed is a 0..1 fraction — Ego Tax adds 0.02, caps at 0.50
  traits: { positive: PositiveTraitId; negative: NegativeTraitId };
  status: HeroStatus;
  personal_wealth: number;
  gear: Partial<Record<GearSlot, Item>>;
  lastDungeonId?: string; // last dungeon this hero was sent to — rotation bonus in tickQuests
}

export interface LootTable {
  gold: [min: number, max: number];
  materials: Partial<Record<MaterialKey, [min: number, max: number]>>;
}

export interface Dungeon {
  id: string;
  name: string;
  threat_level: number;
  base_duration_ms: number;
  tags: string[];
  loot_table: LootTable;
}

export interface Ledger {
  gold: number;
  reputation: number;
  materials: Record<MaterialKey, number>;
}

export type MarketRates = Record<MaterialKey, number>; // 0.5–2.0 multipliers

export interface ActiveQuest {
  heroId: string;
  dungeonId: string;
  completionTime: number; // epoch ms — evaluated on mount, survives offline
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
}

export interface FloatingText {
  id: string;
  heroId: string;
  text: string;
  color: string; // tailwind text class
}

export interface HeroChat {
  id: string;
  heroId: string;
  heroName: string;
  text: string;
  type: "roster" | "combat";
  expiresAt: number;
}

// ---------- Boss raids & consumables ----------

export type ConsumableId = "life_potion" | "phoenix_vial" | "haste_scroll";

export interface Consumable {
  id: ConsumableId;
  name: string;
  type: "potion" | "scroll";
  effect: string; // human-readable blurb shown in the Arsenal
  quantity: number;
}

export interface LoadoutEntry {
  heroId: string | "global"; // "global" = the single guild-wide slot
  itemId: ConsumableId;
  triggerCondition: string;
}

export interface BossFight {
  bossId: string;
  heroIds: string[];
  bossHp: number;
  round: number;
  hasteMul: number; // 1 or 1.5 when a Scroll of Haste fired at combat start
  deadHeroIds: string[]; // accumulates across the raid — fortitude hit 0, even if later revived
}

export type RelationshipStatus = "neutral" | "bonded" | "rivals";
export interface Relationship {
  heroAId: string;
  heroBId: string;
  affinity: number;
  status: RelationshipStatus;
}
// unordered pair key — sort so (a,b) and (b,a) hash the same
export const relationshipKey = (a: string, b: string) => [a, b].sort().join("|");
export const findRelationship = (relationships: Relationship[], a: string, b: string) =>
  relationships.find((r) => relationshipKey(r.heroAId, r.heroBId) === relationshipKey(a, b));

export interface BossDef {
  id: string;
  name: string;
  maxHp: number;
  damage: number; // fortitude chunk dealt to one random hero per tick
  rewardGold: number;
  rewardRep: number;
  rewardExp: number;
  rewardMaterials: Partial<Record<MaterialKey, number>>;
}

export const BOSSES: BossDef[] = [
  { id: "boss-1", name: "Crushing Cyclops", maxHp: 400, damage: 6, rewardGold: 400, rewardRep: 25, rewardExp: 150, rewardMaterials: { organics: 3 } },
  { id: "boss-2", name: "Brawny Ogre", maxHp: 600, damage: 9, rewardGold: 600, rewardRep: 40, rewardExp: 220, rewardMaterials: { minerals: 3 } },
  { id: "boss-3", name: "Stone Troll", maxHp: 850, damage: 12, rewardGold: 850, rewardRep: 55, rewardExp: 300, rewardMaterials: { botanicals: 4, minerals: 2 } },
  { id: "boss-4", name: "Swamp Troll", maxHp: 1100, damage: 15, rewardGold: 1100, rewardRep: 70, rewardExp: 380, rewardMaterials: { organics: 4, botanicals: 3 } },
  { id: "boss-5", name: "Ocular Watcher", maxHp: 1400, damage: 18, rewardGold: 1400, rewardRep: 90, rewardExp: 470, rewardMaterials: { minerals: 5, botanicals: 3 } },
  { id: "boss-6", name: "Humongous Ettin", maxHp: 1800, damage: 22, rewardGold: 1800, rewardRep: 115, rewardExp: 580, rewardMaterials: { organics: 5, minerals: 5, botanicals: 5 } },
];

export interface BossResult {
  bossName: string;
  win: boolean;
  gold: number;
  reputation: number;
  exp: number;
  materials: Partial<Record<MaterialKey, number>>;
  heroNames: string[];
}

export const MAX_HERO_SLOTS = 2; // loadout slots per hero
export const MAX_PARTY = 5;

export const CONSUMABLE_TRIGGERS: Record<ConsumableId, string> = {
  life_potion: "hp<30%",
  phoenix_vial: "on_death",
  haste_scroll: "combat_start",
};

// gold sink — restock consumables from the Market
export const CONSUMABLE_PRICE: Record<ConsumableId, number> = {
  life_potion: 60,
  phoenix_vial: 250,
  haste_scroll: 120,
};

// ---------- Store ----------

interface GuildState {
  ledger: Ledger;
  heroes: Hero[];
  tavernCandidates: Hero[];
  dungeons: Dungeon[];
  activeQuests: ActiveQuest[];
  inventory: Item[];
  consumables: Consumable[]; // guild stock of potions/scrolls
  combatLoadout: LoadoutEntry[]; // max 2 per hero + 1 "global" slot
  bossFight: BossFight | null; // active raid, ticked by GameTicker
  bossResult: BossResult | null; // ephemeral post-raid summary, not persisted
  eventLog: LogEntry[];
  floatingTexts: FloatingText[]; // ephemeral UI juice, not persisted
  activeChats: HeroChat[]; // ephemeral hero chatter, not persisted
  upgrades: string[]; // purchased upgrade ids
  guildFacilities: { tavernLevel: number; forgeLevel: number; bountyBoardLevel: number };
  relationships: Relationship[];
  expedition: Expedition | null; // one offline expedition at a time, ticked by GameTicker
  shadyMerchantActive: boolean;
  shadyMerchantExpiresAt: number; // epoch ms — merchant vanishes on the tick past this
  shadyMerchantInventory: Item[];
  shadyMerchantSeenVisit: number; // expiresAt of the visit the player dismissed (0 = none)
  // permanent account progression — survives every hero, never resets
  retiredHeroes: { id: string; name: string; class: string; level: number }[];
  prestigeBuffs: { globalAttackBonus: number; startingLevel: number };
  craftCooldownUntil: number; // epoch ms — craftItem() no-ops until this passes
  marketRates: MarketRates;

  dispatchHero: (heroId: string, dungeonId: string) => void;
  tickQuests: () => void;
  assignConsumable: (slotOwner: string | "global", itemId: ConsumableId) => boolean;
  unassignConsumable: (index: number) => void;
  buyConsumable: (itemId: ConsumableId) => boolean;
  startBossFight: (bossId: string, heroIds: string[]) => void;
  tickBossFight: () => void;
  dismissBossResult: () => void;
  addLog: (message: string) => void;
  healHero: (heroId: string) => void;
  refreshTavern: () => void;
  hireHero: (candidateId: string) => boolean;
  craftItem: (subType: SubType) => void;
  heroBuyItem: (itemId: string) => boolean;
  tickShopAutoBuy: () => void;
  scrapItem: (itemId: string) => boolean;
  removeFloatingText: (id: string) => void;
  triggerHeroChat: (
    heroId: string,
    text: string,
    type: "roster" | "combat",
    durationMs?: number,
  ) => void;
  retireHero: (heroId: string) => void;
  buyUpgrade: (upgradeId: string, cost: { gold: number; reputation: number }) => void;
  upgradeFacility: (facility: FacilityKey, cost: number) => void;
  tickTavernRegen: () => void;
  startExpedition: (heroIds: string[], durationMs: number) => boolean;
  tickExpedition: () => void;
  tickShadyMerchant: () => void;
  buyShadyItem: (itemId: string) => boolean;
  setShadyMerchantSeen: (visit: number) => void;
  rollMarket: () => void;
  sellMaterial: (key: MaterialKey) => void;
  exportSave: () => string;
  importSave: (base64String: string) => boolean;
  wipeSave: () => void;
}

const QUEST_FATIGUE = 10; // fortitude lost on a successful run
// balance: 80% let a maxed-greed hero's questing net the guild almost
// nothing — guild now always keeps at least half the raw loot
const GREED_CAP = 0.5; // Ego Tax ceiling (50%)
const RIVAL_ROLL_CHANCE = 0.3;
const BOND_AFFINITY_THRESHOLD = 5;

// Pure — applies post-victory affinity gains between every surviving pair,
// then (if someone died this raid) rolls a rivalry chance per survivor.
const applyRaidRelationships = (
  relationships: Relationship[],
  survivors: Hero[],
  partyIds: string[],
  someoneDied: boolean,
): Relationship[] => {
  let next = relationships;
  const bump = (a: string, b: string) => {
    const existing = findRelationship(next, a, b);
    const affinity = (existing?.affinity ?? 0) + 1;
    const status: RelationshipStatus =
      affinity > BOND_AFFINITY_THRESHOLD ? "bonded" : (existing?.status ?? "neutral");
    next = existing
      ? next.map((r) => (r === existing ? { ...r, affinity, status } : r))
      : [...next, { heroAId: a, heroBId: b, affinity, status }];
  };
  for (let i = 0; i < survivors.length; i++) {
    for (let j = i + 1; j < survivors.length; j++) {
      bump(survivors[i].id, survivors[j].id);
    }
  }

  if (someoneDied) {
    for (const survivor of survivors) {
      if (Math.random() >= RIVAL_ROLL_CHANCE) continue;
      const others = partyIds.filter((id) => id !== survivor.id);
      if (others.length === 0) continue;
      const rivalId = others[Math.floor(Math.random() * others.length)];
      const existing = findRelationship(next, survivor.id, rivalId);
      next = existing
        ? next.map((r) => (r === existing ? { ...r, status: "rivals" as const } : r))
        : [...next, { heroAId: survivor.id, heroBId: rivalId, affinity: 0, status: "rivals" as const }];
    }
  }
  return next;
};

// Add exp and run the level-up loop. Pure — returns a new hero + any level
// logs. Each level: +power, +maxFortitude, full heal, +2% greed (Ego Tax).
// Hard-capped at MAX_HERO_LEVEL — a capped hero pools exp and is eligible to
// retire as a Legend (Hall of Fame + permanent prestige buffs).
// Pure — finds the first idle hero who can afford `item`, wants the stat
// upgrade it carries, and isn't blocked by the Greedy floor. Shared by the
// manual "Sell to Guild" action and the silent auto-buy tick so both honor
// the exact same rules (Greedy/Thrifty/Company Man included).
const findBuyerFor = (
  heroes: Hero[],
  item: Item,
): { buyer: Hero; slot: GearSlot; paid: number } | null => {
  const statKey = primaryStatKey(item);
  const itemStat = item.base_stats[statKey] ?? 0;

  const targetSlotFor = (h: Hero): GearSlot | null => {
    if (item.slot === "accessory") {
      if (!h.gear.accessory1) return "accessory1";
      if (!h.gear.accessory2) return "accessory2";
      const s1 = h.gear.accessory1.base_stats[statKey] ?? 0;
      const s2 = h.gear.accessory2.base_stats[statKey] ?? 0;
      const weaker: GearSlot = s1 <= s2 ? "accessory1" : "accessory2";
      return itemStat > Math.min(s1, s2) ? weaker : null;
    }
    const current = h.gear[item.slot];
    if (!current) return item.slot;
    return itemStat > (current.base_stats[statKey] ?? 0) ? item.slot : null;
  };

  const priceFor = (h: Hero) => {
    const base = heroEffects(h).has("companyman") ? Math.round(item.price * 1.5) : item.price;
    return h.traits.positive === "thrifty" ? Math.round(base * 0.8) : base;
  };

  let slot: GearSlot | null = null;
  const buyer = heroes.find((h) => {
    if (h.status !== "idle" || h.personal_wealth < priceFor(h)) return false;
    if (h.traits.negative === "greedy" && priceFor(h) < GREEDY_MIN_PRICE) return false;
    slot = targetSlotFor(h);
    return slot !== null;
  });
  if (!buyer || !slot) return null;
  return { buyer, slot, paid: priceFor(buyer) };
};

const gainExp = (hero: Hero, amount: number): { hero: Hero; logs: string[] } => {
  let { level, exp, expToNext } = hero;
  let { power, max_fortitude, fortitude } = hero.stats;
  let greed = hero.attr.greed;
  const logs: string[] = [];

  exp += amount;
  while (exp >= expToNext && level < MAX_HERO_LEVEL) {
    exp -= expToNext;
    level += 1;
    expToNext = Math.floor(Math.pow(level, 2) * 100);
    power += randInt([2, 4]);
    max_fortitude += randInt([10, 20]);
    fortitude = max_fortitude; // fully restore
    greed = Math.min(GREED_CAP, greed + 0.02);
    logs.push(
      level === MAX_HERO_LEVEL
        ? `${hero.name} reached the level cap (${MAX_HERO_LEVEL})! They can now retire as a Legend.`
        : `${hero.name} leveled up to ${level}! Greed increased to ${Math.round(greed * 100)}%`,
    );
  }

  return {
    hero: {
      ...hero,
      level,
      exp,
      expToNext,
      stats: { ...hero.stats, power, max_fortitude, fortitude },
      attr: { ...hero.attr, greed },
    },
    logs,
  };
};
const MAX_LOG_ENTRIES = 50;
export const HEAL_COST = 50;
export const HIRE_COST = 100;
// balance: most real gear already costs >=100g, so the old floor rarely
// triggered — raised so Greedy is an actual downside, not a near-dud
export const GREEDY_MIN_PRICE = 200;
export const RETIRE_REP_PER_LEVEL = 50;
// hire cost scales past the base roster cap — same linear-scaling spirit as
// facilityUpgradeCost, so roster growth has real cost pressure
export const HIRE_COST_PER_EXTRA_SLOT = 50;
export const CRAFT_COOLDOWN_MS = 4000;
export const hireCost = (currentRosterSize: number) =>
  HIRE_COST + HIRE_COST_PER_EXTRA_SLOT * Math.max(0, currentRosterSize - BASE_ROSTER_CAP);
// ── Lineage & Retirement prestige ──
export const MAX_HERO_LEVEL = 50;
export const LEGEND_ATTACK_BONUS = 0.02; // +2% global attack per retired Legend
// uncapped growth eventually trivializes every fight since nothing in boss
// scaling counters it — ceiling keeps the prestige loop meaningful forever
export const LEGEND_ATTACK_CAP = 0.5;
// startingLevel is +1 per Legend, uncapped — reaching Lv50 takes ~4M exp per
// hero (~674hrs at the best active-grind rate), so the earn rate self-limits
// how fast this snowballs
export const BASE_ROSTER_CAP = 3;
// per-unit base sale price, multiplied by the live market rate
export const MATERIAL_BASE_PRICE: Record<MaterialKey, number> = {
  organics: 5,
  minerals: 8,
  botanicals: 4,
};

// upgrade ids — effects hook in where noted
export const UPGRADE_IDS = {
  beds: "bigger-beds", // +1 roster cap (rosterCap)
  sharpening: "sharpening-stones", // +5 power in tickQuests
  taxLoophole: "tax-loophole", // -2% greed cut in tickQuests
} as const;

export const rosterCap = (upgrades: string[]) =>
  BASE_ROSTER_CAP + (upgrades.includes(UPGRADE_IDS.beds) ? 1 : 0);

// ── guild hall facilities: leveled, repeatable upgrades (distinct from the
// one-time UPGRADE_IDS flags above) ──
export type FacilityKey = "tavern" | "forge" | "bountyBoard";
export const FACILITY_MAX_LEVEL = 5;
export const FACILITY_BASE_COST: Record<FacilityKey, number> = {
  tavern: 150,
  forge: 200,
  bountyBoard: 250,
};
// linear scaling: level 0->1 costs base, 1->2 costs 2x base, etc.
export const facilityUpgradeCost = (facility: FacilityKey, currentLevel: number) =>
  FACILITY_BASE_COST[facility] * (currentLevel + 1);
const TAVERN_REGEN_PCT_PER_LEVEL = 0.005; // % max HP per idle hero per minute, per level (tickTavernRegen runs on the 60s tick, not every second)
const FORGE_TIER_BONUS_PER_LEVEL = 5; // added to the crafting rarity roll, per level

// ── offline expeditions (Bounty Board) ──
// Balance: zero-risk and hands-off, so the gold rate is deliberately ~20-25%
// of active questing (Goblin spam ≈600g/hr/hero, endgame ≈2250g/hr/hero, both
// with click cost + injury risk). Expeditions trade rate for convenience —
// they must never beat paying attention.
export interface Expedition {
  heroIds: string[];
  startedAt: number;
  completionTime: number; // absolute epoch ms — resolves late but never wrong in a throttled tab
  durationMs: number;
}
// ── Shady Merchant random event ──
// Extreme risk/reward gear: stats far above anything craftable, priced cheap —
// the curse is the real cost, and it hooks the boss-combat loop directly.
export const SHADY_MERCHANT_DURATION_MS = 10 * 60_000; // exactly 10 minutes
const SHADY_SPAWN_CHANCE = 1 / 900; // per second ≈ one visit every ~15 min
export const SHADY_STOCK: Omit<Item, "id">[] = [
  {
    name: "Cursed Sword",
    slot: "weapon",
    subType: "sword",
    base_stats: { power: 18 }, // ~3.6x a common sword
    rarity: "legendary",
    rarity_tier: 3,
    prefix: null,
    suffix: null,
    specialEffect: "hemorrhage",
    price: 200,
  },
  {
    name: "Bloodpact Ring",
    slot: "accessory",
    subType: "ring",
    base_stats: { power: 12 }, // 6x a common ring
    rarity: "epic",
    rarity_tier: 2,
    prefix: null,
    suffix: null,
    specialEffect: "bloodpact",
    price: 250,
  },
  {
    name: "Dread Plate",
    slot: "armor",
    subType: "armor",
    base_stats: { max_fortitude: 45 }, // 4.5x common armor
    rarity: "legendary",
    rarity_tier: 3,
    prefix: null,
    suffix: null,
    specialEffect: "dread",
    price: 300,
  },
];

// duration slots unlocked one per Bounty Board level (Lv1 = 1h ... Lv5 = 12h)
export const EXPEDITION_DURATIONS_MS = [1, 2, 4, 8, 12].map((h) => h * 3_600_000);
export const EXPEDITION_GOLD_PER_POWER_HOUR = 6; // gold per hero power per hour
export const EXPEDITION_LEVEL_GOLD_BONUS = 0.05; // +5% gold per board level above 1
const EXPEDITION_EXP_PER_HOUR = 30; // far below active questing (Goblin ≈300/hr)

// ── gear math: single source for computed hero totals ──

export const GEAR_SLOTS: GearSlot[] = [
  "weapon",
  "armor",
  "boots",
  "accessory1",
  "accessory2",
];

export const gearBonus = (hero: Hero, key: keyof ItemStats): number =>
  GEAR_SLOTS.reduce((sum, s) => sum + (hero.gear[s]?.base_stats[key] ?? 0), 0);

export const heroEffects = (hero: Hero): Set<EffectId> => {
  const out = new Set<EffectId>();
  // all slots, not just accessories — cursed Shady Merchant gear carries
  // effects on weapons/armor too (crafted gear only ever has them on rings)
  for (const s of GEAR_SLOTS) {
    const fx = hero.gear[s]?.specialEffect;
    if (fx) out.add(fx);
  }
  return out;
};

// base + all equipped gear (monocle power penalty applied here)
export function totalStats(hero: Hero) {
  const fx = heroEffects(hero);
  const job = JOB_STAT_BONUS[hero.job];
  const basePower = hero.stats.power * (fx.has("monocle") ? 0.75 : 1);
  return {
    power: Math.round(
      (basePower + gearBonus(hero, "power")) * (1 + (job.power ?? 0)),
    ),
    speed:
      Math.round(
        (hero.stats.speed + gearBonus(hero, "speed")) * (1 + (job.speed ?? 0)) * 100,
      ) / 100,
    maxFortitude: Math.round(
      (hero.stats.max_fortitude + gearBonus(hero, "max_fortitude")) *
        (hero.traits.positive === "resilient" ? 1.1 : 1) *
        (1 + (job.maxFortitude ?? 0)),
    ),
    scavenge:
      Math.round(
        (hero.attr.scavenge_multiplier + gearBonus(hero, "scavenge")) *
          (hero.traits.positive === "lucky" ? 1.1 : 1) *
          (1 + (job.scavenge ?? 0)) *
          100,
      ) / 100,
  };
}

// the one stat a crafted item carries — used for buy-upgrade comparisons
export const primaryStatKey = (item: Item): keyof ItemStats =>
  (Object.keys(item.base_stats) as (keyof ItemStats)[])[0] ?? "power";

// ── crafting recipes ──
export interface Recipe {
  slot: ItemSlot;
  name: string;
  cost: Partial<Record<MaterialKey, number>>;
  stat: keyof ItemStats;
  base: number; // multiplied by rarity tier
  priceBase: number; // multiplied by rarity tier
}

export const RECIPES: Record<SubType, Recipe> = {
  dagger: { slot: "weapon", name: "Dagger", cost: { organics: 3, minerals: 2 }, stat: "speed", base: 0.1, priceBase: 60 },
  sword: { slot: "weapon", name: "Sword", cost: { minerals: 3 }, stat: "power", base: 5, priceBase: 75 },
  staff: { slot: "weapon", name: "Staff", cost: { botanicals: 4 }, stat: "scavenge", base: 0.15, priceBase: 70 },
  armor: { slot: "armor", name: "Armor", cost: { organics: 3, minerals: 2 }, stat: "max_fortitude", base: 10, priceBase: 80 },
  boots: { slot: "boots", name: "Boots", cost: { organics: 2, minerals: 1 }, stat: "max_fortitude", base: 6, priceBase: 50 },
  ring: { slot: "accessory", name: "Ring", cost: { minerals: 5 }, stat: "power", base: 2, priceBase: 120 },
};

export const SCRAP_REFUND_RATE = 0.5;
// pure — materials refunded for scrapping an item, so the UI can preview the
// exact amount before the player clicks (same calc the store action applies)
export const scrapRefund = (item: Item): Partial<Record<MaterialKey, number>> =>
  Object.fromEntries(
    Object.entries(RECIPES[item.subType].cost).map(([mat, qty]) => [
      mat,
      Math.ceil((qty as number) * SCRAP_REFUND_RATE),
    ]),
  );

const ACCESSORY_EFFECT_CHANCE = 0.6;
// cumulative weights: 60/25/10/4/1
const RARITY_TABLE: { rarity: Rarity; tier: number; upTo: number }[] = [
  { rarity: "common", tier: 1, upTo: 60 },
  { rarity: "uncommon", tier: 1.2, upTo: 85 },
  { rarity: "rare", tier: 1.5, upTo: 95 },
  { rarity: "epic", tier: 2, upTo: 99 },
  { rarity: "legendary", tier: 3, upTo: 100 },
];

const PREFIXES = ["Swift", "Heavy", "Grim", "Keen", "Vicious", "Gilded"];

const CANDIDATE_NAMES = [
  "Brakka", "Thorn", "Mira", "Oxhide", "Vex", "Snaggle", "Petra", "Durn",
  "Hazel", "Krug", "Sable", "Fenwick", "Rooka", "Grim", "Tilly", "Bortle",
];

const POSITIVE_TRAIT_IDS = Object.keys(POSITIVE_TRAITS) as PositiveTraitId[];
const NEGATIVE_TRAIT_IDS = Object.keys(NEGATIVE_TRAITS) as NegativeTraitId[];

const randomTraits = () => ({
  positive: POSITIVE_TRAIT_IDS[randInt([0, POSITIVE_TRAIT_IDS.length - 1])],
  negative: NEGATIVE_TRAIT_IDS[randInt([0, NEGATIVE_TRAIT_IDS.length - 1])],
});

// external data (old localStorage saves, imported exports) may predate the
// traits field or carry its old `string[]` shape — self-heal instead of
// crashing the whole app on a bad read
const sanitizeHero = (h: Hero): Hero => {
  const t = h?.traits as { positive?: string; negative?: string } | undefined;
  const valid = !!t && !!POSITIVE_TRAITS[t.positive as PositiveTraitId] && !!NEGATIVE_TRAITS[t.negative as NegativeTraitId];
  return valid ? h : { ...h, traits: randomTraits() };
};

// same self-heal idea as sanitizeHero, for the other nested slices that cross
// the persist/import boundary — malformed input falls back to `fallback`
// (the running state's current value) instead of NaN-ing out later
const MATERIAL_KEYS: MaterialKey[] = ["organics", "minerals", "botanicals"];

const sanitizeMarketRates = (v: unknown, fallback: MarketRates): MarketRates => {
  const r = v as Partial<MarketRates> | null | undefined;
  return r && typeof r === "object" && MATERIAL_KEYS.every((k) => typeof r[k] === "number")
    ? (r as MarketRates)
    : fallback;
};

const sanitizeGuildFacilities = (
  v: unknown,
  fallback: GuildState["guildFacilities"],
): GuildState["guildFacilities"] => {
  const f = v as Partial<GuildState["guildFacilities"]> | null | undefined;
  return f &&
    typeof f === "object" &&
    typeof f.tavernLevel === "number" &&
    typeof f.forgeLevel === "number" &&
    typeof f.bountyBoardLevel === "number"
    ? (f as GuildState["guildFacilities"])
    : fallback;
};

const sanitizePrestigeBuffs = (
  v: unknown,
  fallback: GuildState["prestigeBuffs"],
): GuildState["prestigeBuffs"] => {
  const p = v as Partial<GuildState["prestigeBuffs"]> | null | undefined;
  return p && typeof p === "object" && typeof p.globalAttackBonus === "number" && typeof p.startingLevel === "number"
    ? (p as GuildState["prestigeBuffs"])
    : fallback;
};

const sanitizeArray = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);

let heroSeq = 0;
// startingLevel comes from prestigeBuffs — Legacy recruits spawn pre-leveled,
// using the same per-level gain rolls as gainExp so they aren't stat-cheated
const rollCandidate = (startingLevel = 1): Hero => {
  const level = Math.max(1, Math.min(MAX_HERO_LEVEL, Math.round(startingLevel)));
  let power = randInt([5, 15]);
  let maxFort = randInt([40, 60]);
  for (let l = 2; l <= level; l++) {
    power += randInt([2, 4]);
    maxFort += randInt([10, 20]);
  }
  return {
    id: `hero-${Date.now()}-${heroSeq++}`,
    name: CANDIDATE_NAMES[randInt([0, CANDIDATE_NAMES.length - 1])],
    job: JOBS[randInt([0, JOBS.length - 1])],
    level,
    exp: 0,
    expToNext: Math.floor(Math.pow(level, 2) * 100), // same curve gainExp uses on arrival at `level`
    stats: {
      power,
      fortitude: maxFort,
      max_fortitude: maxFort,
      speed: randInt([8, 15]) / 10, // 0.8–1.5
    },
    attr: {
      // matches gainExp's +0.02 greed per level-up — a pre-leveled prestige
      // recruit shouldn't stay cheaper than a hero who leveled there naturally
      greed: Math.min(GREED_CAP, randInt([5, 25]) / 100 + (level - 1) * 0.02),
      scavenge_multiplier: randInt([8, 15]) / 10,
    },
    traits: randomTraits(),
    status: "idle",
    personal_wealth: 0,
    gear: {},
  };
};

const randInt = ([min, max]: [number, number]) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

let logSeq = 0;
const makeLog = (message: string): LogEntry => ({
  // ponytail: counter + timestamp id, swap for crypto.randomUUID() if collisions ever matter
  id: `${Date.now()}-${logSeq++}`,
  timestamp: Date.now(),
  message,
});

// everything persisted/exported — the store minus its actions
type GuildData = Pick<
  GuildState,
  | "ledger"
  | "upgrades"
  | "guildFacilities"
  | "relationships"
  | "expedition"
  | "shadyMerchantActive"
  | "shadyMerchantExpiresAt"
  | "shadyMerchantInventory"
  | "shadyMerchantSeenVisit"
  | "retiredHeroes"
  | "prestigeBuffs"
  | "craftCooldownUntil"
  | "marketRates"
  | "heroes"
  | "tavernCandidates"
  | "dungeons"
  | "activeQuests"
  | "inventory"
  | "consumables"
  | "combatLoadout"
  | "bossFight"
  | "bossResult"
  | "eventLog"
  | "floatingTexts"
  | "activeChats"
>;

// fresh defaults each call — shared by store creation and wipeSave
const initialState = (): GuildData => ({
  ledger: {
    gold: 100,
    reputation: 0,
    materials: { organics: 0, minerals: 0, botanicals: 0 },
  },
  upgrades: [],
  guildFacilities: { tavernLevel: 0, forgeLevel: 0, bountyBoardLevel: 0 },
  relationships: [],
  expedition: null,
  shadyMerchantActive: false,
  shadyMerchantExpiresAt: 0,
  shadyMerchantInventory: [],
  shadyMerchantSeenVisit: 0,
  retiredHeroes: [],
  prestigeBuffs: { globalAttackBonus: 0, startingLevel: 1 },
  craftCooldownUntil: 0,
  marketRates: { organics: 1, minerals: 1, botanicals: 1 },

  heroes: [
    {
      id: "hero-1",
      name: "Brakka",
      job: "Warrior",
      level: 1,
      exp: 0,
      expToNext: 100,
      stats: { power: 10, fortitude: 50, max_fortitude: 50, speed: 1 },
      attr: { greed: 0.1, scavenge_multiplier: 1 },
      traits: { positive: "resilient", negative: "glutton" },
      status: "idle",
      personal_wealth: 0,
      gear: {},
    },
  ],

  tavernCandidates: [], // filled client-side by refreshTavern — keeps SSR deterministic

  dungeons: [
    {
      id: "dungeon-1",
      name: "Goblin Cave",
      threat_level: 5,
      base_duration_ms: 60_000,
      tags: ["goblinoid", "starter"],
      loot_table: {
        gold: [5, 15],
        materials: { organics: [1, 3] },
      },
    },
    {
      id: "dungeon-2",
      name: "Bandit Camp",
      threat_level: 15,
      base_duration_ms: 120_000,
      tags: ["humanoid"],
      loot_table: {
        gold: [15, 40],
        materials: { minerals: [1, 2], botanicals: [1, 4] },
      },
    },
    {
      id: "dungeon-3",
      name: "Cursed Monastery",
      threat_level: 30,
      base_duration_ms: 180_000,
      tags: ["undead", "holy"],
      loot_table: {
        gold: [40, 90],
        materials: { botanicals: [2, 5], organics: [1, 3] },
      },
    },
    {
      id: "dungeon-4",
      name: "Shadow Spire",
      threat_level: 50,
      base_duration_ms: 300_000,
      tags: ["arcane"],
      loot_table: {
        gold: [80, 160],
        materials: { minerals: [2, 5] },
      },
    },
    {
      id: "dungeon-5",
      name: "Gilded Vault",
      threat_level: 75,
      base_duration_ms: 480_000,
      tags: ["construct", "treasure"],
      loot_table: {
        gold: [150, 300],
        materials: { minerals: [3, 6], botanicals: [2, 4] },
      },
    },
    {
      id: "dungeon-6",
      name: "Black Citadel",
      threat_level: 100,
      base_duration_ms: 600_000,
      tags: ["demonic", "endgame"],
      loot_table: {
        gold: [250, 500],
        materials: { organics: [3, 6], minerals: [3, 6], botanicals: [3, 6] },
      },
    },
  ],

  activeQuests: [],
  inventory: [],
  // ponytail: starter stock hardcoded; buyable consumables in Market when economy needs the sink
  consumables: [
    { id: "life_potion", name: "Life Potion", type: "potion", effect: "Below 30% HP: restore 50% HP", quantity: 3 },
    { id: "phoenix_vial", name: "Phoenix Vial", type: "potion", effect: "On death: revive at 20% HP", quantity: 1 },
    { id: "haste_scroll", name: "Scroll of Haste", type: "scroll", effect: "Combat start: +50% party attack", quantity: 2 },
  ],
  combatLoadout: [],
  bossFight: null,
  bossResult: null,
  eventLog: [],
  floatingTexts: [],
  activeChats: [],
});

export const useGuildStore = create<GuildState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      exportSave: () => {
        const data = Object.fromEntries(
          Object.entries(get()).filter(
            ([k, v]) =>
              typeof v !== "function" &&
              k !== "floatingTexts" &&
              k !== "activeChats" &&
              k !== "bossResult" &&
              k !== "dungeons",
          ),
        );
        // UTF-8-safe base64: btoa alone throws on chars >255 (logs contain ×, —)
        return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
      },

      importSave: (base64String) => {
        try {
          const parsed = JSON.parse(
            decodeURIComponent(escape(atob(base64String.trim()))),
          );
          // minimal shape check so garbage can't brick the store
          if (
            typeof parsed !== "object" ||
            parsed === null ||
            typeof parsed.ledger?.gold !== "number" ||
            !Array.isArray(parsed.heroes)
          )
            return false;
          const before = get();
          // dungeons stay code-defined — old exports must not shadow new content
          set({
            ...parsed,
            heroes: (parsed.heroes as Hero[]).map(sanitizeHero),
            tavernCandidates: Array.isArray(parsed.tavernCandidates)
              ? (parsed.tavernCandidates as Hero[]).map(sanitizeHero)
              : [],
            marketRates: sanitizeMarketRates(parsed.marketRates, before.marketRates),
            guildFacilities: sanitizeGuildFacilities(parsed.guildFacilities, before.guildFacilities),
            prestigeBuffs: sanitizePrestigeBuffs(parsed.prestigeBuffs, before.prestigeBuffs),
            consumables: sanitizeArray(parsed.consumables, before.consumables),
            combatLoadout: sanitizeArray(parsed.combatLoadout, before.combatLoadout),
            floatingTexts: [],
            activeChats: [],
            bossResult: null,
            dungeons: get().dungeons,
          });
          return true;
        } catch {
          return false;
        }
      },

      wipeSave: () => {
        set(initialState());
      },

      removeFloatingText: (id) => {
        set({ floatingTexts: get().floatingTexts.filter((f) => f.id !== id) });
      },

      triggerHeroChat: (heroId, text, type, durationMs = 3000) => {
        const hero = get().heroes.find((h) => h.id === heroId);
        if (!hero) return;

        const id = `chat-${Date.now()}-${heroSeq++}`;
        set({
          activeChats: [
            ...get().activeChats,
            {
              id,
              heroId,
              heroName: hero.name,
              text,
              type,
              expiresAt: Date.now() + durationMs,
            },
          ],
        });
        setTimeout(() => {
          set({ activeChats: get().activeChats.filter((c) => c.id !== id) });
        }, durationMs);
      },

      // ── Boss raids & consumable loadout ──

      assignConsumable: (slotOwner, itemId) => {
        const { consumables, combatLoadout, bossFight } = get();
        if (bossFight) return false; // loadout locked mid-raid

        const stock = consumables.find((c) => c.id === itemId);
        if (!stock) return false;

        // every loadout entry reserves one unit of stock
        const reserved = combatLoadout.filter((l) => l.itemId === itemId).length;
        if (reserved >= stock.quantity) return false;

        const slotsUsed = combatLoadout.filter((l) => l.heroId === slotOwner).length;
        const maxSlots = slotOwner === "global" ? 1 : MAX_HERO_SLOTS;
        if (slotsUsed >= maxSlots) return false;

        set({
          combatLoadout: [
            ...combatLoadout,
            { heroId: slotOwner, itemId, triggerCondition: CONSUMABLE_TRIGGERS[itemId] },
          ],
        });
        return true;
      },

      unassignConsumable: (index) => {
        if (get().bossFight) return;
        set({ combatLoadout: get().combatLoadout.filter((_, i) => i !== index) });
      },

      buyConsumable: (itemId) => {
        const { ledger, consumables, addLog } = get();
        const price = CONSUMABLE_PRICE[itemId];
        if (ledger.gold < price) return false;

        const stock = consumables.find((c) => c.id === itemId);
        if (!stock) return false;

        set({
          ledger: { ...ledger, gold: ledger.gold - price },
          consumables: consumables.map((c) =>
            c.id === itemId ? { ...c, quantity: c.quantity + 1 } : c,
          ),
        });
        addLog(`Bought a ${stock.name} for ${price}g.`);
        return true;
      },

      startBossFight: (bossId, heroIds) => {
        const { heroes, bossFight, consumables, combatLoadout, addLog } = get();
        if (bossFight) return;

        const bossDef = BOSSES.find((b) => b.id === bossId);
        if (!bossDef) return;

        const party = heroes.filter(
          (h) => heroIds.includes(h.id) && h.status === "idle" && h.stats.fortitude > 0,
        );
        if (party.length === 0 || party.length > MAX_PARTY) return;

        // Scroll of Haste fires at combat start from the global slot
        let hasteMul = 1;
        let nextConsumables = consumables;
        let nextLoadout = combatLoadout;
        const hasteIdx = combatLoadout.findIndex(
          (l) => l.heroId === "global" && l.itemId === "haste_scroll",
        );
        if (hasteIdx !== -1) {
          hasteMul = 1.5;
          nextLoadout = combatLoadout.filter((_, i) => i !== hasteIdx);
          nextConsumables = consumables.map((c) =>
            c.id === "haste_scroll" ? { ...c, quantity: c.quantity - 1 } : c,
          );
        }

        set({
          bossFight: {
            bossId: bossDef.id,
            heroIds: party.map((h) => h.id),
            bossHp: bossDef.maxHp,
            round: 0,
            hasteMul,
            deadHeroIds: [],
          },
          consumables: nextConsumables,
          combatLoadout: nextLoadout,
          heroes: heroes.map((h) =>
            party.some((p) => p.id === h.id)
              ? { ...h, status: "on_quest" as const }
              : h,
          ),
        });
        addLog(`The party marches on ${bossDef.name}! (${party.length} heroes)`);
        if (hasteMul > 1) {
          const blessed = party[Math.floor(Math.random() * party.length)];
          get().triggerHeroChat(
            blessed.id,
            "I feel the Guildmaster's blessing!",
            "combat",
          );
        }
      },

      tickBossFight: () => {
        const fight = get().bossFight;
        if (!fight) return;
        const bossDef = BOSSES.find((b) => b.id === fight.bossId);
        // a corrupted/imported save could carry a bossId that no longer
        // exists — bail out of the raid instead of crashing on `undefined.x`
        if (!bossDef) {
          set({ bossFight: null });
          return;
        }
        const { heroes, consumables, combatLoadout, ledger, relationships } = get();
        // a raid persisted before this field existed would rehydrate without
        // it — default instead of crashing on the first tick after upgrade
        const deadHeroIds = fight.deadHeroIds ?? [];

        const inParty = (h: Hero) => fight.heroIds.includes(h.id);
        const living = heroes.filter((h) => inParty(h) && h.stats.fortitude > 0);
        const newLogs: LogEntry[] = [];
        const chats: { heroId: string; text: string }[] = [];

        // ── party swings first — bonded/rival pairs currently fighting shift total damage ──
        let synergyMod = 0;
        for (let i = 0; i < living.length; i++) {
          for (let j = i + 1; j < living.length; j++) {
            const rel = findRelationship(relationships, living[i].id, living[j].id);
            if (rel?.status === "bonded") synergyMod += 0.05;
            else if (rel?.status === "rivals") synergyMod -= 0.05;
          }
        }
        const partyDmg = Math.round(
          living.reduce((sum, h) => sum + totalStats(h).power, 0) *
            fight.hasteMul *
            (1 + synergyMod) *
            (1 + get().prestigeBuffs.globalAttackBonus), // Legends watch over the guild
        );
        const bossHp = fight.bossHp - partyDmg;

        if (bossHp <= 0) {
          // victory — pay out, level the party, release heroes
          const heroNames = heroes.filter(inParty).map((h) => h.name);
          let updated = heroes;
          const perHeroExp = Math.floor(bossDef.rewardExp / fight.heroIds.length);
          updated = updated.map((h) => {
            if (!inParty(h)) return h;
            // fallen heroes stay down — gainExp fully heals on level-up, which
            // would otherwise revive them for free, bypassing Phoenix Vial
            if (h.stats.fortitude <= 0) return { ...h, status: "injured" as const };
            const { hero: leveled, logs } = gainExp(h, perHeroExp);
            logs.forEach((l) => newLogs.push(makeLog(l)));
            return {
              ...leveled,
              status: leveled.stats.fortitude > 0 ? ("idle" as const) : ("injured" as const),
            };
          });
          newLogs.push(
            makeLog(
              `${bossDef.name} falls! +${bossDef.rewardGold} gold, +${bossDef.rewardRep} reputation.`,
            ),
          );
          const materials = { ...ledger.materials };
          for (const [key, amount] of Object.entries(bossDef.rewardMaterials) as [
            MaterialKey,
            number,
          ][]) {
            materials[key] += amount;
          }
          set({
            bossFight: null,
            bossResult: {
              bossName: bossDef.name,
              win: true,
              gold: bossDef.rewardGold,
              reputation: bossDef.rewardRep,
              exp: bossDef.rewardExp,
              materials: bossDef.rewardMaterials,
              heroNames,
            },
            heroes: updated,
            ledger: {
              ...ledger,
              gold: ledger.gold + bossDef.rewardGold,
              reputation: ledger.reputation + bossDef.rewardRep,
              materials,
            },
            relationships: applyRaidRelationships(
              relationships,
              living,
              fight.heroIds,
              deadHeroIds.length > 0,
            ),
            eventLog: [...newLogs, ...get().eventLog].slice(0, MAX_LOG_ENTRIES),
          });
          return;
        }

        // ── boss strikes one random living hero — unless someone wears the
        // Dread Plate, which draws every blow to its bearer ──
        const dreadTank = living.find((h) => heroEffects(h).has("dread"));
        const target = dreadTank ?? living[Math.floor(Math.random() * living.length)];
        let nextConsumables = consumables;
        let nextLoadout = combatLoadout;

        // consume one unit + drop the loadout entry; false if none equipped
        const consume = (heroId: string, itemId: ConsumableId): boolean => {
          const idx = nextLoadout.findIndex(
            (l) => l.heroId === heroId && l.itemId === itemId,
          );
          if (idx === -1) return false;
          nextLoadout = nextLoadout.filter((_, i) => i !== idx);
          nextConsumables = nextConsumables.map((c) =>
            c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c,
          );
          return true;
        };

        // heroes who flee this tick (Coward trait) — removed from the fight,
        // sent home safe, never also drink a potion the same tick
        const fleeing: string[] = [];

        // per-hero consumable auto-triggers, checked every combat tick
        const checkConsumableTriggers = (h: Hero): Hero => {
          const max = totalStats(h).maxFortitude;
          let fort = h.stats.fortitude;

          // Phoenix Vial — death prevention first
          if (fort <= 0 && consume(h.id, "phoenix_vial")) {
            fort = Math.max(1, Math.round(max * 0.2));
            chats.push({ heroId: h.id, text: "Second wind! Let's go!" });
            newLogs.push(makeLog(`${h.name}'s Phoenix Vial shatters — back on their feet!`));
          }
          if (fort < 0) fort = 0; // down, no vial — don't leak negative HP into bars
          // Coward — flees below 40% HP instead of fighting on
          if (fort > 0 && fort < max * 0.4 && h.traits.negative === "coward") {
            fleeing.push(h.id);
            chats.push({ heroId: h.id, text: "I didn't sign up for this!" });
            newLogs.push(makeLog(`${h.name} flees the battle!`));
          } else if (
            fort > 0 &&
            fort < max * 0.3 &&
            // Bloodpact Ring — the pact forbids borrowed life
            !heroEffects(h).has("bloodpact") &&
            consume(h.id, "life_potion")
          ) {
            // Life Potion — emergency heal below 30%
            fort = Math.min(max, fort + Math.round(max * 0.5));
            chats.push({ heroId: h.id, text: "I'm not dying today!" });
            newLogs.push(makeLog(`${h.name} downs a Life Potion mid-fight.`));
          }
          return fort === h.stats.fortitude
            ? h
            : { ...h, stats: { ...h.stats, fortitude: fort } };
        };

        // fortitude hitting 0 counts as "died" even if a Phoenix Vial revives them
        // this same tick — captured before checkConsumableTriggers can heal it away
        const newlyDead: string[] = [];
        let updated = heroes.map((h) => {
          if (!inParty(h)) return h;
          let fort = h.stats.fortitude;
          if (h.id === target?.id) fort -= bossDef.damage;
          // Cursed Sword — the blade feeds on its bearer every round
          if (h.stats.fortitude > 0 && heroEffects(h).has("hemorrhage")) {
            fort -= Math.ceil(totalStats(h).maxFortitude * 0.05);
          }
          const struck = fort === h.stats.fortitude ? h : { ...h, stats: { ...h.stats, fortitude: fort } };
          if (struck.stats.fortitude <= 0 && !deadHeroIds.includes(struck.id)) {
            newlyDead.push(struck.id);
          }
          const checked = checkConsumableTriggers(struck);
          return fleeing.includes(h.id) ? { ...checked, status: "idle" as const } : checked;
        });

        const anyoneUp = updated.some(
          (h) => inParty(h) && h.stats.fortitude > 0 && !fleeing.includes(h.id),
        );
        if (!anyoneUp) {
          // wipe — everyone still standing limps home injured; fled heroes stay idle
          const heroNames = heroes.filter(inParty).map((h) => h.name);
          updated = updated.map((h) =>
            inParty(h) && !fleeing.includes(h.id)
              ? { ...h, status: "injured" as const, stats: { ...h.stats, fortitude: 0 } }
              : h,
          );
          newLogs.push(makeLog(`The party was wiped out by ${bossDef.name}...`));
          set({
            bossFight: null,
            bossResult: {
              bossName: bossDef.name,
              win: false,
              gold: 0,
              reputation: 0,
              exp: 0,
              materials: {},
              heroNames,
            },
            heroes: updated,
            consumables: nextConsumables,
            combatLoadout: nextLoadout,
            eventLog: [...newLogs, ...get().eventLog].slice(0, MAX_LOG_ENTRIES),
          });
          return;
        }

        set({
          bossFight: {
            ...fight,
            bossHp,
            round: fight.round + 1,
            heroIds: fight.heroIds.filter((id) => !fleeing.includes(id)),
            deadHeroIds: [...deadHeroIds, ...newlyDead],
          },
          heroes: updated,
          consumables: nextConsumables,
          combatLoadout: nextLoadout,
          eventLog: newLogs.length
            ? [...newLogs, ...get().eventLog].slice(0, MAX_LOG_ENTRIES)
            : get().eventLog,
        });
        for (const c of chats) get().triggerHeroChat(c.heroId, c.text, "combat");
      },

      dismissBossResult: () => {
        set({ bossResult: null });
      },

      retireHero: (heroId) => {
        const { heroes, ledger, retiredHeroes, prestigeBuffs, addLog } = get();
        const hero = heroes.find((h) => h.id === heroId);
        if (!hero || hero.status === "on_quest") return;

        const rep = hero.level * RETIRE_REP_PER_LEVEL;
        // a level-capped hero retires as a Legend: Hall of Fame entry plus
        // permanent, account-wide prestige buffs on top of the usual rep
        const isLegend = hero.level >= MAX_HERO_LEVEL;
        set({
          heroes: heroes.filter((h) => h.id !== heroId),
          ledger: { ...ledger, reputation: ledger.reputation + rep },
          ...(isLegend && {
            retiredHeroes: [
              ...retiredHeroes,
              { id: hero.id, name: hero.name, class: hero.job, level: hero.level },
            ],
            prestigeBuffs: {
              globalAttackBonus: Math.min(
                LEGEND_ATTACK_CAP,
                Math.round((prestigeBuffs.globalAttackBonus + LEGEND_ATTACK_BONUS) * 100) / 100,
              ),
              startingLevel: prestigeBuffs.startingLevel + 1,
            },
          }),
        });
        addLog(
          isLegend
            ? `${hero.name} enters the Hall of Fame! +${rep} reputation, +2% guild attack, recruits now start at Lv ${prestigeBuffs.startingLevel + 1}.`
            : `${hero.name} retired with honors. +${rep} reputation.`,
        );
      },

      buyUpgrade: (upgradeId, cost) => {
        const { ledger, upgrades, addLog } = get();
        if (
          upgrades.includes(upgradeId) ||
          ledger.gold < cost.gold ||
          ledger.reputation < cost.reputation
        )
          return;

        set({
          ledger: {
            ...ledger,
            gold: ledger.gold - cost.gold,
            reputation: ledger.reputation - cost.reputation,
          },
          upgrades: [...upgrades, upgradeId],
        });
        addLog(`Guild upgrade purchased: ${upgradeId}.`);
      },

      upgradeFacility: (facility, cost) => {
        const { ledger, guildFacilities, addLog } = get();
        const levelKey = `${facility}Level` as const;
        const currentLevel = guildFacilities[levelKey];
        if (currentLevel >= FACILITY_MAX_LEVEL || ledger.gold < cost) return;

        set({
          ledger: { ...ledger, gold: ledger.gold - cost },
          guildFacilities: { ...guildFacilities, [levelKey]: currentLevel + 1 },
        });
        addLog(`${facility} upgraded to level ${currentLevel + 1}.`);
      },

      tickTavernRegen: () => {
        const { heroes, guildFacilities } = get();
        const level = guildFacilities.tavernLevel;
        if (level <= 0) return;
        const regenPct = TAVERN_REGEN_PCT_PER_LEVEL * level;
        let changed = false;
        const updated = heroes.map((h) => {
          if (h.status !== "idle") return h;
          const max = totalStats(h).maxFortitude;
          if (h.stats.fortitude >= max) return h;
          changed = true;
          // Math.max(1, ...) floor: without it, sub-1 HP amounts (any hero
          // with max_fortitude under ~100 at Lv1) round down to a no-op tick
          return {
            ...h,
            stats: {
              ...h.stats,
              fortitude: Math.min(max, h.stats.fortitude + Math.max(1, Math.round(max * regenPct))),
            },
          };
        });
        if (changed) set({ heroes: updated });
      },

      startExpedition: (heroIds, durationMs) => {
        const { heroes, guildFacilities, expedition, addLog } = get();
        const level = guildFacilities.bountyBoardLevel;
        // duration must be a slot this board level has actually unlocked
        if (level < 1 || expedition) return false;
        if (!EXPEDITION_DURATIONS_MS.slice(0, level).includes(durationMs)) return false;

        const party = heroes.filter(
          (h) => heroIds.includes(h.id) && h.status === "idle" && h.stats.fortitude > 0,
        );
        if (party.length === 0 || party.length > MAX_PARTY) return false;

        const now = Date.now();
        set({
          expedition: {
            heroIds: party.map((h) => h.id),
            startedAt: now,
            completionTime: now + durationMs,
            durationMs,
          },
          heroes: heroes.map((h) =>
            party.some((p) => p.id === h.id) ? { ...h, status: "on_quest" as const } : h,
          ),
        });
        addLog(
          `${party.map((h) => h.name).join(", ")} set out on a ${durationMs / 3_600_000}h expedition.`,
        );
        return true;
      },

      tickExpedition: () => {
        const exp = get().expedition;
        if (!exp || exp.completionTime > Date.now()) return;
        const state = get();
        const hours = exp.durationMs / 3_600_000;
        const levelBonus =
          1 + EXPEDITION_LEVEL_GOLD_BONUS * Math.max(0, state.guildFacilities.bountyBoardLevel - 1);

        let heroes = state.heroes;
        let guildGold = 0;
        const materials = { ...state.ledger.materials };
        const newLogs: LogEntry[] = [];
        const matKeys: MaterialKey[] = ["organics", "minerals", "botanicals"];

        for (const id of exp.heroIds) {
          const hero = heroes.find((h) => h.id === id);
          if (!hero) continue; // retired mid-expedition is impossible today, but stay safe

          const fx = heroEffects(hero);
          const totals = totalStats(hero);
          // no failure roll — safety is the trade for the low rate (see constants)
          const rawGold = Math.round(
            totals.power * EXPEDITION_GOLD_PER_POWER_HOUR * hours * levelBonus *
              (fx.has("monocle") ? 1.5 : 1),
          );
          const effectiveGreed = Math.max(
            0,
            hero.attr.greed -
              (state.upgrades.includes(UPGRADE_IDS.taxLoophole) ? 0.02 : 0) -
              (fx.has("embezzler") ? 0.1 : 0),
          );
          const heroCut = Math.round(rawGold * effectiveGreed);
          guildGold += rawGold - heroCut;

          const matKey = matKeys[randInt([0, matKeys.length - 1])];
          materials[matKey] += Math.max(1, Math.round(hours * totals.scavenge));

          const fatigued: Hero = {
            ...hero,
            personal_wealth: hero.personal_wealth + heroCut,
            stats: {
              ...hero.stats,
              fortitude: fx.has("insomniac")
                ? hero.stats.fortitude
                : Math.max(0, hero.stats.fortitude - QUEST_FATIGUE),
            },
          };
          const { hero: leveled, logs } = gainExp(
            fatigued,
            Math.round(EXPEDITION_EXP_PER_HOUR * hours),
          );
          logs.forEach((l) => newLogs.push(makeLog(l)));
          const done: Hero = {
            ...leveled,
            status: leveled.stats.fortitude === 0 ? "injured" : "idle",
          };
          heroes = heroes.map((h) => (h.id === id ? done : h));
        }

        newLogs.push(
          makeLog(`Expedition returned after ${hours}h — +${guildGold}g for the guild coffers.`),
        );
        set({
          expedition: null,
          heroes,
          ledger: { ...state.ledger, gold: state.ledger.gold + guildGold, materials },
          eventLog: [...newLogs, ...state.eventLog].slice(0, MAX_LOG_ENTRIES),
        });
        const speaker = exp.heroIds[randInt([0, exp.heroIds.length - 1])];
        get().triggerHeroChat(speaker, "We're back! The road was long.", "roster");
      },

      tickShadyMerchant: () => {
        const { shadyMerchantActive, shadyMerchantExpiresAt, addLog } = get();
        const now = Date.now();

        if (shadyMerchantActive) {
          if (now >= shadyMerchantExpiresAt) {
            set({
              shadyMerchantActive: false,
              shadyMerchantExpiresAt: 0,
              shadyMerchantInventory: [],
            });
            addLog("The shady merchant has vanished into the mist...");
          }
          return;
        }

        // rare spawn roll, once per tick
        if (Math.random() >= SHADY_SPAWN_CHANCE) return;
        set({
          shadyMerchantActive: true,
          shadyMerchantExpiresAt: now + SHADY_MERCHANT_DURATION_MS,
          shadyMerchantInventory: SHADY_STOCK.map((tpl) => ({
            ...tpl,
            id: `shady-${Date.now()}-${heroSeq++}`,
          })),
        });
        addLog("A shady merchant has appeared with cursed wares. He won't stay long.");
      },

      buyShadyItem: (itemId) => {
        const { shadyMerchantActive, shadyMerchantInventory, ledger, inventory, addLog } = get();
        const item = shadyMerchantInventory.find((i) => i.id === itemId);
        if (!shadyMerchantActive || !item || ledger.gold < item.price) return false;

        // bought into the armory with guild gold — heroes then buy/equip it
        // through the normal Market flow like any other gear
        set({
          ledger: { ...ledger, gold: ledger.gold - item.price },
          inventory: [...inventory, item],
          shadyMerchantInventory: shadyMerchantInventory.filter((i) => i.id !== itemId),
        });
        addLog(`Bought ${item.name} from the shady merchant for ${item.price}g. No refunds.`);
        return true;
      },

      setShadyMerchantSeen: (visit) => {
        set({ shadyMerchantSeenVisit: visit });
      },

      rollMarket: () => {
        // mean-reverting walk, not an independent redraw — prices drift from
        // where they were instead of teleporting, so timing a sale is a real
        // (small) strategic choice instead of pure noise with zero EV
        const { marketRates } = get();
        const walk = (prev: number) =>
          Math.round(Math.min(2, Math.max(0.5, prev + (Math.random() - 0.5) * 0.3)) * 100) / 100;
        set({
          marketRates: {
            organics: walk(marketRates.organics),
            minerals: walk(marketRates.minerals),
            botanicals: walk(marketRates.botanicals),
          },
        });
      },

      sellMaterial: (key) => {
        const { ledger, marketRates, addLog } = get();
        const count = ledger.materials[key];
        if (count <= 0) return;

        const earned = Math.floor(count * MATERIAL_BASE_PRICE[key] * marketRates[key]);
        set({
          ledger: {
            ...ledger,
            gold: ledger.gold + earned,
            materials: { ...ledger.materials, [key]: 0 },
          },
        });
        addLog(`Sold ${count} ${key} for ${earned}g (${marketRates[key]}× rate).`);
      },

      craftItem: (subType) => {
        const { ledger, inventory, craftCooldownUntil, addLog } = get();
        if (Date.now() < craftCooldownUntil) return; // spam-click guard
        const recipe = RECIPES[subType];

        for (const [mat, need] of Object.entries(recipe.cost) as [MaterialKey, number][]) {
          if (ledger.materials[mat] < need) return;
        }

        // Forge facility levels bias the roll toward higher tiers — clamp is
        // load-bearing: an unclamped roll past 100 would miss every bucket
        // and fall back to RARITY_TABLE[0] (common), inverting the buff.
        const roll = Math.min(
          99.99,
          Math.random() * 100 + FORGE_TIER_BONUS_PER_LEVEL * get().guildFacilities.forgeLevel,
        );
        const { rarity, tier } =
          RARITY_TABLE.find((r) => roll < r.upTo) ?? RARITY_TABLE[0];
        const prefix =
          tier >= 1.5 ? PREFIXES[randInt([0, PREFIXES.length - 1])] : null;

        // fractional stats (speed/scavenge) keep 2dp; flat stats round whole
        const raw = recipe.base * tier;
        const value = recipe.base < 1 ? Math.round(raw * 100) / 100 : Math.round(raw);

        // accessories can roll a rule-bending effect and take its artifact name
        // (craftable pool only — cursed effects are Shady Merchant exclusives)
        const specialEffect =
          recipe.slot === "accessory" && Math.random() < ACCESSORY_EFFECT_CHANCE
            ? CRAFTABLE_EFFECT_IDS[randInt([0, CRAFTABLE_EFFECT_IDS.length - 1])]
            : undefined;

        const item: Item = {
          id: `item-${Date.now()}-${heroSeq++}`,
          name: specialEffect ? EFFECTS[specialEffect].name : recipe.name,
          slot: recipe.slot,
          subType,
          base_stats: { [recipe.stat]: value },
          rarity,
          rarity_tier: tier,
          prefix: specialEffect ? null : prefix,
          suffix: null,
          specialEffect,
          price: Math.round(recipe.priceBase * tier),
        };

        const materials = { ...ledger.materials };
        for (const [mat, need] of Object.entries(recipe.cost) as [MaterialKey, number][]) {
          materials[mat] -= need;
        }

        set({
          ledger: { ...ledger, materials },
          inventory: [...inventory, item],
          craftCooldownUntil: Date.now() + CRAFT_COOLDOWN_MS,
        });
        addLog(
          `Crafted a ${rarity[0].toUpperCase() + rarity.slice(1)}${item.prefix ? ` "${item.prefix}"` : ""} ${item.name}!`,
        );
      },

      heroBuyItem: (itemId) => {
        const { heroes, inventory, ledger, addLog } = get();
        const item = inventory.find((i) => i.id === itemId);
        if (!item) return false;

        const match = findBuyerFor(heroes, item);
        if (!match) {
          // companyman pays a 150% premium, thrifty gets a 20% discount —
          // duplicated (not shared with findBuyerFor) since it's only needed
          // here to pick which hero grumbles, not for the match itself
          const priceFor = (h: Hero) => {
            const base = heroEffects(h).has("companyman")
              ? Math.round(item.price * 1.5)
              : item.price;
            return h.traits.positive === "thrifty" ? Math.round(base * 0.8) : base;
          };
          const greedyRejector = heroes.find(
            (h) =>
              h.status === "idle" &&
              h.personal_wealth >= priceFor(h) &&
              h.traits.negative === "greedy" &&
              priceFor(h) < GREEDY_MIN_PRICE,
          );
          if (greedyRejector) {
            get().triggerHeroChat(
              greedyRejector.id,
              "Do I look like a peasant? Bring me glowing weapons!",
              "roster",
            );
          } else if (heroes.length > 0) {
            // nobody bites — a random hero explains why
            const grump = heroes[randInt([0, heroes.length - 1])];
            get().triggerHeroChat(
              grump.id,
              grump.personal_wealth < item.price
                ? "Sorry, I'm broke!"
                : "I don't need that!",
              "roster",
            );
          }
          return false;
        }

        const { buyer, slot, paid } = match;
        set({
          ledger: { ...ledger, gold: ledger.gold + paid },
          inventory: inventory.filter((i) => i.id !== itemId),
          // ponytail: replaced gear is discarded; return-to-inventory when players notice
          heroes: heroes.map((h) =>
            h.id === buyer.id
              ? {
                  ...h,
                  personal_wealth: h.personal_wealth - paid,
                  gear: { ...h.gear, [slot]: item },
                }
              : h,
          ),
        });
        addLog(
          `${buyer.name} bought ${item.prefix ? `${item.prefix} ` : ""}${item.name} for ${paid}g!`,
        );
        return true;
      },

      tickShopAutoBuy: () => {
        const { inventory, heroes, ledger, addLog } = get();
        let curHeroes = heroes;
        let curLedger = ledger;
        let curInventory = inventory;
        const logs: string[] = [];

        for (const item of inventory) {
          const match = findBuyerFor(curHeroes, item);
          if (!match) continue;
          const { buyer, slot, paid } = match;
          curLedger = { ...curLedger, gold: curLedger.gold + paid };
          curInventory = curInventory.filter((i) => i.id !== item.id);
          curHeroes = curHeroes.map((h) =>
            h.id === buyer.id
              ? { ...h, personal_wealth: h.personal_wealth - paid, gear: { ...h.gear, [slot]: item } }
              : h,
          );
          logs.push(
            `${buyer.name} picked up ${item.prefix ? `${item.prefix} ` : ""}${item.name} from stock for ${paid}g.`,
          );
        }

        if (logs.length === 0) return; // no-op avoidance — same idiom as tickTavernRegen
        set({ heroes: curHeroes, ledger: curLedger, inventory: curInventory });
        for (const l of logs) addLog(l);
      },

      scrapItem: (itemId) => {
        const { inventory, ledger, addLog } = get();
        const item = inventory.find((i) => i.id === itemId);
        if (!item) return false;

        const refund = scrapRefund(item);
        const materials = { ...ledger.materials };
        for (const [mat, qty] of Object.entries(refund) as [MaterialKey, number][]) {
          materials[mat] += qty;
        }

        set({
          ledger: { ...ledger, materials },
          inventory: inventory.filter((i) => i.id !== itemId),
        });
        const refundText = Object.entries(refund)
          .map(([mat, qty]) => `${qty} ${mat}`)
          .join(", ");
        addLog(
          `Scrapped ${item.prefix ? `${item.prefix} ` : ""}${item.name} for ${refundText}.`,
        );
        return true;
      },

      refreshTavern: () => {
        const lvl = get().prestigeBuffs.startingLevel;
        set({ tavernCandidates: [rollCandidate(lvl), rollCandidate(lvl), rollCandidate(lvl)] });
      },

      hireHero: (candidateId) => {
        const { ledger, heroes, tavernCandidates, upgrades, addLog } = get();
        const candidate = tavernCandidates.find((c) => c.id === candidateId);
        const base = hireCost(heroes.length);
        const cost = candidate?.traits.negative === "glutton" ? base * 2 : base;
        if (!candidate || ledger.gold < cost || heroes.length >= rosterCap(upgrades))
          return false;

        set({
          ledger: { ...ledger, gold: ledger.gold - cost },
          heroes: [...heroes, candidate],
          tavernCandidates: tavernCandidates.filter((c) => c.id !== candidateId),
        });
        addLog(`${candidate.name} joined the guild for ${cost}g.`);
        // an old-timer welcomes the recruit
        if (heroes.length > 0) {
          const greeter = heroes[randInt([0, heroes.length - 1])];
          get().triggerHeroChat(greeter.id, "Yo, welcome to the guild!!!", "roster");
        }
        return true;
      },

      addLog: (message) => {
        set({
          eventLog: [makeLog(message), ...get().eventLog].slice(
            0,
            MAX_LOG_ENTRIES,
          ),
        });
      },

      healHero: (heroId) => {
        const { heroes, ledger, addLog } = get();
        const hero = heroes.find((h) => h.id === heroId);
        const cost = hero?.traits.negative === "glutton" ? HEAL_COST * 2 : HEAL_COST;
        if (!hero || hero.status === "on_quest" || ledger.gold < cost)
          return;
        const maxFort = totalStats(hero).maxFortitude; // armor counts
        if (hero.stats.fortitude >= maxFort) return;

        set({
          ledger: { ...ledger, gold: ledger.gold - cost },
          heroes: heroes.map((h) =>
            h.id === heroId
              ? {
                  ...h,
                  status: "idle" as const,
                  stats: { ...h.stats, fortitude: maxFort },
                }
              : h,
          ),
        });
        addLog(`${hero.name} healed for ${cost}g and is ready to work.`);
      },

      dispatchHero: (heroId, dungeonId) => {
        const { heroes, dungeons, activeQuests } = get();
        const hero = heroes.find((h) => h.id === heroId);
        const dungeon = dungeons.find((d) => d.id === dungeonId);
        if (!hero || !dungeon || hero.status !== "idle") return;

        const quest: ActiveQuest = {
          heroId,
          dungeonId,
          // gear speed counts toward travel time
          completionTime:
            Date.now() + dungeon.base_duration_ms / totalStats(hero).speed,
        };

        set({
          activeQuests: [...activeQuests, quest],
          heroes: heroes.map((h) =>
            h.id === heroId ? { ...h, status: "on_quest" as const } : h,
          ),
        });
        get().addLog(`${hero.name} set out for ${dungeon.name}.`);
      },

      // Quest resolution engine. GameTicker calls this on mount (offline
      // progress) and every second (live completions). Resolves every quest
      // whose completionTime has passed; quest removal = completionTime reset.
      tickQuests: () => {
        const now = Date.now();
        const state = get();
        const finished = state.activeQuests.filter(
          (q) => q.completionTime <= now,
        );
        if (finished.length === 0) return;

        let heroes = state.heroes;
        let ledger = state.ledger;
        const newLogs: LogEntry[] = [];
        const newFloats: FloatingText[] = [];
        const reactions: { heroId: string; text: string }[] = [];

        for (const quest of finished) {
          const hero = heroes.find((h) => h.id === quest.heroId);
          const dungeon = state.dungeons.find((d) => d.id === quest.dungeonId);
          if (!hero || !dungeon) continue;

          // gear counts — it's why heroes buy it; upgrades + accessories bend rules
          const fx = heroEffects(hero);
          const totals = totalStats(hero); // includes gear bonuses + monocle penalty
          const effectivePower =
            (totals.power + (state.upgrades.includes(UPGRADE_IDS.sharpening) ? 5 : 0)) *
            (1 + state.prestigeBuffs.globalAttackBonus);
          const successChance = (effectivePower / dungeon.threat_level) * 100;
          const success = Math.random() * 100 < successChance;
          const effectiveGreed = Math.max(
            0,
            hero.attr.greed -
              (state.upgrades.includes(UPGRADE_IDS.taxLoophole) ? 0.02 : 0) -
              (fx.has("embezzler") ? 0.1 : 0),
          );

          // exp scales with threat × duration-in-minutes; 100% on win, 25% on loss
          const baseExp = Math.floor(
            dungeon.threat_level * (dungeon.base_duration_ms / 60000),
          );

          // rewards sending a hero somewhere different than their last trip —
          // without it, one "best" dungeon dominates forever once you outlevel
          // its threat, and every lower-threat dungeon goes permanently dead
          const rotationBonus =
            hero.lastDungeonId && hero.lastDungeonId !== dungeon.id ? 1.15 : 1;

          // base hero after quest outcome (stats/wealth), pre-progression
          let base: Hero;
          if (success) {
            const rawGold = Math.round(
              randInt(dungeon.loot_table.gold) *
                totals.scavenge *
                rotationBonus *
                (fx.has("monocle") ? 1.5 : 1),
            );
            const heroCut = Math.round(rawGold * effectiveGreed);
            const guildGold = rawGold - heroCut;

            const materials = { ...ledger.materials };
            for (const [key, range] of Object.entries(
              dungeon.loot_table.materials,
            ) as [MaterialKey, [number, number]][]) {
              materials[key] += Math.round(randInt(range) * totals.scavenge);
            }

            ledger = { ...ledger, gold: ledger.gold + guildGold, materials };
            base = {
              ...hero,
              lastDungeonId: dungeon.id,
              personal_wealth: hero.personal_wealth + heroCut,
              // success still fatigues — unless the Insomniac never sleeps
              stats: {
                ...hero.stats,
                fortitude: fx.has("insomniac")
                  ? hero.stats.fortitude
                  : Math.max(0, hero.stats.fortitude - QUEST_FATIGUE),
              },
            };
            newLogs.push(
              makeLog(
                `${hero.name} cleared ${dungeon.name}!${rotationBonus > 1 ? " (fresh territory bonus)" : ""} Earned ${guildGold}g (+${heroCut}g pocketed).`,
              ),
            );
            newFloats.push({
              id: `float-${Date.now()}-${heroSeq++}`,
              heroId: hero.id,
              text: `+${guildGold} Gold`,
              color: "text-amber-400",
            });
          } else {
            // failure wipes fortitude
            base = { ...hero, lastDungeonId: dungeon.id, stats: { ...hero.stats, fortitude: 0 } };
            newLogs.push(
              makeLog(
                `${hero.name} failed ${dungeon.name} and was severely injured!`,
              ),
            );
            newFloats.push({
              id: `float-${Date.now()}-${heroSeq++}`,
              heroId: hero.id,
              text: "Injured!",
              color: "text-rose-400",
            });
          }

          // level-up may fully restore fortitude, reviving an injured hero
          // martyr: failure teaches double; everyone else learns 25%
          const earnedExp = success
            ? baseExp
            : fx.has("martyr")
              ? baseExp * 2
              : Math.floor(baseExp * 0.25);
          const { hero: leveled, logs: lvlLogs } = gainExp(base, earnedExp);
          const updated: Hero = {
            ...leveled,
            status: leveled.stats.fortitude === 0 ? "injured" : "idle",
          };
          heroes = heroes.map((h) => (h.id === hero.id ? updated : h));
          for (const l of lvlLogs) newLogs.push(makeLog(l));

          // post-quest chatter
          if (updated.stats.fortitude < totalStats(updated).maxFortitude * 0.2) {
            reactions.push({ heroId: hero.id, text: "Oh no, I'm dying..." });
          } else if (success && updated.stats.fortitude >= hero.stats.fortitude) {
            // triumph: took no net damage
            reactions.push({ heroId: hero.id, text: "I can do this all day!" });
          }
        }

        set({
          heroes,
          ledger,
          activeQuests: state.activeQuests.filter(
            (q) => q.completionTime > now,
          ),
          eventLog: [...newLogs, ...state.eventLog].slice(0, MAX_LOG_ENTRIES),
          floatingTexts: [...state.floatingTexts, ...newFloats],
        });
        for (const r of reactions) get().triggerHeroChat(r.heroId, r.text, "combat");
      },
    }),
    {
      name: "guild-master-storage",
      // ponytail: version bump discards old dev saves; write real migrations post-launch
      version: 8,
      // stale save → intentional reset to defaults (merge fills everything)
      migrate: () => ({}) as GuildState,
      // saves written before dungeons were unpersisted still carry a stale
      // dungeons array — always take the code-defined list
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(persisted as Partial<GuildState>),
          dungeons: current.dungeons,
        };
        return {
          ...merged,
          heroes: merged.heroes.map(sanitizeHero),
          tavernCandidates: merged.tavernCandidates.map(sanitizeHero),
          marketRates: sanitizeMarketRates(merged.marketRates, current.marketRates),
          guildFacilities: sanitizeGuildFacilities(merged.guildFacilities, current.guildFacilities),
          prestigeBuffs: sanitizePrestigeBuffs(merged.prestigeBuffs, current.prestigeBuffs),
          consumables: sanitizeArray(merged.consumables, current.consumables),
          combatLoadout: sanitizeArray(merged.combatLoadout, current.combatLoadout),
        };
      },
      // floatingTexts/activeChats/bossResult are ephemeral juice — never write
      // to localStorage. dungeons are static content from code — persisting
      // them would freeze old saves out of newly added dungeons.
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([k]) =>
              k !== "floatingTexts" &&
              k !== "activeChats" &&
              k !== "bossResult" &&
              k !== "dungeons",
          ),
        ) as GuildState,
    },
  ),
);
