# viettrace-map-web — Agent Instructions

> **Scope**: Next.js 15 frontend for Viettrace — interactive MapLibre map comparing Vietnam's 63 vs 34 provinces.
> **Location**: `D:\viettrace\viettrace-map-web`

---

## 🚀 Developer Commands

```bash
cd viettrace-map-web

pnpm install          # First time only
pnpm dev              # Dev server with Turbopack → http://localhost:3000
pnpm build            # Production build (output: standalone)
pnpm start            # Run production build
pnpm lint             # ESLint — ALWAYS run before committing
pnpm knip             # Dead code detection
```

---

## 🛠️ Agent skills — when to use which

Load skills with the `skill` tool **before** starting work that matches the task below. Prefer loading **all** skills that apply to a single change (e.g. a new client map control → `vercel-react-best-practices` + `tailwind-design-system`).

### Quick routing (what are you doing?)

| If your task involves… | Load this skill |
|---|---|
| `app/`, `layout.tsx`, `page.tsx`, route segments, `metadata`, `generateStaticParams`, middleware, **next-intl** routing | `next-best-practices` |
| Server vs client components, **fetching** in RSC, loading/error boundaries, route handlers | `next-best-practices` |
| **React** components/hooks, `useEffect`, `useState`, state, event handlers, **MapLibre + React** integration | `vercel-react-best-practices` |
| Re-renders, `useMemo`/`useCallback`, lists, **performance** of the map UI | `vercel-react-best-practices` |
| **Tailwind**, `@theme`, responsive layout, spacing/typography tokens, **globals.css** | `tailwind-design-system` |
| Building or refactoring **reusable UI** (buttons, overlays, toggles) with consistent tokens | `tailwind-design-system` |
| **Complex TypeScript** only (generics, conditional/mapped types, strict props for helpers) | `typescript-advanced-types` |
| **New screens / hero / marketing look** — avoid “generic AI” UI, strong visual identity | `frontend-design` |
| **UX review**, palettes, a11y checks, product-style patterns (dashboard, map chrome) | `ui-ux-pro-max` |
| User asks *“is there a skill for…?”*, *“how do I install…?”* | `find-skills` |

### Core skills (default for this repo)

These four cover most day-to-day work on Viettrace Map Web:

```json
{"name": "next-best-practices"}
```
**When**: App Router, file conventions, RSC boundaries, data fetching, async patterns, metadata, route handlers, **next-intl** setup, middleware, layouts/pages under `src/app/`.

```json
{"name": "vercel-react-best-practices"}
```
**When**: Any `'use client'` code, React hooks, component structure, effects, event listeners (including MapLibre `map.on`), bundle/render performance, avoiding unnecessary re-renders.

```json
{"name": "tailwind-design-system"}
```
**When**: Styling, Tailwind v4 CSS-first config, responsive behavior, overlay/toolbar/popup layout, design tokens in `globals.css`.

```json
{"name": "typescript-advanced-types"}
```
**When**: Non-trivial types (generic hooks, typed GeoJSON/feature props, shared utilities), **not** for every small prop interface.

### Optional skills (use when the task fits)

```json
{"name": "frontend-design"}
```
**When**: Distinctive UI polish, landing sections, or components where visual quality and non-template aesthetics matter.

```json
{"name": "ui-ux-pro-max"}
```
**When**: Broader UX guidance (accessibility, motion, layout patterns), color/typography systems, or reviewing/improving interaction design.

```json
{"name": "find-skills"}
```
**When**: Discovering or installing skills, or answering “which skill should I use?” from a capability angle.

### Combining skills (examples)

- **New map overlay / toggle / popup**: `vercel-react-best-practices` + `tailwind-design-system`; add `frontend-design` if the UI should feel bespoke.
- **New route or i18n change**: `next-best-practices` first; add `tailwind-design-system` if layout/strings affect UI structure.
- **Typed helpers for tile features or merger data**: `typescript-advanced-types` if the types are genuinely complex; otherwise rely on normal TS in-repo.

---


## 📂 Key Files & Entrypoints

| File | Purpose |
|---|---|
| `src/app/[locale]/layout.tsx` | Root layout — fonts (Geist), next-intl provider, metadata |
| `src/app/[locale]/page.tsx` | Landing page (currently default Next.js template — needs redirect to `/map`) |
| `src/app/[locale]/map/page.tsx` | Map page — renders `<Map />` component |
| `src/components/Map/Map.tsx` | **Main map component** — MapLibre GL initialization |
| `src/libs/i18n/routing.ts` | Locale config: `locales: ['en', 'de']` ⚠️ needs changing to `['en', 'vi']` |
| `src/libs/i18n/request.ts` | Message loading per locale |
| `src/styles/globals.css` | Tailwind CSS 4 entry + theme variables |
| `public/data/merger-info.json` | 29 province merger mappings (old → new) — **needs creation** |

---

## 🎨 Frontend Conventions

### Locales (next-intl)

- **Target locales**: `en`, `vi` (currently `['en', 'de']` — must fix)
- **Default**: `en`
- Files: `src/locales/en.json`, `src/locales/vi.json`
- Routing: `[locale]` dynamic segment with `next-intl/middleware`

### Path Aliases

```json
"@src/*" → "src/*"
"@public/*" → "public/*"
```

### CSS (Tailwind CSS 4)

- Entry: `@import "tailwindcss"` in `src/styles/globals.css`
- PostCSS plugin: `@tailwindcss/postcss`
- Theme variables in `@theme inline` block
- Fonts: Geist Sans (`--font-geist-sans`) + Geist Mono (`--font-geist-mono`)
- **No Tailwind config file** — v4 uses CSS-based configuration

### MapLibre GL

- Version: 5.6.1
- Import CSS: `import 'maplibre-gl/dist/maplibre-gl.css'`
- Basemap style: Carto Positron (`https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`)
- Map center: `[105.8, 21.0]`, zoom: 5
- **Component must be `'use client'`**

---

## 🔧 Env Variables

Create `.env.local` (gitignored):

```env
# Local dev
NEXT_PUBLIC_TILE_URL_PRE=http://localhost:8080/tiles/vn_provinces_pre_2025
NEXT_PUBLIC_TILE_URL_POST=http://localhost:8080/tiles/vn_provinces_post_2025
NEXT_PUBLIC_MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json

# Production (uncomment when deploying)
# NEXT_PUBLIC_TILE_URL_PRE=https://tiles.viettrace.org/tiles/vn_provinces_pre_2025
# NEXT_PUBLIC_TILE_URL_POST=https://tiles.viettrace.org/tiles/vn_provinces_post_2025
```

> **Never hardcode URLs in source code.** Always read from `process.env.NEXT_PUBLIC_*`.

---

## 🧩 Component Patterns

### Map Architecture (Proposed for M2)

```
MapPage (/vi/map)
├── MapContainer (100vh / 100dvh)
│   ├── useMap hook — MapLibre instance init + cleanup
│   ├── ProvinceLayer — 2 vector sources + fill/outline layers
│   ├── MapToggle — slider switch overlay (top-right)
│   └── ProvincePopup — click handler + tooltip
└── MapAttribution — bottom bar (OSM + Viettrace)
```

### Color Scheme

| Mode | Fill | Outline |
|---|---|---|
| 63 tỉnh (pre-2025) | `#d44` opacity 0.1 | `#d44` width 1.5 |
| 34 tỉnh (post-2025) | `#3388ff` opacity 0.1 | `#3388ff` width 1.5 |

---

## ⚠️ Critical Rules

1. **Always use `'use client'`** for MapLibre components (needs DOM access).
2. **Never hardcode tile URLs** — use `process.env.NEXT_PUBLIC_TILE_URL_*`.
3. **Source-layer names in MapLibre**: `vn_provinces_pre_2025` and `vn_provinces_post_2025`.
4. **Run `pnpm lint` before every commit**.
5. **`.env.local` is gitignored** — never commit secrets.
6. **Map container**: `100vh` desktop, `100dvh` mobile (handles mobile browser chrome).
7. **Attribution required**: `© OpenStreetMap contributors` (ODbL compliance) + `© Viettrace`.

---

## 📋 M2 Checklist (In Progress)

- [ ] Fix `routing.ts` locales: `['en', 'vi']`
- [ ] Create `.env.local`
- [ ] Create `public/data/merger-info.json` (29 mappings)
- [ ] Create `src/locales/vi.json`
- [ ] Update `src/locales/en.json` with map-specific keys
- [ ] Redirect `/` → `/vi/map` in `page.tsx`
- [ ] Refactor `Map.tsx` → `useMap()` hook + subcomponents
- [ ] Add toggle UI (slider switch)
- [ ] Add popup on click
- [ ] Responsive + mobile UX
- [ ] SEO meta tags

---

## 🔗 Related Docs

- Parent project instructions: `../AGENTS.md`
- MVP plan: `../viettrace-plans/mvp-plan.md`
- M1 implementation: `../viettrace-plans/milestone-1-implementation.md`
- Tile server setup: `../viettrace-plans/tile-server-setup.md`
