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
- Province search/fly-to from a generated static province index.
- Shared selected-province detail panel opened from search or map click.
- Shareable URL state with `mode` and province slug query params.
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
pnpm test:unit
pnpm build
pnpm start
pnpm data:generate-index
pnpm data:verify-index
pnpm knip
```

Notes:

- `pnpm dev` runs Next.js with Turbopack on `http://localhost:3000`.
- `pnpm lint` must pass before finishing meaningful frontend changes.
- `pnpm test:unit` covers shared map/data utility contracts.
- `pnpm build` uses `output: 'standalone'`; on Windows with pnpm it may require Developer Mode, elevated permissions, a cleared `.next` cache, or Docker/Linux due to `.next/trace` cache locking or `.next/standalone` symlink creation.

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
| `src/app/[locale]/data-sources/page.tsx` | Public data-source, attribution, and limitations page |
| `src/app/global-error.tsx` | App-level global error fallback |
| `src/app/opengraph-image.tsx` | Dynamic Open Graph image |
| `src/components/Map/Map.tsx` | Compatibility entrypoint that mounts the feature map shell |
| `src/features/map-shell/MapShell.tsx` | Map shell, feature composition, and map chrome wiring |
| `src/features/map-shell/useMapLibre.ts` | MapLibre initialization, readiness, and error lifecycle |
| `src/features/map-state/mapViewReducer.ts` | Shared map view state reducer |
| `src/features/boundaries/boundaryLayerRegistry.ts` | Vector/GeoJSON source and layer registry |
| `src/features/boundaries/BoundaryLayers.tsx` | Boundary source/layer registration and visibility sync |
| `src/features/boundaries/ProvinceBoundaryInteractions.tsx` | Map click and hover interactions for province selection |
| `src/features/province-index/` | Static province index types, loader, search, and lookup helpers |
| `src/features/province-search/ProvinceSearch.tsx` | Province search and fly-to UI |
| `src/features/province-detail/ProvinceDetailPanel.tsx` | Shared selected-province detail panel |
| `src/features/map-state/urlState.ts` | URL state parse/serialize helpers for shareable map state |
| `src/components/Map/MapToggle.tsx` | Before/after toggle UI |
| `src/components/Map/MapDataNotice.tsx` | Public data note, data-source page link, and data issue entry point |
| `src/components/Map/MapAttribution.tsx` | OSM and Viettrace attribution |
| `src/libs/config/publicEnv.ts` | Public env validation for map config |
| `src/libs/maplibre/` | Small MapLibre helpers for camera, sources, layers, visibility, and tile URLs |
| `src/libs/i18n/routing.ts` | next-intl routing config, locales `en` and `vi` |
| `src/libs/i18n/request.ts` | next-intl message loading |
| `src/locales/en.json` | English copy |
| `src/locales/vi.json` | Vietnamese copy |
| `src/styles/globals.css` | Tailwind CSS 4 entry and theme variables |
| `public/data/merger-info.json` | Static province merger metadata |
| `public/data/province-index.json` | Generated province search/detail/camera index |
| `public/data/province-labels-pre.json` | Static pre-2025 label points |
| `public/data/province-labels-post.json` | Static post-2025 label points |
| `public/data/offshore-island-labels.json` | Static offshore island label points |
| `Dockerfile` | Multi-stage standalone production build |
| `.env.sample` | Documented public env vars |

---

## Environment Variables

Public map env vars:

```env
NEXT_PUBLIC_TILE_URL_PRE=http://localhost:8080/tiles/vn_provinces_pre_2025
NEXT_PUBLIC_TILE_URL_POST=http://localhost:8080/tiles/vn_provinces_post_2025
NEXT_PUBLIC_TILE_URL_ISLANDS=http://localhost:8080/tiles/vn_offshore_islands
NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
NEXT_PUBLIC_TILE_CACHE_BUSTER=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Production tile URL bases:

```env
NEXT_PUBLIC_TILE_URL_PRE=https://tiles.viettrace.org/tiles/vn_provinces_pre_2025
NEXT_PUBLIC_TILE_URL_POST=https://tiles.viettrace.org/tiles/vn_provinces_post_2025
NEXT_PUBLIC_TILE_URL_ISLANDS=https://tiles.viettrace.org/tiles/vn_offshore_islands
NEXT_PUBLIC_TILE_CACHE_BUSTER=20260509-display
```

Rules:

- Never hardcode tile URLs in source code.
- Use `process.env.NEXT_PUBLIC_*` for browser-visible configuration.
- Bump `NEXT_PUBLIC_TILE_CACHE_BUSTER` after tile data changes when browser/CDN caches may still hold stale MVTs.
- `.env.local` is gitignored; do not commit secrets or private env values.
- Docker builds need `NEXT_PUBLIC_*` args at build time because client public env values are inlined.

---

## MapLibre Rules

- MapLibre components must be client components with `'use client'`.
- Import MapLibre CSS from `maplibre-gl/dist/maplibre-gl.css` once in the map client tree.
- Source-layer names must be exactly `vn_provinces_pre_2025` and `vn_provinces_post_2025`.
- Default map center is `[105.8, 21.0]`; default zoom is `5`.
- Toggle layer visibility with `map.setLayoutProperty(layerId, 'visibility', ...)` instead of recreating sources.
- Search/detail/URL restore must read `public/data/province-index.json`; do not depend on currently rendered vector tiles for search data.
- Preserve required attribution: `© OpenStreetMap contributors`, `© geoBoundaries www.geoboundaries.org` for offshore islands, and `© Viettrace`.

## Tile Source Rules

| Mode | Source | Source-layer | Fill | Outline |
|---|---|---|---|---|
| Pre-2025 | `vn-provinces-pre` | `vn_provinces_pre_2025` | `#d44` opacity `0.1` | `#d44` width `1.5` |
| Post-2025 | `vn-provinces-post` | `vn_provinces_post_2025` | `#3388ff` opacity `0.1` | `#3388ff` width `1.5` |
| Offshore islands | `vn-offshore-islands` | `vn_offshore_islands` | teal reference fill/outline | optional toggle layer |

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

For non-trivial code, refactor, UX, or architecture work, load the relevant repo-local skill before editing. Prefer the copies under `.agents/skills/`; `.claude/skills/` may exist for other tools but should not be the primary source for Codex work.

If the agent runtime exposes a skill by name, use the runtime skill mechanism. If it does not, manually read the corresponding `.agents/skills/<skill>/SKILL.md` file before making changes and follow the applicable guidance.

| Task | Skill |
|---|---|
| App Router routes/layouts, metadata, middleware, next-intl, Next config, build behavior | `.agents/skills/next-best-practices/SKILL.md` |
| Client components, hooks, MapLibre event handlers, React state, performance-sensitive refactors | `.agents/skills/vercel-react-best-practices/SKILL.md` |
| Tailwind styling, responsive overlays, map controls, design tokens | `.agents/skills/tailwind-design-system/SKILL.md` |
| Complex TypeScript types/utilities only | `.agents/skills/typescript-advanced-types/SKILL.md` |
| Larger visual/product UX decisions | `.agents/skills/frontend-design/SKILL.md` or `.agents/skills/ui-ux-pro-max/SKILL.md` |
| Skill discovery/install questions | `.agents/skills/find-skills/SKILL.md` |

Minimum checklist:

1. Identify which row(s) match the task before editing.
2. Read only the relevant `SKILL.md` and directly referenced files needed for the task.
3. Mention in the work summary which skill guidance was used, or why none applied.

---

## Verification Expectations

For meaningful frontend changes:

1. Run `pnpm lint`.
2. Run `pnpm build` when the change touches build/deploy/Next config or route structure.
3. If build fails only on Windows-local `.next/trace` permission/cache locking or `.next/standalone` symlink creation, report it clearly and recommend Docker/Linux, CI, clearing `.next`, or an elevated/Developer Mode shell for full verification.
4. For map behavior changes, manually verify `/vi/map` with local or production tile env vars.

Useful local stack command from workspace root:

```bash
docker compose -f compose.full.yml --env-file viettrace-infra/.env up -d --build
```

---

## Git And PR Convention

- `main` is the production branch and deploys to Vercel.
- Use short-lived branches: `feat/*`, `fix/*`, `docs/*`, `chore/*`, `refactor/*`, `test/*`, `ci/*`, `perf/*`, `hotfix/*`.
- Use Conventional Commits: `type(scope): summary`.
- PR titles should follow Conventional Commit format because maintainers use squash merge.
- CI should pass before merge: `pnpm lint` and `pnpm build`.
- Do not push directly to `main` except explicitly approved emergency hotfixes.
- Data changes should update `../viettrace-plans/04-data/` when source/process/quality status changes.

## Release Convention

- `package.json#version` is the source of truth for release version.
- Release tags use `v${version}`.
- GitHub Releases are created from the same tag.
- `CHANGELOG.md` is generated from Conventional Commits by release-it.
- Use the manual GitHub Actions `Release` workflow for releases; exact `version` is for first/current-version releases, otherwise use `increment`.
- Release commits use `chore(release): v${version}`.
- Update `../viettrace-plans/05-releases/` for product/project milestone releases.

---

## Do Not

- Do not modify `viettrace-core` as part of frontend MVP work.
- Do not hardcode `localhost` or production tile URLs in TypeScript/TSX source.
- Do not rename MapLibre source-layer names without updating tile server docs and frontend code together.
- Do not remove OSM attribution.
- Do not remove geoBoundaries attribution when offshore islands layer is enabled.
- Do not commit `.env.local` or other secret-bearing env files.
- Do not delete static data files under `public/data/` without updating `../viettrace-plans/04-data/`.
