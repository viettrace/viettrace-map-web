# viettrace-map-web

Interactive web map for Viettrace, built with Next.js and MapLibre GL.

Viettrace compares Vietnam province/city administrative boundaries before and after the July 2025 merger from 63 provinces to 34 provinces. This frontend renders the map UI, before/after toggle, province popups, labels, attribution, SEO metadata, and production Docker build.

## Current Status

The frontend MVP is complete.

| Area | Status |
|---|---|
| MapLibre map | Complete |
| 63/34 province toggle | Complete |
| Province popup | Complete |
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
NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Production tile URL bases:

```env
NEXT_PUBLIC_TILE_URL_PRE=https://tiles.viettrace.org/tiles/vn_provinces_pre_2025
NEXT_PUBLIC_TILE_URL_POST=https://tiles.viettrace.org/tiles/vn_provinces_post_2025
```

Do not hardcode tile URLs in source code. Public map config must come from `NEXT_PUBLIC_*` env vars.

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
| `pnpm build` | Build production app with standalone output |
| `pnpm start` | Start production Next.js server |
| `pnpm knip` | Run dead-code detection |

## Project Structure

```txt
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── map/
│   │       ├── page.tsx
│   │       └── error.tsx
│   ├── global-error.tsx
│   └── opengraph-image.tsx
├── components/Map/
│   ├── Map.tsx
│   ├── ProvinceLayer.tsx
│   ├── MapToggle.tsx
│   ├── ProvincePopup.tsx
│   └── MapAttribution.tsx
├── libs/i18n/
├── locales/
└── styles/

public/data/
├── merger-info.json
├── province-labels-pre.json
└── province-labels-post.json
```

## Map Data

Vector tiles are served by Martin from PostGIS through `https://tiles.viettrace.org` in production or `http://localhost:8080` locally.

| Mode | Tile source-layer | URL env var |
|---|---|---|
| Pre-2025, 63 provinces | `vn_provinces_pre_2025` | `NEXT_PUBLIC_TILE_URL_PRE` |
| Post-2025, 34 provinces | `vn_provinces_post_2025` | `NEXT_PUBLIC_TILE_URL_POST` |

Static frontend metadata lives in `public/data/`:

- `merger-info.json`: old province to new province mappings.
- `province-labels-pre.json`: label points for pre-2025 provinces.
- `province-labels-post.json`: label points for post-2025 provinces.

OSM attribution is required: `© OpenStreetMap contributors`.

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
NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
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
  -e NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json \
  viettrace-map-web:local
```

Self-host deployment config is maintained in `../viettrace-infra/compose.prod.yml` and documented in `../viettrace-plans/03-runbooks/frontend-deploy.md`.

## Verification

Before finishing meaningful frontend changes:

```bash
pnpm lint
```

Run build for route/config/deployment changes:

```bash
pnpm build
```

On Windows with pnpm, `next build` standalone output may fail during symlink creation under `.next/standalone` unless symlink support is enabled. If that happens, verify through Docker/Linux or an elevated/Developer Mode shell.

For map behavior changes, manually verify:

- `/vi/map` loads.
- Pre-2025 layer is visible by default.
- Toggle switches to post-2025 layer.
- Province popup appears on click.
- OSM/Viettrace attribution is visible.

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
