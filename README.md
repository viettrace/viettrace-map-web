# viettrace-map-web

Interactive web map for Viettrace, built with Next.js and MapLibre GL.

Viettrace compares Vietnam province/city administrative boundaries before and after the July 2025 merger from 63 provinces to 34 provinces. This frontend renders the map UI, before/after toggle, province search/fly-to, selected-province detail panel, shareable URL state, labels, attribution, SEO metadata, and production Docker build.

## Current Status

The frontend MVP is complete. Immediate Post-MVP Phase 3 UX utility is also complete.

| Area | Status |
|---|---|
| MapLibre map | Complete |
| 63/34 province toggle | Complete |
| Province search/fly-to | Complete |
| Province detail panel | Complete |
| Shareable URL state | Complete |
| Static merger metadata | Complete |
| i18n `vi`/`en` | Complete |
| SEO/Open Graph | Complete |
| Docker standalone build config | Complete |

For current project state, read `../viettrace-plans/status.md`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| UI runtime | React 19 |
| Map | MapLibre GL 5.6 |
| Styling | Tailwind CSS 4 |
| i18n | next-intl |
| Package manager | pnpm 10 |
| Runtime | Node.js 22.16 |

## Key Routes

| Route | Purpose |
|---|---|
| `/vi/map` | Main Vietnamese map page |
| `/en/map` | English map page |
| `/vi/data-sources` | Public Vietnamese data-source and limitations page |
| `/en/data-sources` | Public English data-source and limitations page |

## Requirements

- Node.js `22.16.0`
- pnpm `>=9.0.0` (project currently uses `pnpm@10.12.4`)
- Local tile stack from `viettrace-infra` or production tile URLs

## Environment Variables

Create `.env.local` from `.env.sample`:

```bash
cp .env.sample .env.local
```

Local defaults:

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

Do not hardcode tile URLs in source code. Public map config must come from `NEXT_PUBLIC_*` env vars. `NEXT_PUBLIC_TILE_URL_ISLANDS` is recommended for the full production layer set; if it is absent in an older local env file, the map still loads without the offshore-islands layer/toggle.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the frontend dev server:

```bash
pnpm dev
```

Open:

```txt
http://localhost:3000/vi/map
```

If using local tiles, start the infra stack from the workspace root or `viettrace-infra` repo:

```bash
docker compose -f compose.full.yml --env-file viettrace-infra/.env up -d --build
```

Then use local tile URLs from `.env.sample`.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Next.js dev server with Turbopack |
| `pnpm lint` | Run ESLint |
| `pnpm test:unit` | Run Vitest unit tests for map/data utility contracts |
| `pnpm build` | Build production app with standalone output |
| `pnpm start` | Start production Next.js server |
| `pnpm data:generate-index` | Regenerate `public/data/province-index.json` from display-safe GeoJSON and merger metadata |
| `pnpm data:generate-labels` | Regenerate province label points from `../viettrace-data` |
| `pnpm data:verify-index` | Verify province index counts, slugs, camera data, and merger metadata references |
| `pnpm data:verify-mergers` | Verify merger metadata names against tile province names |
| `pnpm knip` | Run dead-code detection |

## Project Structure

```txt
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── data-sources/
│   │   │   └── page.tsx
│   │   └── map/
│   │       ├── page.tsx
│   │       └── error.tsx
│   ├── global-error.tsx
│   └── opengraph-image.tsx
├── components/Map/
│   ├── Map.tsx
│   ├── MapToggle.tsx
│   ├── MapDataNotice.tsx
│   └── MapAttribution.tsx
├── features/
│   ├── map-shell/
│   ├── map-state/
│   ├── boundaries/
│   ├── province-index/
│   ├── province-search/
│   └── province-detail/
├── libs/
│   ├── config/
│   ├── geo/
│   ├── i18n/
│   └── maplibre/
├── locales/
└── styles/

public/data/
├── merger-info.json
├── province-index.json
├── province-labels-pre.json
├── province-labels-post.json
└── offshore-island-labels.json
```

## Map Data

Vector tiles are served by Martin from PostGIS through `https://tiles.viettrace.org` in production or `http://localhost:8080` locally.

| Mode | Tile source-layer | URL env var |
|---|---|---|
| Pre-2025, 63 provinces | `vn_provinces_pre_2025` | `NEXT_PUBLIC_TILE_URL_PRE` |
| Post-2025, 34 provinces | `vn_provinces_post_2025` | `NEXT_PUBLIC_TILE_URL_POST` |
| Offshore islands | `vn_offshore_islands` | `NEXT_PUBLIC_TILE_URL_ISLANDS` |

Static frontend metadata lives in `public/data/`:

- `merger-info.json`: old province to new province mappings.
- `province-index.json`: generated search/detail/camera index from display-safe province GeoJSON.
- `province-labels-pre.json`: label points for pre-2025 provinces.
- `province-labels-post.json`: label points for post-2025 provinces.
- `offshore-island-labels.json`: label points for Hoàng Sa and Trường Sa reference layer.

OSM attribution is required: `© OpenStreetMap contributors`.
geoBoundaries attribution is required for offshore islands: `© geoBoundaries www.geoboundaries.org`.

## Docker

The recommended post-MVP frontend deployment target is Vercel. Docker remains the fallback self-host path.

## Vercel

No `vercel.json` is required for the current app. Use Vercel's Next.js defaults unless custom routing, headers, redirects, or non-default build behavior becomes necessary.

Recommended settings:

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root directory | `viettrace-map-web` |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |

Production environment variables:

```env
NEXT_PUBLIC_TILE_URL_PRE=https://tiles.viettrace.org/tiles/vn_provinces_pre_2025
NEXT_PUBLIC_TILE_URL_POST=https://tiles.viettrace.org/tiles/vn_provinces_post_2025
NEXT_PUBLIC_TILE_URL_ISLANDS=https://tiles.viettrace.org/tiles/vn_offshore_islands
NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
NEXT_PUBLIC_TILE_CACHE_BUSTER=20260509-display
NEXT_PUBLIC_SITE_URL=https://viettrace.org
NEXT_PUBLIC_SENTRY_ENABLED=false
```

Keep `tiles.viettrace.org` on the CX23 tile server. Point `viettrace.org` and `www.viettrace.org` to Vercel.

## Docker Fallback

Build locally:

```bash
docker build -t viettrace-map-web:local .
```

Run with production-style public env values:

```bash
docker run --rm -p 3002:3000 \
  -e NEXT_PUBLIC_TILE_URL_PRE=https://tiles.viettrace.org/tiles/vn_provinces_pre_2025 \
  -e NEXT_PUBLIC_TILE_URL_POST=https://tiles.viettrace.org/tiles/vn_provinces_post_2025 \
  -e NEXT_PUBLIC_TILE_URL_ISLANDS=https://tiles.viettrace.org/tiles/vn_offshore_islands \
  -e NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json \
  -e NEXT_PUBLIC_TILE_CACHE_BUSTER=20260509-display \
  viettrace-map-web:local
```

Self-host deployment config is maintained in `../viettrace-infra/compose.prod.yml` and documented in `../viettrace-plans/03-runbooks/frontend-deploy.md`.

## Verification

Before finishing meaningful frontend changes:

```bash
pnpm lint
pnpm test:unit
pnpm data:verify-index
pnpm data:verify-mergers
```

Run build for route/config/deployment changes:

```bash
pnpm build
```

On Windows with pnpm, `next build` can fail on `.next/trace` permission/cache locking or during symlink creation under `.next/standalone`. If that happens, verify through CI, Docker/Linux, a cleared `.next` cache, or an elevated/Developer Mode shell.

For map behavior changes, manually verify:

- `/vi/map` loads.
- Pre-2025 layer is visible by default.
- Toggle switches to post-2025 layer.
- Search finds province names with and without Vietnamese accents.
- Selecting a search result switches mode when needed and fits the map to the province.
- Province detail panel opens from both search and map click.
- URL state restores from links such as `/vi/map?mode=pre&province=ha-giang`.
- Data-source note links to the public localized data-sources page.
- Data-source note can be closed and reopened from the attribution bar.
- Report-data link opens the GitHub data issue template.
- OSM/Viettrace attribution is visible.

## Releases

Releases are versioned from `package.json`.

| Artifact | Convention |
|---|---|
| Version source | `package.json#version` |
| Git tag | `v${version}` |
| Release commit | `chore(release): v${version}` |
| Changelog | `CHANGELOG.md` generated from Conventional Commits |
| GitHub Release | Created by the manual `Release` workflow |

Use GitHub Actions -> `Release`. For the first release, enter an exact `version` such as `0.1.0` to publish the current package version. For later releases, leave `version` empty and choose `major`, `minor`, `patch`, or prerelease increment. The workflow runs lint/build before creating the version commit, tag, changelog entry, and GitHub Release.

## Documentation

| Topic | Document |
|---|---|
| Current project status | `../viettrace-plans/status.md` |
| Frontend architecture | `../viettrace-plans/01-architecture/frontend-map.md` |
| Tile server architecture | `../viettrace-plans/01-architecture/tile-server.md` |
| Local development runbook | `../viettrace-plans/03-runbooks/local-development.md` |
| Frontend deploy runbook | `../viettrace-plans/03-runbooks/frontend-deploy.md` |
| Data notes | `../viettrace-plans/04-data/` |
| Agent instructions | `AGENTS.md` |

## Contributing

We welcome issues, suggestions, translations, and pull requests.

Important rules:

- Use short-lived branches such as `feat/province-search`, `fix/mobile-toggle-overlap`, or `docs/update-vercel-guide`.
- Use Conventional Commits, for example `feat(map): add province search`.
- Open PRs into `main`; `main` is the production branch and deploys to Vercel.
- Keep tile URLs environment-driven.
- Preserve MapLibre source-layer names unless tile server config changes too.
- Keep copy in both `src/locales/en.json` and `src/locales/vi.json`.
- Keep OSM attribution visible.
- Run `pnpm lint` before submitting meaningful changes.
- Check the Vercel preview for UI/map behavior changes when available.

See `CONTRIBUTING.md` for general contribution guidance.

## License

MIT © viettrace.org
