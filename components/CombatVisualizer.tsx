"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatedSprite,
  Application,
  Assets,
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
import { BOSSES, useGuildStore } from "@/store/useGuildStore";

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

function sliceClip(
  loaded: Record<string, Texture>,
  clip: Clip,
  cfgSize: number,
): LoadedClip {
  const base = loaded[clip.url];
  base.source.scaleMode = "nearest"; // crisp pixel art
  const size = clip.size ?? cfgSize;
  // oversize cell: body block centered → feet at (size/2 + cfgSize/2)
  const anchorY = size === cfgSize ? 1 : (size / 2 + cfgSize / 2) / size;
  return { frames: sliceStrip(base, clip.frames, size, clip.row ?? 0), anchorY };
}

function loadAnimSet(
  loaded: Record<string, Texture>,
  cfg: JobAnims,
): LoadedAnims {
  return {
    idle: sliceClip(loaded, cfg.idle, cfg.size),
    attacks: cfg.attacks.map((a) => sliceClip(loaded, a, cfg.size)),
    guard: cfg.guard ? sliceClip(loaded, cfg.guard, cfg.size) : null,
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
      const dustFrames = sliceClip(loaded, { url: PARTICLES.dust.url, frames: PARTICLES.dust.frames }, PARTICLES.dust.size);
      const explosionFrames = sliceClip(loaded, { url: PARTICLES.explosion.url, frames: PARTICLES.explosion.frames }, PARTICLES.explosion.size);

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
        const heroAnims = loadAnimSet(loaded, heroCfg);
        const enemyAnims = loadAnimSet(loaded, enemyCfg);
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
        label.position.set(cx, feetY - baseUnit * depthScale - 4);

        return {
          feetY,
          depthScale,
          nodes: [heroShadow, enemyShadow, heroSprite, enemySprite, label],
          heroSprite,
          enemySprite,
          heroAnims,
          enemyAnims,
          heroX,
          enemyX,
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

      // ── boss mode: one giant boss + crown, party row, flavor mobs ──
      let bossDuel: {
        bossSprite: AnimatedSprite;
        bossAnims: LoadedAnims;
        bossX: number;
        bossFeetY: number;
        heroEntries: { sprite: AnimatedSprite; anims: LoadedAnims; x: number; feetY: number }[];
        currentHero: number;
        attacker: Side;
        attackClip: number;
        turnStart: number;
        struck: boolean;
      } | null = null;

      if (boss && bossCfg) {
        const bossDef = BOSSES.find((b) => b.id === boss.bossId);
        const bossUnit = Math.min(baseUnit * (bossCfg.bodyScale ?? 1), H * 0.85, bandH * 1.4);
        const bossSc = bossUnit / bossCfg.size;
        const bossFeetY = Math.min(H - 4, Math.max(horizonY + bandH * 0.85, bossUnit + 34));
        const bossX = W * 0.74;
        const bossAnims = loadAnimSet(loaded, bossCfg);

        const heroFeetY = horizonY + bandH * 0.82;
        const availableW = Math.max(60, bossX - bossUnit * 0.5 - 30);
        const spacing = Math.min(baseUnit * 1.05, availableW / Math.max(1, n));
        const startX = 20 + spacing * 0.5;

        // flavor mobs — idle-only decoration, seeded so they stay put on resize
        const mobRand = seededRand(`${boss.bossId}-mobs`);
        for (const cfg of mobCfgs) {
          const anims = loadAnimSet(loaded, cfg);
          const y = horizonY + bandH * (0.28 + mobRand() * 0.22);
          const x = 24 + mobRand() * (W - 48);
          const sc = ((baseUnit * 0.4) / cfg.size) * (cfg.bodyScale ?? 1);
          app.stage.addChild(makeShadow(x, y, baseUnit * 0.22));
          app.stage.addChild(makeFighter(anims, cfg, x, y, sc, mobRand() < 0.5));
        }

        const heroEntries = fighters.map((hero, i) => {
          const x = startX + i * spacing;
          const heroCfg = heroCfgs[i];
          const heroAnims = loadAnimSet(loaded, heroCfg);
          const heroSc = baseUnit / heroCfg.size;
          app.stage.addChild(makeShadow(x, heroFeetY, baseUnit * 0.5));
          const sprite = makeFighter(heroAnims, heroCfg, x, heroFeetY, heroSc, false);
          app.stage.addChild(sprite);
          const label = new Text({
            text: `${hero.name} · ${hero.job}`,
            style: { fill: 0xe2e8f0, fontSize: 10, fontFamily: "monospace" },
          });
          label.anchor.set(0.5, 1);
          label.position.set(x, heroFeetY - baseUnit - 4);
          app.stage.addChild(label);
          return { sprite, anims: heroAnims, x, feetY: heroFeetY };
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

        bossDuel = {
          bossSprite,
          bossAnims,
          bossX,
          bossFeetY,
          heroEntries,
          currentHero: 0,
          attacker: (Math.random() < 0.5 ? "hero" : "enemy") as Side,
          attackClip: 0,
          turnStart: performance.now(),
          struck: false,
        };
      }

      app.ticker.add(() => {
        const now = performance.now();

        // clouds drift
        for (const c of clouds) {
          c.x += 0.08;
          if (c.x > W) c.x = -c.width;
        }

        if (bossDuel) {
          const bd = bossDuel;
          const t = now - bd.turnStart;
          if (t >= 0) {
            const atk = bd.attacker === "hero";
            const heroEntry = bd.heroEntries[bd.currentHero];
            const attacker = atk ? heroEntry.sprite : bd.bossSprite;
            const defender = atk ? bd.bossSprite : heroEntry.sprite;
            const aAnims = atk ? heroEntry.anims : bd.bossAnims;
            const dAnims = atk ? bd.bossAnims : heroEntry.anims;
            const aHome = atk ? heroEntry.x : bd.bossX;
            const dHome = atk ? bd.bossX : heroEntry.x;
            const dir = atk ? 1 : -1;

            if (t < RECOVER_AT) {
              const clip = aAnims.attacks[bd.attackClip % aAnims.attacks.length];
              play(attacker, clip, { loop: false, speed: clip.frames.length / 36 });
              play(defender, dAnims.guard ?? dAnims.idle, { loop: true, speed: 0.2 });
              const lunge = Math.sin(Math.min(1, t / RECOVER_AT) * Math.PI);
              attacker.x = aHome + dir * lunge * 22;
              if (!bd.struck && t >= STRIKE_AT) {
                bd.struck = true;
                spawnParticle(dHome - dir * 8, (atk ? bd.bossFeetY : heroEntry.feetY) - 6, 1);
                defender.x = dHome + dir * 5;
              }
            } else if (t < TURN_MS) {
              play(attacker, aAnims.idle, { loop: true, speed: 0.12 });
              play(defender, dAnims.idle, { loop: true, speed: 0.12 });
              attacker.x = aHome;
              defender.x = dHome;
            } else {
              bd.attacker = Math.random() < 0.5 ? "hero" : "enemy";
              bd.currentHero = Math.floor(Math.random() * bd.heroEntries.length);
              bd.attackClip++;
              bd.struck = false;
              bd.turnStart = now;
            }
          }
        }

        for (const d of duels) {
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
            // attack phase: attacker plays attack clip once, defender guards
            const clip = aAnims.attacks[d.attackClip % aAnims.attacks.length];
            play(attacker, clip, { loop: false, speed: clip.frames.length / 36 });
            play(defender, dAnims.guard ?? dAnims.idle, { loop: true, speed: 0.2 });

            // lunge toward the defender and back (scaled by depth)
            const lunge = Math.sin(Math.min(1, t / RECOVER_AT) * Math.PI);
            attacker.x = aHome + dir * lunge * 22 * d.depthScale;

            if (!d.struck && t >= STRIKE_AT) {
              d.struck = true;
              spawnParticle(dHome - dir * 8 * d.depthScale, d.feetY - 6, d.depthScale);
              defender.x = dHome + dir * 5 * d.depthScale; // knockback
            }
          } else if (t < TURN_MS) {
            // recover: both idle, positions restored
            play(attacker, aAnims.idle, { loop: true, speed: 0.12 });
            play(defender, dAnims.idle, { loop: true, speed: 0.12 });
            attacker.x = aHome;
            defender.x = dHome;
          } else {
            // next exchange: random attacker, next attack variant
            d.attacker = Math.random() < 0.5 ? "hero" : "enemy";
            d.attackClip++;
            d.struck = false;
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
