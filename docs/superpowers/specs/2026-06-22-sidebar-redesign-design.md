# Design: Map settings sidebar redesign

- **Date:** 2026-06-22
- **Repo:** viettrace-map-web
- **Status:** approved (design); ready for implementation plan
- **Origin:** Follow-up to the OSM-boundaries toggle (`2026-06-21-osm-boundaries-toggle-design.md`). Adding that toggle exposed how mismatched the panel's controls had become. User feedback: the sidebar looks cluttered ("lộn xộn").

## Goal

Make `MapSettingsPanel` (the slide-in "Tuỳ chọn bản đồ" drawer, used on both desktop and mobile) feel **consistent and tidy**. Same behavior, same controls — only the layout and visual language change. The user picked "nhất quán & gọn gàng" over "tối giản tối đa" or "dễ hiểu cho người mới (icons + mô tả)".

## Problems with the current panel

1. **Four control idioms for five rows** — a sliding switch (View), segmented pills (Boundaries, Colors, Language), and a full-width text button (Compare). Each row makes the eye re-learn the control.
2. **Five separate bordered cards stacked vertically**, each with an UPPERCASE label — nested borders read as a "grid" and waste height.
3. **Duplicated hint** — `controlsNeedBoundaries` ("Bật ranh giới OSM để sử dụng") renders twice (under View and under Colors) because both depend on the boundary overlay.
4. **Dependency is invisible** — View and Colors are children of Boundaries (only meaningful when the overlay is on) but sit as flat siblings.
5. **Language is mixed in** — VI/EN is an app setting, not a map-display control, yet it shares the same list.

## Approved layout — "Settings list" (Approach A)

A single panel with **one** control idiom (segmented pill), **label-left / control-right** rows, group structure expressed by indentation and one hairline divider, and Language pinned to a footer.

```
┌─────────────────────────────────────┐
│ Tuỳ chọn bản đồ                   ✕  │   ← header (unchanged)
├─────────────────────────────────────┤
│ Ranh giới OSM        [ Hiện | Ẩn ]   │   ← parent / master
│  ╎ Chế độ xem        [63 tỉnh|34 tỉnh]│   ← child (indent + left rule)
│  ╎ Màu sắc           [Mặc định|Vùng] │   ← child
│  (hint shows here once, only when OFF)│
│ ─────────────────────────────────── │   ← single divider
│ So sánh                    [ ▥ Bật ] │   ← always enabled
├─────────────────────────────────────┤
│ NGÔN NGỮ                     VI  EN  │   ← grey footer, separated
└─────────────────────────────────────┘
```

### Concrete decisions (confirmed with user)

1. **One idiom:** every control is a rounded segmented pill (active segment = `slate-900` / white, inactive = `slate-700`). The View sliding switch becomes a 2-segment pill.
2. **View pill keeps semantic color:** the active segment is **red** for "63 tỉnh" (pre) and **blue** for "34 tỉnh" (post), matching the pre/post boundary colors on the map. All other pills use the neutral `slate-900` active. This is a deliberate exception, not inconsistency.
3. **Dependency group:** Chế độ xem + Màu sắc are indented under Ranh giới OSM with a left rule. When boundaries are OFF, the whole child group dims + disables together, and **one** hint (`controlsNeedBoundaries`) renders once beneath the group — never per-row.
4. **Compare** sits below the divider and stays enabled regardless of the boundary toggle (entering swipe forces boundaries on, as today). Rendered as a right-aligned pill-style action, not a full-width button.
5. **Language** moves to a footer strip (grey background, top hairline) with a small "NGÔN NGỮ" label — visually separated from the map controls.
6. **Remove the in-body UPPERCASE section labels** — the row labels (Ranh giới OSM / Chế độ xem / Màu sắc / So sánh) already name each control. Only the footer keeps a label.

## Component design

- **New `SegmentedControl` component** (`src/components/Map/SegmentedControl.tsx`) — the single reusable pill control that enforces consistency.
  - Props: `options: Array<{ value: string; label: string; activeClassName?: string }>`, `value`, `onChange(value)`, `disabled?`, `ariaLabel?`.
  - Default active style `bg-slate-900 text-white`; an option may override via `activeClassName` (View uses `bg-red-600` / `bg-blue-600`).
  - Disabled → `opacity-40` + `disabled` on each segment + `cursor-not-allowed` (reuses the existing disabled pattern).
  - Used for: Boundaries (Hiện/Ẩn), View (63/34, with red/blue), Colors (Mặc định/Theo vùng).
- **`SettingRow`** — a small layout primitive inside `MapSettingsPanel`: label on the left, control on the right, consistent vertical rhythm. (Local helper, like the current `Section`.)
- **`MapSettingsPanel` restructure:**
  - Replace the five bordered `Section` cards with: the boundary group (parent row + indented children + single hint), a divider, the Compare row, and the Language footer.
  - Boundary children container: indent + `border-l`, and apply `opacity-40` + disable when `!boundariesVisible`.
- **`MapToggle`** (sliding switch) — its only consumer is this panel (panel variant). It is replaced by `SegmentedControl`; remove `MapToggle` if `pnpm knip` confirms no other usage.
- **`CompareModeToggle`** — restyle/extend the `panel` variant to render as a right-aligned compact pill action inside a `SettingRow` ("So sánh" label + pill). Toolbar/default variants untouched.
- **`MapLanguageSwitch`** — reuse the existing `panel` variant inside the new footer; only its container placement changes.

## Behavior details

- **Boundaries OFF:** child group (View + Colors) dims + disables; single hint shown. Compare + Language stay active. (Same logic as the just-shipped fix, regrouped visually.)
- **Swipe / compare mode (`compareMode === 'swipe'`):** hide the whole boundary group (Ranh giới + View + Màu) — boundaries are forced on and per-side coloring does not apply — and show only the Compare row (switch back to single) + Language footer. This replaces the current "Colors shown but disabled with a compare hint"; the `colorModeDisabledInCompare` string becomes unused (remove if `knip` flags it).
- **No state/URL changes.** `state.layers.boundaries`, `mode`, `colorMode`, `compareMode` and their handlers are unchanged. This is presentation-only.

## i18n

- Reuse existing keys: `settingsTitle`, `boundariesShow`/`boundariesHide`, `togglePre`/`togglePost` (63/34 tỉnh), `colorModeDefault`/`colorModeRegion`, `controlsNeedBoundaries`, `compareSwitchToSwipe`/`compareSwitchToToggle`, language keys.
- The in-body section-label keys (`settingsSectionView`, `settingsSectionBoundaries`, `settingsSectionCompare`, `settingsSectionColorMode`) move from uppercase headers to row labels — keep the strings, repurpose as `SettingRow` labels (rename keys only if it improves clarity; otherwise leave as-is to limit churn).
- Add nothing new unless a footer label key is wanted (can reuse `settingsSectionLanguage`).
- Update both `en.json` and `vi.json` together.

## Non-goals / out of scope

- No change to map rendering, tiles, or the boundary-toggle logic.
- No new features in the panel (no new settings).
- Not adopting the "icons + descriptions" or "maximum-compact" directions.
- Mobile: the panel is already a responsive slide-in drawer; keep it. The new rows must stay tap-friendly (min ~28px control height) but no separate mobile layout is introduced.

## Testing

- `pnpm lint` + `pnpm test:unit` (existing 64 tests must stay green; this is presentation-only so no test changes expected beyond any snapshot of panel structure if added).
- `pnpm knip` to catch `MapToggle` / `colorModeDisabledInCompare` becoming unused.
- Manual `/vi/map` + `/en/map`: verify the four states — boundaries ON, boundaries OFF (child group dim + single hint), swipe mode (boundary group hidden), and language switch — plus mobile drawer width.
