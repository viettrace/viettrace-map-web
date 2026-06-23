# Implementation plan: Map settings sidebar redesign

- **Spec:** `../specs/2026-06-22-sidebar-redesign-design.md`
- **Branch:** continue on `feat/toggle-osm-boundaries` (this redesign builds directly on the just-shipped panel changes; the toggle PR is not merged yet). Split into its own PR later only if desired.
- **Repo:** viettrace-map-web

Presentation-only: no changes to `state`, URL, reducers, or the boundary-toggle logic. Work the steps in order. Run `pnpm lint` + `pnpm test:unit` after the code steps; `pnpm knip` + full manual check at the end.

---

## Step 1 — New shared control: `SegmentedControl`

**`src/components/Map/SegmentedControl.tsx`** (new, `'use client'` not needed — no browser API, pure presentational; it's rendered inside a client tree already).

```tsx
export interface SegmentedOption {
  value: string;
  label: string;
  activeClassName?: string; // override active background, e.g. 'bg-red-600' / 'bg-blue-600'
}
interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}
```

- Container: `inline-flex` (or `flex` when it should stretch), rounded-full, `border border-slate-200`, `bg-slate-50`, `overflow-hidden`. Add `opacity-40` when `disabled`.
- Each option is a `<button type="button" disabled={disabled}>`:
  - Active (`value === option.value`): `option.activeClassName ?? 'bg-slate-900'` + `text-white`, `rounded-full`.
  - Inactive: `text-slate-600 hover:bg-slate-100` (omit hover when disabled).
  - `disabled:cursor-not-allowed`, focus ring matching existing controls (`focus:ring-2 focus:ring-slate-400`).
- `role="group"` + `aria-label={ariaLabel}`; each button `aria-pressed={active}`.

This is the single idiom; it replaces the sliding switch and the segmented pills already in the panel.

**Verify:** lint clean; renders 2 segments with correct active styling. (Optional tiny unit/render test — not required since it's presentational.)

---

## Step 2 — Restructure `MapSettingsPanel` to the "settings list" layout

**`src/components/Map/MapSettingsPanel.tsx`** — keep the existing props/handlers (`boundariesVisible`, `colorMode`, `compareMode`, `mode`, `onBoundariesChange`, `onColorModeChange`, `onCompareModeChange`, `onToggle`) and the drawer shell (button, backdrop, `<aside>`, header, ESC handler). Replace the **body** (`<div class="flex-1 overflow-y-auto …">`) and the `Section` helper.

Add a local `SettingRow` helper (label-left / control-right):
```tsx
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
    </div>
  );
}
```

Body structure (non-swipe state):
```tsx
<div className="flex-1 overflow-y-auto px-4 py-3">
  {/* Boundary group: parent + indented children */}
  <SettingRow label={t('settingsSectionBoundaries')}>
    <SegmentedControl
      ariaLabel={t('settingsSectionBoundaries')}
      value={boundariesVisible ? 'show' : 'hide'}
      onChange={v => onBoundariesChange(v === 'show')}
      options={[
        { value: 'show', label: t('boundariesShow') },
        { value: 'hide', label: t('boundariesHide') },
      ]}
    />
  </SettingRow>

  <div className={`ml-1 border-l-2 border-slate-200 pl-3 ${overlayHidden ? 'opacity-40' : ''}`}>
    <SettingRow label={t('settingsSectionView')}>
      <SegmentedControl
        ariaLabel={t('settingsSectionView')}
        disabled={overlayHidden}
        value={mode}
        onChange={v => onToggle(v as 'pre' | 'post')}
        options={[
          { value: 'pre',  label: t('togglePre'),  activeClassName: 'bg-red-600' },
          { value: 'post', label: t('togglePost'), activeClassName: 'bg-blue-600' },
        ]}
      />
    </SettingRow>
    <SettingRow label={t('settingsSectionColorMode')}>
      <SegmentedControl
        ariaLabel={t('settingsSectionColorMode')}
        disabled={overlayHidden}
        value={colorMode}
        onChange={v => onColorModeChange(v as ColorMode)}
        options={[
          { value: 'default', label: t('colorModeDefault') },
          { value: 'region',  label: t('colorModeRegion') },
        ]}
      />
    </SettingRow>
  </div>
  {overlayHidden && (
    <p className="mt-1 pl-4 text-[11px] text-slate-400">{t('controlsNeedBoundaries')}</p>
  )}

  <div className="my-2 border-t border-slate-100" />

  {/* Compare: always enabled, right-aligned pill action (Step 3) */}
  <SettingRow label={t('settingsSectionCompare')}>
    <CompareModeToggle compareMode={compareMode} onChange={onCompareModeChange} variant="panel" />
  </SettingRow>
</div>
```

- Keep `const overlayHidden = !boundariesVisible && !isSwipe;` (already present).
- **Swipe state (`isSwipe`):** render only the Compare row + Language footer (boundary group hidden entirely). Wrap the boundary group + divider in `{!isSwipe && ( … )}`. This drops the old "color shown-but-disabled-in-compare" branch.
- Remove the `Section` component (cards) and the old per-section markup, including the now-unused `colorModeDisabled` / `isSwipe`-dim logic on color.

Language footer (replaces the in-body Language `Section`): keep it pinned at the bottom of the `<aside>`, outside the scroll area:
```tsx
<div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5">
  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('settingsSectionLanguage')}</span>
  <MapLanguageSwitch variant="panel" />
</div>
```

**Verify:** lint clean; drawer shows boundary group with indented View+Colors, single hint when boundaries off, Compare row, footer language. In swipe, only Compare + footer show.

---

## Step 3 — Compare control: compact right-aligned pill (`CompareModeToggle` panel variant)

**`src/components/Map/CompareModeToggle.tsx`** — adjust the `panel` variant so it sits as a compact pill on the right of a `SettingRow` (today it's a full-width left-aligned row with long text):
- Render a rounded pill button: not-swipe → `bg-slate-900 text-white` with the swipe icon + a short label; swipe → an "exit/!active" treatment (e.g. `border border-slate-300 text-slate-700`).
- Labels: the current `compareSwitchToSwipe` ("Bật chế độ so sánh") / `compareSwitchToToggle` are long for a compact pill next to the "So sánh" label. Add short keys `compareEnableShort` / `compareDisableShort` ("Bật" / "Tắt"; EN "On" / "Off") and use them for the `panel` variant only; keep the descriptive labels as the `aria-label`/`title` for accessibility.
- Leave `toolbar` and `default` variants untouched.

**Verify:** Compare row reads "So sánh  [▥ Bật]" (single) and "So sánh  [▥ Tắt]" (swipe); toggling enters/exits swipe; in swipe the rest of the boundary group is hidden (Step 2).

---

## Step 4 — Retire the sliding switch + dead i18n

- **`src/components/Map/MapToggle.tsx`** — its only consumer was the panel View section (now `SegmentedControl`). Run `pnpm knip`; if `MapToggle` is reported unused, delete the file and its import. (If something else still imports it, leave it.)
- **`colorModeDisabledInCompare`** — the swipe branch no longer shows a disabled color control, so this string is likely unused. If `knip`/grep confirms no reference, remove it from both locales.
- The `disabled` prop just added to `MapToggle` in the prior fix goes away with the file if it's deleted.

**Verify:** `pnpm knip` clean (no new unused exports, no dangling references).

---

## Step 5 — i18n pass (both locales together)

**`src/locales/en.json` + `src/locales/vi.json`** (under `Map`):
- Reused as row labels (no value change needed): `settingsSectionView` ("Chế độ xem"), `settingsSectionBoundaries` ("Ranh giới OSM"), `settingsSectionColorMode` ("Màu sắc bản đồ" — consider shortening the row label to "Màu sắc" for the compact row; if changed, update both locales), `settingsSectionCompare` ("So sánh"), `settingsSectionLanguage` (footer label).
- `controlsNeedBoundaries`: keep, or reword to the group-level phrasing shown in the mockup ("Bật ranh giới OSM để dùng chế độ xem & màu sắc" / "Turn on OSM boundaries to use view & colors"). Pick one and set both locales.
- Add `compareEnableShort` / `compareDisableShort` (Step 3).
- Remove `colorModeDisabledInCompare` if unused (Step 4).

**Verify:** no missing-key console warnings on `/vi/map` and `/en/map`.

---

## Step 6 — Verify + finish

- `pnpm lint` (must pass), `pnpm test:unit` (existing 64 green), `pnpm knip` (clean).
- Manual `/vi/map` + `/en/map`, the four states:
  1. **Boundaries ON** — View (63 red / 34 blue) + Colors active under Boundaries; Compare + language work.
  2. **Boundaries OFF** — View + Colors dim/disabled together, **one** hint under the group; Compare still works.
  3. **Swipe** — boundary group hidden; only Compare ("Tắt") + language footer.
  4. **Language switch** vi↔en — labels update; layout intact.
- **Mobile:** open the drawer at ~360px width — rows don't overflow, pills stay tap-friendly (≥ ~28px height), footer language reachable.
- Commit per Conventional Commits, e.g. `refactor(map-ui): redesign settings sidebar into a unified settings list`. (Spec/plan already committed.)

## Notes / risks

- **Pill width on mobile:** "63 tỉnh | 34 tỉnh" + "Mặc định | Theo vùng" on the right of a label in a ~300–360px drawer is the tightest case. If it wraps awkwardly, shorten the row label (e.g. "Màu sắc") and/or let `SettingRow` allow the control to wrap below the label on very narrow widths — verify visually in Step 6.
- **Red/blue active pills** must use the same hues as the map's pre/post boundaries (`#dc2626` red / `#2563eb` blue per existing `MapToggle`) for the association to read.
- Keep the change presentation-only — if a step tempts a state/handler change, stop: the spec scopes this to layout/visuals.
- The boundary-group `opacity-40` + per-button `disabled` mirrors the pattern shipped in the prior fix; reuse it rather than inventing a new disabled style.
