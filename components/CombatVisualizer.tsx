"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatedSprite,
  Application,
  Assets,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
  TilingSprite,
} from "pixi.js";
import {
  BACKDROP,
  bossCombatAnims,
  CROWN_GLYPH,
  heroCombatAnims,
  monsterAnims,
  PARTICLES,
  type Clip,
  type JobAnims,
} from "@/components/assets";
import { BOSSES, heroEffects, totalStats, useGuildStore } from "@/store/useGuildStore";

const MOB_COUNT = 3; // flavor monsters scattered around a boss fight

// small seeded PRNG so flavor-mob positions stay put across resize rebuilds
function seededRand(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return () => {
    h = (h * 1103515245 + 12345) | 0;
    return (h >>> 0) / 4294967296;
  };
}

const FIGHT_GAP = 78; // distance between the two combatants in a duel
const TURN_MS = 1500; // one full attack exchange
const STRIKE_AT = 420; // impact moment inside the turn
const RECOVER_AT = 750; // both back to idle
const BACK_SCALE = 0.82; // back-row duels shrink for depth

// boss exchange sub-phases, one exchange per store tick (~1s): the party swings
// first, then the boss retaliates at whichever hero it really struck this tick
const B_PARTY_STRIKE = 220;
const B_PARTY_RECOVER = 430;
const B_BOSS_STRIKE = 620;
const B_BOSS_RECOVER = 830;

type Side = "hero" | "enemy";

// a sliced clip carries its own anchorY: LPC oversize (192px) frames keep the
// same 64px body centered in a bigger canvas, so the feet sit at 2/3 height
// instead of the bottom — anchoring per clip keeps feet planted on swap
interface LoadedClip {
  frames: Texture[];
  anchorY: number;
}

interface LoadedAnims {
  idle: LoadedClip;
  attacks: LoadedClip[];
  guard: LoadedClip | null;
}

function sliceStrip(base: Texture, frames: number, size: number, row = 0): Texture[] {
  return Array.from(
    { length: frames },
    (_, i) =>
      new Texture({
        source: base.source,
        frame: new Rectangle(i * size, row * size, size, size),
      }),
  );
}

// mobile GPUs commonly cap textures at 4096px — the hero master sheets are up
// to 5760px tall and upload as a black box there. For oversized sources, copy
// just the needed row into a small canvas and texture THAT instead.
//
// The row is extracted from an independently-fetched <img>, NOT from the
// Pixi-managed texture's own resource: Pixi's image loader decodes to an
// ImageBitmap and may transfer/close it once uploaded to the GPU, and
// drawImage() on a closed ImageBitmap throws "the image source is detached"
// — silently breaking the whole scene build with no visible console error
// bridge to catch it. A plain Image() is decoupled from that lifecycle and
// the browser serves it from cache instantly (same URL, already fetched).
const MAX_GPU_TEX = 4096;
const rawImageCache = new Map<string, Promise<HTMLImageElement>>();

function loadRawImage(url: string): Promise<HTMLImageElement> {
  let p = rawImageCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    rawImageCache.set(url, p);
  }
  return p;
}

function extractRow(img: HTMLImageElement, frames: number, size: number, row: number): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = frames * size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    0, row * size, frames * size, size,
    0, 0, frames * size, size,
  );
  const tex = Texture.from(canvas);
  tex.source.scaleMode = "nearest";
  return tex;
}

// pre-extract every oversized clip's row into its own small texture, once,
// before the scene is built — sliceClip then does a plain synchronous lookup
async function preloadOversizeRows(
  loaded: Record<string, Texture>,
  cfgs: JobAnims[],
): Promise<Map<string, Texture>> {
  const jobs: { key: string; url: string; size: number; row: number; frames: number }[] = [];
  for (const cfg of cfgs) {
    for (const clip of [cfg.idle, ...cfg.attacks, ...(cfg.guard ? [cfg.guard] : [])]) {
      const base = loaded[clip.url];
      if (base.source.pixelWidth <= MAX_GPU_TEX && base.source.pixelHeight <= MAX_GPU_TEX) continue;
      const size = clip.size ?? cfg.size;
      const row = clip.row ?? 0;
      jobs.push({ key: `${clip.url}#${row}#${size}`, url: clip.url, size, row, frames: clip.frames });
    }
  }
  const extracted = new Map<string, Texture>();
  await Promise.all(
    jobs.map(async (j) => {
      if (extracted.has(j.key)) return;
      const img = await loadRawImage(j.url);
      extracted.set(j.key, extractRow(img, j.frames, j.size, j.row));
    }),
  );
  return extracted;
}

function sliceClip(
  loaded: Record<string, Texture>,
  clip: Clip,
  cfgSize: number,
  extracted: Map<string, Texture>,
): LoadedClip {
  const base = loaded[clip.url];
  base.source.scaleMode = "nearest"; // crisp pixel art
  const size = clip.size ?? cfgSize;
  // oversize cell: body block centered → feet at (size/2 + cfgSize/2)
  const anchorY = size === cfgSize ? 1 : (size / 2 + cfgSize / 2) / size;

  const row = clip.row ?? 0;
  const pre = extracted.get(`${clip.url}#${row}#${size}`);
  const strip = pre ?? base;
  return { frames: sliceStrip(strip, clip.frames, size, pre ? 0 : row), anchorY };
}

function loadAnimSet(
  loaded: Record<string, Texture>,
  cfg: JobAnims,
  extracted: Map<string, Texture>,
): LoadedAnims {
  return {
    idle: sliceClip(loaded, cfg.idle, cfg.size, extracted),
    attacks: cfg.attacks.map((a) => sliceClip(loaded, a, cfg.size, extracted)),
    guard: cfg.guard ? sliceClip(loaded, cfg.guard, cfg.size, extracted) : null,
  };
}

// swap textures only on clip change so animations don't restart every tick
function play(
  sprite: AnimatedSprite & { _clip?: LoadedClip },
  clip: LoadedClip,
  opts: { loop: boolean; speed: number },
) {
  if (sprite._clip === clip) return;
  sprite._clip = clip;
  sprite.textures = clip.frames;
  sprite.anchor.y = clip.anchorY;
  sprite.loop = opts.loop;
  sprite.animationSpeed = opts.speed;
  sprite.gotoAndPlay(0);
}

export default function CombatVisualizer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const heroes = useGuildStore((s) => s.heroes);
  const bossFight = useGuildStore((s) => s.bossFight);
  const questing = heroes.filter((h) => h.status === "on_quest");
  const questingKey = questing
    .map((h) => h.id)
    .sort()
    .join(",");
  // boss fights get a dedicated giant-boss scene — key on bossId too so a new
  // raid with the exact same hero set still rebuilds the scene
  const sceneKey = bossFight
    ? `boss-${bossFight.bossId}-${bossFight.heroIds.join(",")}`
    : questingKey;

  // container resize (rotation, breakpoint change) → rebuild scene at new size
  const [sizeKey, setSizeKey] = useState(0);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let last = host.clientWidth;
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      if (Math.abs(host.clientWidth - last) < 24) return; // ignore jitter
      last = host.clientWidth;
      clearTimeout(t);
      t = setTimeout(() => setSizeKey((k) => k + 1), 300); // debounce
    });
    ro.observe(host);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [sceneKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || sceneKey === "") return;

    // ponytail: full app rebuild per quest-set change; persistent app + scene
    // diffing if WebGL context churn ever shows up
    let cancelled = false;
    let ready = false;
    const app = new Application();

    (async () => {
      const state = useGuildStore.getState();
      const boss = state.bossFight;

      // boss mode: only the raid party + one giant boss + flavor mobs.
      // regular mode: every on-quest hero gets a 1-vs-1 duel, unchanged.
      const fighters = boss
        ? state.heroes.filter((h) => boss.heroIds.includes(h.id))
        : state.heroes.filter((h) => h.status === "on_quest");

      const heroCfgs = fighters.map((h) => heroCombatAnims(h.job, h.id));
      const enemyCfgs = boss ? [] : fighters.map((h) => monsterAnims(h.id)); // random monster per duel
      const bossCfg = boss ? bossCombatAnims(boss.bossId) : null;
      const mobCfgs = boss
        ? Array.from({ length: MOB_COUNT }, (_, i) => monsterAnims(`${boss.bossId}-mob-${i}`))
        : [];

      const urls = new Set<string>([
        BACKDROP.tilemap,
        BACKDROP.shadow,
        ...BACKDROP.clouds,
        BACKDROP.tower,
        ...BACKDROP.bushes,
        ...BACKDROP.rocks,
        ...BACKDROP.waterRocks,
        PARTICLES.dust.url,
        PARTICLES.explosion.url,
      ]);
      for (const cfg of [...heroCfgs, ...enemyCfgs, ...mobCfgs, ...(bossCfg ? [bossCfg] : [])]) {
        urls.add(cfg.idle.url);
        cfg.attacks.forEach((a) => urls.add(a.url));
        if (cfg.guard) urls.add(cfg.guard.url);
      }
      const loaded: Record<string, Texture> = await Assets.load([...urls]);
      if (cancelled) return;

      const extracted = await preloadOversizeRows(loaded, [
        ...heroCfgs,
        ...enemyCfgs,
        ...mobCfgs,
        ...(bossCfg ? [bossCfg] : []),
      ]);
      if (cancelled) return;

      const W = host.clientWidth || 700;
      const H = Math.max(host.clientHeight, 150);

      await app.init({ background: "#5a7a9a", width: W, height: H, antialias: false });
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      ready = true;
      host.appendChild(app.canvas);

      const horizonY = Math.round(H * 0.42); // grass field starts here

      // ── sky: drifting clouds up top ──
      const clouds = BACKDROP.clouds.map((url, i) => {
        const c = new Sprite(loaded[url]);
        c.texture.source.scaleMode = "nearest";
        c.alpha = 0.6;
        c.scale.set(0.5);
        c.position.set(i * (W / 2), 4 + i * 14);
        app.stage.addChild(c);
        return c;
      });

      // distant tower silhouette on the horizon
      const tower = new Sprite(loaded[BACKDROP.tower]);
      tower.texture.source.scaleMode = "nearest";
      tower.anchor.set(0.5, 1);
      tower.scale.set((H * 0.55) / 256);
      tower.alpha = 0.5;
      tower.tint = 0x7f93b8;
      tower.position.set(W - 66, horizonY + 10);
      app.stage.addChild(tower);

      // ── grass field: fill from horizon to bottom ──
      const tilemap = loaded[BACKDROP.tilemap];
      tilemap.source.scaleMode = "nearest";
      const g = BACKDROP.groundTile;
      const groundTex = new Texture({
        source: tilemap.source,
        frame: new Rectangle(g.x, g.y, g.w, g.h),
      });
      const bandH = H - horizonY;
      const ground = new TilingSprite({ texture: groundTex, width: W, height: bandH });
      ground.tileScale.set(48 / g.h); // ~48px tiles across the field
      ground.y = horizonY;
      app.stage.addChild(ground);

      // ── natural scatter of bushes, boulders, water-rocks (behind fighters) ──
      const rand = (min: number, max: number) => min + Math.random() * (max - min);
      const pick = <T,>(arr: readonly T[]) =>
        arr[Math.floor(Math.random() * arr.length)];
      // nearer the bottom = bigger (fake depth)
      const depthAt = (y: number) => 0.5 + ((y - horizonY) / bandH) * 0.8;

      type Deco = { node: Sprite | AnimatedSprite; y: number };
      const decos: Deco[] = [];

      // bushes: dense treeline at the horizon + a few scattered deeper on the field
      const bushRow = Math.ceil(W / 52) + 2;
      for (let i = 0; i < bushRow; i++) {
        const variant = pick(BACKDROP.bushes);
        const frame = Math.floor(rand(0, BACKDROP.bushFrames));
        const tex = sliceStrip(loaded[variant], BACKDROP.bushFrames, BACKDROP.bushSize)[frame];
        const y = horizonY + rand(2, 14);
        const b = new Sprite(tex);
        b.anchor.set(0.5, 1);
        b.scale.set(0.4 * depthAt(y));
        b.alpha = rand(0.85, 1);
        b.position.set(i * 52 + rand(-16, 16), y);
        decos.push({ node: b, y });
      }
      for (let i = 0; i < Math.round(rand(3, 5)); i++) {
        const variant = pick(BACKDROP.bushes);
        const frame = Math.floor(rand(0, BACKDROP.bushFrames));
        const tex = sliceStrip(loaded[variant], BACKDROP.bushFrames, BACKDROP.bushSize)[frame];
        const y = rand(horizonY + bandH * 0.3, H - 6);
        const b = new Sprite(tex);
        b.anchor.set(0.5, 1);
        b.scale.set(0.4 * depthAt(y) * (Math.random() < 0.5 ? -1 : 1), 0.4 * depthAt(y));
        b.alpha = rand(0.85, 1);
        b.position.set(rand(10, W - 10), y);
        decos.push({ node: b, y });
      }

      // boulders scattered across the field
      for (let i = 0; i < Math.round(rand(6, 9)); i++) {
        const r = new Sprite(loaded[pick(BACKDROP.rocks)]);
        r.texture.source.scaleMode = "nearest";
        r.anchor.set(0.5, 1);
        const y = rand(horizonY + bandH * 0.25, H - 4);
        const s = rand(0.4, 0.62) * depthAt(y);
        r.scale.set(Math.random() < 0.5 ? -s : s, s); // random horizontal flip
        r.alpha = 0.96;
        r.position.set(rand(8, W - 8), y);
        decos.push({ node: r, y });
      }

      // a few animated water-rocks (wet stones) low on the field
      for (let i = 0; i < Math.round(rand(2, 4)); i++) {
        const variant = pick(BACKDROP.waterRocks);
        const frames = sliceStrip(loaded[variant], BACKDROP.waterRockFrames, BACKDROP.waterRockSize);
        const wr = new AnimatedSprite(frames);
        wr.anchor.set(0.5, 1);
        const y = rand(horizonY + bandH * 0.55, H - 4);
        const s = rand(0.45, 0.65) * depthAt(y);
        wr.scale.set(s);
        wr.alpha = 0.95;
        wr.position.set(rand(12, W - 12), y);
        wr.animationSpeed = 0.12;
        wr.gotoAndPlay(Math.floor(rand(0, BACKDROP.waterRockFrames))); // desync ripples
        decos.push({ node: wr, y });
      }

      // paint back-to-front so nearer decorations overlap farther ones
      for (const d of decos.sort((a, b) => a.y - b.y)) app.stage.addChild(d.node);

      // ── duels, staggered front↔back for depth ──
      const shadowTex = loaded[BACKDROP.shadow];
      shadowTex.source.scaleMode = "nearest";
      const dustFrames = sliceClip(loaded, { url: PARTICLES.dust.url, frames: PARTICLES.dust.frames }, PARTICLES.dust.size, extracted);
      const explosionFrames = sliceClip(loaded, { url: PARTICLES.explosion.url, frames: PARTICLES.explosion.frames }, PARTICLES.explosion.size, extracted);

      const n = fighters.length;
      // one shared unit height so hero + orc read at consistent scale
      const baseUnit = Math.min(104, bandH * 0.72);

      const makeShadow = (x: number, y: number, w: number) => {
        const sh = new Sprite(shadowTex);
        sh.anchor.set(0.5, 0.5);
        sh.scale.set(w / 192, w / 192 / 2.6); // flattened ellipse
        sh.alpha = 0.4;
        sh.position.set(x, y);
        return sh;
      };

      const makeFighter = (
        anims: LoadedAnims,
        cfg: JobAnims,
        x: number,
        feetY: number,
        sc: number,
        mirror: boolean,
      ) => {
        const s = new AnimatedSprite(anims.idle.frames);
        s.anchor.set(0.5, 1);
        s.scale.set(mirror ? -sc : sc, sc);
        s.position.set(x, feetY);
        play(s, anims.idle, { loop: true, speed: 0.12 });
        return s;
      };

      const duels = boss ? [] : fighters.map((hero, i) => {
        const back = n > 1 && i % 2 === 1; // alternate rows
        const depthScale = back ? BACK_SCALE : 1;
        // front row lower in the band, back row higher (further away)
        const feetY = back
          ? horizonY + bandH * 0.42
          : horizonY + bandH * 0.82;

        // spread duels across the width; back row nudged toward center
        const slot = (i + 0.5) / n;
        const cx = W * (back ? 0.25 + slot * 0.5 : slot);
        const gap = FIGHT_GAP * depthScale;
        const heroX = cx - gap / 2;
        const enemyX = cx + gap / 2;

        const heroCfg = heroCfgs[i];
        const enemyCfg = enemyCfgs[i];
        const heroAnims = loadAnimSet(loaded, heroCfg, extracted);
        const enemyAnims = loadAnimSet(loaded, enemyCfg, extracted);
        const heroSc = (baseUnit / heroCfg.size) * depthScale;
        const enemySc =
          (baseUnit / enemyCfg.size) * (enemyCfg.bodyScale ?? 1) * depthScale;

        const heroShadow = makeShadow(heroX, feetY, baseUnit * 0.5 * depthScale);
        const enemyShadow = makeShadow(enemyX, feetY, baseUnit * 0.5 * depthScale);
        const heroSprite = makeFighter(heroAnims, heroCfg, heroX, feetY, heroSc, false);
        const enemySprite = makeFighter(enemyAnims, enemyCfg, enemyX, feetY, enemySc, true);

        const label = new Text({
          text: `${hero.name} · ${hero.job}`,
          style: { fill: 0xe2e8f0, fontSize: back ? 9 : 11, fontFamily: "monospace" },
        });
        label.anchor.set(0.5, 1);
        label.position.set(cx, feetY - baseUnit * depthScale - 14);

        // both combatants get a real HP bar — the fight trajectory is charted
        // from the quest's decided outcome (see the duel ticker below)
        const bar = new Graphics();
        const enemyBar = new Graphics();

        return {
          heroId: hero.id,
          feetY,
          depthScale,
          nodes: [heroShadow, enemyShadow, heroSprite, enemySprite, label, bar, enemyBar],
          heroSprite,
          enemySprite,
          heroAnims,
          enemyAnims,
          heroX,
          enemyX,
          bar,
          enemyBar,
          heroLastPct: -1,
          enemyLastPct: -1,
          prevHeroPct: 1,
          prevEnemyPct: 1,
          decided: false, // decisive end pose applied
          attacker: (Math.random() < 0.5 ? "hero" : "enemy") as Side,
          attackClip: 0,
          turnStart: performance.now() + i * 300, // stagger starts
          struck: false,
        };
      });

      // add nodes back-to-front so nearer duels overlap farther ones
      for (const d of [...duels].sort((a, b) => a.feetY - b.feetY)) {
        for (const node of d.nodes) app.stage.addChild(node);
      }

      const spawnParticle = (x: number, y: number, scale: number) => {
        const big = Math.random() < 0.25;
        const frames = big ? explosionFrames.frames : dustFrames.frames;
        const p = new AnimatedSprite(frames);
        p.anchor.set(0.5, big ? 0.7 : 1);
        p.scale.set((big ? baseUnit / 256 : 0.9) * scale);
        p.position.set(x, y);
        p.loop = false;
        p.animationSpeed = 0.35;
        p.onComplete = () => p.destroy();
        p.play();
        app.stage.addChild(p);
      };

      // ── live HP bars + real damage numbers, synced to store state ──
      const drawHpBar = (g: Graphics, x: number, topY: number, w: number, pct: number) => {
        g.clear();
        g.rect(x - w / 2, topY, w, 4).fill({ color: 0x1e293b, alpha: 0.9 });
        if (pct > 0) {
          // same thresholds as the roster's hpBarColor
          const color = pct > 0.5 ? 0x10b981 : pct > 0.25 ? 0xf59e0b : 0xf43f5e;
          g.rect(x - w / 2, topY, w * pct, 4).fill(color);
        }
      };

      // exact store-resolved deltas (boss tick damage, hemorrhage, potions) —
      // floats up and fades, mirroring the roster cards' FloatingText
      const spawnNumber = (x: number, y: number, msg: string, color: number) => {
        const label = new Text({
          text: msg,
          style: { fill: color, fontSize: 13, fontFamily: "monospace", fontWeight: "bold" },
        });
        label.anchor.set(0.5, 1);
        label.position.set(x, y);
        app.stage.addChild(label);
        const born = performance.now();
        const drift = () => {
          const e = (performance.now() - born) / 900;
          if (e >= 1) {
            app.ticker.remove(drift);
            label.destroy();
            return;
          }
          label.y = y - e * 26;
          label.alpha = 1 - e;
        };
        app.ticker.add(drift);
      };

      // fallen heroes stop swinging — desaturate and freeze until a Phoenix
      // Vial (or the fight ending) brings them back
      const setDeadLook = (s: AnimatedSprite, dead: boolean) => {
        if (dead) {
          s.stop();
          s.tint = 0x475569;
          s.alpha = 0.35;
        } else {
          s.tint = 0xffffff;
          s.alpha = 1;
          s.play();
        }
      };

      // ── boss mode: one giant boss + crown, party row, flavor mobs ──
      interface BossHeroEntry {
        heroId: string;
        sprite: AnimatedSprite;
        anims: LoadedAnims;
        x: number;
        feetY: number;
        bar: Graphics;
        lastPct: number;
        prevFort: number;
        dead: boolean;
      }
      let bossDuel: {
        bossSprite: AnimatedSprite;
        bossAnims: LoadedAnims;
        bossX: number;
        bossFeetY: number;
        bossUnit: number;
        bossBar: Graphics;
        bossMaxHp: number;
        prevBossHp: number;
        lastBossPct: number;
        heroEntries: BossHeroEntry[];
        // exchanges are driven by the real fight's round counter, not a timer —
        // one party-swing → boss-retaliate exchange plays per store tick
        lastRound: number;
        exchangeStart: number;
        partyStruck: boolean;
        bossStruck: boolean;
        targetIdx: number; // heroEntries index the boss hit this round (-1 = none)
        attackClip: number;
      } | null = null;

      if (boss && bossCfg) {
        const bossDef = BOSSES.find((b) => b.id === boss.bossId);
        const bossUnit = Math.min(baseUnit * (bossCfg.bodyScale ?? 1), H * 0.85, bandH * 1.4);
        const bossSc = bossUnit / bossCfg.size;
        const bossFeetY = Math.min(H - 4, Math.max(horizonY + bandH * 0.85, bossUnit + 34));
        const bossX = W * 0.74;
        const bossAnims = loadAnimSet(loaded, bossCfg, extracted);

        const heroFeetY = horizonY + bandH * 0.82;
        const availableW = Math.max(60, bossX - bossUnit * 0.5 - 30);
        const spacing = Math.min(baseUnit * 1.05, availableW / Math.max(1, n));
        const startX = 20 + spacing * 0.5;

        // flavor mobs — idle-only decoration, seeded so they stay put on resize
        const mobRand = seededRand(`${boss.bossId}-mobs`);
        for (const cfg of mobCfgs) {
          const anims = loadAnimSet(loaded, cfg, extracted);
          const y = horizonY + bandH * (0.28 + mobRand() * 0.22);
          const x = 24 + mobRand() * (W - 48);
          const sc = ((baseUnit * 0.4) / cfg.size) * (cfg.bodyScale ?? 1);
          app.stage.addChild(makeShadow(x, y, baseUnit * 0.22));
          app.stage.addChild(makeFighter(anims, cfg, x, y, sc, mobRand() < 0.5));
        }

        const heroEntries = fighters.map((hero, i) => {
          const x = startX + i * spacing;
          const heroCfg = heroCfgs[i];
          const heroAnims = loadAnimSet(loaded, heroCfg, extracted);
          const heroSc = baseUnit / heroCfg.size;
          app.stage.addChild(makeShadow(x, heroFeetY, baseUnit * 0.5));
          const sprite = makeFighter(heroAnims, heroCfg, x, heroFeetY, heroSc, false);
          app.stage.addChild(sprite);
          const label = new Text({
            text: `${hero.name} · ${hero.job}`,
            style: { fill: 0xe2e8f0, fontSize: 10, fontFamily: "monospace" },
          });
          label.anchor.set(0.5, 1);
          label.position.set(x, heroFeetY - baseUnit - 14);
          app.stage.addChild(label);
          const bar = new Graphics();
          app.stage.addChild(bar);
          return {
            heroId: hero.id,
            sprite,
            anims: heroAnims,
            x,
            feetY: heroFeetY,
            bar,
            lastPct: -1,
            prevFort: Math.max(0, hero.stats.fortitude),
            dead: hero.stats.fortitude <= 0,
          };
        });

        app.stage.addChild(makeShadow(bossX, bossFeetY, bossUnit * 0.55));
        const bossSprite = makeFighter(bossAnims, bossCfg, bossX, bossFeetY, bossSc, true);
        app.stage.addChild(bossSprite);

        const crown = new Text({
          text: CROWN_GLYPH,
          style: { fontSize: Math.round(Math.min(30, bossUnit * 0.22)) },
        });
        crown.anchor.set(0.5, 1);
        crown.position.set(bossX, bossFeetY - bossUnit - 6);
        app.stage.addChild(crown);

        const bossLabel = new Text({
          text: bossDef?.name ?? "???",
          style: { fill: 0xfca5a5, fontSize: 12, fontFamily: "monospace", fontWeight: "bold" },
        });
        bossLabel.anchor.set(0.5, 1);
        bossLabel.position.set(bossX, bossFeetY - bossUnit - 32);
        app.stage.addChild(bossLabel);

        const bossBar = new Graphics();
        app.stage.addChild(bossBar);

        bossDuel = {
          bossSprite,
          bossAnims,
          bossX,
          bossFeetY,
          bossUnit,
          bossBar,
          bossMaxHp: bossDef?.maxHp ?? boss.bossHp,
          prevBossHp: Math.max(0, boss.bossHp),
          lastBossPct: -1,
          heroEntries,
          lastRound: -1, // -1 so the first frame kicks off an exchange
          exchangeStart: 0,
          partyStruck: false,
          bossStruck: false,
          targetIdx: -1,
          attackClip: 0,
        };
      }

      app.ticker.add(() => {
        const now = performance.now();
        const epoch = Date.now(); // quest progress is measured against epoch timers
        const st = useGuildStore.getState(); // sim state is the source of truth

        // clouds drift
        for (const c of clouds) {
          c.x += 0.08;
          if (c.x > W) c.x = -c.width;
        }

        if (bossDuel) {
          const bd = bossDuel;

          // ── sync visuals to the real fight: HP bars, exact damage/heal
          // numbers from store deltas, dead heroes frozen out ──
          const fight = st.bossFight;
          if (fight) {
            const bossHp = Math.max(0, fight.bossHp);
            if (bossHp < bd.prevBossHp) {
              spawnNumber(bd.bossX, bd.bossFeetY - bd.bossUnit - 46, `-${bd.prevBossHp - bossHp}`, 0xfbbf24);
              bd.prevBossHp = bossHp;
            }
            const bossPct = bossHp / bd.bossMaxHp;
            if (bossPct !== bd.lastBossPct) {
              bd.lastBossPct = bossPct;
              drawHpBar(bd.bossBar, bd.bossX, bd.bossFeetY - bd.bossUnit - 42, bd.bossUnit * 0.7, bossPct);
            }
            for (const e of bd.heroEntries) {
              const h = st.heroes.find((x) => x.id === e.heroId);
              if (!h) continue;
              const fort = Math.max(0, h.stats.fortitude);
              if (fort !== e.prevFort) {
                const delta = fort - e.prevFort;
                spawnNumber(
                  e.x,
                  e.feetY - baseUnit - 18,
                  delta > 0 ? `+${delta}` : `${delta}`,
                  delta > 0 ? 0x34d399 : 0xf87171,
                );
                e.prevFort = fort;
              }
              const pct = fort / totalStats(h).maxFortitude;
              if (pct !== e.lastPct) {
                e.lastPct = pct;
                drawHpBar(e.bar, e.x, e.feetY - baseUnit - 8, baseUnit * 0.55, pct);
              }
              const dead = fort <= 0;
              if (dead !== e.dead) {
                e.dead = dead;
                setDeadLook(e.sprite, dead);
              }
            }
          }

          // a new store tick (round change) kicks off one exchange: the whole
          // living party swings at the boss, then the boss hits its real target
          if (fight && fight.round !== bd.lastRound) {
            bd.lastRound = fight.round;
            bd.exchangeStart = now;
            bd.partyStruck = false;
            bd.bossStruck = false;
            bd.attackClip++;
            bd.targetIdx = fight.lastTargetId
              ? bd.heroEntries.findIndex((e) => e.heroId === fight.lastTargetId)
              : -1;
          }

          const te = now - bd.exchangeStart;
          const targetEntry = bd.targetIdx >= 0 ? bd.heroEntries[bd.targetIdx] : null;

          if (te < B_PARTY_RECOVER) {
            // ── party phase: every living hero lunges at the boss ──
            const lunge = Math.sin(Math.min(1, te / B_PARTY_RECOVER) * Math.PI);
            for (const e of bd.heroEntries) {
              if (e.dead) continue;
              const clip = e.anims.attacks[bd.attackClip % e.anims.attacks.length];
              play(e.sprite, clip, { loop: false, speed: clip.frames.length / 30 });
              e.sprite.x = e.x + lunge * 16;
            }
            play(bd.bossSprite, bd.bossAnims.guard ?? bd.bossAnims.idle, { loop: true, speed: 0.14 });
            if (!bd.partyStruck && te >= B_PARTY_STRIKE) {
              bd.partyStruck = true;
              spawnParticle(bd.bossX - 10, bd.bossFeetY - bd.bossUnit * 0.4, 1);
            }
          } else if (te < B_BOSS_RECOVER) {
            // ── boss phase: it retaliates at the hero it really struck ──
            for (const e of bd.heroEntries) {
              if (e.dead) continue;
              play(e.sprite, e.anims.idle, { loop: true, speed: 0.12 });
              e.sprite.x = e.x;
            }
            if (targetEntry && !targetEntry.dead) {
              const clip = bd.bossAnims.attacks[bd.attackClip % bd.bossAnims.attacks.length];
              play(bd.bossSprite, clip, { loop: false, speed: clip.frames.length / 30 });
              const lunge = Math.sin(Math.min(1, (te - B_PARTY_RECOVER) / (B_BOSS_RECOVER - B_PARTY_RECOVER)) * Math.PI);
              bd.bossSprite.x = bd.bossX - lunge * 24;
              if (!bd.bossStruck && te >= B_BOSS_STRIKE) {
                bd.bossStruck = true;
                spawnParticle(targetEntry.x + 8, targetEntry.feetY - 6, 1);
              }
            } else {
              play(bd.bossSprite, bd.bossAnims.idle, { loop: true, speed: 0.12 });
              bd.bossSprite.x = bd.bossX;
            }
          } else {
            // ── settle: everyone idle at home until the next tick ──
            for (const e of bd.heroEntries) {
              if (e.dead) continue;
              play(e.sprite, e.anims.idle, { loop: true, speed: 0.12 });
              e.sprite.x = e.x;
            }
            play(bd.bossSprite, bd.bossAnims.idle, { loop: true, speed: 0.12 });
            bd.bossSprite.x = bd.bossX;
          }
        }

        // ── quest duels: a real fight charted from the quest's decided outcome.
        // Both HP bars trace a trajectory across the quest duration, exchanges
        // trade real chip damage, and the loser drops as the timer runs out. ──
        for (const d of duels) {
          const h = st.heroes.find((x) => x.id === d.heroId);
          const q = st.activeQuests.find((x) => x.heroId === d.heroId);
          if (!h || !q) continue; // quest resolving — scene rebuilds on status change
          const dg = st.dungeons.find((x) => x.id === q.dungeonId);
          const maxFort = totalStats(h).maxFortitude;
          const known = q.outcome != null;
          const win = q.outcome === "win";
          const dur = Math.max(1, q.completionTime - q.startedAt);
          const frac = Math.max(0, Math.min(1, (epoch - q.startedAt) / dur));
          const enemyMaxHp = dg ? Math.max(20, Math.round(dg.threat_level * 3)) : 60;

          // HP trajectories — hero drains toward the real end state, enemy toward
          // 0 on a win / a survivor's sliver on a loss
          const startFortPct = Math.max(0, Math.min(1, h.stats.fortitude / maxFort));
          const endFortPct = win ? Math.max(0, startFortPct - 10 / maxFort) : 0;
          const heroPct = known ? startFortPct + (endFortPct - startFortPct) * frac : startFortPct;
          const enemyEnd = known ? (win ? 0 : 0.4) : 0.5;
          const enemyPct = 1 + (enemyEnd - 1) * frac;

          const barY = d.feetY - baseUnit * d.depthScale - 8;
          const barW = baseUnit * 0.5 * d.depthScale;
          const hKey = Math.round(heroPct * 200);
          if (hKey !== d.heroLastPct) {
            d.heroLastPct = hKey;
            drawHpBar(d.bar, d.heroX, barY, barW, heroPct);
          }
          const eKey = Math.round(enemyPct * 200);
          if (eKey !== d.enemyLastPct) {
            d.enemyLastPct = eKey;
            drawHpBar(d.enemyBar, d.enemyX, barY, barW, enemyPct);
          }

          // decisive finish in the last 10% of the run — loser drops, winner stands
          if (known && frac >= 0.9) {
            const k = (frac - 0.9) / 0.1;
            if (win) {
              d.enemySprite.tint = 0x475569;
              d.enemySprite.alpha = 1 - k * 0.85;
              d.enemySprite.stop();
              play(d.heroSprite, d.heroAnims.idle, { loop: true, speed: 0.12 });
              d.heroSprite.x = d.heroX;
            } else {
              d.heroSprite.tint = 0x475569;
              d.heroSprite.alpha = 1 - k * 0.6;
              d.heroSprite.stop();
              play(d.enemySprite, d.enemyAnims.idle, { loop: true, speed: 0.12 });
              d.enemySprite.x = d.enemyX;
            }
            continue;
          }

          // ongoing exchange — attacker lunges, defender takes real chip damage
          const t = now - d.turnStart;
          if (t < 0) continue; // stagger delay
          const atk = d.attacker === "hero";
          const attacker = atk ? d.heroSprite : d.enemySprite;
          const defender = atk ? d.enemySprite : d.heroSprite;
          const aAnims = atk ? d.heroAnims : d.enemyAnims;
          const dAnims = atk ? d.enemyAnims : d.heroAnims;
          const aHome = atk ? d.heroX : d.enemyX;
          const dHome = atk ? d.enemyX : d.heroX;
          const dir = atk ? 1 : -1; // hero lunges right, enemy lunges left

          if (t < RECOVER_AT) {
            const clip = aAnims.attacks[d.attackClip % aAnims.attacks.length];
            play(attacker, clip, { loop: false, speed: clip.frames.length / 36 });
            play(defender, dAnims.guard ?? dAnims.idle, { loop: true, speed: 0.2 });
            const lunge = Math.sin(Math.min(1, t / RECOVER_AT) * Math.PI);
            attacker.x = aHome + dir * lunge * 22 * d.depthScale;
            if (!d.struck && t >= STRIKE_AT) {
              d.struck = true;
              spawnParticle(dHome - dir * 8 * d.depthScale, d.feetY - 6, d.depthScale);
              defender.x = dHome + dir * 5 * d.depthScale;
              // chip number off the HP the defender shed since the last exchange
              if (atk) {
                const drop = Math.max(1, Math.round((d.prevEnemyPct - enemyPct) * enemyMaxHp));
                spawnNumber(d.enemyX, barY - 4, `-${drop}`, 0xfbbf24);
              } else {
                const drop = Math.max(1, Math.round((d.prevHeroPct - heroPct) * maxFort));
                spawnNumber(d.heroX, barY - 4, `-${drop}`, 0xf87171);
              }
            }
          } else if (t < TURN_MS) {
            play(attacker, aAnims.idle, { loop: true, speed: 0.12 });
            play(defender, dAnims.idle, { loop: true, speed: 0.12 });
            attacker.x = aHome;
            defender.x = dHome;
          } else {
            d.attacker = Math.random() < 0.5 ? "hero" : "enemy";
            d.attackClip++;
            d.struck = false;
            d.prevHeroPct = heroPct;
            d.prevEnemyPct = enemyPct;
            d.turnStart = now;
          }
        }
      });
    })();

    return () => {
      cancelled = true;
      if (ready) app.destroy(true, { children: true }); // free WebGL context
    };
  }, [sceneKey, sizeKey]);

  if (questing.length === 0) {
    return (
      <div className="relative flex h-full items-center justify-center overflow-hidden">
        <div className="sprite-idle absolute bottom-[-52px] origin-bottom scale-75 opacity-40" aria-hidden="true" />
        <span className="absolute bottom-1 right-2 text-[10px] uppercase tracking-widest text-slate-600">
          No active combat — dispatch a hero
        </span>
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      aria-label="Combat visualizer"
      className="h-full overflow-hidden [&_canvas]:block [&_canvas]:max-w-full"
    />
  );
}
