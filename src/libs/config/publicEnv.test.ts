import { describe, expect, it } from 'vitest';
import { localizeBasemapStyle, readPublicEnv } from './publicEnv';

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
      enableQaLayers: false,
      mapStyle: '/basemap-style.json',
      tileCacheBuster: undefined,
      tileUrlIslands: 'https://tiles.example.test/islands',
      tileUrlPostWardsCandidateLabels: undefined,
      tileUrlPostWardsCandidate: 'https://tiles.example.test/post-wards',
      tileUrlPost: 'https://tiles.example.test/post',
      tileUrlPreDistrictsCandidateLabels: undefined,
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
      enableQaLayers: false,
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

  it('enables QA layers only when explicitly set to true', () => {
    expect(
      readPublicEnv({
        ...requiredEnv,
        NEXT_PUBLIC_ENABLE_QA_LAYERS: 'true',
      }),
    ).toMatchObject({
      enableQaLayers: true,
    });

    expect(
      readPublicEnv({
        ...requiredEnv,
        NEXT_PUBLIC_ENABLE_QA_LAYERS: '1',
      }),
    ).toMatchObject({
      enableQaLayers: false,
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

describe('localizeBasemapStyle', () => {
  it('keeps the base file for the default (vi) locale', () => {
    expect(localizeBasemapStyle('/basemap-style.json', 'vi')).toBe('/basemap-style.json');
  });

  it('rewrites a self-hosted style to the -en variant for en', () => {
    expect(localizeBasemapStyle('/basemap-style.json', 'en')).toBe('/basemap-style-en.json');
    expect(localizeBasemapStyle('/poc-basemap-style.json', 'en')).toBe(
      '/poc-basemap-style-en.json',
    );
  });

  it('leaves external style URLs (e.g. CARTO fallback) unchanged for en', () => {
    const carto = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
    expect(localizeBasemapStyle(carto, 'en')).toBe(carto);
  });
});
