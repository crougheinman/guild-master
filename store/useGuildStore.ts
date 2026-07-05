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

export type GearSlot = "weapon" | "armor" | "trinket";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface Item {
  id: string;
  name: string;
  base_stats: Partial<HeroStats>;
  rarity: Rarity;
  rarity_tier: number; // 1..3 — multiplier on base_stats
  prefix: string | null;
  suffix: string | null;
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
  materials: Record<MaterialKey, number>;
}

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

// ---------- Store ----------

interface GuildState {
  ledger: Ledger;
  heroes: Hero[];
  tavernCandidates: Hero[];
  dungeons: Dungeon[];
  activeQuests: ActiveQuest[];
  inventory: Item[];
  eventLog: LogEntry[];

  dispatchHero: (heroId: string, dungeonId: string) => void;
  tickQuests: () => void;
  addLog: (message: string) => void;
  healHero: (heroId: string) => void;
  refreshTavern: () => void;
  hireHero: (candidateId: string) => void;
  craftDagger: () => void;
  heroBuyItem: (itemId: string) => boolean;
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
export const DAGGER_COST = { organics: 3, minerals: 2 } as const;
const DAGGER_BASE_POWER = 5;

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

export const useGuildStore = create<GuildState>()(
  persist(
    (set, get) => ({
      ledger: {
        gold: 100,
        materials: { organics: 0, minerals: 0, botanicals: 0 },
      },

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

      craftDagger: () => {
        const { ledger, inventory, addLog } = get();
        const { organics, minerals } = ledger.materials;
        if (organics < DAGGER_COST.organics || minerals < DAGGER_COST.minerals)
          return;

        const roll = Math.random() * 100;
        const { rarity, tier } =
          RARITY_TABLE.find((r) => roll < r.upTo) ?? RARITY_TABLE[0];
        const prefix =
          tier >= 1.5 ? PREFIXES[randInt([0, PREFIXES.length - 1])] : null;

        const power = Math.round(DAGGER_BASE_POWER * tier);
        const item: Item = {
          id: `item-${Date.now()}-${heroSeq++}`,
          name: "Dagger",
          base_stats: { power },
          rarity,
          rarity_tier: tier,
          prefix,
          suffix: null,
          price: power * 15,
        };

        set({
          ledger: {
            ...ledger,
            materials: {
              ...ledger.materials,
              organics: organics - DAGGER_COST.organics,
              minerals: minerals - DAGGER_COST.minerals,
            },
          },
          inventory: [...inventory, item],
        });
        addLog(
          `Crafted a ${rarity[0].toUpperCase() + rarity.slice(1)}${prefix ? ` "${prefix}"` : ""} Dagger!`,
        );
      },

      heroBuyItem: (itemId) => {
        const { heroes, inventory, ledger, addLog } = get();
        const item = inventory.find((i) => i.id === itemId);
        if (!item) return false;

        const itemPower = item.base_stats.power ?? 0;
        const buyer = heroes.find(
          (h) =>
            h.status === "idle" &&
            h.personal_wealth >= item.price &&
            itemPower > (h.gear.weapon?.base_stats.power ?? 0),
        );
        if (!buyer) return false;

        set({
          ledger: { ...ledger, gold: ledger.gold + item.price },
          inventory: inventory.filter((i) => i.id !== itemId),
          // ponytail: replaced weapon is scrapped; return-to-inventory when players notice
          heroes: heroes.map((h) =>
            h.id === buyer.id
              ? {
                  ...h,
                  personal_wealth: h.personal_wealth - item.price,
                  gear: { ...h.gear, weapon: item },
                }
              : h,
          ),
        });
        addLog(
          `${buyer.name} bought ${item.prefix ? `${item.prefix} ` : ""}${item.name} for ${item.price}g!`,
        );
        return true;
      },

      refreshTavern: () => {
        set({ tavernCandidates: [rollCandidate(), rollCandidate(), rollCandidate()] });
      },

      hireHero: (candidateId) => {
        const { ledger, heroes, tavernCandidates, addLog } = get();
        const candidate = tavernCandidates.find((c) => c.id === candidateId);
        if (!candidate || ledger.gold < HIRE_COST) return;

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
        if (
          !hero ||
          ledger.gold < HEAL_COST ||
          hero.stats.fortitude >= hero.stats.max_fortitude ||
          hero.status === "on_quest"
        )
          return;

        set({
          ledger: { ...ledger, gold: ledger.gold - HEAL_COST },
          heroes: heroes.map((h) =>
            h.id === heroId
              ? {
                  ...h,
                  status: "idle" as const,
                  stats: { ...h.stats, fortitude: h.stats.max_fortitude },
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
          completionTime:
            Date.now() + dungeon.base_duration_ms / hero.stats.speed,
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

        for (const quest of finished) {
          const hero = heroes.find((h) => h.id === quest.heroId);
          const dungeon = state.dungeons.find((d) => d.id === quest.dungeonId);
          if (!hero || !dungeon) continue;

          // weapon counts — it's why heroes buy gear
          const effectivePower =
            hero.stats.power + (hero.gear.weapon?.base_stats.power ?? 0);
          const successChance = (effectivePower / dungeon.threat_level) * 100;
          const success = Math.random() * 100 < successChance;

          // exp scales with threat × duration-in-minutes; 100% on win, 25% on loss
          const baseExp = Math.floor(
            dungeon.threat_level * (dungeon.base_duration_ms / 60000),
          );

          // base hero after quest outcome (stats/wealth), pre-progression
          let base: Hero;
          if (success) {
            const rawGold = Math.round(
              randInt(dungeon.loot_table.gold) * hero.attr.scavenge_multiplier,
            );
            const heroCut = Math.round(rawGold * hero.attr.greed);
            const guildGold = rawGold - heroCut;

            const materials = { ...ledger.materials };
            for (const [key, range] of Object.entries(
              dungeon.loot_table.materials,
            ) as [MaterialKey, [number, number]][]) {
              materials[key] += Math.round(
                randInt(range) * hero.attr.scavenge_multiplier,
              );
            }

            ledger = { gold: ledger.gold + guildGold, materials };
            base = {
              ...hero,
              personal_wealth: hero.personal_wealth + heroCut,
              // success still fatigues
              stats: {
                ...hero.stats,
                fortitude: Math.max(0, hero.stats.fortitude - QUEST_FATIGUE),
              },
            };
            newLogs.push(
              makeLog(
                `${hero.name} cleared ${dungeon.name}! Earned ${guildGold}g (+${heroCut}g pocketed).`,
              ),
            );
          } else {
            // failure wipes fortitude
            base = { ...hero, stats: { ...hero.stats, fortitude: 0 } };
            newLogs.push(
              makeLog(
                `${hero.name} failed ${dungeon.name} and was severely injured!`,
              ),
            );
          }

          // level-up may fully restore fortitude, reviving an injured hero
          const earnedExp = success ? baseExp : Math.floor(baseExp * 0.25);
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
        });
      },
    }),
    {
      name: "guild-master-storage",
      // ponytail: version bump discards old dev saves; write real migrations post-launch
      version: 5,
      // stale save → intentional reset to defaults (merge fills everything)
      migrate: () => ({}) as GuildState,
    },
  ),
);
