import { beforeEach, describe, expect, it } from "vitest";
import {
  gainExp,
  totalStats,
  UPGRADE_IDS,
  useGuildStore,
  facilityUpgradeCost,
  type Hero,
  type Item,
} from "../useGuildStore";

const armor = (max_fortitude: number): Item => ({
  id: "armor-1",
  name: "Armor",
  slot: "armor",
  subType: "armor",
  base_stats: { max_fortitude },
  rarity: "common",
  rarity_tier: 1,
  prefix: null,
  suffix: null,
  price: 80,
});

const baseHero = (): Hero => useGuildStore.getState().heroes[0];

beforeEach(() => {
  useGuildStore.getState().wipeSave();
});

describe("gainExp", () => {
  it("restores fortitude to the TOTAL pool on level-up, never below current HP", () => {
    // geared hero at full HP: gear pushes total max far above the base pool
    const hero: Hero = { ...baseHero(), gear: { armor: armor(100) } };
    hero.stats = { ...hero.stats, fortitude: totalStats(hero).maxFortitude };
    const before = hero.stats.fortitude;

    const { hero: leveled } = gainExp(hero, hero.expToNext);
    expect(leveled.level).toBe(2);
    // old behavior reset this to the (much smaller) base max_fortitude
    expect(leveled.stats.fortitude).toBe(totalStats(leveled).maxFortitude);
    expect(leveled.stats.fortitude).toBeGreaterThanOrEqual(before);
  });

  it("leaves fortitude alone when no level-up happens", () => {
    const hero: Hero = { ...baseHero(), stats: { ...baseHero().stats, fortitude: 7 } };
    const { hero: same } = gainExp(hero, 1);
    expect(same.stats.fortitude).toBe(7);
  });
});

describe("new heroes start at full health", () => {
  it("the starter hero is not born hurt", () => {
    const h = baseHero();
    expect(h.stats.fortitude).toBe(totalStats(h).maxFortitude);
  });

  it("tavern recruits are not born hurt", () => {
    useGuildStore.getState().refreshTavern();
    for (const c of useGuildStore.getState().tavernCandidates) {
      expect(c.stats.fortitude).toBe(totalStats(c).maxFortitude);
    }
  });
});

describe("shop purchases use store-side prices", () => {
  it("upgradeFacility charges the real cost regardless of the caller", () => {
    useGuildStore.setState({ ledger: { gold: 1000, reputation: 0, materials: { organics: 0, minerals: 0, botanicals: 0 } } });
    useGuildStore.getState().upgradeFacility("tavern");
    const s = useGuildStore.getState();
    expect(s.guildFacilities.tavernLevel).toBe(1);
    expect(s.ledger.gold).toBe(1000 - facilityUpgradeCost("tavern", 0));
  });

  it("buyUpgrade requires both gold and reputation, and rejects unknown ids", () => {
    const { buyUpgrade } = useGuildStore.getState();
    useGuildStore.setState({ ledger: { gold: 5000, reputation: 0, materials: { organics: 0, minerals: 0, botanicals: 0 } } });
    buyUpgrade(UPGRADE_IDS.beds);
    expect(useGuildStore.getState().upgrades).toEqual([]); // no rep

    useGuildStore.setState({ ledger: { gold: 5000, reputation: 100, materials: { organics: 0, minerals: 0, botanicals: 0 } } });
    buyUpgrade(UPGRADE_IDS.beds);
    expect(useGuildStore.getState().upgrades).toEqual([UPGRADE_IDS.beds]);
    expect(useGuildStore.getState().ledger.gold).toBe(4500);

    // @ts-expect-error — bogus id from a tampered caller
    buyUpgrade("free-lunch");
    expect(useGuildStore.getState().upgrades).toEqual([UPGRADE_IDS.beds]);
  });
});

describe("boss raids", () => {
  const raidDamage = (withSharpening: boolean) => {
    useGuildStore.getState().wipeSave();
    useGuildStore.setState({ upgrades: withSharpening ? [UPGRADE_IDS.sharpening] : [] });
    const hero = useGuildStore.getState().heroes[0];
    useGuildStore.getState().startBossFight("boss-1", [hero.id]);
    useGuildStore.getState().tickBossFight();
    const fight = useGuildStore.getState().bossFight!;
    return 400 - fight.bossHp; // boss-1 maxHp
  };

  it("Sharpening Stones adds +5 power per hero to raid damage", () => {
    expect(raidDamage(true) - raidDamage(false)).toBe(5);
  });
});

describe("importSave / save sanitizing", () => {
  const encode = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));

  it("rejects garbage", () => {
    expect(useGuildStore.getState().importSave("not base64!!")).toBe(false);
    expect(useGuildStore.getState().importSave(encode({ nope: 1 }))).toBe(false);
  });

  it("repairs a ledger with missing/NaN fields instead of poisoning gold", () => {
    const save = encode({
      ledger: { gold: 250, materials: { organics: "lots" } },
      heroes: [baseHero()],
      inventory: "not-an-array",
    });
    expect(useGuildStore.getState().importSave(save)).toBe(true);
    const s = useGuildStore.getState();
    expect(s.ledger.gold).toBe(250);
    expect(s.ledger.reputation).toBe(0);
    expect(s.ledger.materials).toEqual({ organics: 0, minerals: 0, botanicals: 0 });
    expect(Array.isArray(s.inventory)).toBe(true);
  });
});
