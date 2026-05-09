import { describe, expect, it } from 'vitest';
import { initialMapViewState } from '@src/features/map-state/mapViewReducer';
import type { PublicEnv } from '@src/libs/config/publicEnv';
import {
  boundaryLayerGroups,
  boundarySourceIds,
  getBoundaryLayerDefinitions,
  getBoundaryLayerGroups,
  getBoundarySourceDefinitions,
  getProvinceHitLayerId,
} from './boundaryLayerRegistry';

const env: PublicEnv = {
  mapStyle: 'style',
  tileCacheBuster: '20260509-display',
  tileUrlIslands: 'https://tiles.example.test/islands',
  tileUrlPost: 'https://tiles.example.test/post',
  tileUrlPre: 'https://tiles.example.test/pre',
};

describe('boundaryLayerRegistry', () => {
  it('builds tile source definitions from public env', () => {
    const sources = getBoundarySourceDefinitions(env);
    const preSource = sources.find(source => source.id === boundarySourceIds.pre)?.source as {
      tiles: string[];
    };

    expect(preSource.tiles[0]).toBe(
      'https://tiles.example.test/pre/{z}/{x}/{y}?v=20260509-display',
    );
  });

  it('uses current map state for layer visibility', () => {
    const state = {
      ...initialMapViewState,
      layers: { offshoreIslands: false },
      mode: 'post' as const,
    };
    const layers = getBoundaryLayerDefinitions('vi', state);

    expect(
      layers.find(definition => definition.layer.id === 'provinces-post-fill')?.layer.layout,
    ).toMatchObject({ visibility: 'visible' });
    expect(
      layers.find(definition => definition.layer.id === 'provinces-pre-fill')?.layer.layout,
    ).toMatchObject({ visibility: 'none' });
    expect(
      layers.find(definition => definition.layer.id === 'offshore-islands-fill')?.layer.layout,
    ).toMatchObject({ visibility: 'none' });
  });

  it('keeps hit layers and group visibility centralized', () => {
    expect(getProvinceHitLayerId('pre')).toBe('provinces-pre-fill');
    expect(getProvinceHitLayerId('post')).toBe('provinces-post-fill');
    expect(boundaryLayerGroups.map(group => group.id)).toEqual([
      'pre-provinces',
      'post-provinces',
      'offshore-islands',
    ]);
  });

  it('omits offshore island sources and layers when the tile URL is not configured', () => {
    const envWithoutIslands = {
      mapStyle: 'style',
      tileUrlPost: 'https://tiles.example.test/post',
      tileUrlPre: 'https://tiles.example.test/pre',
    };

    expect(getBoundarySourceDefinitions(envWithoutIslands).map(source => source.id)).not.toContain(
      boundarySourceIds.islands,
    );
    expect(
      getBoundaryLayerDefinitions('vi', initialMapViewState, {
        includeOffshoreIslands: false,
      }).map(definition => definition.layer.id),
    ).not.toContain('offshore-islands-fill');
    expect(getBoundaryLayerGroups(false).map(group => group.id)).toEqual([
      'pre-provinces',
      'post-provinces',
    ]);
  });
});
