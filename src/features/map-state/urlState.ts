import {
  clampCompareDivider,
  COMPARE_DIVIDER_DEFAULT,
  type CompareMode,
  type MapMode,
  type MapViewState,
} from './mapViewTypes';

const MODE_PARAM = 'mode';
const PROVINCE_PARAM = 'province';
const NESTED_PARAM = 'nested';
const NESTED_TYPE_PARAM = 'nestedType';
const COMPARE_PARAM = 'compare';
const DIVIDER_PARAM = 'divider';
const BOUNDARIES_PARAM = 'boundaries';
const LAT_PARAM = 'lat';
const LNG_PARAM = 'lng';
const ZOOM_PARAM = 'z';

type NestedFeatureType = 'district' | 'ward';

interface ParsedMapUrlState {
  mode: MapMode | null;
  provinceSlug: string | null;
  nestedSlug: string | null;
  nestedType: NestedFeatureType | null;
  compareMode: CompareMode | null;
  compareDividerX: number | null;
  // null = default (boundaries ON / param absent); false = explicitly off (`?boundaries=off`).
  boundaries: boolean | null;
  lat: number | null;
  lng: number | null;
  zoom: number | null;
}

export function parseMapMode(value: string | null): MapMode | null {
  if (value === 'pre' || value === 'post') {
    return value;
  }

  return null;
}

function parseNestedType(value: string | null): NestedFeatureType | null {
  if (value === 'district' || value === 'ward') {
    return value;
  }

  return null;
}

function parseCompareMode(value: string | null): CompareMode | null {
  if (value === 'toggle' || value === 'swipe') {
    return value;
  }

  return null;
}

function parseCompareDividerX(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clampCompareDivider(parsed);
}

function parseCoord(value: string | null, min: number, max: number): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

export function readMapUrlState(searchParams: URLSearchParams): ParsedMapUrlState {
  return {
    mode: parseMapMode(searchParams.get(MODE_PARAM)),
    provinceSlug: searchParams.get(PROVINCE_PARAM),
    nestedSlug: searchParams.get(NESTED_PARAM),
    nestedType: parseNestedType(searchParams.get(NESTED_TYPE_PARAM)),
    compareMode: parseCompareMode(searchParams.get(COMPARE_PARAM)),
    compareDividerX: parseCompareDividerX(searchParams.get(DIVIDER_PARAM)),
    boundaries: searchParams.get(BOUNDARIES_PARAM) === 'off' ? false : null,
    lat: parseCoord(searchParams.get(LAT_PARAM), -90, 90),
    lng: parseCoord(searchParams.get(LNG_PARAM), -180, 180),
    zoom: parseCoord(searchParams.get(ZOOM_PARAM), 0, 22),
  };
}

export function writeMapUrlState(
  searchParams: URLSearchParams,
  state: MapViewState,
  camera?: { lat: number; lng: number; zoom: number } | null,
) {
  const nextSearchParams = new URLSearchParams(searchParams);
  const selectedProvince =
    state.selectedFeature?.type === 'province' ? state.selectedFeature : null;
  const selectedNested = state.selectedFeature?.type === 'nested' ? state.selectedFeature : null;

  nextSearchParams.set(MODE_PARAM, selectedProvince?.mode ?? selectedNested?.mode ?? state.mode);

  if (selectedProvince) {
    nextSearchParams.set(PROVINCE_PARAM, selectedProvince.slug);
  } else {
    nextSearchParams.delete(PROVINCE_PARAM);
  }

  if (selectedNested) {
    nextSearchParams.set(NESTED_PARAM, selectedNested.slug);
    nextSearchParams.set(NESTED_TYPE_PARAM, selectedNested.featureType);
  } else {
    nextSearchParams.delete(NESTED_PARAM);
    nextSearchParams.delete(NESTED_TYPE_PARAM);
  }

  if (state.compareMode === 'swipe') {
    nextSearchParams.set(COMPARE_PARAM, 'swipe');

    // Only persist the divider when it is meaningfully off-center; default 0.5
    // stays implicit so the URL remains short.
    if (Math.abs(state.compareDividerX - COMPARE_DIVIDER_DEFAULT) > 0.005) {
      nextSearchParams.set(DIVIDER_PARAM, state.compareDividerX.toFixed(2));
    } else {
      nextSearchParams.delete(DIVIDER_PARAM);
    }
  } else {
    nextSearchParams.delete(COMPARE_PARAM);
    nextSearchParams.delete(DIVIDER_PARAM);
  }

  // Boundaries overlay: only persist when explicitly OFF (default ON stays implicit). Not in swipe
  // compare, where the overlay is always on and the param does not apply.
  if (state.layers.boundaries === false && state.compareMode !== 'swipe') {
    nextSearchParams.set(BOUNDARIES_PARAM, 'off');
  } else {
    nextSearchParams.delete(BOUNDARIES_PARAM);
  }

  if (camera) {
    nextSearchParams.set(LAT_PARAM, camera.lat.toFixed(5));
    nextSearchParams.set(LNG_PARAM, camera.lng.toFixed(5));
    nextSearchParams.set(ZOOM_PARAM, camera.zoom.toFixed(2));
  } else {
    nextSearchParams.delete(LAT_PARAM);
    nextSearchParams.delete(LNG_PARAM);
    nextSearchParams.delete(ZOOM_PARAM);
  }

  return nextSearchParams;
}
