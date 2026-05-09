import type { MapMode } from '@src/features/map-state/mapViewTypes';

type ProvinceBbox = readonly [number, number, number, number];
type ProvinceCenter = readonly [number, number];

interface ProvinceMergerMetadata {
  mergeDate: string;
  newProvince?: string;
  oldProvinces?: string[];
}

export interface ProvinceIndexEntry {
  bbox: ProvinceBbox;
  center: ProvinceCenter;
  id: string;
  merger?: ProvinceMergerMetadata;
  mode: MapMode;
  name: string;
  name_en: string;
  slug: string;
}

export interface ProvinceIndex {
  schemaVersion: 1;
  counts: {
    post: number;
    pre: number;
    total: number;
  };
  provinces: ProvinceIndexEntry[];
  sources: {
    mergerInfo: string;
    post: string;
    pre: string;
  };
}
