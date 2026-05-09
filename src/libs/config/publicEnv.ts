export interface PublicEnv {
  mapStyle: string;
  tileCacheBuster?: string;
  tileUrlIslands?: string;
  tileUrlPost: string;
  tileUrlPre: string;
}

const DEFAULT_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
type PublicEnvSource = Record<string, string | undefined>;

const browserPublicEnv: PublicEnvSource = {
  NEXT_PUBLIC_MAP_STYLE: process.env.NEXT_PUBLIC_MAP_STYLE,
  NEXT_PUBLIC_TILE_CACHE_BUSTER: process.env.NEXT_PUBLIC_TILE_CACHE_BUSTER,
  NEXT_PUBLIC_TILE_URL_ISLANDS: process.env.NEXT_PUBLIC_TILE_URL_ISLANDS,
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

export function readPublicEnv(env: PublicEnvSource = browserPublicEnv): PublicEnv {
  return {
    mapStyle: env.NEXT_PUBLIC_MAP_STYLE || DEFAULT_MAP_STYLE,
    tileCacheBuster: env.NEXT_PUBLIC_TILE_CACHE_BUSTER || undefined,
    tileUrlIslands: env.NEXT_PUBLIC_TILE_URL_ISLANDS || undefined,
    tileUrlPost: readRequiredEnv(env, 'NEXT_PUBLIC_TILE_URL_POST'),
    tileUrlPre: readRequiredEnv(env, 'NEXT_PUBLIC_TILE_URL_PRE'),
  };
}
