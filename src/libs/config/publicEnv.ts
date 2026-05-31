export interface PublicEnv {
  enableQaLayers: boolean;
  mapStyle: string;
  pmtilesUrlPostWardsCandidateLabels?: string;
  pmtilesUrlPostWardsCandidate?: string;
  pmtilesUrlPreDistrictsCandidateLabels?: string;
  pmtilesUrlPreDistrictsCandidate?: string;
  tileCacheBuster?: string;
  tileUrlIslands?: string;
  tileUrlPostWardsCandidateLabels?: string;
  tileUrlPostWardsCandidate?: string;
  tileUrlPost: string;
  tileUrlPreDistrictsCandidateLabels?: string;
  tileUrlPreDistrictsCandidate?: string;
  tileUrlPre: string;
}

const DEFAULT_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
type PublicEnvSource = Record<string, string | undefined>;

const browserPublicEnv: PublicEnvSource = {
  NEXT_PUBLIC_ENABLE_QA_LAYERS: process.env.NEXT_PUBLIC_ENABLE_QA_LAYERS,
  NEXT_PUBLIC_MAP_STYLE: process.env.NEXT_PUBLIC_MAP_STYLE,
  NEXT_PUBLIC_PMTILES_URL_POST_WARDS_CANDIDATE_LABELS:
    process.env.NEXT_PUBLIC_PMTILES_URL_POST_WARDS_CANDIDATE_LABELS,
  NEXT_PUBLIC_PMTILES_URL_POST_WARDS_CANDIDATE:
    process.env.NEXT_PUBLIC_PMTILES_URL_POST_WARDS_CANDIDATE,
  NEXT_PUBLIC_PMTILES_URL_PRE_DISTRICTS_CANDIDATE_LABELS:
    process.env.NEXT_PUBLIC_PMTILES_URL_PRE_DISTRICTS_CANDIDATE_LABELS,
  NEXT_PUBLIC_PMTILES_URL_PRE_DISTRICTS_CANDIDATE:
    process.env.NEXT_PUBLIC_PMTILES_URL_PRE_DISTRICTS_CANDIDATE,
  NEXT_PUBLIC_TILE_CACHE_BUSTER: process.env.NEXT_PUBLIC_TILE_CACHE_BUSTER,
  NEXT_PUBLIC_TILE_URL_ISLANDS: process.env.NEXT_PUBLIC_TILE_URL_ISLANDS,
  NEXT_PUBLIC_TILE_URL_POST_WARDS_CANDIDATE_LABELS:
    process.env.NEXT_PUBLIC_TILE_URL_POST_WARDS_CANDIDATE_LABELS,
  NEXT_PUBLIC_TILE_URL_POST_WARDS_CANDIDATE: process.env.NEXT_PUBLIC_TILE_URL_POST_WARDS_CANDIDATE,
  NEXT_PUBLIC_TILE_URL_PRE_DISTRICTS_CANDIDATE_LABELS:
    process.env.NEXT_PUBLIC_TILE_URL_PRE_DISTRICTS_CANDIDATE_LABELS,
  NEXT_PUBLIC_TILE_URL_PRE_DISTRICTS_CANDIDATE:
    process.env.NEXT_PUBLIC_TILE_URL_PRE_DISTRICTS_CANDIDATE,
  NEXT_PUBLIC_TILE_URL_POST: process.env.NEXT_PUBLIC_TILE_URL_POST,
  NEXT_PUBLIC_TILE_URL_PRE: process.env.NEXT_PUBLIC_TILE_URL_PRE,
};

function readRequiredEnv(env: PublicEnvSource, key: string): string {
  const value = env[key];

  if (!value) {
    throw new Error(`Missing required public environment variable: ${key}`);
  }

  return value;
}

function readBooleanEnv(env: PublicEnvSource, key: string): boolean {
  return env[key]?.trim().toLowerCase() === 'true';
}

export function readPublicEnv(env: PublicEnvSource = browserPublicEnv): PublicEnv {
  return {
    enableQaLayers: readBooleanEnv(env, 'NEXT_PUBLIC_ENABLE_QA_LAYERS'),
    mapStyle: env.NEXT_PUBLIC_MAP_STYLE || DEFAULT_MAP_STYLE,
    pmtilesUrlPostWardsCandidateLabels:
      env.NEXT_PUBLIC_PMTILES_URL_POST_WARDS_CANDIDATE_LABELS || undefined,
    pmtilesUrlPostWardsCandidate: env.NEXT_PUBLIC_PMTILES_URL_POST_WARDS_CANDIDATE || undefined,
    pmtilesUrlPreDistrictsCandidateLabels:
      env.NEXT_PUBLIC_PMTILES_URL_PRE_DISTRICTS_CANDIDATE_LABELS || undefined,
    pmtilesUrlPreDistrictsCandidate:
      env.NEXT_PUBLIC_PMTILES_URL_PRE_DISTRICTS_CANDIDATE || undefined,
    tileCacheBuster: env.NEXT_PUBLIC_TILE_CACHE_BUSTER || undefined,
    tileUrlIslands: env.NEXT_PUBLIC_TILE_URL_ISLANDS || undefined,
    tileUrlPostWardsCandidateLabels:
      env.NEXT_PUBLIC_TILE_URL_POST_WARDS_CANDIDATE_LABELS || undefined,
    tileUrlPostWardsCandidate: env.NEXT_PUBLIC_TILE_URL_POST_WARDS_CANDIDATE || undefined,
    tileUrlPost: readRequiredEnv(env, 'NEXT_PUBLIC_TILE_URL_POST'),
    tileUrlPreDistrictsCandidateLabels:
      env.NEXT_PUBLIC_TILE_URL_PRE_DISTRICTS_CANDIDATE_LABELS || undefined,
    tileUrlPreDistrictsCandidate: env.NEXT_PUBLIC_TILE_URL_PRE_DISTRICTS_CANDIDATE || undefined,
    tileUrlPre: readRequiredEnv(env, 'NEXT_PUBLIC_TILE_URL_PRE'),
  };
}
