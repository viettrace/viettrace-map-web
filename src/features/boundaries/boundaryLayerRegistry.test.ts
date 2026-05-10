import { describe, expect, it } from 'vitest';
import type maplibregl from 'maplibre-gl';
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
  tileUrlPostWardsCandidate: 'https://tiles.example.test/post-wards',
  tileUrlPost: 'https://tiles.example.test/post',
  tileUrlPreDistrictsCandidate: 'https://tiles.example.test/pre-districts',
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
      layers: { ...initialMapViewState.layers, offshoreIslands: false },
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

  it('uses localized province label fields', () => {
    const viLabel = getBoundaryLayerDefinitions('vi', initialMapViewState).find(
      definition => definition.layer.id === 'provinces-pre-label',
    )?.layer as maplibregl.SymbolLayerSpecification | undefined;
    const enLabel = getBoundaryLayerDefinitions('en', initialMapViewState).find(
      definition => definition.layer.id === 'provinces-pre-label',
    )?.layer as maplibregl.SymbolLayerSpecification | undefined;

    expect(viLabel?.layout?.['text-field']).toEqual(['get', 'name']);
    expect(enLabel?.layout?.['text-field']).toEqual(['get', 'name_en']);
  });

  it('adds a national capital marker for province labels', () => {
    const capitalMarker = getBoundaryLayerDefinitions('en', initialMapViewState).find(
      definition => definition.layer.id === 'provinces-pre-national-capital-marker',
    )?.layer as maplibregl.SymbolLayerSpecification | undefined;

    expect(capitalMarker?.filter).toEqual(['==', ['get', 'is_capital'], true]);
    expect(capitalMarker?.minzoom).toBe(4.35);
    expect(capitalMarker?.layout?.['icon-image']).toBe('national-capital-star');
    expect(capitalMarker?.layout?.['icon-offset']).toEqual([0, -13]);
    expect(capitalMarker?.layout?.['icon-size']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      4.35,
      1.1,
      7,
      1.3,
    ]);
    expect(capitalMarker?.paint?.['icon-opacity']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      4.35,
      0,
      4.75,
      1,
    ]);

    const capitalLabel = getBoundaryLayerDefinitions('en', initialMapViewState).find(
      definition => definition.layer.id === 'provinces-pre-national-capital-label',
    )?.layer as maplibregl.SymbolLayerSpecification | undefined;

    expect(capitalLabel?.filter).toEqual(['==', ['get', 'is_capital'], true]);
    expect(capitalLabel?.minzoom).toBe(4.35);
    expect(capitalLabel?.layout?.['text-allow-overlap']).toBe(true);
    expect(capitalLabel?.layout?.['text-field']).toEqual(['get', 'name_en']);
  });

  it('uses zoom gates so default zoom shows national capital and city labels first', () => {
    const layers = getBoundaryLayerDefinitions('en', initialMapViewState);
    const preLabel = layers.find(definition => definition.layer.id === 'provinces-pre-label')
      ?.layer as maplibregl.SymbolLayerSpecification | undefined;
    const preCityLabel = layers.find(
      definition => definition.layer.id === 'provinces-pre-city-label',
    )?.layer as maplibregl.SymbolLayerSpecification | undefined;
    const postLabel = layers.find(definition => definition.layer.id === 'provinces-post-label')
      ?.layer as maplibregl.SymbolLayerSpecification | undefined;
    const postCityLabel = layers.find(
      definition => definition.layer.id === 'provinces-post-city-label',
    )?.layer as maplibregl.SymbolLayerSpecification | undefined;
    const islandLabel = layers.find(definition => definition.layer.id === 'offshore-islands-label')
      ?.layer as maplibregl.SymbolLayerSpecification | undefined;

    expect(preLabel?.filter).toEqual([
      'all',
      ['!=', ['get', 'is_capital'], true],
      ['!=', ['get', 'is_city'], true],
    ]);
    expect(preLabel?.minzoom).toBe(5.25);
    expect(preLabel?.paint?.['text-opacity']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      5.25,
      0,
      6.05,
      1,
    ]);
    expect(preCityLabel?.filter).toEqual([
      'all',
      ['==', ['get', 'is_city'], true],
      ['!=', ['get', 'is_capital'], true],
    ]);
    expect(preCityLabel?.minzoom).toBe(4.35);
    expect(preCityLabel?.paint?.['text-opacity']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      4.35,
      0,
      5,
      1,
    ]);
    expect(postLabel?.filter).toEqual([
      'all',
      ['!=', ['get', 'is_capital'], true],
      ['!=', ['get', 'is_city'], true],
    ]);
    expect(postLabel?.minzoom).toBe(5.05);
    expect(postLabel?.paint?.['text-opacity']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      5.05,
      0,
      5.8,
      1,
    ]);
    expect(postCityLabel?.filter).toEqual([
      'all',
      ['==', ['get', 'is_city'], true],
      ['!=', ['get', 'is_capital'], true],
    ]);
    expect(postCityLabel?.minzoom).toBe(4.35);
    expect(postCityLabel?.paint?.['text-opacity']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      4.35,
      0,
      5,
      1,
    ]);
    expect(islandLabel?.minzoom).toBe(5.25);
    expect(islandLabel?.paint?.['text-opacity']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      5.25,
      0,
      5.95,
      1,
    ]);
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

  it('adds local candidate sources and layers only when configured', () => {
    const sources = getBoundarySourceDefinitions(env);
    const preCandidateSource = sources.find(
      source => source.id === boundarySourceIds.preDistrictsCandidate,
    )?.source as { tiles: string[] } | undefined;
    const postCandidateSource = sources.find(
      source => source.id === boundarySourceIds.postWardsCandidate,
    )?.source as { tiles: string[] } | undefined;
    const state = {
      ...initialMapViewState,
      layers: { ...initialMapViewState.layers, nestedCandidates: true },
      mode: 'post' as const,
    };
    const layers = getBoundaryLayerDefinitions('vi', state, {
      includePostWardCandidates: true,
      includePreDistrictCandidates: true,
    });

    expect(preCandidateSource?.tiles[0]).toBe(
      'https://tiles.example.test/pre-districts/{z}/{x}/{y}?v=20260509-display',
    );
    expect(postCandidateSource?.tiles[0]).toBe(
      'https://tiles.example.test/post-wards/{z}/{x}/{y}?v=20260509-display',
    );
    expect(
      layers.find(definition => definition.layer.id === 'wards-post-2025-candidate-outline')?.layer
        .layout,
    ).toMatchObject({ visibility: 'visible' });
    expect(
      layers.find(definition => definition.layer.id === 'districts-pre-2025-candidate-outline')
        ?.layer.layout,
    ).toMatchObject({ visibility: 'none' });
    expect(
      getBoundaryLayerGroups({
        includePostWardCandidates: true,
        includePreDistrictCandidates: true,
      }).map(group => group.id),
    ).toEqual([
      'pre-provinces',
      'post-provinces',
      'offshore-islands',
      'pre-districts-candidate',
      'post-wards-candidate',
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
    expect(getBoundarySourceDefinitions(envWithoutIslands).map(source => source.id)).not.toContain(
      boundarySourceIds.preDistrictsCandidate,
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
