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

export const DUNGEON_ART: Record<string, string> = {
  "dungeon-1": "/game-assets/Buildings/Red Buildings/Tower.png", // Goblin Cave
  "dungeon-2": "/game-assets/Buildings/Red Buildings/Barracks.png", // Bandit Camp
};

// ── combat sprite strips, per job ──
// Frames laid out horizontally; frame size differs per job (Lancer is 320px).
// Only Warrior/Lancer ship guard clips — others idle while defending.
import type { Job } from "@/store/useGuildStore";

export type Team = "Blue" | "Red";

export interface Clip {
  url: string;
  frames: number;
}

export interface JobAnims {
  size: number; // square frame edge in px
  idle: Clip;
  attacks: Clip[]; // one is picked at random per swing
  guard?: Clip;
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
  let hash = 0;
  for (let i = 0; i < heroId.length; i++) {
    hash = (hash * 31 + heroId.charCodeAt(i)) | 0;
  }
  const n = (Math.abs(hash) % AVATAR_COUNT) + 1;
  return `${UI}/Human Avatars/Avatars_${String(n).padStart(2, "0")}.png`;
}
