export type MapMode = 'pre' | 'post';
export type CompareMode = 'toggle' | 'swipe';
export type ColorMode =
  | 'default'
  | 'region'
  | 'population'
  | 'density'
  | 'area'
  | 'grdp'
  | 'grdp_per_capita';

export const COMPARE_MODE_DEFAULT: CompareMode = 'toggle';
export const COMPARE_DIVIDER_DEFAULT = 0.5;
export const COMPARE_DIVIDER_MIN = 0.05;
export const COMPARE_DIVIDER_MAX = 0.95;

export function clampCompareDivider(value: number): number {
  if (!Number.isFinite(value)) {
    return COMPARE_DIVIDER_DEFAULT;
  }

  if (value < COMPARE_DIVIDER_MIN) {
    return COMPARE_DIVIDER_MIN;
  }

  if (value > COMPARE_DIVIDER_MAX) {
    return COMPARE_DIVIDER_MAX;
  }

  return value;
}

interface SelectedProvinceFeature {
  type: 'province';
  mode: MapMode;
  slug: string;
}

interface SelectedNestedFeature {
  type: 'nested';
  featureType: 'district' | 'ward';
  mode: MapMode;
  slug: string;
}

// Pre-2025 ward selected from the map (OSM-tier layer). The panel reads the clicked tile feature's
// own properties INLINE (no nested-index lookup): pre-2025 ward names collide across districts, so a
// name→slug match would be ambiguous, but the exact clicked feature is unambiguous. Ephemeral — not
// serialized to the URL (writeMapUrlState only persists province/nested).
export interface PreWardData {
  name: string;
  oldDistrict: string;
  oldProvince: string;
  newWard: string | null;
  newWardCode: string | null;
  confidence: string | null;
  areaQa: string | null;
  matched: boolean;
}

interface SelectedPreWardFeature {
  type: 'preWard';
  mode: 'pre';
  data: PreWardData;
}

export type SelectedMapFeature =
  | SelectedProvinceFeature
  | SelectedNestedFeature
  | SelectedPreWardFeature;

export interface MapViewState {
  mode: MapMode;
  compareMode: CompareMode;
  colorMode: ColorMode;
  colorModeBeforeCompare: ColorMode | null;
  compareDividerX: number;
  selectedFeature: SelectedMapFeature | null;
  layers: {
    nestedCandidates: boolean;
    offshoreIslands: boolean;
    // The OSM boundary overlay (provinces + nested districts/wards + their labels). When false the
    // overlay hides (offshore islands stay) and the basemap's full VN labels are revealed.
    boundaries: boolean;
  };
  panels: {
    dataNotice: boolean;
    detail: boolean;
  };
}

export type MapViewAction =
  | { type: 'setMode'; mode: MapMode }
  | { type: 'setCompareMode'; compareMode: CompareMode }
  | { type: 'setColorMode'; colorMode: ColorMode }
  | { type: 'setCompareDividerX'; dividerX: number }
  | { type: 'setNestedCandidatesVisible'; visible: boolean }
  | { type: 'setOffshoreIslandsVisible'; visible: boolean }
  | { type: 'setBoundariesVisible'; visible: boolean }
  | { type: 'setDataNoticeOpen'; open: boolean }
  | { type: 'toggleDataNotice' }
  | { type: 'selectFeature'; feature: SelectedMapFeature | null };
