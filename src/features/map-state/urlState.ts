import type { MapMode, MapViewState } from './mapViewTypes';

const MODE_PARAM = 'mode';
const PROVINCE_PARAM = 'province';

interface ParsedMapUrlState {
  mode: MapMode | null;
  provinceSlug: string | null;
}

export function parseMapMode(value: string | null): MapMode | null {
  if (value === 'pre' || value === 'post') {
    return value;
  }

  return null;
}

export function readMapUrlState(searchParams: URLSearchParams): ParsedMapUrlState {
  return {
    mode: parseMapMode(searchParams.get(MODE_PARAM)),
    provinceSlug: searchParams.get(PROVINCE_PARAM),
  };
}

export function writeMapUrlState(searchParams: URLSearchParams, state: MapViewState) {
  const nextSearchParams = new URLSearchParams(searchParams);
  const selectedProvince =
    state.selectedFeature?.type === 'province' ? state.selectedFeature : null;

  nextSearchParams.set(MODE_PARAM, selectedProvince?.mode ?? state.mode);

  if (selectedProvince) {
    nextSearchParams.set(PROVINCE_PARAM, selectedProvince.slug);
  } else {
    nextSearchParams.delete(PROVINCE_PARAM);
  }

  return nextSearchParams;
}
