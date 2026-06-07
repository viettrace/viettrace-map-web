export type MapMode = 'pre' | 'post';
export type CompareMode = 'toggle' | 'swipe';
export type ColorMode = 'default' | 'region';

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

export type SelectedMapFeature = SelectedProvinceFeature | SelectedNestedFeature;

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
  | { type: 'setDataNoticeOpen'; open: boolean }
  | { type: 'toggleDataNotice' }
  | { type: 'selectFeature'; feature: SelectedMapFeature | null };
