# Micro-Guildmaster

A browser-based idle guild-management RPG. Hire heroes, send them on timed quests,
raid bosses, craft gear at the Forge and sell it back to your own heroes, and
retire max-level heroes as Legends for permanent prestige buffs. Progress is saved
to `localStorage` and keeps ticking while the tab is closed (quests resolve on the
next load).

Built with Next.js (App Router), React 19, Zustand, Tailwind CSS 4, Framer Motion
and PixiJS (the live combat stage).

> **Heads up:** this repo uses a Next.js version with breaking changes from older
> releases. Check `node_modules/next/dist/docs/` before using framework APIs
> (see `AGENTS.md`).

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the dev server                  |
| `npm run build`     | Production build                      |
| `npm start`         | Serve the production build            |
| `npm run lint`      | ESLint                                |
| `npm run typecheck` | `tsc --noEmit`                        |
| `npm test`          | Vitest unit tests for the game store  |

## Project layout

```
app/          Next.js shell — page.tsx is the 3-column dashboard (mobile: tabs)
components/   One component per game screen/modal; assets.ts maps sprite paths
store/        useGuildStore.ts — ALL game rules and state (Zustand + persist)
docs/         game-assets-guide.md — sprite sheet notes
public/       Pixel-art assets
```

### The store is the game

`store/useGuildStore.ts` owns every rule: quests, boss raids, expeditions, the
Forge, the market, prestige. `components/GameTicker.tsx` drives it with a 1-second
interval (plus one catch-up tick on load for offline progress). UI components only
read state and call actions — prices and costs are computed in the store, never
passed in by the UI.

Conventions worth knowing:

- **Persisted fields are `snake_case`** (`max_fortitude`, `personal_wealth`).
  Renaming one breaks existing saves without a migration. Derived values from
  `totalStats()` are `camelCase` and include gear, traits and job bonuses.
- **Anything crossing the save boundary is sanitized** (`sanitize*` helpers) so a
  stale or hand-edited save degrades gracefully instead of producing `NaN`.
- Dungeons are code-defined and deliberately **not** persisted.
- Bumping the persist `version` currently discards old saves (`migrate` resets).

## Testing

Unit tests live in `store/__tests__/` and exercise the store directly via
`useGuildStore.getState()` — no DOM required.
