"use client";

import { useEffect, useRef } from "react";
import {
  AnimatedSprite,
  Application,
  Assets,
  Container,
  Rectangle,
  Text,
  Texture,
} from "pixi.js";
import {
  WARRIOR_FRAMES,
  WARRIOR_SIZE,
  WARRIOR_URLS,
  type WarriorAnim,
} from "@/components/assets";
import { useGuildStore } from "@/store/useGuildStore";

const LANE_HEIGHT = 96;
const PAD = 16;
const SPRITE_DISPLAY = 88; // 192px frame scaled down
const GAP = 96; // idle distance between combatants

type AnimSet = Record<WarriorAnim, Texture[]>;

// slice a horizontal strip into equal frame textures (Pixi v8)
function sliceStrip(base: Texture, frames: number): Texture[] {
  return Array.from(
    { length: frames },
    (_, i) =>
      new Texture({
        source: base.source,
        frame: new Rectangle(i * WARRIOR_SIZE, 0, WARRIOR_SIZE, WARRIOR_SIZE),
      }),
  );
}

// build the 4 animation clips for one team from loaded textures
function buildAnimSet(
  loaded: Record<string, Texture>,
  urls: Record<WarriorAnim, string>,
): AnimSet {
  const out = {} as AnimSet;
  for (const anim of Object.keys(WARRIOR_FRAMES) as WarriorAnim[]) {
    out[anim] = sliceStrip(loaded[urls[anim]], WARRIOR_FRAMES[anim]);
  }
  return out;
}

// swap clip only on state change, else AnimatedSprite restarts every frame
function playAnim(
  sprite: AnimatedSprite & { _anim?: WarriorAnim },
  anim: WarriorAnim,
  set: AnimSet,
  speed: number,
  loop: boolean,
) {
  if (sprite._anim === anim) return;
  sprite._anim = anim;
  sprite.textures = set[anim];
  sprite.loop = loop;
  sprite.animationSpeed = speed;
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

      const loaded = await Assets.load([
        ...Object.values(WARRIOR_URLS.hero),
        ...Object.values(WARRIOR_URLS.enemy),
      ]);
      if (cancelled) return;

      const heroAnims = buildAnimSet(loaded, WARRIOR_URLS.hero);
      const enemyAnims = buildAnimSet(loaded, WARRIOR_URLS.enemy);

      await app.init({
        background: "#0f172a",
        width: host.clientWidth || 600,
        height: PAD * 2 + fighters.length * LANE_HEIGHT,
        antialias: false,
      });
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      ready = true;
      host.appendChild(app.canvas);

      const scale = SPRITE_DISPLAY / WARRIOR_SIZE;

      const lanes = fighters.map((hero, i) => {
        const lane = new Container();
        lane.y = PAD + i * LANE_HEIGHT;
        const midY = LANE_HEIGHT / 2;

        const heroSprite = new AnimatedSprite(heroAnims.idle);
        heroSprite.anchor.set(0.5);
        heroSprite.scale.set(scale);
        heroSprite.position.set(PAD + SPRITE_DISPLAY / 2, midY);

        const enemySprite = new AnimatedSprite(enemyAnims.idle);
        enemySprite.anchor.set(0.5);
        enemySprite.scale.set(-scale, scale); // mirror to face the hero
        enemySprite.position.set(PAD + SPRITE_DISPLAY + GAP, midY);

        const label = new Text({
          text: hero.name,
          style: { fill: 0xe2e8f0, fontSize: 12, fontFamily: "monospace" },
        });
        label.anchor.set(0.5, 1);
        label.position.set(PAD + SPRITE_DISPLAY / 2, midY - SPRITE_DISPLAY / 2);

        lane.addChild(enemySprite, heroSprite, label);
        app.stage.addChild(lane);
        return {
          heroSprite,
          enemySprite,
          baseX: PAD + SPRITE_DISPLAY / 2,
          phase: i * 0.9,
          strikes: 0, // counts committed swings to alternate attack1/2
          swung: false, // debounce: one attack per swing
        };
      });

      const strikeRange = GAP * 0.7;

      app.ticker.add(() => {
        const t = Date.now() / 200;
        for (const lane of lanes) {
          // sine lunge: clamp negative half → rest, then strike
          const swing = Math.max(0, Math.sin(t + lane.phase));
          lane.heroSprite.x = lane.baseX + swing * strikeRange;

          const lunging = swing > 0.15;
          if (lunging) {
            if (!lane.swung) {
              lane.swung = true;
              lane.strikes++; // new swing → alternate the blade
            }
            // Attack1 / Attack2 on alternate swings
            const attack: WarriorAnim =
              lane.strikes % 2 === 1 ? "attack1" : "attack2";
            playAnim(lane.heroSprite, attack, heroAnims, 0.3, true);
          } else {
            lane.swung = false;
            playAnim(lane.heroSprite, "idle", heroAnims, 0.12, true);
          }

          // enemy raises Guard at the top of the hero's swing, else idles
          const guarding = swing > 0.6;
          lane.enemySprite.x =
            PAD + SPRITE_DISPLAY + GAP + (swing > 0.95 ? 4 : 0); // flinch on hit
          playAnim(
            lane.enemySprite,
            guarding ? "guard" : "idle",
            enemyAnims,
            guarding ? 0.25 : 0.12,
            true,
          );
        }
      });
    })();

    return () => {
      cancelled = true;
      if (ready) app.destroy(true, { children: true }); // free WebGL context
    };
  }, [questingKey]);

  if (questing.length === 0) return null;

  return (
    <div
      ref={hostRef}
      aria-label="Combat visualizer"
      className="overflow-hidden rounded-lg border border-slate-800 [&_canvas]:block [&_canvas]:max-w-full"
    />
  );
}
