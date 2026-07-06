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
}

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
  removeFloatingText: (id: string) => void;
  triggerHeroChat: (
    heroId: string,
    text: string,
    type: "roster" | "combat",
    durationMs?: number,
  ) => void;
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
          // dungeons stay code-defined — old exports must not shadow new content
          set({
            ...parsed,
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
        const bossDef = BOSSES.find((b) => b.id === fight.bossId)!;
        const { heroes, consumables, combatLoadout, ledger } = get();

        const inParty = (h: Hero) => fight.heroIds.includes(h.id);
        const living = heroes.filter((h) => inParty(h) && h.stats.fortitude > 0);
        const newLogs: LogEntry[] = [];
        const chats: { heroId: string; text: string }[] = [];

        // ── party swings first ──
        const partyDmg = Math.round(
          living.reduce((sum, h) => sum + totalStats(h).power, 0) * fight.hasteMul,
        );
        const bossHp = fight.bossHp - partyDmg;

        if (bossHp <= 0) {
          // victory — pay out, level the party, release heroes
          const heroNames = heroes.filter(inParty).map((h) => h.name);
          let updated = heroes;
          const perHeroExp = Math.floor(bossDef.rewardExp / fight.heroIds.length);
          updated = updated.map((h) => {
            if (!inParty(h)) return h;
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
            eventLog: [...newLogs, ...get().eventLog].slice(0, MAX_LOG_ENTRIES),
          });
          return;
        }

        // ── boss strikes one random living hero ──
        const target = living[Math.floor(Math.random() * living.length)];
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
          // Life Potion — emergency heal below 30%
          if (fort > 0 && fort < max * 0.3 && consume(h.id, "life_potion")) {
            fort = Math.min(max, fort + Math.round(max * 0.5));
            chats.push({ heroId: h.id, text: "I'm not dying today!" });
            newLogs.push(makeLog(`${h.name} downs a Life Potion mid-fight.`));
          }
          return fort === h.stats.fortitude
            ? h
            : { ...h, stats: { ...h.stats, fortitude: fort } };
        };

        let updated = heroes.map((h) => {
          if (!inParty(h)) return h;
          const struck =
            h.id === target?.id
              ? { ...h, stats: { ...h.stats, fortitude: h.stats.fortitude - bossDef.damage } }
              : h;
          return checkConsumableTriggers(struck);
        });

        const anyoneUp = updated.some((h) => inParty(h) && h.stats.fortitude > 0);
        if (!anyoneUp) {
          // wipe — everyone limps home injured
          const heroNames = heroes.filter(inParty).map((h) => h.name);
          updated = updated.map((h) =>
            inParty(h)
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
          bossFight: { ...fight, bossHp, round: fight.round + 1 },
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
        if (!buyer || !slot) {
          // nobody bites — a random hero explains why
          if (heroes.length > 0) {
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
        if (!candidate || ledger.gold < HIRE_COST || heroes.length >= rosterCap(upgrades))
          return false;

        set({
          ledger: { ...ledger, gold: ledger.gold - HIRE_COST },
          heroes: [...heroes, candidate],
          tavernCandidates: tavernCandidates.filter((c) => c.id !== candidateId),
        });
        addLog(`${candidate.name} joined the guild for ${HIRE_COST}g.`);
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
        const reactions: { heroId: string; text: string }[] = [];

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
      version: 7,
      // stale save → intentional reset to defaults (merge fills everything)
      migrate: () => ({}) as GuildState,
      // saves written before dungeons were unpersisted still carry a stale
      // dungeons array — always take the code-defined list
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<GuildState>),
        dungeons: current.dungeons,
      }),
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
