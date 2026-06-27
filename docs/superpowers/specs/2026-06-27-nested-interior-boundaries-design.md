# Design: Nested boundaries — draw interior divisions only ("don't double-draw")

- **Date:** 2026-06-27
- **Repos:** `viettrace-data` (data-prep + tile build) + `viettrace-map-web` (rendering)
- **Status:** approved (design); ready for implementation plan
- **Origin:** Follow-up to the boundary z14 rebuild. At a province border the **province** (admin_level 4) line and the **nested** (district pre / ward post, admin_level 6) line visibly diverge, worse on overzoom.

## Problem (diagnosed)

Along a shared border the province and nested **source geometries are identical** — verified on the Bắc Giang–Lạng Sơn border: **100% of province border vertices coord-match a nested vertex (0.0 m)**. So it is *not* a data/topology conflict. The divergence is a **tiling artifact**: the province PMTiles and the nested PMTiles are produced by **separate tippecanoe runs** with `--simplification=10`, which applies Douglas-Peucker per layer even at maxzoom. The same border is an edge of a huge province polygon in one tileset and of a small district polygon in the other, so each run keeps a slightly different vertex subset → two lines that diverge, magnified by overzoom above z14.

## Goal

At a province border, draw **one** line (the province line). The nested layer draws **only interior** (intra-province) divisions. Result: no possible divergence at any zoom; inside a province the district/ward divisions still show.

## Approach (chosen: A2)

Erase, at data-prep, the nested boundary segments that coincide exactly with a province border, producing an **interior-only LineString** geometry. The nested **outline** renders from that geometry; the nested **polygon** is kept unchanged for the fill, labels, and click interaction. The interior lines ship as a **second source-layer inside the existing nested PMTiles** (one file, no new env var) — *A2*. (Rejected A1: a separate interior PMTiles + new env var — more plumbing for no benefit.)

Exact-match erasure is safe because the diagnosis proved shared vertices are identical (no fuzzy tolerance). Coastal edges (shared with the province's clipped coast edge) are erased too — a free bonus that also removes the coastal double-line on the nested layer.

## 1. Data-prep — `viettrace-data/scripts/build-nested-interior-boundaries.mjs` (new)

Inputs (from `.data/processed/land-clip/`):
- Provinces: `vn_pre_2025_display_land.geojson` (level 4), `vn_post_2025_display_land.geojson`.
- Nested: `vn_pre_2025_districts_candidate_land.geojson` (level 6), `vn_post_2025_wards_candidate_land.geojson`.

For each pair {nested, matching-era provinces}:
1. **Province edge set** — for every province ring, every consecutive vertex pair → an **undirected** key `min(a,b)|max(a,b)` where each endpoint is `lng.toFixed(6),lat.toFixed(6)`. Collect into a `Set`.
2. **Walk nested rings** — for each nested polygon ring, for each consecutive vertex pair, **drop** the edge if its key is in the province set, else **keep** it.
3. **Dedup kept edges** by undirected key (an interior border shared by two adjacent units is emitted once).
4. Emit a `FeatureCollection` of 2-point `LineString`s (one per kept edge). *(Optional later optimization: line-merge contiguous segments into longer LineStrings — not required for correctness.)*

Outputs (to `.data/processed/land-clip/`, so the tile build below can mount the same dir as `/data`):
- `vn_pre_2025_districts_candidate_interior.geojson`
- `vn_post_2025_wards_candidate_interior.geojson`

Add a `package.json` script (e.g. `data:build-nested-interior`) and a manifest entry recording inputs + counts + hashes, per the existing data-traceability convention.

**Verification inside the script:** assert that **0** emitted segments match any province edge (sanity), and log kept/dropped counts.

## 2. Tile build (runbook `viettrace-plans/03-runbooks/pmtiles-r2-setup.md`)

Rebuild each nested PMTiles with **two layers in one tippecanoe run** (`-L` per layer), keeping the polygon layer identical (z4–14) and adding the interior-lines layer:

```bash
tippecanoe -o /output/vn_districts_pre_2025_candidate.pmtiles \
  --minimum-zoom=4 --maximum-zoom=14 --no-feature-limit --no-tile-size-limit \
  --detect-shared-borders --simplification=10 --force \
  -L'{"file":"/data/vn_pre_2025_districts_candidate_land.geojson","layer":"vn_districts_pre_2025_candidate"}' \
  -L'{"file":"/data/vn_pre_2025_districts_candidate_interior.geojson","layer":"vn_districts_pre_2025_candidate_interior"}'
```

(and the analogous `vn_wards_post_2025_candidate.pmtiles` with `…_interior`). Same object key/URL on R2 → re-upload in place; the user purges Cloudflare (or bumps `?v=`). Update the runbook's build commands + file table (the nested files gain a second layer; size grows modestly).

## 3. Frontend (`viettrace-map-web/src/features/boundaries/boundaryLayerRegistry.ts`)

- Add source-layer name constants `preDistrictsCandidateInterior = 'vn_districts_pre_2025_candidate_interior'` and `postWardsCandidateInterior = 'vn_wards_post_2025_candidate_interior'` to `boundarySourceLayers`.
- The **outline** `line` layers (`preDistrictsCandidateOutline`, `postWardsCandidateOutline`) change only their `'source-layer'` to the interior constant. `source` (same PMTiles), paint, zoom ramps, `minzoom`, and `visibility` are unchanged.
- **Fill** layers, **label** layers, and the click/`queryRenderedFeatures` interaction stay on the polygon source-layer — unchanged.
- The `EXCLUDE_ARCHIPELAGO_FILTER` on the outline can stay (harmless — interior lines carry no archipelago) or be dropped from the outline layer; keeping it is fine.

No env-var changes (A2 = same PMTiles URL). No `BoundaryLayers.tsx` logic change beyond what the registry drives.

## Scope

- **In:** pre districts (vs pre provinces) + post wards (vs post provinces).
- The province layer is always rendered when boundaries are on → it supplies the outer boundary; nested-interior + province-outer = a complete picture.
- **Out:** offshore/coastline alignment vs the basemap (separate, accepted issue); any change to province tiles; line-merge optimization (optional, deferred).

## Non-goals

- No topological re-derivation of the hierarchy (sources are already consistent).
- No change to province PMTiles, labels, fills, interaction, or env vars.

## Testing / verification

- Script self-check: 0 interior segments coincide with a province edge; sane kept/dropped counts.
- `pnpm lint`, `pnpm test:unit`, `pnpm knip` in `viettrace-map-web`.
- Manual `/vi/map` + `/en/map`: at the Bắc Giang–Lạng Sơn border only the province line shows at all zooms including z17+; interior district/ward divisions still render; fill + click-select still work; both pre and post modes.
- Production: re-upload nested PMTiles, purge cache, re-check header (`maxzoom=14`, both source-layers present) + visual.
