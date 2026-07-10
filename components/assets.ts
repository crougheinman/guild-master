// Central map of Tiny Swords asset paths (public/game-assets)

const UI = "/game-assets/UI Elements/UI Elements";

export const ICONS = {
  gold: `${UI}/Icons/Icon_03.png`, // coin
  organics: `${UI}/Icons/Icon_04.png`, // meat
  minerals: "/game-assets/Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png",
  botanicals: `${UI}/Icons/Icon_02.png`, // log
  power: `${UI}/Icons/Icon_05.png`, // sword
  fortitude: `${UI}/Icons/Icon_06.png`, // shield
  speed: `${UI}/Icons/Icon_08.png`, // arrow
  forge: `${UI}/Icons/Icon_01.png`, // hammer
  settings: `${UI}/Icons/Icon_10.png`, // gear
  roster: `${UI}/Human Avatars/Avatars_01.png`, // helm portrait
} as const;

// ── item icons: 16×16 cells in the Others sheet ──
import type { SubType } from "@/store/useGuildStore";

export const ITEM_SHEET = {
  url: "/game-assets/Others/others.png",
  w: 256,
  h: 2192,
  cell: 16,
} as const;

// col/row of the best-reading cell per craftable subtype
export const ITEM_ICONS: Record<SubType, { col: number; row: number }> = {
  dagger: { col: 1, row: 100 }, // blue knife
  sword: { col: 3, row: 99 }, // gold broadsword
  staff: { col: 6, row: 18 }, // orb scepter
  armor: { col: 0, row: 116 }, // blue chestplate
  boots: { col: 4, row: 121 }, // red boots
  ring: { col: 5, row: 7 }, // gold ring
};

export const DUNGEON_ART: Record<string, string> = {
  "dungeon-1": "/game-assets/Buildings/Red Buildings/Tower.png", // Goblin Cave
  "dungeon-2": "/game-assets/Buildings/Red Buildings/Barracks.png", // Bandit Camp
  "dungeon-3": "/game-assets/Buildings/Black Buildings/Monastery.png", // Cursed Monastery
  "dungeon-4": "/game-assets/Buildings/Purple Buildings/Tower.png", // Shadow Spire
  "dungeon-5": "/game-assets/Buildings/Yellow Buildings/Castle.png", // Gilded Vault
  "dungeon-6": "/game-assets/Buildings/Black Buildings/Castle.png", // Black Citadel
};

// ── combat sprite strips, per job ──
// Frames laid out horizontally; frame size differs per job (Lancer is 320px).
// Only Warrior/Lancer ship guard clips — others idle while defending.
import type { Job } from "@/store/useGuildStore";

export type Team = "Blue" | "Red";

export interface Clip {
  url: string;
  frames: number;
  row?: number; // which row of a multi-row grid sheet (0 = single-strip file)
  size?: number; // per-clip cell override — LPC "oversize" weapon anims are 192px
}

export interface JobAnims {
  size: number; // square frame edge in px
  idle: Clip;
  attacks: Clip[]; // one is picked at random per swing
  guard?: Clip;
  // display multiplier — small sprites whose body fills the frame (16px
  // monsters) render oversized next to padded 100px+ frames without this
  bodyScale?: number;
}

export function unitAnims(team: Team, job: Job): JobAnims {
  const d = `/game-assets/Units/${team} Units/${job}`;
  switch (job) {
    case "Warrior":
      return {
        size: 192,
        idle: { url: `${d}/Warrior_Idle.png`, frames: 8 },
        attacks: [
          { url: `${d}/Warrior_Attack1.png`, frames: 4 },
          { url: `${d}/Warrior_Attack2.png`, frames: 4 },
        ],
        guard: { url: `${d}/Warrior_Guard.png`, frames: 6 },
      };
    case "Archer":
      return {
        size: 192,
        idle: { url: `${d}/Archer_Idle.png`, frames: 6 },
        attacks: [{ url: `${d}/Archer_Shoot.png`, frames: 8 }],
      };
    case "Lancer":
      return {
        size: 320,
        idle: { url: `${d}/Lancer_Idle.png`, frames: 12 },
        attacks: [{ url: `${d}/Lancer_Right_Attack.png`, frames: 3 }],
        guard: { url: `${d}/Lancer_Right_Defence.png`, frames: 6 },
      };
    case "Monk":
      return {
        size: 192,
        idle: { url: `${d}/Idle.png`, frames: 6 },
        attacks: [{ url: `${d}/Heal.png`, frames: 11 }],
      };
    case "Pawn":
      return {
        size: 192,
        idle: { url: `${d}/Pawn_Idle.png`, frames: 8 },
        attacks: [{ url: `${d}/Pawn_Interact Knife.png`, frames: 4 }],
      };
  }
}

// ── Heroes/<Job>/<job>-1..4.png — real recolor variants, randomized per hero ──
// Every sheet is the same 64px LPC universal template (verified by scanning
// per-row frame counts — identical across all classes/variants): rows come in
// direction quads ordered up/left/down/right, so RIGHT-facing = quad row +3.
//   0-3 spellcast(7f) · 4-7 thrust(8f) · 8-11 walk(9f) · 12-15 slash(6f)
//   16-19 bow-shoot(13f) · 20 hurt(6f) · 22-25 idle(2f) · 38-41 run(8f) ...
// Weapon art is only baked into some quads (varies per variant) and rows 46+
// are unclothed template leftovers — the picks below are clothed on all 4
// variants of every class. No guard clip: row 20 is a collapse-and-die, and
// looping that as a defend pose reads as dying (defender falls back to idle).
interface HeroSheetDef {
  attacks: { row: number; frames: number; size?: number }[];
  variants?: number[]; // subset when some recolors don't fit the class
}

const HERO_VARIANTS = [1, 2, 3, 4];
const HERO_IDLE = { row: 25, frames: 2 }; // idle-right, gentle 2-frame breathe

const HERO_SHEETS: Record<Job, HeroSheetDef> = {
  Archer: { attacks: [{ row: 19, frames: 13 }] }, // bow nock-draw-release, right
  // last sheet row = LPC oversize (192px) halberd scythe-arc swing, right
  Lancer: { attacks: [{ row: 25, frames: 6, size: 192 }] },
  // monk-3/4 are bare-chested brawler skins on every row — robed variants only
  Monk: { attacks: [{ row: 3, frames: 7 }], variants: [1, 2] },
  // last sheet row = oversize axe/machete arc swing, right (warrior-1's
  // bigger master sheet puts its sword-lunge on a different last row —
  // special-cased in heroCombatAnims)
  Warrior: { attacks: [{ row: 21, frames: 6, size: 192 }] },
  Pawn: { attacks: [{ row: 7, frames: 8 }] }, // spear+shield thrust on -2/3/4
};

const HERO_CELL = 64;

// shared deterministic string hash — every "stable pick per id" below uses it
function hashString(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// stable per-hero variant pick — salted so the portrait and combat sprite
// don't always correlate
export function heroVariant(heroId: string, job: Job): number {
  const pool = HERO_SHEETS[job].variants ?? HERO_VARIANTS;
  return pool[hashString(`${job}:variant:${heroId}`) % pool.length];
}

export function heroCombatAnims(job: Job, heroId: string): JobAnims {
  const sheet = HERO_SHEETS[job];
  const n = heroVariant(heroId, job);
  const url = `/game-assets/Heroes/${job}/${job.toLowerCase()}-${n}.png`;
  // warrior-1's master sheet is taller — its oversize sword-lunge sits on
  // row 29 (8 frames) instead of the recolors' row 21 (6 frames)
  const attacks =
    job === "Warrior" && n === 1
      ? [{ row: 29, frames: 8, size: 192 }]
      : sheet.attacks;
  return {
    size: HERO_CELL,
    idle: { url, frames: HERO_IDLE.frames, row: HERO_IDLE.row },
    attacks: attacks.map((a) => ({ url, ...a })),
  };
}

// Orc enemy — 100px frames, faces right (mirror to face the hero). One type.
const ORC = "/game-assets/Enemies/Orc";
export function orcAnims(): JobAnims {
  return {
    size: 100,
    idle: { url: `${ORC}/Orc-Idle.png`, frames: 6 },
    attacks: [
      { url: `${ORC}/Orc-Attack01.png`, frames: 6 },
      { url: `${ORC}/Orc-Attack02.png`, frames: 6 },
    ],
    // no guard clip — defender falls back to idle
  };
}
export const ORC_HURT = { url: `${ORC}/Orc-Hurt.png`, frames: 4, size: 100 };

// boss portraits — animated gifs, plain <img> plays them for free
export const BOSS_ART: Record<string, string> = {
  "boss-1": "/game-assets/Enemies/Crushing Cyclops/CrushingCyclops.gif",
  "boss-2": "/game-assets/Enemies/Brawny Ogre/BrawnyOgre.gif",
  "boss-3": "/game-assets/Enemies/Stone Troll/StoneTroll.gif",
  "boss-4": "/game-assets/Enemies/Swamp Troll/SwampTroll.gif",
  "boss-5": "/game-assets/Enemies/Ocular Watcher/OcularWatcher.gif",
  "boss-6": "/game-assets/Enemies/Humongous Ettin/HumongousEttin.gif",
};

// ── 16×16 monster pack: one 4-frame idle strip each, body fills the frame ──
const MONSTERS = [
  "Blinded Grimlock/BlindedGrimlock",
  "Bloodshot Eye/BloodshotEye",
  "Brawny Ogre/BrawnyOgre",
  "Crimson Slaad/CrimsonSlaad",
  "Crushing Cyclops/CrushingCyclops",
  "Death Slime/DeathSlime",
  "Fungal Myconid/FungalMyconid",
  "Humongous Ettin/HumongousEttin",
  "Murky Slaad/MurkySlaad",
  "Ochre Jelly/OchreJelly",
  "Ocular Watcher/OcularWatcher",
  "Red Cap/RedCap",
  "Shrieker Mushroom/ShriekerMushroom",
  "Stone Troll/StoneTroll",
  "Swamp Troll/SwampTroll",
] as const;

// deterministic pick per seed (heroId) — stable across scene rebuilds/resizes.
// Orc is one slot in the pool; monsters reuse idle as the attack clip (the
// lunge tween sells the swing).
export function monsterAnims(seed: string): JobAnims {
  const n = hashString(seed) % (MONSTERS.length + 1);
  if (n === MONSTERS.length) return orcAnims();
  const clip: Clip = {
    url: `/game-assets/Enemies/${MONSTERS[n]}.png`,
    frames: 4,
  };
  return { size: 16, idle: clip, attacks: [clip], bodyScale: 0.6 };
}

// giant boss sprite for the raid combat visual — same PNG each boss already
// ships (reused from BOSS_ART's folder), scaled UP instead of monsterAnims'
// shrink so it towers over the party.
const BOSS_MONSTER_PNG: Record<string, string> = {
  "boss-1": "/game-assets/Enemies/Crushing Cyclops/CrushingCyclops.png",
  "boss-2": "/game-assets/Enemies/Brawny Ogre/BrawnyOgre.png",
  "boss-3": "/game-assets/Enemies/Stone Troll/StoneTroll.png",
  "boss-4": "/game-assets/Enemies/Swamp Troll/SwampTroll.png",
  "boss-5": "/game-assets/Enemies/Ocular Watcher/OcularWatcher.png",
  "boss-6": "/game-assets/Enemies/Humongous Ettin/HumongousEttin.png",
};

export function bossCombatAnims(bossId: string): JobAnims {
  const clip: Clip = { url: BOSS_MONSTER_PNG[bossId], frames: 4 };
  return { size: 16, idle: clip, attacks: [clip], bodyScale: 2.4 };
}

// crown glyph marking the giant boss sprite — canvas text renders emoji fine,
// no dedicated crown sprite ships in the asset pack
export const CROWN_GLYPH = "👑";

// ── combat FX + backdrop ──
export const PARTICLES = {
  dust: { url: "/game-assets/Particle FX/Dust_02.png", frames: 10, size: 64 },
  explosion: {
    url: "/game-assets/Particle FX/Explosion_01.png",
    frames: 8,
    size: 192,
  },
} as const;

export const BACKDROP = {
  tilemap: "/game-assets/Terrain/Tileset/Tilemap_color1.png",
  // flat grass tile (64x64 grid unit per Tiny Swords tilemap-guide), tiles horizontally
  groundTile: { x: 64, y: 64, w: 64, h: 64 },
  shadow: "/game-assets/Terrain/Tileset/Shadow.png", // 192px soft blob, foot shadow
  clouds: [
    "/game-assets/Terrain/Decorations/Clouds/Clouds_01.png",
    "/game-assets/Terrain/Decorations/Clouds/Clouds_02.png",
  ],
  tower: "/game-assets/Buildings/Blue Buildings/Tower.png",
  castle: "/game-assets/Buildings/Blue Buildings/Castle.png",
  // 4 bush variants, each an 8-frame 128px strip (use frame 0 as a static bush)
  bushes: [
    "/game-assets/Terrain/Decorations/Bushes/Bushe1.png",
    "/game-assets/Terrain/Decorations/Bushes/Bushe2.png",
    "/game-assets/Terrain/Decorations/Bushes/Bushe3.png",
    "/game-assets/Terrain/Decorations/Bushes/Bushe4.png",
  ],
  bushFrames: 8,
  bushSize: 128,
  // 4 single 64px boulders
  rocks: [
    "/game-assets/Terrain/Decorations/Rocks/Rock1.png",
    "/game-assets/Terrain/Decorations/Rocks/Rock2.png",
    "/game-assets/Terrain/Decorations/Rocks/Rock3.png",
    "/game-assets/Terrain/Decorations/Rocks/Rock4.png",
  ],
  // 4 water-rock variants, each a 16-frame 64px animated ripple
  waterRocks: [
    "/game-assets/Terrain/Decorations/Rocks in the Water/Water Rocks_01.png",
    "/game-assets/Terrain/Decorations/Rocks in the Water/Water Rocks_02.png",
    "/game-assets/Terrain/Decorations/Rocks in the Water/Water Rocks_03.png",
    "/game-assets/Terrain/Decorations/Rocks in the Water/Water Rocks_04.png",
  ],
  waterRockFrames: 16,
  waterRockSize: 64,
} as const;

const AVATAR_COUNT = 25;

// stable portrait per hero, derived from id — no schema change, no migration
export function avatarFor(heroId: string): string {
  const n = (hashString(heroId) % AVATAR_COUNT) + 1;
  return `${UI}/Human Avatars/Avatars_${String(n).padStart(2, "0")}.png`;
}
