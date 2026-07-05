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

export type ItemSlot = "weapon" | "armor" | "boots" | "accessory";
export type GearSlot = "weapon" | "armor" | "boots" | "accessory1" | "accessory2";
export type SubType = "dagger" | "sword" | "staff" | "armor" | "boots" | "ring";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type EffectId =
  | "embezzler"
  | "insomniac"
  | "martyr"
  | "monocle"
  | "companyman";

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
  attr: HeroAttr; // greed is a 0..1 fraction — Ego Tax adds 0.02, caps at 0.80
  traits: string[];
  status: HeroStatus;
  personal_wealth: number;
  gear: Partial<Record<GearSlot, Item>>;
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

// ---------- Store ----------

interface GuildState {
  ledger: Ledger;
  heroes: Hero[];
  tavernCandidates: Hero[];
  dungeons: Dungeon[];
  activeQuests: ActiveQuest[];
  inventory: Item[];
  eventLog: LogEntry[];
  floatingTexts: FloatingText[]; // ephemeral UI juice, not persisted
  upgrades: string[]; // purchased upgrade ids
  marketRates: MarketRates;

  dispatchHero: (heroId: string, dungeonId: string) => void;
  tickQuests: () => void;
  addLog: (message: string) => void;
  healHero: (heroId: string) => void;
  refreshTavern: () => void;
  hireHero: (candidateId: string) => void;
  craftItem: (subType: SubType) => void;
  heroBuyItem: (itemId: string) => boolean;
  removeFloatingText: (id: string) => void;
  retireHero: (heroId: string) => void;
  buyUpgrade: (upgradeId: string, cost: { gold: number; reputation: number }) => void;
  rollMarket: () => void;
  sellMaterial: (key: MaterialKey) => void;
  exportSave: () => string;
  importSave: (base64String: string) => boolean;
  wipeSave: () => void;
}

const QUEST_FATIGUE = 10; // fortitude lost on a successful run
const GREED_CAP = 0.8; // Ego Tax ceiling (80%)

// Add exp and run the level-up loop. Pure — returns a new hero + any level
// logs. Each level: +power, +maxFortitude, full heal, +2% greed (Ego Tax).
const gainExp = (hero: Hero, amount: number): { hero: Hero; logs: string[] } => {
  let { level, exp, expToNext } = hero;
  let { power, max_fortitude, fortitude } = hero.stats;
  let greed = hero.attr.greed;
  const logs: string[] = [];

  exp += amount;
  while (exp >= expToNext) {
    exp -= expToNext;
    level += 1;
    expToNext = Math.floor(Math.pow(level, 2) * 100);
    power += randInt([2, 4]);
    max_fortitude += randInt([10, 20]);
    fortitude = max_fortitude; // fully restore
    greed = Math.min(GREED_CAP, greed + 0.02);
    logs.push(
      `${hero.name} leveled up to ${level}! Greed increased to ${Math.round(greed * 100)}%`,
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
export const RETIRE_REP_PER_LEVEL = 50;
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
  for (const s of ["accessory1", "accessory2"] as const) {
    const fx = hero.gear[s]?.specialEffect;
    if (fx) out.add(fx);
  }
  return out;
};

// base + all equipped gear (monocle power penalty applied here)
export function totalStats(hero: Hero) {
  const fx = heroEffects(hero);
  const basePower = hero.stats.power * (fx.has("monocle") ? 0.75 : 1);
  return {
    power: Math.round(basePower + gearBonus(hero, "power")),
    speed: Math.round((hero.stats.speed + gearBonus(hero, "speed")) * 100) / 100,
    maxFortitude: hero.stats.max_fortitude + gearBonus(hero, "max_fortitude"),
    scavenge:
      Math.round(
        (hero.attr.scavenge_multiplier + gearBonus(hero, "scavenge")) * 100,
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

let heroSeq = 0;
const rollCandidate = (): Hero => {
  const fortitude = randInt([40, 60]);
  return {
    id: `hero-${Date.now()}-${heroSeq++}`,
    name: CANDIDATE_NAMES[randInt([0, CANDIDATE_NAMES.length - 1])],
    job: JOBS[randInt([0, JOBS.length - 1])],
    level: 1,
    exp: 0,
    expToNext: 100,
    stats: {
      power: randInt([5, 15]),
      fortitude,
      max_fortitude: fortitude,
      speed: randInt([8, 15]) / 10, // 0.8–1.5
    },
    attr: {
      greed: randInt([5, 25]) / 100,
      scavenge_multiplier: randInt([8, 15]) / 10,
    },
    traits: [],
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
  | "marketRates"
  | "heroes"
  | "tavernCandidates"
  | "dungeons"
  | "activeQuests"
  | "inventory"
  | "eventLog"
  | "floatingTexts"
>;

// fresh defaults each call — shared by store creation and wipeSave
const initialState = (): GuildData => ({
  ledger: {
    gold: 100,
    reputation: 0,
    materials: { organics: 0, minerals: 0, botanicals: 0 },
  },
  upgrades: [],
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
      traits: [],
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
  ],

  activeQuests: [],
  inventory: [],
  eventLog: [],
  floatingTexts: [],
});

export const useGuildStore = create<GuildState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      exportSave: () => {
        const data = Object.fromEntries(
          Object.entries(get()).filter(
            ([k, v]) => typeof v !== "function" && k !== "floatingTexts",
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
          set({ ...parsed, floatingTexts: [] });
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

      retireHero: (heroId) => {
        const { heroes, ledger, addLog } = get();
        const hero = heroes.find((h) => h.id === heroId);
        if (!hero || hero.status === "on_quest") return;

        const rep = hero.level * RETIRE_REP_PER_LEVEL;
        set({
          heroes: heroes.filter((h) => h.id !== heroId),
          ledger: { ...ledger, reputation: ledger.reputation + rep },
        });
        addLog(`${hero.name} retired with honors. +${rep} reputation.`);
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

      rollMarket: () => {
        const roll = () => Math.round(randInt([50, 200])) / 100; // 0.5–2.0
        set({
          marketRates: {
            organics: roll(),
            minerals: roll(),
            botanicals: roll(),
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
        const { ledger, inventory, addLog } = get();
        const recipe = RECIPES[subType];

        for (const [mat, need] of Object.entries(recipe.cost) as [MaterialKey, number][]) {
          if (ledger.materials[mat] < need) return;
        }

        const roll = Math.random() * 100;
        const { rarity, tier } =
          RARITY_TABLE.find((r) => roll < r.upTo) ?? RARITY_TABLE[0];
        const prefix =
          tier >= 1.5 ? PREFIXES[randInt([0, PREFIXES.length - 1])] : null;

        // fractional stats (speed/scavenge) keep 2dp; flat stats round whole
        const raw = recipe.base * tier;
        const value = recipe.base < 1 ? Math.round(raw * 100) / 100 : Math.round(raw);

        // accessories can roll a rule-bending effect and take its artifact name
        const specialEffect =
          recipe.slot === "accessory" && Math.random() < ACCESSORY_EFFECT_CHANCE
            ? (Object.keys(EFFECTS) as EffectId[])[
                randInt([0, Object.keys(EFFECTS).length - 1])
              ]
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
        });
        addLog(
          `Crafted a ${rarity[0].toUpperCase() + rarity.slice(1)}${item.prefix ? ` "${item.prefix}"` : ""} ${item.name}!`,
        );
      },

      heroBuyItem: (itemId) => {
        const { heroes, inventory, ledger, addLog } = get();
        const item = inventory.find((i) => i.id === itemId);
        if (!item) return false;

        const statKey = primaryStatKey(item);
        const itemStat = item.base_stats[statKey] ?? 0;

        // which gear slot would this hero put the item in? null = doesn't want it
        const targetSlotFor = (h: Hero): GearSlot | null => {
          if (item.slot === "accessory") {
            if (!h.gear.accessory1) return "accessory1"; // fill 1 first
            if (!h.gear.accessory2) return "accessory2";
            // both full — replace the weaker on the same stat, if strictly better
            const s1 = h.gear.accessory1.base_stats[statKey] ?? 0;
            const s2 = h.gear.accessory2.base_stats[statKey] ?? 0;
            const weaker: GearSlot = s1 <= s2 ? "accessory1" : "accessory2";
            return itemStat > Math.min(s1, s2) ? weaker : null;
          }
          const current = h.gear[item.slot];
          if (!current) return item.slot; // empty slot -> wants it
          return itemStat > (current.base_stats[statKey] ?? 0) ? item.slot : null;
        };

        // companyman pays a 150% premium — the guild's favorite customer
        const priceFor = (h: Hero) =>
          heroEffects(h).has("companyman")
            ? Math.round(item.price * 1.5)
            : item.price;

        let slot: GearSlot | null = null;
        const buyer = heroes.find((h) => {
          if (h.status !== "idle" || h.personal_wealth < priceFor(h)) return false;
          slot = targetSlotFor(h);
          return slot !== null;
        });
        if (!buyer || !slot) return false;

        const paid = priceFor(buyer);
        set({
          ledger: { ...ledger, gold: ledger.gold + paid },
          inventory: inventory.filter((i) => i.id !== itemId),
          // ponytail: replaced gear is scrapped; return-to-inventory when players notice
          heroes: heroes.map((h) =>
            h.id === buyer.id
              ? {
                  ...h,
                  personal_wealth: h.personal_wealth - paid,
                  gear: { ...h.gear, [slot as GearSlot]: item },
                }
              : h,
          ),
        });
        addLog(
          `${buyer.name} bought ${item.prefix ? `${item.prefix} ` : ""}${item.name} for ${paid}g!`,
        );
        return true;
      },

      refreshTavern: () => {
        set({ tavernCandidates: [rollCandidate(), rollCandidate(), rollCandidate()] });
      },

      hireHero: (candidateId) => {
        const { ledger, heroes, tavernCandidates, upgrades, addLog } = get();
        const candidate = tavernCandidates.find((c) => c.id === candidateId);
        if (
          !candidate ||
          ledger.gold < HIRE_COST ||
          heroes.length >= rosterCap(upgrades)
        )
          return;

        set({
          ledger: { ...ledger, gold: ledger.gold - HIRE_COST },
          heroes: [...heroes, candidate],
          tavernCandidates: tavernCandidates.filter((c) => c.id !== candidateId),
        });
        addLog(`${candidate.name} joined the guild for ${HIRE_COST}g.`);
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
        if (!hero || hero.status === "on_quest" || ledger.gold < HEAL_COST)
          return;
        const maxFort = totalStats(hero).maxFortitude; // armor counts
        if (hero.stats.fortitude >= maxFort) return;

        set({
          ledger: { ...ledger, gold: ledger.gold - HEAL_COST },
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
        addLog(`${hero.name} healed for ${HEAL_COST}g and is ready to work.`);
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

        for (const quest of finished) {
          const hero = heroes.find((h) => h.id === quest.heroId);
          const dungeon = state.dungeons.find((d) => d.id === quest.dungeonId);
          if (!hero || !dungeon) continue;

          // gear counts — it's why heroes buy it; upgrades + accessories bend rules
          const fx = heroEffects(hero);
          const totals = totalStats(hero); // includes gear bonuses + monocle penalty
          const effectivePower =
            totals.power +
            (state.upgrades.includes(UPGRADE_IDS.sharpening) ? 5 : 0);
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

          // base hero after quest outcome (stats/wealth), pre-progression
          let base: Hero;
          if (success) {
            const rawGold = Math.round(
              randInt(dungeon.loot_table.gold) *
                totals.scavenge *
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
                `${hero.name} cleared ${dungeon.name}! Earned ${guildGold}g (+${heroCut}g pocketed).`,
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
            base = { ...hero, stats: { ...hero.stats, fortitude: 0 } };
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
      },
    }),
    {
      name: "guild-master-storage",
      // ponytail: version bump discards old dev saves; write real migrations post-launch
      version: 7,
      // stale save → intentional reset to defaults (merge fills everything)
      migrate: () => ({}) as GuildState,
      // floatingTexts is ephemeral juice — never write it to localStorage
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([k]) => k !== "floatingTexts"),
        ) as GuildState,
    },
  ),
);
