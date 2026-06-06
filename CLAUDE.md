# viettrace-map-web

## Overview

Next.js frontend for Viettrace, an interactive map comparing Vietnam province boundaries before and after the July 2025 administrative merger. Features bilingual support (Vietnamese/English), province/district/ward search, detail panels, side-by-side compare mode with synchronized cameras, and shareable URL state.

**Current State:** Phase 5B complete. MVP launched with full compare UX, PMTiles-served nested boundaries, and production deployment.

**Context:** This CLAUDE.md is scoped to the frontend. Check `../viettrace-plans/status.md` for project-wide state and `../viettrace-plans/01-architecture/frontend-map.md` for architecture details.

## Project Structure

```
viettrace-map-web/
├── src/
│   ├── app/[locale]/          # Next.js App Router with i18n
│   │   ├── layout.tsx         # Root layout with next-intl
│   │   └── map/page.tsx       # Main map route
│   ├── features/              # Feature-based organization
│   │   ├── map-shell/         # MapShell, SingleMapShell, CompareMapShell
│   │   ├── boundaries/        # BoundaryLayers, boundaryLayerRegistry
│   │   ├── province-search/   # Search UI and logic
│   │   ├── province-detail/   # Detail panel components
│   │   ├── province-index/    # Static province lookup utilities
│   │   ├── compare/           # Compare mode components
│   │   └── map-state/         # URL state sync (urlState.ts)
│   ├── libs/
│   │   ├── config/publicEnv.ts  # Environment variable access
│   │   └── i18n/routing.ts      # i18n route configuration
│   ├── locales/
│   │   ├── en.json            # English translations
│   │   └── vi.json            # Vietnamese translations
│   └── styles/globals.css     # Tailwind v4 theme variables
├── public/data/               # Generated static data
│   ├── province-index.json    # Province search/lookup index
│   ├── nested-index.json      # District/ward index
│   ├── province-labels-*.json # Label data
│   └── merger-info.json       # Merger metadata
├── scripts/data-generation/   # Data generation scripts
├── .env.sample                # Environment variable template
└── Dockerfile                 # Multi-stage standalone build
```

## Tech Stack

- **Framework:** Next.js (App Router) with Turbopack
- **React:** Client/server component separation
- **Mapping:** MapLibre GL JS with PMTiles protocol
- **i18n:** next-intl (routes: /vi/map, /en/map)
- **Styling:** Tailwind CSS v4 (CSS-first, no config file)
- **Package Manager:** pnpm
- **Tile Data:** Vector tiles (MVT) from Martin or PMTiles from Cloudflare R2
- **Basemap:** CARTO Positron

## Development Workflow

### Setup
```bash
pnpm install
```

### Development
```bash
pnpm dev  # http://localhost:3000
```

### Quality Checks
```bash
pnpm lint          # Must pass before PR
pnpm test:unit     # Map/data utility tests
pnpm build         # Standalone output (see Windows note below)
pnpm knip          # Check unused exports
```

### Data Generation
```bash
pnpm data:generate-index        # Province index
pnpm data:generate-nested-index # District/ward index
pnpm data:generate-labels       # Label files
pnpm data:verify-index          # Verify integrity
```

### Local Stack (from workspace root)
```bash
docker compose -f compose.full.yml --env-file viettrace-infra/.env up -d --build
```

### Testing Routes
- `/vi/map` - Vietnamese (default)
- `/en/map` - English

**Test:** Province search, map clicks, pre/post toggle, compare mode with divider, nested boundary interactions, URL state sharing, language switch, mobile responsive layout.

## Code Conventions

### React
- **Server/Client Boundaries:** Keep explicit. Only use `'use client'` when needing browser APIs, state, effects, or event handlers.
- **Optimization:** Do not add `useMemo`/`useCallback` by default unless measured benefit or existing pattern.
- **Component Style:** Prefer small, focused components for map overlays and controls.
- **Error Handling:** Use route-level `error.tsx` for route-specific fallbacks.

### MapLibre
- **Client Components:** All MapLibre components must use `'use client'`.
- **CSS Import:** Import `maplibre-gl/dist/maplibre-gl.css` once in map client tree.
- **Source Layer Names:** Exactly `'vn_provinces_pre_2025'` and `'vn_provinces_post_2025'` (coordinate changes with backend).
- **Default View:** Center `[105.8, 21.0]`, zoom `5`.
- **Layer Visibility:** Toggle with `setLayoutProperty('visibility', ...)`, not recreating sources.
- **Search Data:** Read from `province-index.json`, not rendered vector tiles.

### MapLibre Layer Styling
- **Pre-2025 provinces:** Red `#d44`, fill opacity `0.1`, outline width `1.5`
- **Post-2025 provinces:** Blue `#3388ff`, fill opacity `0.1`, outline width `1.5`
- **Pre-2025 districts:** Red `#d44`, fill opacity `0.04`, outline `#b91c1c`, visible from zoom `7`
- **Post-2025 wards:** Blue `#3388ff`, fill opacity `0.03`, outline `#1d4ed8`, visible from zoom `8`
- **Offshore islands:** Teal reference fill/outline

### Styling
- **Framework:** Tailwind CSS v4 (CSS-first, no config file).
- **Theme Variables:** In `src/styles/globals.css`.
- **Responsive:** Map container works on desktop and mobile. Overlays must not block critical interactions on mobile.
- **Visual Language:** Preserve current map UI unless explicitly asked to redesign.

### i18n
- **Locales:** `en`, `vi` (default: `vi`)
- **Update Pattern:** Add or update keys in both `src/locales/en.json` and `src/locales/vi.json`.
- **Routing:** Keep aligned with `src/libs/i18n/routing.ts`.

### Git
- **Branch Prefixes:** `feat/*`, `fix/*`, `docs/*`, `chore/*`, `refactor/*`, `test/*`, `ci/*`, `perf/*`, `hotfix/*`
- **Commit Format:** Conventional Commits: `type(scope): summary`
- **PR Titles:** Follow Conventional Commit format (squash merge used).
- **Main Branch:** `main` (deploys to Vercel). Do not push directly except approved emergency hotfixes.

### Releases
- **Version Source:** `package.json#version`
- **Tag Format:** `v${version}`
- **Changelog:** Generated from Conventional Commits by release-it
- **Release Workflow:** Manual GitHub Actions Release workflow
- **Release Commit:** `chore(release): v${version}`

## Critical Paths

### Core Map Components
- `src/app/[locale]/layout.tsx` - Root layout with next-intl provider
- `src/app/[locale]/map/page.tsx` - Main map route
- `src/features/map-shell/MapShell.tsx` - Map shell orchestrator
- `src/features/map-shell/SingleMapShell.tsx` - Single map with toggle
- `src/features/compare/CompareMapShell.tsx` - Split view with synced cameras

### Boundary System
- `src/features/boundaries/boundaryLayerRegistry.ts` - Layer configuration registry
- `src/features/boundaries/BoundaryLayers.tsx` - Layer rendering component

### Data and State
- `src/features/province-index/` - Province lookup utilities
- `src/features/map-state/urlState.ts` - URL state synchronization
- `src/libs/config/publicEnv.ts` - Environment variable access
- `public/data/province-index.json` - Generated province index
- `public/data/nested-index.json` - Generated district/ward index

### i18n
- `src/locales/en.json` - English translations
- `src/locales/vi.json` - Vietnamese translations

### Deployment
- `.env.sample` - Environment variable template
- `Dockerfile` - Multi-stage standalone build

## Environment Variables

### Tile URLs (Required)
```bash
NEXT_PUBLIC_TILE_URL_PRE=https://tiles.viettrace.org/tiles/vn_provinces_pre_2025
NEXT_PUBLIC_TILE_URL_POST=https://tiles.viettrace.org/tiles/vn_provinces_post_2025
NEXT_PUBLIC_TILE_URL_ISLANDS=https://tiles.viettrace.org/tiles/vn_offshore_islands
```

### PMTiles URLs (Priority over Martin for polygons)
```bash
NEXT_PUBLIC_PMTILES_URL_PRE_DISTRICTS_CANDIDATE=https://nested-tiles.viettrace.org/nested/vn_districts_pre_2025_candidate.pmtiles
NEXT_PUBLIC_PMTILES_URL_POST_WARDS_CANDIDATE=https://nested-tiles.viettrace.org/nested/vn_wards_post_2025_candidate.pmtiles
NEXT_PUBLIC_PMTILES_URL_PRE_DISTRICTS_CANDIDATE_LABELS=https://nested-tiles.viettrace.org/nested/vn_districts_pre_2025_candidate_labels.pmtiles
NEXT_PUBLIC_PMTILES_URL_POST_WARDS_CANDIDATE_LABELS=https://nested-tiles.viettrace.org/nested/vn_wards_post_2025_candidate_labels.pmtiles
```

### Optional Configuration
```bash
NEXT_PUBLIC_ENABLE_QA_LAYERS=false  # QA layers toggle (default: false)
NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
NEXT_PUBLIC_TILE_CACHE_BUSTER=20260509-display  # Bump after tile data changes
NEXT_PUBLIC_SITE_URL=https://viettrace.org
```

### Rules
- Never hardcode tile URLs in source code.
- Use `process.env.NEXT_PUBLIC_*` for browser-visible config via `publicEnv.ts`.
- PMTiles URLs take priority over Martin URLs for polygon sources.
- `.env.local` is gitignored. Never commit secrets.
- Docker builds need `NEXT_PUBLIC_*` args at build time (inlined into client bundle).

## Common Tasks

### Add a New Province Feature
1. Check `../viettrace-plans/` for existing plans
2. Read `src/features/province-index/` for data contracts
3. Update both `src/locales/en.json` and `src/locales/vi.json`
4. Add component in appropriate `src/features/` directory
5. Run `pnpm lint` before committing

### Update Translations
```bash
# Edit both files
src/locales/en.json
src/locales/vi.json

# Verify
pnpm dev  # Check both /vi/map and /en/map
```

### Change Map Layer Styling
1. Find layer in `src/features/boundaries/boundaryLayerRegistry.ts`
2. Update paint or layout properties
3. Test visibility, opacity, and responsive behavior
4. Do not change `source-layer` names without backend coordination

### Add Environment Variable
1. Add to `.env.sample` with description
2. Add to `src/libs/config/publicEnv.ts`
3. Update this CLAUDE.md
4. Update Docker args in `Dockerfile` if `NEXT_PUBLIC_*`

### Regenerate Static Data
```bash
pnpm data:generate-index        # After province data changes
pnpm data:generate-nested-index # After district/ward data changes
pnpm data:verify-index          # Verify integrity
```

### Create Feature Branch
```bash
git checkout -b feat/your-feature-name
# Work, commit, push
# Create PR with Conventional Commit title
```

## Gotchas and Notes

### Windows Build Issues
`pnpm build` may fail on Windows due to:
- `.next/trace` cache locking
- `.next/standalone` symlink issues

**Solutions:** Use Docker/Linux, clear `.next/`, enable Developer Mode, or use elevated permissions.

### MapLibre Source Layer Names
Must exactly match `'vn_provinces_pre_2025'` and `'vn_provinces_post_2025'`. Changes require coordination with backend tile generation.

### Attribution Requirements
Always include:
- OpenStreetMap contributors (required)
- geoBoundaries www.geoboundaries.org (when offshore islands layer enabled)
- Viettrace (app-owned)

### Skills for Non-Trivial Work
Load from `.agents/skills/` before editing:
- `next-best-practices` - App Router, layouts, metadata, middleware, next-intl
- `vercel-react-best-practices` - Client components, hooks, MapLibre handlers, React state
- `tailwind-design-system` - Styling, responsive overlays, design tokens
- `typescript-advanced-types` - Complex TypeScript types only
- `frontend-design` or `ui-ux-pro-max` - Visual/product UX decisions
- `find-skills` - Skill discovery/install

### DO NOT
- Modify `viettrace-core` as part of frontend work
- Hardcode localhost or production tile URLs in TypeScript/TSX
- Rename MapLibre source-layer names without coordinated updates
- Remove OSM or geoBoundaries attribution
- Commit `.env.local` or secret files
- Delete `public/data/` files without updating `../viettrace-plans/04-data/` or `../viettrace-scraping/` if data came from external scraping
- Add `useMemo`/`useCallback` without measured benefit
- Skip `pnpm lint` before PR

### Verification Before PR
**Minimal:** `pnpm lint` for all meaningful changes.

**Build Check:** `pnpm build` when touching build/deploy/Next config or route structure.

**Manual Test:** Verify `/vi/map` with local or production tile env vars for map behavior changes.

### Deployment
- **Platform:** Vercel
- **Trigger:** Push to `main`
- **Build Output:** `output: 'standalone'` in Next.js config
- **CI Requirements:** `pnpm lint` and `pnpm build` must pass

### Production Tile URLs
See Environment Variables section above for current production PMTiles and MVT endpoints.
