# Implementation plan: Nested interior-only boundaries ("don't double-draw")

- **Spec:** `../specs/2026-06-27-nested-interior-boundaries-design.md`
- **Repos / branches:**
  - `viettrace-data` — data-prep script + tile build (suggest branch `feat/nested-interior-boundaries`).
  - `viettrace-map-web` — frontend source-layer switch (suggest `feat/nested-interior-boundaries`, PR per repo convention).
- **Commits/PR:** authored by the user. The assistant builds/verifies/uploads; the user commits + purges Cloudflare.

Work in order. Steps 1–3 produce + tile the data; step 4 is the frontend; step 5 verifies; step 6 ships.

---

## Step 1 — Data-prep script (`viettrace-data/scripts/build-nested-interior-boundaries.mjs`, new)

Pure Node (mirror the style of existing `build-*.mjs` scripts). For each era pair, read the land-clipped geojsons from `.data/processed/land-clip/`:

| Era | Provinces (level 4) | Nested (level 6) | Output |
|---|---|---|---|
| pre | `vn_pre_2025_display_land.geojson` | `vn_pre_2025_districts_candidate_land.geojson` | `vn_pre_2025_districts_candidate_interior.geojson` |
| post | `vn_post_2025_display_land.geojson` | `vn_post_2025_wards_candidate_land.geojson` | `vn_post_2025_wards_candidate_interior.geojson` |

Algorithm (per era):
```
ptKey(c)  = c[0].toFixed(6) + ',' + c[1].toFixed(6)
edgeKey(a,b) = [ptKey(a), ptKey(b)].sort().join('|')   // undirected

provinceEdges = Set()
for each province feature, each polygon, each ring:
  for i in 0..ring.length-2: provinceEdges.add(edgeKey(ring[i], ring[i+1]))

kept = Map()   // edgeKey -> [a,b]  (dedup interior borders)
for each nested feature, each polygon, each ring:
  for i in 0..ring.length-2:
    k = edgeKey(ring[i], ring[i+1])
    if (!provinceEdges.has(k) && !kept.has(k)) kept.set(k, [ring[i], ring[i+1]])

features = [...kept.values()].map(([a,b]) => LineString([a,b]))
write FeatureCollection(features) to the output path
```
- Iterate `MultiPolygon` (and `Polygon`) coordinates; include interior rings (holes) too.
- **Self-check (fail the script if violated):** re-scan emitted segments, assert **0** have a key in `provinceEdges`. Log: province-edge count, nested-edge count, dropped (shared) count, kept (interior, deduped) count.
- Keep 2-point LineStrings (no line-merge — deferred optional optimization noted in the spec).

**`viettrace-data/package.json`:** add `"data:build-nested-interior": "node scripts/build-nested-interior-boundaries.mjs"`.

**Manifest:** write `manifests/nested-interior-boundaries-2026-06-27.json` recording input paths + sha + feature/edge counts, per the data-traceability convention. Update `viettrace-data/scripts/README.md` (+ `README.md` datasets) with the new script + outputs.

**Verify:** `pnpm data:build-nested-interior` runs clean; self-check passes; the two `*_interior.geojson` exist in `land-clip/`.

---

## Step 2 — (covered by Step 1 run) Generate the interior geojsons

Run `pnpm data:build-nested-interior` from `viettrace-data/`. Eyeball the counts (interior kept should be ≫ 0 and dropped/shared should be a large fraction — the outer perimeters). Optionally open one output in geojson.io to confirm it's interior divisions only (no outer province ring).

---

## Step 3 — Build two-layer nested PMTiles (A2)

Rebuild each nested PMTiles with the polygon layer **and** the interior-lines layer in one tippecanoe run (Docker; Git Bash needs the path-mangling guard). Output to `.data/tiles-z14/` (overwrites the current z14 nested files, which are polygon-only):

```bash
VT="<path>/viettrace-data"
MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker run --rm \
  -v "$VT/.data/processed/land-clip:/data" -v "$VT/.data/tiles-z14:/output" \
  indigoag/tippecanoe tippecanoe -o /output/vn_districts_pre_2025_candidate.pmtiles \
  --minimum-zoom=4 --maximum-zoom=14 --no-feature-limit --no-tile-size-limit \
  --detect-shared-borders --simplification=10 --force \
  -L'{"file":"/data/vn_pre_2025_districts_candidate_land.geojson","layer":"vn_districts_pre_2025_candidate"}' \
  -L'{"file":"/data/vn_pre_2025_districts_candidate_interior.geojson","layer":"vn_districts_pre_2025_candidate_interior"}'
```
(and the analogous `vn_wards_post_2025_candidate.pmtiles` with `vn_post_2025_wards_candidate_land.geojson` + `…_interior.geojson`, layers `vn_wards_post_2025_candidate` + `vn_wards_post_2025_candidate_interior`.)

**Verify:** both PMTiles report `maxzoom=14` and their **metadata `vector_layers` lists both layer names** (polygon + `…_interior`). Check via the PMTiles metadata (e.g. `pmtiles` CLI `show`, or read the JSON metadata section). Note new file sizes (polygon stays ~same; interior adds a few MB).

---

## Step 4 — Frontend: outline reads the interior layer (`viettrace-map-web`)

**`src/features/boundaries/boundaryLayerRegistry.ts`**
- In `boundarySourceLayers`, add:
  - `preDistrictsCandidateInterior: 'vn_districts_pre_2025_candidate_interior'`
  - `postWardsCandidateInterior: 'vn_wards_post_2025_candidate_interior'`
- On the **outline** `line` layers only, switch `'source-layer'`:
  - `preDistrictsCandidateOutline` (≈ L998–999): `boundarySourceLayers.preDistrictsCandidate` → `…Interior`.
  - `postWardsCandidateOutline` (≈ L1069–1070): `boundarySourceLayers.postWardsCandidate` → `…Interior`.
  - Keep `source` (same PMTiles), `paint`, zoom ramps, `minzoom`, `visibility` unchanged.
- **Do NOT change** the fill layers, label layers, or the `source-layer` on anything used by click/`queryRenderedFeatures` — those stay on the polygon layer.
- `EXCLUDE_ARCHIPELAGO_FILTER` on the outline: leave as-is (harmless on interior lines).

No env-var, `BoundaryLayers.tsx`, or `publicEnv.ts` change (same source URL; A2).

**Verify:** `pnpm lint`, `pnpm test:unit`, `pnpm knip` (watch for the new source-layer constants being flagged unused — they must be referenced by the outline layers).

---

## Step 5 — Local visual verification (before touching production)

Serve the freshly built nested PMTiles locally and point the app at them:
- Run the local PMTiles server (`viettrace-data/.data/planetiler/serve-pmtiles.mjs` on `:8600`), copy/serve the new `.data/tiles-z14/vn_{districts_pre,wards_post}_*candidate.pmtiles`.
- In `viettrace-map-web/.env.local`, point `NEXT_PUBLIC_PMTILES_URL_PRE_DISTRICTS_CANDIDATE` / `…_POST_WARDS_CANDIDATE` at `http://localhost:8600/…`, enable QA/nested candidate layers, `pnpm dev`.
- Check `/vi/map` + `/en/map`, pre and post:
  - At the Bắc Giang–Lạng Sơn border: **one** line (province) at all zooms incl. z17+ — no thin nested line hugging it.
  - Inside a province: district/ward divisions still render.
  - Fill + click-to-select still work; labels unchanged.

---

## Step 6 — Ship to production

- Upload the two rebuilt nested PMTiles to R2 (`wrangler r2 object put viettrace-tiles/nested/…`, `--remote`) — same object keys (in-place).
- **Cache:** purge the two nested URLs in Cloudflare (or bump `?v=`), then re-check: header `maxzoom=14`, metadata lists both layers, `Cf-Cache-Status: MISS` on first fetch.
- Merge the frontend branch (PR) so the outline reads the interior source-layer in production.

> Note: production needs **both** the new PMTiles (with the interior layer) **and** the frontend change live. If the frontend ships before the tiles, the outline layer references a missing source-layer → outline disappears until the tiles are uploaded. Sequence: upload tiles + purge **first**, then merge/deploy the frontend (or do them close together).

---

## Step 7 — Docs

- `viettrace-plans/03-runbooks/pmtiles-r2-setup.md`: update the nested build commands to the two-layer (`-L`) form; note the `…_interior` layers + the `build-nested-interior` prerequisite; bump file sizes.
- `viettrace-plans/status.md`: note the nested interior-only outline fix under the boundary-alignment entry.
- `viettrace-data/scripts/README.md` + `README.md`: document the new script + `*_interior.geojson` outputs + manifest.

## Notes / risks

- **Exact-match dependency:** the erase relies on nested edges sharing province vertices exactly (diagnosis: 100% on BG–LS). If some borders don't match (e.g. a province ring densified differently somewhere), those segments won't be dropped → a residual hugging line there. Mitigation if seen: log unmatched-but-near segments in the script (a vertex within ε of a province vertex but no exact edge key) to spot them; only add a tolerance/snap pass if the visual check reveals leftovers.
- **Deploy ordering** (Step 6 note) — tiles before frontend.
- **Interior line count** (wards) is large; 2-point segments tile fine but if size/perf is a concern, add the optional line-merge pass in Step 1.
- Keep the polygon-only z14 nested PMTiles backup (current `.data/tiles-z14/*` before this rebuild, or rebuildable from Step 3 of the z14 runbook) for rollback.
