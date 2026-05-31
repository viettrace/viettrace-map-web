import type { MapMode, MapViewState } from './mapViewTypes';

const MODE_PARAM = 'mode';
const PROVINCE_PARAM = 'province';
const NESTED_PARAM = 'nested';
const NESTED_TYPE_PARAM = 'nestedType';

type NestedFeatureType = 'district' | 'ward';

interface ParsedMapUrlState {
  mode: MapMode | null;
  provinceSlug: string | null;
  nestedSlug: string | null;
  nestedType: NestedFeatureType | null;
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

export function readMapUrlState(searchParams: URLSearchParams): ParsedMapUrlState {
  return {
    mode: parseMapMode(searchParams.get(MODE_PARAM)),
    provinceSlug: searchParams.get(PROVINCE_PARAM),
    nestedSlug: searchParams.get(NESTED_PARAM),
    nestedType: parseNestedType(searchParams.get(NESTED_TYPE_PARAM)),
  };
}

export function writeMapUrlState(searchParams: URLSearchParams, state: MapViewState) {
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

  return nextSearchParams;
}
