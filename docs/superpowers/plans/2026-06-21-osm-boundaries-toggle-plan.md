# Implementation plan: "OSM boundaries" toggle

- **Spec:** `../specs/2026-06-21-osm-boundaries-toggle-design.md`
- **Branch:** `feat/toggle-osm-boundaries` (already checked out)
- **Repo:** viettrace-map-web

Work the steps in order. Each step lists the files, the change, and how to verify. Run `pnpm lint` + `pnpm test:unit` after the code steps; full manual check at the end.

---

## Step 1 — State: add `layers.boundaries` + action

**`src/features/map-state/mapViewTypes.ts`**
- In `MapViewState.layers`, add `boundaries: boolean;`.
- Add to the `MapViewAction` union: `| { type: 'setBoundariesVisible'; visible: boolean }`.

**`src/features/map-state/mapViewReducer.ts`**
- `initialMapViewState.layers`: add `boundaries: true`.
- Add a reducer case (mirror `setOffshoreIslandsVisible`):
  ```ts
  case 'setBoundariesVisible':
    return { ...state, layers: { ...state.layers, boundaries: action.visible } };
  ```

**Verify:** `tsc`/lint clean. (Optional) add a reducer unit test asserting the case flips the flag.

---

## Step 2 — URL persistence (`?boundaries=off`)

**`src/features/map-state/urlState.ts`**
- Add `const BOUNDARIES_PARAM = 'boundaries';`.
- Add `boundaries: boolean | null;` to `ParsedMapUrlState`.
- In `readMapUrlState`: `boundaries: searchParams.get(BOUNDARIES_PARAM) === 'off' ? false : null` (only `off` is meaningful; absence = default ON = `null`).
- In `writeMapUrlState`: after the compare block, write the param only when OFF and not swiping:
  ```ts
  if (state.layers.boundaries === false && state.compareMode !== 'swipe') {
    nextSearchParams.set(BOUNDARIES_PARAM, 'off');
  } else {
    nextSearchParams.delete(BOUNDARIES_PARAM);
  }
  ```

**`src/features/map-shell/MapShell.tsx`**
- In the mount effect that restores compare/divider from the URL (`readMapUrlState(...)`), also: `if (parsed.boundaries === false) dispatch({ type: 'setBoundariesVisible', visible: false });`.

**Verify:** unit test in `urlState.test.ts` — round-trip: `boundaries=false` → `?boundaries=off`; `true`/default → param absent; swipe never writes it. Manual: open `?boundaries=off` → loads with boundaries off.

---

## Step 3 — Registry: gate overlay visibility + add basemap-label constants

**`src/features/boundaries/boundaryLayerRegistry.ts`**
- Gate the province + nested + region overlay on `state.layers.boundaries` (islands stay ungated):
  - Group predicates (~L196/208/233/243): change `state.mode === 'pre'` → `state.mode === 'pre' && state.layers.boundaries` (and the `post` one); the nested ones already AND `nestedCandidates`, also AND `state.layers.boundaries`. **Do NOT touch** the offshore-islands group predicate.
  - Layer-creation visibility (~L490): `const preVisible = state.mode === 'pre' && state.layers.boundaries;` and `postVisible = state.mode === 'post' && state.layers.boundaries;`. (Region-color labels live in `BoundaryLayers`/`ensureRegionLabels` — handle their hide in Step 4 since they're added imperatively.)
- Re-introduce the basemap settlement-label list + a filter helper (exported):
  ```ts
  // Self-built OMT basemap settlement-label layers carrying the OUTSIDE_VN spatial filter
  // (['all', <class>, ['!', ['within', VN_OUTLINE]]]). When the boundary overlay is OFF we drop
  // the OUTSIDE_VN clause so VN labels show too.
  export const BASEMAP_SETTLEMENT_LABEL_LAYERS = [
    'place-city', 'place-town', 'place-village', 'place-state',
    'world-place-city', 'world-place-city-dot',
  ] as const;
  // place-commune is visibility:none in the style; shown only when boundaries are OFF.
  export const BASEMAP_COMMUNE_LAYER = 'place-commune';
  // Strip the trailing ['!', ['within', …]] element from an ['all', …] filter.
  export function dropWithinClause(filter: unknown): unknown { … }
  ```

**Verify:** existing `boundaryLayerRegistry.test.ts` still passes (the test env state has `layers.boundaries`; add it to the test fixture so predicates evaluate). Add a small test for `dropWithinClause`.

---

## Step 4 — BoundaryLayers: apply the toggle on the map

**`src/features/boundaries/BoundaryLayers.tsx`**
- **Overlay visibility:** the existing visibility-sync already keys off the group `isVisible` predicates (now boundaries-aware from Step 3), so province + nested hide automatically when `boundaries` is false. For **region-color labels** (added via `ensureRegionLabels`), hide them when `!state.layers.boundaries` (skip `ensureRegionLabels` / remove the region-labels layer when boundaries off).
- **Basemap label flip (new effect):** keyed on `[map, state.layers.boundaries]`, and re-applied on `map` `style.load` (locale switch resets the style):
  - On first run, cache each `BASEMAP_SETTLEMENT_LABEL_LAYERS` layer's original filter (the style default, with OUTSIDE_VN).
  - `boundaries === false` → for each layer present (`map.getLayer`): `setFilter(layer, dropWithinClause(originalFilter))`; `setLayoutProperty(BASEMAP_COMMUNE_LAYER, 'visibility', 'visible')`.
  - `boundaries === true` → restore: `setFilter(layer, originalFilter)`; `setLayoutProperty(BASEMAP_COMMUNE_LAYER, 'visibility', 'none')`.
  - Guard everything with `map.getLayer(...)` (no-op on CARTO/Protomaps fallback). Re-bind on `style.load` so the state survives a locale switch.

**Verify:** manual — toggle OFF hides provinces/nested + their labels + region labels, reveals basemap VN labels incl phường/xã, keeps Hoàng Sa/Trường Sa; ON restores; switch vi↔en while OFF → stays off; no flicker/camera change.

---

## Step 5 — UI control + wiring + i18n

**`src/components/Map/MapSettingsPanel.tsx`**
- Add props `boundariesVisible: boolean` + `onBoundariesChange: (visible: boolean) => void`.
- Add a `Section` titled `t('settingsSectionBoundaries')`, **rendered only when `!isSwipe`**, with an on/off control consistent with the panel (reuse `MapToggle` if it fits a generic on/off, else a 2-button group like the color-mode control). Wire to `onBoundariesChange`.

**`src/features/map-shell/MapShell.tsx`**
- Pass `boundariesVisible={state.layers.boundaries}` + `onBoundariesChange={visible => dispatch({ type: 'setBoundariesVisible', visible })}` to `MapSettingsPanel`.

**`src/locales/en.json` + `src/locales/vi.json`** (both, under `Map`)
- `settingsSectionBoundaries` ("OSM boundaries" / "Ranh giới OSM"), plus on/off labels if the chosen control needs them (e.g. `boundariesOn`/`boundariesOff` or reuse a generic show/hide).

**Verify:** drawer shows the toggle; flipping it drives the map (Step 4); toggle is absent in swipe compare.

---

## Step 6 — Verify + finish

- `pnpm lint` (must pass), `pnpm test:unit` (must pass), `pnpm knip` (no new unused exports).
- Manual `/vi/map` + `/en/map`: all behaviors above + share `?boundaries=off`.
- Commit per Conventional Commits (`feat(boundaries): add OSM-boundaries toggle …`) on `feat/toggle-osm-boundaries`; PR to `main`.

## Notes / risks

- The `dropWithinClause` helper assumes the settlement filter shape is `['all', <class…>, ['!', ['within', …]]]` (true for the current generator output). If the generator changes the filter shape, the helper must be revisited — keep it defensive (only strip when the trailing element is `['!', ['within', …]]`).
- Caching the original filter per layer (vs reading on every toggle) avoids depending on whether a previous OFF already stripped it; re-cache on `style.load`.
- Region color mode + boundaries OFF: region fill/labels hide (documented in spec); the color-mode control remains but is inert until boundaries return.
