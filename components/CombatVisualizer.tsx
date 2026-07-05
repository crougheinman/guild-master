"use client";

import { useEffect, useRef } from "react";
import {
  AnimatedSprite,
  Application,
  Assets,
  Container,
  Rectangle,
  Sprite,
  Text,
  Texture,
  TilingSprite,
} from "pixi.js";
import {
  BACKDROP,
  PARTICLES,
  unitAnims,
  type Clip,
  type JobAnims,
} from "@/components/assets";
import { JOBS, useGuildStore, type Job } from "@/store/useGuildStore";

const DUEL_WIDTH = 210; // horizontal space per fight
const FIGHT_GAP = 92; // distance between the two combatants
const GROUND_H = 30;
const TURN_MS = 1500; // one full attack exchange
const STRIKE_AT = 420; // impact moment inside the turn
const RECOVER_AT = 750; // both back to idle

type Side = "hero" | "enemy";

interface LoadedAnims {
  idle: Texture[];
  attacks: Texture[][];
  guard: Texture[] | null;
}

function sliceStrip(base: Texture, frames: number, size: number): Texture[] {
  return Array.from(
    { length: frames },
    (_, i) =>
      new Texture({
        source: base.source,
        frame: new Rectangle(i * size, 0, size, size),
      }),
  );
}

function sliceClip(loaded: Record<string, Texture>, clip: Clip, size: number) {
  const base = loaded[clip.url];
  base.source.scaleMode = "nearest"; // crisp pixel art
  return sliceStrip(base, clip.frames, size);
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
  sprite: AnimatedSprite & { _clip?: Texture[] },
  clip: Texture[],
  opts: { loop: boolean; speed: number },
) {
  if (sprite._clip === clip) return;
  sprite._clip = clip;
  sprite.textures = clip;
  sprite.loop = opts.loop;
  sprite.animationSpeed = opts.speed;
  sprite.gotoAndPlay(0);
}

export default function CombatVisualizer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const heroes = useGuildStore((s) => s.heroes);
  const questing = heroes.filter((h) => h.status === "on_quest");
  const questingKey = questing
    .map((h) => h.id)
    .sort()
    .join(",");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || questingKey === "") return;

    // ponytail: full app rebuild per quest-set change; persistent app + scene
    // diffing if WebGL context churn ever shows up
    let cancelled = false;
    let ready = false;
    const app = new Application();

    (async () => {
      const fighters = useGuildStore
        .getState()
        .heroes.filter((h) => h.status === "on_quest");

      // enemy job: random but stable per hero id (visual only)
      const enemyJobFor = (id: string): Job =>
        JOBS[Math.abs([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % JOBS.length];

      const heroCfgs = fighters.map((h) => unitAnims("Blue", h.job));
      const enemyCfgs = fighters.map((h) => unitAnims("Red", enemyJobFor(h.id)));

      const urls = new Set<string>([
        BACKDROP.tilemap,
        ...BACKDROP.clouds,
        BACKDROP.tower,
        BACKDROP.bush,
        ...BACKDROP.rocks,
        PARTICLES.dust.url,
        PARTICLES.explosion.url,
      ]);
      for (const cfg of [...heroCfgs, ...enemyCfgs]) {
        urls.add(cfg.idle.url);
        cfg.attacks.forEach((a) => urls.add(a.url));
        if (cfg.guard) urls.add(cfg.guard.url);
      }
      const loaded: Record<string, Texture> = await Assets.load([...urls]);
      if (cancelled) return;

      const W = host.clientWidth || 700;
      const H = Math.max(host.clientHeight, 150);

      await app.init({ background: "#1a2740", width: W, height: H, antialias: false });
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      ready = true;
      host.appendChild(app.canvas);

      const groundY = H - GROUND_H;

      // ── backdrop: clouds → buildings → bush/rocks → ground ──
      const clouds = BACKDROP.clouds.map((url, i) => {
        const c = new Sprite(loaded[url]);
        c.texture.source.scaleMode = "nearest";
        c.alpha = 0.5;
        c.scale.set(0.5);
        c.position.set(i * (W / 2), 4 + i * 12);
        app.stage.addChild(c);
        return c;
      });

      const tower = new Sprite(loaded[BACKDROP.tower]);
      tower.texture.source.scaleMode = "nearest";
      tower.anchor.set(0.5, 1);
      tower.scale.set((H * 0.75) / 256);
      tower.alpha = 0.55; // pushed back
      tower.tint = 0x8899bb;
      tower.position.set(W - 70, groundY + 6);
      app.stage.addChild(tower);

      const bushTex = sliceStrip(loaded[BACKDROP.bush], 8, 128)[0];
      const bush = new Sprite(bushTex);
      bush.anchor.set(0.5, 1);
      bush.scale.set(0.45);
      bush.alpha = 0.8;
      bush.position.set(40, groundY + 10);
      app.stage.addChild(bush);

      BACKDROP.rocks.forEach((url, i) => {
        const r = new Sprite(loaded[url]);
        r.texture.source.scaleMode = "nearest";
        r.anchor.set(0.5, 1);
        r.scale.set(0.5);
        r.alpha = 0.9;
        r.position.set(120 + i * (W - 200), groundY + 8);
        app.stage.addChild(r);
      });

      const tilemap = loaded[BACKDROP.tilemap];
      tilemap.source.scaleMode = "nearest";
      const g = BACKDROP.groundTile;
      const groundTex = new Texture({
        source: tilemap.source,
        frame: new Rectangle(g.x, g.y, g.w, g.h),
      });
      const ground = new TilingSprite({ texture: groundTex, width: W, height: GROUND_H + 12 });
      ground.tileScale.set((GROUND_H + 12) / g.h);
      ground.y = groundY - 6;
      app.stage.addChild(ground);

      // ── duels ──
      const spriteDisplay = Math.min(96, H - 54);
      const dustFrames = sliceClip(loaded, { url: PARTICLES.dust.url, frames: PARTICLES.dust.frames }, PARTICLES.dust.size);
      const explosionFrames = sliceClip(loaded, { url: PARTICLES.explosion.url, frames: PARTICLES.explosion.frames }, PARTICLES.explosion.size);

      const makeFighter = (anims: LoadedAnims, cfg: JobAnims, x: number, mirror: boolean) => {
        const s = new AnimatedSprite(anims.idle);
        s.anchor.set(0.5, 1);
        const sc = spriteDisplay / cfg.size;
        s.scale.set(mirror ? -sc : sc, sc);
        s.position.set(x, groundY + 10); // feet on grass
        play(s, anims.idle, { loop: true, speed: 0.12 });
        app.stage.addChild(s);
        return s;
      };

      const duels = fighters.map((hero, i) => {
        const baseX = 30 + i * DUEL_WIDTH;
        const heroAnims = loadAnimSet(loaded, heroCfgs[i]);
        const enemyAnims = loadAnimSet(loaded, enemyCfgs[i]);

        const heroSprite = makeFighter(heroAnims, heroCfgs[i], baseX + 40, false);
        const enemySprite = makeFighter(enemyAnims, enemyCfgs[i], baseX + 40 + FIGHT_GAP, true);

        const label = new Text({
          text: `${hero.name} · ${hero.job}`,
          style: { fill: 0xe2e8f0, fontSize: 11, fontFamily: "monospace" },
        });
        label.anchor.set(0.5, 0);
        label.position.set(baseX + 40 + FIGHT_GAP / 2, 2);
        app.stage.addChild(label);

        return {
          heroSprite,
          enemySprite,
          heroAnims,
          enemyAnims,
          heroX: baseX + 40,
          enemyX: baseX + 40 + FIGHT_GAP,
          attacker: (Math.random() < 0.5 ? "hero" : "enemy") as Side,
          attackClip: 0,
          turnStart: performance.now() + i * 300, // stagger duels
          struck: false,
        };
      });

      const spawnParticle = (x: number, y: number) => {
        const big = Math.random() < 0.25;
        const frames = big ? explosionFrames : dustFrames;
        const p = new AnimatedSprite(frames);
        p.anchor.set(0.5, big ? 0.7 : 1);
        p.scale.set(big ? spriteDisplay / 256 : 0.9);
        p.position.set(x, y);
        p.loop = false;
        p.animationSpeed = 0.35;
        p.onComplete = () => p.destroy();
        p.play();
        app.stage.addChild(p);
      };

      app.ticker.add(() => {
        const now = performance.now();

        // clouds drift
        for (const c of clouds) {
          c.x += 0.08;
          if (c.x > W) c.x = -c.width;
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
            play(attacker, clip, { loop: false, speed: clip.length / 36 });
            play(defender, dAnims.guard ?? dAnims.idle, { loop: true, speed: 0.2 });

            // lunge toward the defender and back
            const lunge = Math.sin(Math.min(1, t / RECOVER_AT) * Math.PI);
            attacker.x = aHome + dir * lunge * 22;

            if (!d.struck && t >= STRIKE_AT) {
              d.struck = true;
              spawnParticle(dHome - dir * 8, groundY + 8);
              defender.x = dHome + dir * 5; // knockback
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
  }, [questingKey]);

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
