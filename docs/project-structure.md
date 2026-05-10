# Project Structure

This document is a concise map of the frontend codebase. The source of truth for larger architectural direction is `../viettrace-plans/01-architecture/frontend-map.md`.

## Top-Level Areas

```txt
viettrace-map-web/
├── src/
│   ├── app/                  # Next.js App Router routes and route-level errors
│   ├── components/           # Small presentational/shared React components
│   ├── features/             # Feature-owned map/product logic
│   ├── libs/                 # Internal libraries and framework integrations
│   ├── locales/              # `vi` and `en` message files
│   └── styles/               # Tailwind v4 entry and global CSS
├── public/data/              # Static/generated data contracts
├── scripts/                  # Reproducible data verification/generation scripts
└── docs/                     # Frontend-specific docs
```

## App Layer

`src/app/` should stay thin. Routes choose layout, metadata, locale validation, and which feature entrypoint to render. Browser APIs, MapLibre, and interactive state stay outside server route components.

Current public routes:

```txt
src/app/[locale]/
├── page.tsx
├── data-sources/page.tsx
└── map/
    ├── page.tsx
    └── error.tsx
```

## Feature Layer

Feature folders own product behavior and can compose small components from `src/components/`.

```txt
src/features/
├── map-shell/
│   ├── MapShell.tsx          # Top-level map composition and controls
│   └── useMapLibre.ts        # MapLibre instance lifecycle
├── map-state/
│   ├── mapViewReducer.ts     # Shared map view reducer
│   ├── mapViewTypes.ts
│   └── urlState.ts           # Query-param parse/serialize helpers
├── boundaries/
    ├── boundaryLayerRegistry.ts
    ├── BoundaryLayers.tsx
    └── ProvinceBoundaryInteractions.tsx
├── province-index/           # Static province index types/search/load helpers
├── province-search/          # Search input and result list
└── province-detail/          # Shared selected-province detail panel
```

New map capabilities should usually start as a feature folder, for example `compare-tools/`, `admin-search/`, or `place-search/`.

## Library Layer

`src/libs/` contains internal libraries and framework integrations that do not own product UI.

```txt
src/libs/
├── config/publicEnv.ts       # Public env validation
├── geo/                      # Slug/search normalization helpers
├── i18n/                     # next-intl routing/request integration
└── maplibre/                 # Camera/source/layer/visibility/tile URL helpers
```

Code here should be easy to unit test and should not depend on React unless there is a clear reason.

## Data Contracts

Static/generated frontend data lives in `public/data/`:

```txt
public/data/
├── merger-info.json
├── province-index.json
├── province-labels-pre.json
├── province-labels-post.json
└── offshore-island-labels.json
```

`province-index.json` is generated from display-safe pre/post GeoJSON plus merger metadata. Search, detail, and URL restore read generated JSON, not rendered vector tiles.

Province label JSON is generated from display-safe province GeoJSON. The generator prefers OSM `label_node` / `admin_centre` metadata before falling back to polylabel, Latinizes `name_en` for English labels, appends `City` for `Thành phố` entries, marks Hà Nội with `is_capital`, and `scripts/province-label-overrides.json` records known placement exceptions.

## Verification

Use these checks for architecture and map utility changes:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:unit
pnpm knip
```

Run `pnpm build` for route/config/deploy changes. On Windows with pnpm, build may require clearing `.next`, stopping a running dev server, Docker/Linux, or Developer Mode because `.next/trace` and standalone symlinks can be locked.
