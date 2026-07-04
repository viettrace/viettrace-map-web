// Loads the Track B province statistics (population 2024, official area, density) once and caches it.
// Mirrors the on-demand static-JSON loader pattern (see loadRegionalClassification / useProvinceIndex).

export interface ProvinceStatValue {
  value: number;
  year?: number;
  source?: string;
  derived?: boolean;
  method?: string;
  note?: string;
}

export interface ProvinceStatEntry {
  name: string;
  code: string | null;
  population: ProvinceStatValue;
  area_km2: ProvinceStatValue;
  area_km2_computed?: ProvinceStatValue;
  density: ProvinceStatValue;
  components?: string[];
}

interface ProvinceStatistics {
  schemaVersion: number;
  pre: Record<string, ProvinceStatEntry>;
  post: Record<string, ProvinceStatEntry>;
}

const STATS_URL = '/data/province-statistics.json';

let cache: Promise<ProvinceStatistics | null> | null = null;

export function loadProvinceStatistics(): Promise<ProvinceStatistics | null> {
  if (!cache) {
    cache = fetch(STATS_URL)
      .then(response => (response.ok ? (response.json() as Promise<ProvinceStatistics>) : null))
      .catch(() => null);
  }
  return cache;
}

export function getProvinceStat(
  data: ProvinceStatistics | null,
  mode: 'pre' | 'post',
  slug: string,
): ProvinceStatEntry | null {
  return data?.[mode]?.[slug] ?? null;
}
