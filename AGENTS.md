# viettrace-map-web — Agent Instructions

> Scope: Next.js frontend for Viettrace, an interactive MapLibre map comparing Vietnam province boundaries before and after the July 2025 merger.
> Location: `D:\viettrace\viettrace-map-web`

---

## How Agents Should Use This File

This file is the repo-local instruction source for frontend work. It overrides the root `../AGENTS.md` for files inside `viettrace-map-web`.

Before meaningful frontend changes, read:

1. This file.
2. `../viettrace-plans/status.md` for current project state.
3. `../viettrace-plans/01-architecture/frontend-map.md` for frontend architecture.
4. `../viettrace-plans/03-runbooks/local-development.md` for local stack usage.

If changing deployment behavior, also read `../viettrace-plans/03-runbooks/frontend-deploy.md`.

---

## Current State

M2 frontend map MVP is complete. The app currently supports:

- `/vi/map` and `/en/map` map pages.
- MapLibre map centered on Vietnam.
- Toggle between pre-2025 63-province and post-2025 34-province layers.
- Province click popup with static merger metadata.
- Province labels from static GeoJSON label files.
- OSM/Viettrace attribution.
- SEO metadata and dynamic Open Graph image.
- Docker standalone deployment config.

For the latest state, use `../viettrace-plans/status.md` instead of this file.

---

## Developer Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
pnpm start
pnpm knip
```

Notes:

- `pnpm dev` runs Next.js with Turbopack on `http://localhost:3000`.
- `pnpm lint` must pass before finishing meaningful frontend changes.
- `pnpm build` uses `output: 'standalone'`; on Windows with pnpm it may require Developer Mode, elevated symlink permissions, or Docker/Linux due to `.next/standalone` symlink creation.

---

## Source Of Truth

| Topic | Source |
|---|---|
| Current project state | `../viettrace-plans/status.md` |
| Frontend architecture | `../viettrace-plans/01-architecture/frontend-map.md` |
| Tile server architecture | `../viettrace-plans/01-architecture/tile-server.md` |
| Local development | `../viettrace-plans/03-runbooks/local-development.md` |
| Frontend deploy | `../viettrace-plans/03-runbooks/frontend-deploy.md` |
| Data and metadata | `../viettrace-plans/04-data/` |
| Milestone history | `../viettrace-plans/02-milestones/` |

---

## Key Files

| File | Purpose |
|---|---|
| `src/app/[locale]/layout.tsx` | Root layout, fonts, next-intl provider, SEO metadata |
| `src/app/[locale]/page.tsx` | Locale homepage/map entry |
| `src/app/[locale]/map/page.tsx` | Main map route |
| `src/app/[locale]/map/error.tsx` | Map route error fallback |
| `src/app/global-error.tsx` | App-level global error fallback |
| `src/app/opengraph-image.tsx` | Dynamic Open Graph image |
| `src/components/Map/Map.tsx` | Map shell and MapLibre initialization |
| `src/components/Map/ProvinceLayer.tsx` | Vector sources, fills/outlines, labels, layer visibility |
| `src/components/Map/MapToggle.tsx` | Before/after toggle UI |
| `src/components/Map/ProvincePopup.tsx` | Province click popup and merger metadata lookup |
| `src/components/Map/MapAttribution.tsx` | OSM and Viettrace attribution |
| `src/libs/i18n/routing.ts` | next-intl routing config, locales `en` and `vi` |
| `src/libs/i18n/request.ts` | next-intl message loading |
| `src/locales/en.json` | English copy |
| `src/locales/vi.json` | Vietnamese copy |
| `src/styles/globals.css` | Tailwind CSS 4 entry and theme variables |
| `public/data/merger-info.json` | Static province merger metadata |
| `public/data/province-labels-pre.json` | Static pre-2025 label points |
| `public/data/province-labels-post.json` | Static post-2025 label points |
| `Dockerfile` | Multi-stage standalone production build |
| `.env.sample` | Documented public env vars |

---

## Environment Variables

Public map env vars:

```env
NEXT_PUBLIC_TILE_URL_PRE=http://localhost:8080/tiles/vn_provinces_pre_2025
NEXT_PUBLIC_TILE_URL_POST=http://localhost:8080/tiles/vn_provinces_post_2025
NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Production tile URL bases:

```env
NEXT_PUBLIC_TILE_URL_PRE=https://tiles.viettrace.org/tiles/vn_provinces_pre_2025
NEXT_PUBLIC_TILE_URL_POST=https://tiles.viettrace.org/tiles/vn_provinces_post_2025
```

Rules:

- Never hardcode tile URLs in source code.
- Use `process.env.NEXT_PUBLIC_*` for browser-visible configuration.
- `.env.local` is gitignored; do not commit secrets or private env values.
- Docker builds need `NEXT_PUBLIC_*` args at build time because client public env values are inlined.

---

## MapLibre Rules

- MapLibre components must be client components with `'use client'`.
- Import MapLibre CSS from `maplibre-gl/dist/maplibre-gl.css` once in the map client tree.
- Source-layer names must be exactly `vn_provinces_pre_2025` and `vn_provinces_post_2025`.
- Default map center is `[105.8, 21.0]`; default zoom is `5`.
- Toggle layer visibility with `map.setLayoutProperty(layerId, 'visibility', ...)` instead of recreating sources.
- Preserve required attribution: `© OpenStreetMap contributors` and `© Viettrace`.

## Tile Source Rules

| Mode | Source | Source-layer | Fill | Outline |
|---|---|---|---|---|
| Pre-2025 | `vn-provinces-pre` | `vn_provinces_pre_2025` | `#d44` opacity `0.1` | `#d44` width `1.5` |
| Post-2025 | `vn-provinces-post` | `vn_provinces_post_2025` | `#3388ff` opacity `0.1` | `#3388ff` width `1.5` |

---

## React And Next.js Rules

- Follow App Router conventions.
- Keep server/client component boundaries explicit.
- Do not convert a server component to client unless it needs browser APIs, state, effects, or event handlers.
- Do not add `useMemo` or `useCallback` by default; only add them for measured/reasoned benefit or existing project pattern.
- Prefer small focused components for map chrome and overlays.
- Use route-level `error.tsx` for route-specific error fallbacks.
- Keep metadata in App Router metadata APIs, not ad-hoc head tags.

---

## Tailwind And UI Rules

- Tailwind is v4 CSS-first; there is no Tailwind config file by default.
- Global theme variables live in `src/styles/globals.css`.
- Preserve the current map UI visual language unless explicitly asked to redesign.
- Map container should work on desktop and mobile viewport heights.
- Overlay controls must not block critical map interactions on mobile.

---

## i18n Rules

- Supported locales are `en` and `vi`.
- Default locale is `vi`.
- Add or update keys in both `src/locales/en.json` and `src/locales/vi.json`.
- Keep route logic aligned with `src/libs/i18n/routing.ts`.

---

## Skills

Load relevant skills before non-trivial changes when the environment supports them:

| Task | Skill |
|---|---|
| App Router, metadata, routing, next-intl | `next-best-practices` |
| Client components, hooks, MapLibre event handlers, React performance | `vercel-react-best-practices` |
| Tailwind styling, responsive overlays, design tokens | `tailwind-design-system` |
| Complex TypeScript types/utilities only | `typescript-advanced-types` |
| Skill discovery/install questions | `find-skills` |

---

## Verification Expectations

For meaningful frontend changes:

1. Run `pnpm lint`.
2. Run `pnpm build` when the change touches build/deploy/Next config or route structure.
3. If build fails only at `.next/standalone` symlink creation on Windows, report it clearly and recommend Docker/Linux or symlink-enabled Windows verification.
4. For map behavior changes, manually verify `/vi/map` with local or production tile env vars.

Useful local stack command from workspace root:

```bash
docker compose -f compose.full.yml --env-file viettrace-infra/.env up -d --build
```

---

## Do Not

- Do not modify `viettrace-core` as part of frontend MVP work.
- Do not hardcode `localhost` or production tile URLs in TypeScript/TSX source.
- Do not rename MapLibre source-layer names without updating tile server docs and frontend code together.
- Do not remove OSM attribution.
- Do not commit `.env.local` or other secret-bearing env files.
- Do not delete static data files under `public/data/` without updating `../viettrace-plans/04-data/`.
