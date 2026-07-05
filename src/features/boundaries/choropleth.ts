// Data-driven choropleth shading for the province fill layers (Track B statistics).
// Reuses the province-statistics.json client loader; classification is quantile
// (equal-count) so the HCMC/Hà Nội outliers don't wash out the scale.

import type { ColorMode } from '@src/features/map-state/mapViewTypes';
import type {
  ProvinceStatEntry,
  ProvinceStatistics,
} from '@src/features/province-detail/provinceStatistics';

export type ChoroplethMode = Exclude<ColorMode, 'default' | 'region'>;

export const CHOROPLETH_MODES: ChoroplethMode[] = [
  'population',
  'density',
  'area',
  'grdp',
  'grdp_per_capita',
];

export function isChoroplethMode(mode: ColorMode): mode is ChoroplethMode {
  return (CHOROPLETH_MODES as string[]).includes(mode);
}

// dataviz blue sequential ramp (light → dark), 5 classes — the validated
// choropleth palette. Lightest = near-zero, allowed to recede toward the basemap.
export const CHOROPLETH_PALETTE = ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'];

function statValue(entry: ProvinceStatEntry, mode: ChoroplethMode): number | null {
  switch (mode) {
    case 'population':
      return entry.population?.value ?? null;
    case 'area':
      return entry.area_km2?.value ?? null;
    case 'density':
      return entry.density?.value ?? null;
    case 'grdp':
      return entry.grdp?.value ?? null;
    case 'grdp_per_capita':
      return entry.grdp_per_capita?.value ?? null;
    default:
      return null;
  }
}

// Quantile (equal-count) class breaks — returns `classes - 1` internal breakpoints.
export function quantileBreaks(values: number[], classes: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];
  for (let i = 1; i < classes; i += 1) {
    const pos = (i / classes) * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    const vLo = sorted[lo] ?? 0;
    const vHi = sorted[hi] ?? vLo;
    breaks.push(vLo + (vHi - vLo) * (pos - lo));
  }
  return breaks;
}

function classIndex(value: number, breaks: number[]): number {
  let i = 0;
  while (i < breaks.length && value >= (breaks[i] ?? Infinity)) i += 1;
  return i;
}

export interface ChoroplethData {
  breaks: number[]; // classes - 1 internal breakpoints
  min: number;
  max: number;
  colorBySlug: Map<string, string>;
}

export function computeChoropleth(
  stats: ProvinceStatistics,
  mode: 'pre' | 'post',
  field: ChoroplethMode,
): ChoroplethData | null {
  const rows: { slug: string; value: number }[] = [];
  for (const [slug, entry] of Object.entries(stats[mode])) {
    const value = statValue(entry, field);
    if (value != null && Number.isFinite(value)) rows.push({ slug, value });
  }
  if (rows.length === 0) return null;

  const values = rows.map(r => r.value);
  const breaks = quantileBreaks(values, CHOROPLETH_PALETTE.length);
  const colorBySlug = new Map<string, string>();
  for (const r of rows) {
    const color = CHOROPLETH_PALETTE[classIndex(r.value, breaks)];
    if (color) colorBySlug.set(r.slug, color);
  }

  return { breaks, min: Math.min(...values), max: Math.max(...values), colorBySlug };
}
