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
} as const;

export const DUNGEON_ART: Record<string, string> = {
  "dungeon-1": "/game-assets/Buildings/Red Buildings/Tower.png", // Goblin Cave
  "dungeon-2": "/game-assets/Buildings/Red Buildings/Barracks.png", // Bandit Camp
};

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
