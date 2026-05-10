import { describe, expect, it } from 'vitest';
import { readPublicEnv } from './publicEnv';

const requiredEnv = {
  NEXT_PUBLIC_TILE_URL_ISLANDS: 'https://tiles.example.test/islands',
  NEXT_PUBLIC_TILE_URL_POST_WARDS_CANDIDATE: 'https://tiles.example.test/post-wards',
  NEXT_PUBLIC_TILE_URL_PRE_DISTRICTS_CANDIDATE: 'https://tiles.example.test/pre-districts',
  NEXT_PUBLIC_TILE_URL_POST: 'https://tiles.example.test/post',
  NEXT_PUBLIC_TILE_URL_PRE: 'https://tiles.example.test/pre',
};

describe('readPublicEnv', () => {
  it('reads required tile URLs and default map style', () => {
    expect(readPublicEnv(requiredEnv)).toEqual({
      mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      tileCacheBuster: undefined,
      tileUrlIslands: 'https://tiles.example.test/islands',
      tileUrlPostWardsCandidate: 'https://tiles.example.test/post-wards',
      tileUrlPost: 'https://tiles.example.test/post',
      tileUrlPreDistrictsCandidate: 'https://tiles.example.test/pre-districts',
      tileUrlPre: 'https://tiles.example.test/pre',
    });
  });

  it('allows optional layer tile URLs to be absent for older local env files', () => {
    expect(
      readPublicEnv({
        NEXT_PUBLIC_TILE_URL_POST: 'https://tiles.example.test/post',
        NEXT_PUBLIC_TILE_URL_PRE: 'https://tiles.example.test/pre',
      }),
    ).toMatchObject({
      tileUrlIslands: undefined,
      tileUrlPostWardsCandidate: undefined,
      tileUrlPost: 'https://tiles.example.test/post',
      tileUrlPreDistrictsCandidate: undefined,
      tileUrlPre: 'https://tiles.example.test/pre',
    });
  });

  it('keeps explicit map style and cache buster', () => {
    expect(
      readPublicEnv({
        ...requiredEnv,
        NEXT_PUBLIC_MAP_STYLE: 'https://styles.example.test/style.json',
        NEXT_PUBLIC_TILE_CACHE_BUSTER: '20260509-display',
      }),
    ).toMatchObject({
      mapStyle: 'https://styles.example.test/style.json',
      tileCacheBuster: '20260509-display',
    });
  });

  it('fails early when a required province tile URL is missing', () => {
    expect(() =>
      readPublicEnv({
        NEXT_PUBLIC_TILE_URL_POST: 'https://tiles.example.test/post',
      }),
    ).toThrow('NEXT_PUBLIC_TILE_URL_PRE');
  });
});
