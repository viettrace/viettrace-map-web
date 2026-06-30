import { describe, expect, it } from 'vitest';
import type maplibregl from 'maplibre-gl';
import { initialMapViewState } from '@src/features/map-state/mapViewReducer';
import type { PublicEnv } from '@src/libs/config/publicEnv';
import {
  boundaryLayerGroups,
  boundarySourceIds,
  dropWithinClause,
  getBoundaryLayerDefinitions,
  getBoundaryLayerGroups,
  getBoundarySourceDefinitions,
  getNestedCandidateBasemapPlaceLayerIds,
  getProvinceHitLayerId,
} from './boundaryLayerRegistry';

const env: PublicEnv = {
  enableQaLayers: true,
  mapStyle: 'style',
  tileCacheBuster: '20260509-display',
  tileUrlIslands: 'https://tiles.example.test/islands',
  tileUrlPostWardsCandidateLabels: 'https://tiles.example.test/post-ward-labels',
  tileUrlPostWardsCandidate: 'https://tiles.example.test/post-wards',
  tileUrlPost: 'https://tiles.example.test/post',
  tileUrlPreDistrictsCandidateLabels: 'https://tiles.example.test/pre-district-labels',
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

  it('hides offshore boundary visuals but keeps the archipelago label when boundaries are OFF', () => {
    const state = {
      ...initialMapViewState,
      layers: { ...initialMapViewState.layers, boundaries: false, offshoreIslands: true },
      mode: 'post' as const,
    };
    const layers = getBoundaryLayerDefinitions('vi', state);
    const visibilityOf = (id: string) =>
      layers.find(definition => definition.layer.id === id)?.layer.layout?.visibility;

    // Boundary visuals follow the OSM-boundaries toggle → hidden when OFF.
    expect(visibilityOf('offshore-islands-fill')).toBe('none');
    // The Hoàng Sa/Trường Sa archipelago label stays on regardless of the toggle (sovereignty).
    expect(visibilityOf('offshore-islands-label')).toBe('visible');

    // The two groups encode the same split.
    const groups = getBoundaryLayerGroups(true);
    expect(groups.find(group => group.id === 'offshore-islands')?.isVisible(state)).toBe(false);
    expect(groups.find(group => group.id === 'offshore-islands-label')?.isVisible(state)).toBe(
      true,
    );
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
    expect(capitalMarker?.minzoom).toBe(4.0);
    expect(capitalMarker?.layout?.['icon-image']).toBe('national-capital-star');
    expect(capitalMarker?.layout?.['icon-offset']).toEqual([0, -13]);
    expect(capitalMarker?.layout?.['icon-size']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      4.0,
      1.1,
      7,
      1.3,
    ]);
    expect(capitalMarker?.paint?.['icon-opacity']).toBe(1);

    const capitalLabel = getBoundaryLayerDefinitions('en', initialMapViewState).find(
      definition => definition.layer.id === 'provinces-pre-national-capital-label',
    )?.layer as maplibregl.SymbolLayerSpecification | undefined;

    expect(capitalLabel?.filter).toEqual(['==', ['get', 'is_capital'], true]);
    expect(capitalLabel?.minzoom).toBe(4.0);
    // Capital label now reserves collision space (was ignore-placement) so wards don't paint over it.
    expect(capitalLabel?.layout?.['text-allow-overlap']).toBe(false);
    expect(capitalLabel?.layout?.['text-ignore-placement']).toBe(false);
    expect(capitalLabel?.layout?.['symbol-sort-key']).toBe(1);
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
    expect(preLabel?.minzoom).toBe(4.75);
    // No fade — constant full opacity; hard show at minzoom, hard cut at maxzoom 12.
    expect(preLabel?.paint?.['text-opacity']).toBe(1);
    expect(preLabel?.layout?.['symbol-sort-key']).toBe(3);
    expect(preCityLabel?.filter).toEqual([
      'all',
      ['==', ['get', 'is_city'], true],
      ['!=', ['get', 'is_capital'], true],
    ]);
    expect(preCityLabel?.minzoom).toBe(4.0);
    expect(preCityLabel?.paint?.['text-opacity']).toBe(1);
    expect(preCityLabel?.layout?.['text-allow-overlap']).toBe(false);
    expect(preCityLabel?.layout?.['symbol-sort-key']).toBe(2);
    expect(postLabel?.filter).toEqual([
      'all',
      ['!=', ['get', 'is_capital'], true],
      ['!=', ['get', 'is_city'], true],
    ]);
    expect(postLabel?.minzoom).toBe(4.5);
    expect(postLabel?.paint?.['text-opacity']).toBe(1);
    expect(postLabel?.layout?.['symbol-sort-key']).toBe(3);
    expect(postCityLabel?.filter).toEqual([
      'all',
      ['==', ['get', 'is_city'], true],
      ['!=', ['get', 'is_capital'], true],
    ]);
    expect(postCityLabel?.minzoom).toBe(4.0);
    expect(postCityLabel?.paint?.['text-opacity']).toBe(1);
    expect(postCityLabel?.layout?.['text-allow-overlap']).toBe(false);
    // Offshore (Hoàng Sa/Trường Sa) labels appear at overview zoom now (was 5.25); no fade.
    expect(islandLabel?.minzoom).toBe(3.5);
    expect(islandLabel?.paint?.['text-opacity']).toBe(1);
  });

  it('keeps hit layers and group visibility centralized', () => {
    expect(getProvinceHitLayerId('pre')).toBe('provinces-pre-fill');
    expect(getProvinceHitLayerId('post')).toBe('provinces-post-fill');
    expect(boundaryLayerGroups.map(group => group.id)).toEqual([
      'pre-provinces',
      'post-provinces',
      'offshore-islands',
      'offshore-islands-label',
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
    const preCandidateLabelSource = sources.find(
      source => source.id === boundarySourceIds.preDistrictsCandidateLabels,
    )?.source as { tiles: string[] } | undefined;
    const postCandidateLabelSource = sources.find(
      source => source.id === boundarySourceIds.postWardsCandidateLabels,
    )?.source as { tiles: string[] } | undefined;
    const state = {
      ...initialMapViewState,
      layers: { ...initialMapViewState.layers, nestedCandidates: true },
      mode: 'post' as const,
    };
    const layers = getBoundaryLayerDefinitions('vi', state, {
      includePostWardCandidates: true,
      includePostWardCandidateLabels: true,
      includePreDistrictCandidates: true,
      includePreDistrictCandidateLabels: true,
    });

    expect(preCandidateSource?.tiles[0]).toBe(
      'https://tiles.example.test/pre-districts/{z}/{x}/{y}?v=20260509-display',
    );
    expect(postCandidateSource?.tiles[0]).toBe(
      'https://tiles.example.test/post-wards/{z}/{x}/{y}?v=20260509-display',
    );
    expect(preCandidateLabelSource?.tiles[0]).toBe(
      'https://tiles.example.test/pre-district-labels/{z}/{x}/{y}?v=20260509-display',
    );
    expect(postCandidateLabelSource?.tiles[0]).toBe(
      'https://tiles.example.test/post-ward-labels/{z}/{x}/{y}?v=20260509-display',
    );
    expect(
      layers.find(definition => definition.layer.id === 'wards-post-2025-candidate-outline')?.layer
        .layout,
    ).toMatchObject({ visibility: 'visible' });
    expect(
      layers.find(definition => definition.layer.id === 'districts-pre-2025-candidate-outline')
        ?.layer.layout,
    ).toMatchObject({ visibility: 'none' });
    const postCandidateLabel = layers.find(
      definition => definition.layer.id === 'wards-post-2025-candidate-label',
    )?.layer as maplibregl.SymbolLayerSpecification | undefined;

    expect(postCandidateLabel?.source).toBe(boundarySourceIds.postWardsCandidateLabels);
    expect(postCandidateLabel?.['source-layer']).toBe('vn_wards_post_2025_candidate_labels');
    expect(postCandidateLabel?.minzoom).toBe(10.5);
    expect(
      getBoundaryLayerGroups({
        includePostWardCandidates: true,
        includePostWardCandidateLabels: true,
        includePreDistrictCandidates: true,
        includePreDistrictCandidateLabels: true,
      }).map(group => group.id),
    ).toEqual([
      'pre-provinces',
      'post-provinces',
      'offshore-islands',
      'offshore-islands-label',
      'pre-districts-candidate',
      'post-wards-candidate',
    ]);
  });

  it('omits candidate sources when QA layers are disabled', () => {
    const sources = getBoundarySourceDefinitions({
      ...env,
      enableQaLayers: false,
    });
    const sourceIds = sources.map(source => source.id);

    expect(sourceIds).not.toContain(boundarySourceIds.preDistrictsCandidate);
    expect(sourceIds).not.toContain(boundarySourceIds.preDistrictsCandidateLabels);
    expect(sourceIds).not.toContain(boundarySourceIds.postWardsCandidate);
    expect(sourceIds).not.toContain(boundarySourceIds.postWardsCandidateLabels);
  });

  it('tracks basemap place labels hidden during nested candidate QA', () => {
    expect(getNestedCandidateBasemapPlaceLayerIds()).toEqual([
      'place_city_dot_r4',
      'place_city_dot_r7',
      'place_city_dot_z7',
      'place_capital_dot_z7',
      'place_city_r5',
      'place_city_r6',
      'place_town',
      'place_villages',
      'place_suburbs',
      'place_hamlet',
    ]);
  });

  it('omits offshore island sources and layers when the tile URL is not configured', () => {
    const envWithoutIslands = {
      enableQaLayers: false,
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

describe('dropWithinClause', () => {
  const within = ['!', ['within', { type: 'Polygon', coordinates: [] }]];

  it('strips a trailing OUTSIDE_VN within clause, keeping the class conditions', () => {
    const onFilter = [
      'all',
      ['==', ['get', 'class'], 'city'],
      ['!=', ['get', 'capital'], 2],
      within,
    ] as unknown as maplibregl.FilterSpecification;
    expect(dropWithinClause(onFilter)).toEqual([
      'all',
      ['==', ['get', 'class'], 'city'],
      ['!=', ['get', 'capital'], 2],
    ]);
  });

  it('returns the filter unchanged when there is no trailing within clause', () => {
    const filter = [
      'all',
      ['==', ['get', 'class'], 'city'],
    ] as unknown as maplibregl.FilterSpecification;
    expect(dropWithinClause(filter)).toBe(filter);
  });
});
