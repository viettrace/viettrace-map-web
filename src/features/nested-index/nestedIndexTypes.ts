import type { MapMode } from '@src/features/map-state/mapViewTypes';

export type NestedFeatureType = 'district' | 'ward';

type NestedBbox = readonly [number, number, number, number];
type NestedCenter = readonly [number, number];

export interface NestedIndexEntry {
  bbox: NestedBbox;
  center: NestedCenter;
  id: string;
  mode: MapMode;
  name: string;
  name_en: string;
  parentProvinceName: string;
  parentProvinceSlug: string;
  slug: string;
  type: NestedFeatureType;
}

export interface NestedIndex {
  schemaVersion: 1;
  counts: {
    districts: number;
    wards: number;
    total: number;
  };
  features: NestedIndexEntry[];
  sources: {
    preDistricts: string;
    postWards: string;
  };
}
