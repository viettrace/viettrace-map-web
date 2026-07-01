# Design: "OSM boundaries" toggle

- **Date:** 2026-06-21
- **Repo:** viettrace-map-web
- **Status:** **shipped to production 2026-07-01.** One scope decision (offshore visibility when OFF) was revised in a later follow-up — see the "Update (2026-07-01)" note below.
- **Origin:** deferred follow-up from Track A-SB (self-built basemap). See `../../../../viettrace-plans/02-milestones/immediate-post-mvp/track-a-sb-self-built-basemap/plan.md` → "Deferred follow-ups".

## Goal

Let the user turn the OSM boundary overlay **off** to see a clean basemap with its full Vietnamese labels, and **on** (default) to get the curated admin boundaries. Today the boundary overlay is always on, and the basemap's VN settlement labels are permanently hidden (via the `OUTSIDE_VN` spatial filter baked into the style) so the overlay owns VN admin labels. This feature makes that coupling user-controllable.

## Scope decisions (confirmed with user)

1. **Coupling — when boundaries are OFF:** hide the whole admin overlay (provinces pre/post + nested districts/wards + their labels + region color labels) **EXCEPT the Hoàng Sa / Trường Sa offshore islands**, which stay visible (sovereignty marker persists; the basemap also still renders the islands as land with VN names). _(⚠ Revised 2026-07-01 — see Update note below: OFF now also hides the offshore **boundary visuals**; only the archipelago **label** stays.)_ Simultaneously, reveal the basemap's full VN labels.
2. **Persistence:** the toggle state is **shareable via the URL** (`?boundaries=off`; the default ON omits the param).
3. **Default:** ON — current behavior unchanged.

> **Update (2026-07-01, shipped).** Two changes to the decisions above landed after the initial ship:
>
> - **Offshore visibility (revises decision 1).** When boundaries are OFF, the Hoàng Sa/Trường Sa
>   **boundary visuals (fill + outline) now hide too** — only the archipelago **label** stays as the
>   sovereignty marker. The offshore group was split into `offshore-islands` (fill/outline, gated on
>   `state.layers.boundaries`) and `offshore-islands-label` (label, ungated). So "Always keep" in the
>   Mechanism section below now applies to the **label only**, not the fill/reef/outline.
> - **Labels (unrelated to the toggle, same session).** All overlay-label opacity fades were removed
>   (hard show/hide at `minzoom`), a `symbol-sort-key` priority was added (capital < city < province <
>   district < ward) with city/capital labels reserving collision space so children don't cover parents,
>   and the offshore label `minzoom` dropped 5.25 → 3.5.

## Mechanism (chosen)

**Runtime `setFilter` + `setLayoutProperty` — no style reload.** A second style variant + `map.setStyle()` was rejected (re-inits the map, flicker, two style files to maintain).

When the toggle changes, two things happen on the active map(s):

**A. Boundary overlay visibility** — flip `visibility` on the overlay layers via the existing visibility-control pattern in `BoundaryLayers.tsx`:
- Hide when OFF: pre/post province `fill` + `outline` + `label` + `city-label` + `national-capital-marker` + `national-capital-label`; pre district + post ward candidate `fill` + `outline` + `label`; the region-color label layer.
- Always keep: offshore islands `fill` + reef + `outline` + `label` (Hoàng Sa/Trường Sa) and the basemap itself.

**B. Basemap label reveal** — on the self-built OMT basemap's settlement layers:
- Layers carrying the spatial filter `['all', <class>, OUTSIDE_VN]` (where `OUTSIDE_VN = ['!', ['within', VN_OUTLINE]]`): `place-city`, `place-town`, `place-village`, `place-state`, `world-place-city`, `world-place-city-dot`. When OFF → `setFilter` to the class-only filter (drop the `OUTSIDE_VN` clause) so VN labels show too; when ON → restore the `OUTSIDE_VN` clause (the style default).
- `place-commune` (phường + small subdivisions) is `visibility: none` in the style. When OFF → `visibility: visible`; when ON → `none`.
- Implementation note: the strip/restore is a small contained helper. The "ON" filter is the layer's style default (read once at style load); the "OFF" filter is that with the trailing `['!', ['within', …]]` element removed from the `['all', …]` array.

## State + URL

- Add `boundaries: boolean` to `state.layers` in `mapViewTypes.ts` (`MapViewState.layers`), default `true` in `initialMapViewState` (`mapViewReducer.ts`).
- Add action `{ type: 'setBoundariesVisible'; visible: boolean }` + reducer case (mirrors `setOffshoreIslandsVisible`).
- URL (`urlState.ts`): read/write `boundaries` alongside `mode`/`compare`. Serialize only when OFF (`?boundaries=off`); ON is the default and omits the param. Read on load and apply.

## UI control

- New `Section` in `MapSettingsPanel.tsx` (the ☰ settings drawer), e.g. title "Ranh giới OSM" / "OSM boundaries", containing an on/off toggle consistent with the panel's existing controls (reuse `MapToggle` or a 2-button group like the color-mode control). Wired through `MapShell` → `dispatch({ type: 'setBoundariesVisible', visible })`.
- **Hidden in swipe compare mode** (turning boundaries off contradicts pre-vs-post comparison — same treatment as color mode). In swipe, boundaries are forced ON and the URL param is ignored.
- Add i18n keys to both `locales/en.json` and `locales/vi.json` (section title + on/off labels).

## Edge cases

- **Style reload (locale switch vi↔en):** swapping the style file resets the basemap settlement filters to the style default (`OUTSIDE_VN` present) and `place-commune` to `none`. The effect that applies the toggle must re-run on `style.load` so an active `boundaries=off` state is re-applied after the reload.
- **Region color mode:** when boundaries are OFF, the region fill + region labels hide too (they are part of the overlay). The color-mode control stays usable but has no visible effect until boundaries are turned back on.
- **Compare/swipe:** the param does not apply; toggle hidden.
- **CARTO/Protomaps fallback styles:** the basemap settlement layer ids (`place-*`, `world-place-*`) don't exist there, so the label-reveal step is a no-op (guard with `map.getLayer`). The overlay-visibility step still works.
- **No flicker / no camera change:** because it's `setFilter`/`setLayoutProperty` (not `setStyle`), the camera and map state are untouched.

## Files touched (anticipated)

- `src/features/map-state/mapViewTypes.ts` — `layers.boundaries` + action.
- `src/features/map-state/mapViewReducer.ts` — default + reducer case.
- `src/features/map-state/urlState.ts` — read/write `boundaries`.
- `src/features/boundaries/BoundaryLayers.tsx` — overlay visibility honoring `state.layers.boundaries`; basemap settlement filter/visibility flip + re-apply on `style.load`.
- `src/features/boundaries/boundaryLayerRegistry.ts` — a `BASEMAP_SETTLEMENT_LABEL_LAYERS` list + (if helpful) a helper to compute the class-only filter; identify which overlay layer ids hide.
- `src/components/Map/MapSettingsPanel.tsx` (+ `MapShell.tsx`) — the toggle UI + wiring.
- `src/locales/{en,vi}.json` — i18n strings.

## Testing

- Unit: `urlState` round-trips `boundaries=off`/default; reducer handles `setBoundariesVisible`.
- Manual (`/vi/map` + `/en/map`): toggle OFF → provinces/nested + labels disappear, basemap VN labels (incl phường/xã) appear, Hoàng Sa/Trường Sa stay; toggle ON → restores. Switch locale while OFF → state persists. Share `?boundaries=off` → loads with boundaries off. Confirm swipe-compare hides the toggle. `pnpm lint` + `pnpm test:unit` pass.

## Out of scope

- A standalone "layers panel" exposing the existing always-on `nestedCandidates`/`offshoreIslands` flags (separate, not requested).
- Per-layer granular toggles (provinces vs districts vs wards independently).
