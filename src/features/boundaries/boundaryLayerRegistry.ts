import type maplibregl from 'maplibre-gl';
import type { MapMode, MapViewState } from '@src/features/map-state/mapViewTypes';
import type { PublicEnv } from '@src/libs/config/publicEnv';
import { buildTileTemplate } from '@src/libs/maplibre/tileUrl';

export const boundarySourceIds = {
  islands: 'vn-offshore-islands',
  islandLabels: 'offshore-island-labels',
  post: 'vn-provinces-post',
  postWardsCandidateLabels: 'vn-wards-post-2025-candidate-labels',
  postWardsCandidate: 'vn-wards-post-2025-candidate',
  postLabels: 'province-labels-post',
  pre: 'vn-provinces-pre',
  preDistrictsCandidateLabels: 'vn-districts-pre-2025-candidate-labels',
  preDistrictsCandidate: 'vn-districts-pre-2025-candidate',
  preLabels: 'province-labels-pre',
} as const;

const boundaryLayerIds = {
  islandsFill: 'offshore-islands-fill',
  islandsLabel: 'offshore-islands-label',
  islandsOutline: 'offshore-islands-outline',
  islandsOutlineHalo: 'offshore-islands-outline-halo',
  postCityLabel: 'provinces-post-city-label',
  postWardsCandidateFill: 'wards-post-2025-candidate-fill',
  postWardsCandidateLabel: 'wards-post-2025-candidate-label',
  postWardsCandidateOutline: 'wards-post-2025-candidate-outline',
  postFill: 'provinces-post-fill',
  postNationalCapitalLabel: 'provinces-post-national-capital-label',
  postNationalCapitalMarker: 'provinces-post-national-capital-marker',
  postLabel: 'provinces-post-label',
  postOutline: 'provinces-post-outline',
  preCityLabel: 'provinces-pre-city-label',
  preDistrictsCandidateFill: 'districts-pre-2025-candidate-fill',
  preDistrictsCandidateLabel: 'districts-pre-2025-candidate-label',
  preDistrictsCandidateOutline: 'districts-pre-2025-candidate-outline',
  preFill: 'provinces-pre-fill',
  preNationalCapitalLabel: 'provinces-pre-national-capital-label',
  preNationalCapitalMarker: 'provinces-pre-national-capital-marker',
  preLabel: 'provinces-pre-label',
  preOutline: 'provinces-pre-outline',
} as const;

const boundarySourceLayers = {
  islands: 'vn_offshore_islands',
  post: 'vn_provinces_post_2025',
  postWardsCandidateLabels: 'vn_wards_post_2025_candidate_labels',
  postWardsCandidate: 'vn_wards_post_2025_candidate',
  pre: 'vn_provinces_pre_2025',
  preDistrictsCandidateLabels: 'vn_districts_pre_2025_candidate_labels',
  preDistrictsCandidate: 'vn_districts_pre_2025_candidate',
} as const;

const labelZoomStops = {
  cityLabels: {
    full: 5,
    min: 4.35,
  },
  nationalCapital: {
    full: 4.75,
    min: 4.35,
  },
  offshoreIslands: {
    full: 5.95,
    min: 5.25,
  },
  postWardCandidates: {
    full: 10.75,
    min: 9.75,
  },
  postProvinces: {
    full: 5.8,
    min: 5.05,
  },
  preDistrictCandidates: {
    full: 8.75,
    min: 7.75,
  },
  preProvinces: {
    full: 6.05,
    min: 5.25,
  },
} as const;

const nestedCandidateBasemapPlaceLayerIds = [
  'place_hamlet',
  'place_suburbs',
  'place_villages',
  'place_town',
] as const;

type ZoomRampExpression = ['interpolate', ['linear'], ['zoom'], number, number, number, number];

interface BoundarySourceDefinition {
  id: string;
  source: maplibregl.SourceSpecification;
}

interface BoundaryLayerDefinition {
  groupId: string;
  layer: maplibregl.LayerSpecification;
}

interface BoundaryLayerGroup {
  id: string;
  isVisible: (state: MapViewState) => boolean;
  layerIds: string[];
}

interface BoundaryLayerOptions {
  includeOffshoreIslands?: boolean;
  includePostWardCandidateLabels?: boolean;
  includePostWardCandidates?: boolean;
  includePreDistrictCandidateLabels?: boolean;
  includePreDistrictCandidates?: boolean;
}

type BoundaryLayerGroupOptions = boolean | BoundaryLayerOptions;

const provinceBoundaryLayerGroups: BoundaryLayerGroup[] = [
  {
    id: 'pre-provinces',
    isVisible: state => state.mode === 'pre',
    layerIds: [
      boundaryLayerIds.preFill,
      boundaryLayerIds.preOutline,
      boundaryLayerIds.preLabel,
      boundaryLayerIds.preCityLabel,
      boundaryLayerIds.preNationalCapitalMarker,
      boundaryLayerIds.preNationalCapitalLabel,
    ],
  },
  {
    id: 'post-provinces',
    isVisible: state => state.mode === 'post',
    layerIds: [
      boundaryLayerIds.postFill,
      boundaryLayerIds.postOutline,
      boundaryLayerIds.postLabel,
      boundaryLayerIds.postCityLabel,
      boundaryLayerIds.postNationalCapitalMarker,
      boundaryLayerIds.postNationalCapitalLabel,
    ],
  },
];

const offshoreIslandLayerGroup: BoundaryLayerGroup = {
  id: 'offshore-islands',
  isVisible: state => state.layers.offshoreIslands,
  layerIds: [
    boundaryLayerIds.islandsFill,
    boundaryLayerIds.islandsOutlineHalo,
    boundaryLayerIds.islandsOutline,
    boundaryLayerIds.islandsLabel,
  ],
};

const preDistrictCandidateLayerGroup: BoundaryLayerGroup = {
  id: 'pre-districts-candidate',
  isVisible: state => state.mode === 'pre' && state.layers.nestedCandidates,
  layerIds: [
    boundaryLayerIds.preDistrictsCandidateFill,
    boundaryLayerIds.preDistrictsCandidateOutline,
    boundaryLayerIds.preDistrictsCandidateLabel,
  ],
};

const postWardCandidateLayerGroup: BoundaryLayerGroup = {
  id: 'post-wards-candidate',
  isVisible: state => state.mode === 'post' && state.layers.nestedCandidates,
  layerIds: [
    boundaryLayerIds.postWardsCandidateFill,
    boundaryLayerIds.postWardsCandidateOutline,
    boundaryLayerIds.postWardsCandidateLabel,
  ],
};

function normalizeLayerOptions(options: BoundaryLayerGroupOptions = {}): BoundaryLayerOptions {
  return typeof options === 'boolean' ? { includeOffshoreIslands: options } : options;
}

export function getBoundaryLayerGroups(
  options: BoundaryLayerGroupOptions = {},
): BoundaryLayerGroup[] {
  const normalizedOptions = normalizeLayerOptions(options);
  const groups = [...provinceBoundaryLayerGroups];

  if (normalizedOptions.includeOffshoreIslands !== false) {
    groups.push(offshoreIslandLayerGroup);
  }

  if (normalizedOptions.includePreDistrictCandidates) {
    groups.push(preDistrictCandidateLayerGroup);
  }

  if (
    normalizedOptions.includePreDistrictCandidateLabels &&
    !normalizedOptions.includePreDistrictCandidates
  ) {
    groups.push(preDistrictCandidateLayerGroup);
  }

  if (normalizedOptions.includePostWardCandidates) {
    groups.push(postWardCandidateLayerGroup);
  }

  if (
    normalizedOptions.includePostWardCandidateLabels &&
    !normalizedOptions.includePostWardCandidates
  ) {
    groups.push(postWardCandidateLayerGroup);
  }

  return groups;
}

export const boundaryLayerGroups = getBoundaryLayerGroups(true);

export function getProvinceHitLayerId(mode: MapMode) {
  return mode === 'pre' ? boundaryLayerIds.preFill : boundaryLayerIds.postFill;
}

export function getNestedCandidateBasemapPlaceLayerIds(): string[] {
  return [...nestedCandidateBasemapPlaceLayerIds];
}

function zoomRamp(
  minZoom: number,
  minValue: number,
  fullZoom: number,
  fullValue: number,
): ZoomRampExpression {
  return ['interpolate', ['linear'], ['zoom'], minZoom, minValue, fullZoom, fullValue];
}

export function getBoundarySourceDefinitions(env: PublicEnv): BoundarySourceDefinition[] {
  const sourceDefinitions: BoundarySourceDefinition[] = [
    {
      id: boundarySourceIds.pre,
      source: {
        maxzoom: 10,
        minzoom: 0,
        tiles: [buildTileTemplate(env.tileUrlPre, env.tileCacheBuster)],
        type: 'vector',
      },
    },
    {
      id: boundarySourceIds.post,
      source: {
        maxzoom: 10,
        minzoom: 0,
        tiles: [buildTileTemplate(env.tileUrlPost, env.tileCacheBuster)],
        type: 'vector',
      },
    },
    {
      id: boundarySourceIds.preLabels,
      source: {
        data: '/data/province-labels-pre.json',
        type: 'geojson',
      },
    },
    {
      id: boundarySourceIds.postLabels,
      source: {
        data: '/data/province-labels-post.json',
        type: 'geojson',
      },
    },
  ];

  if (!env.tileUrlIslands) {
    return getNestedCandidateSourceDefinitions(env, sourceDefinitions);
  }

  return getNestedCandidateSourceDefinitions(env, [
    ...sourceDefinitions,
    {
      id: boundarySourceIds.islandLabels,
      source: {
        data: '/data/offshore-island-labels.json',
        type: 'geojson',
      },
    },
    {
      id: boundarySourceIds.islands,
      source: {
        maxzoom: 10,
        minzoom: 0,
        tiles: [buildTileTemplate(env.tileUrlIslands, env.tileCacheBuster)],
        type: 'vector',
      },
    },
  ]);
}

function getNestedCandidateSourceDefinitions(
  env: PublicEnv,
  sourceDefinitions: BoundarySourceDefinition[],
): BoundarySourceDefinition[] {
  const nestedSourceDefinitions = [...sourceDefinitions];

  if (env.pmtilesUrlPreDistrictsCandidate) {
    nestedSourceDefinitions.push({
      id: boundarySourceIds.preDistrictsCandidate,
      source: {
        maxzoom: 12,
        minzoom: 0,
        type: 'vector',
        url: `pmtiles://${env.pmtilesUrlPreDistrictsCandidate}`,
      },
    });
  } else if (env.enableQaLayers && env.tileUrlPreDistrictsCandidate) {
    nestedSourceDefinitions.push({
      id: boundarySourceIds.preDistrictsCandidate,
      source: {
        maxzoom: 12,
        minzoom: 0,
        tiles: [buildTileTemplate(env.tileUrlPreDistrictsCandidate, env.tileCacheBuster)],
        type: 'vector',
      },
    });
  }

  if (env.pmtilesUrlPreDistrictsCandidateLabels) {
    nestedSourceDefinitions.push({
      id: boundarySourceIds.preDistrictsCandidateLabels,
      source: {
        maxzoom: 12,
        minzoom: 0,
        type: 'vector',
        url: `pmtiles://${env.pmtilesUrlPreDistrictsCandidateLabels}`,
      },
    });
  } else if (env.enableQaLayers && env.tileUrlPreDistrictsCandidateLabels) {
    nestedSourceDefinitions.push({
      id: boundarySourceIds.preDistrictsCandidateLabels,
      source: {
        maxzoom: 12,
        minzoom: 0,
        tiles: [buildTileTemplate(env.tileUrlPreDistrictsCandidateLabels, env.tileCacheBuster)],
        type: 'vector',
      },
    });
  }

  if (env.pmtilesUrlPostWardsCandidate) {
    nestedSourceDefinitions.push({
      id: boundarySourceIds.postWardsCandidate,
      source: {
        maxzoom: 12,
        minzoom: 0,
        type: 'vector',
        url: `pmtiles://${env.pmtilesUrlPostWardsCandidate}`,
      },
    });
  } else if (env.enableQaLayers && env.tileUrlPostWardsCandidate) {
    nestedSourceDefinitions.push({
      id: boundarySourceIds.postWardsCandidate,
      source: {
        maxzoom: 12,
        minzoom: 0,
        tiles: [buildTileTemplate(env.tileUrlPostWardsCandidate, env.tileCacheBuster)],
        type: 'vector',
      },
    });
  }

  if (env.pmtilesUrlPostWardsCandidateLabels) {
    nestedSourceDefinitions.push({
      id: boundarySourceIds.postWardsCandidateLabels,
      source: {
        maxzoom: 12,
        minzoom: 0,
        type: 'vector',
        url: `pmtiles://${env.pmtilesUrlPostWardsCandidateLabels}`,
      },
    });
  } else if (env.enableQaLayers && env.tileUrlPostWardsCandidateLabels) {
    nestedSourceDefinitions.push({
      id: boundarySourceIds.postWardsCandidateLabels,
      source: {
        maxzoom: 12,
        minzoom: 0,
        tiles: [buildTileTemplate(env.tileUrlPostWardsCandidateLabels, env.tileCacheBuster)],
        type: 'vector',
      },
    });
  }

  return nestedSourceDefinitions;
}

function getProvinceLayerDefinitions(
  locale: string,
  state: MapViewState,
): BoundaryLayerDefinition[] {
  const preVisible = state.mode === 'pre';
  const postVisible = state.mode === 'post';
  const labelField = locale === 'en' ? 'name_en' : 'name';

  return [
    {
      groupId: 'pre-provinces',
      layer: {
        id: boundaryLayerIds.preFill,
        layout: { visibility: preVisible ? 'visible' : 'none' },
        paint: { 'fill-color': '#d44', 'fill-opacity': 0.1 },
        source: boundarySourceIds.pre,
        'source-layer': boundarySourceLayers.pre,
        type: 'fill',
      },
    },
    {
      groupId: 'pre-provinces',
      layer: {
        id: boundaryLayerIds.preOutline,
        layout: { visibility: preVisible ? 'visible' : 'none' },
        paint: {
          'line-color': '#d44',
          'line-opacity': 0.96,
          'line-width': zoomRamp(4.75, 1.45, 8.5, 2.25),
        },
        source: boundarySourceIds.pre,
        'source-layer': boundarySourceLayers.pre,
        type: 'line',
      },
    },
    {
      groupId: 'post-provinces',
      layer: {
        id: boundaryLayerIds.postFill,
        layout: { visibility: postVisible ? 'visible' : 'none' },
        paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.1 },
        source: boundarySourceIds.post,
        'source-layer': boundarySourceLayers.post,
        type: 'fill',
      },
    },
    {
      groupId: 'post-provinces',
      layer: {
        id: boundaryLayerIds.postOutline,
        layout: { visibility: postVisible ? 'visible' : 'none' },
        paint: {
          'line-color': '#3388ff',
          'line-opacity': 0.96,
          'line-width': zoomRamp(4.75, 1.45, 8.5, 2.25),
        },
        source: boundarySourceIds.post,
        'source-layer': boundarySourceLayers.post,
        type: 'line',
      },
    },
    {
      groupId: 'pre-provinces',
      layer: {
        filter: ['all', ['!=', ['get', 'is_capital'], true], ['!=', ['get', 'is_city'], true]],
        id: boundaryLayerIds.preLabel,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': ['get', labelField],
          'text-ignore-placement': false,
          'text-size': zoomRamp(labelZoomStops.preProvinces.min, 11.5, 7, 13),
          visibility: preVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.preProvinces.min,
        paint: {
          'text-color': '#d44',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          'text-opacity': zoomRamp(
            labelZoomStops.preProvinces.min,
            0,
            labelZoomStops.preProvinces.full,
            1,
          ),
        },
        source: boundarySourceIds.preLabels,
        type: 'symbol',
      },
    },
    {
      groupId: 'pre-provinces',
      layer: {
        filter: ['all', ['==', ['get', 'is_city'], true], ['!=', ['get', 'is_capital'], true]],
        id: boundaryLayerIds.preCityLabel,
        layout: {
          'text-allow-overlap': true,
          'text-anchor': 'center',
          'text-field': ['get', labelField],
          'text-ignore-placement': true,
          'text-size': zoomRamp(labelZoomStops.cityLabels.min, 11.5, 7, 13.5),
          visibility: preVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.cityLabels.min,
        paint: {
          'text-color': '#dc2626',
          'text-halo-color': '#fff',
          'text-halo-width': 2.15,
          'text-opacity': zoomRamp(
            labelZoomStops.cityLabels.min,
            0,
            labelZoomStops.cityLabels.full,
            1,
          ),
        },
        source: boundarySourceIds.preLabels,
        type: 'symbol',
      },
    },
    {
      groupId: 'pre-provinces',
      layer: {
        filter: ['==', ['get', 'is_capital'], true],
        id: boundaryLayerIds.preNationalCapitalMarker,
        layout: {
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
          'icon-image': 'national-capital-star',
          'icon-ignore-placement': true,
          'icon-offset': [0, -13],
          'icon-size': zoomRamp(labelZoomStops.nationalCapital.min, 1.1, 7, 1.3),
          visibility: preVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.nationalCapital.min,
        paint: {
          'icon-opacity': zoomRamp(
            labelZoomStops.nationalCapital.min,
            0,
            labelZoomStops.nationalCapital.full,
            1,
          ),
        },
        source: boundarySourceIds.preLabels,
        type: 'symbol',
      },
    },
    {
      groupId: 'pre-provinces',
      layer: {
        filter: ['==', ['get', 'is_capital'], true],
        id: boundaryLayerIds.preNationalCapitalLabel,
        layout: {
          'text-allow-overlap': true,
          'text-anchor': 'center',
          'text-field': ['get', labelField],
          'text-ignore-placement': true,
          'text-offset': [0, 1.1],
          'text-size': zoomRamp(labelZoomStops.nationalCapital.min, 13, 7, 15),
          visibility: preVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.nationalCapital.min,
        paint: {
          'text-color': '#b45309',
          'text-halo-color': '#fff',
          'text-halo-width': 2.25,
          'text-opacity': zoomRamp(
            labelZoomStops.nationalCapital.min,
            0,
            labelZoomStops.nationalCapital.full,
            1,
          ),
        },
        source: boundarySourceIds.preLabels,
        type: 'symbol',
      },
    },
    {
      groupId: 'post-provinces',
      layer: {
        filter: ['all', ['!=', ['get', 'is_capital'], true], ['!=', ['get', 'is_city'], true]],
        id: boundaryLayerIds.postLabel,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': ['get', labelField],
          'text-ignore-placement': false,
          'text-size': zoomRamp(labelZoomStops.postProvinces.min, 11.5, 7, 13),
          visibility: postVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.postProvinces.min,
        paint: {
          'text-color': '#2563eb',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          'text-opacity': zoomRamp(
            labelZoomStops.postProvinces.min,
            0,
            labelZoomStops.postProvinces.full,
            1,
          ),
        },
        source: boundarySourceIds.postLabels,
        type: 'symbol',
      },
    },
    {
      groupId: 'post-provinces',
      layer: {
        filter: ['all', ['==', ['get', 'is_city'], true], ['!=', ['get', 'is_capital'], true]],
        id: boundaryLayerIds.postCityLabel,
        layout: {
          'text-allow-overlap': true,
          'text-anchor': 'center',
          'text-field': ['get', labelField],
          'text-ignore-placement': true,
          'text-size': zoomRamp(labelZoomStops.cityLabels.min, 11.5, 7, 13.5),
          visibility: postVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.cityLabels.min,
        paint: {
          'text-color': '#2563eb',
          'text-halo-color': '#fff',
          'text-halo-width': 2.15,
          'text-opacity': zoomRamp(
            labelZoomStops.cityLabels.min,
            0,
            labelZoomStops.cityLabels.full,
            1,
          ),
        },
        source: boundarySourceIds.postLabels,
        type: 'symbol',
      },
    },
    {
      groupId: 'post-provinces',
      layer: {
        filter: ['==', ['get', 'is_capital'], true],
        id: boundaryLayerIds.postNationalCapitalMarker,
        layout: {
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
          'icon-image': 'national-capital-star',
          'icon-ignore-placement': true,
          'icon-offset': [0, -13],
          'icon-size': zoomRamp(labelZoomStops.nationalCapital.min, 1.1, 7, 1.3),
          visibility: postVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.nationalCapital.min,
        paint: {
          'icon-opacity': zoomRamp(
            labelZoomStops.nationalCapital.min,
            0,
            labelZoomStops.nationalCapital.full,
            1,
          ),
        },
        source: boundarySourceIds.postLabels,
        type: 'symbol',
      },
    },
    {
      groupId: 'post-provinces',
      layer: {
        filter: ['==', ['get', 'is_capital'], true],
        id: boundaryLayerIds.postNationalCapitalLabel,
        layout: {
          'text-allow-overlap': true,
          'text-anchor': 'center',
          'text-field': ['get', labelField],
          'text-ignore-placement': true,
          'text-offset': [0, 1.1],
          'text-size': zoomRamp(labelZoomStops.nationalCapital.min, 13, 7, 15),
          visibility: postVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.nationalCapital.min,
        paint: {
          'text-color': '#b45309',
          'text-halo-color': '#fff',
          'text-halo-width': 2.25,
          'text-opacity': zoomRamp(
            labelZoomStops.nationalCapital.min,
            0,
            labelZoomStops.nationalCapital.full,
            1,
          ),
        },
        source: boundarySourceIds.postLabels,
        type: 'symbol',
      },
    },
  ];
}

function getOffshoreIslandLayerDefinitions(
  locale: string,
  state: MapViewState,
): BoundaryLayerDefinition[] {
  const islandsVisible = state.layers.offshoreIslands;
  // Match offshore islands styling and labels with the active mode.
  const fillColor = state.mode === 'pre' ? '#d44' : '#3388ff';
  const outlineColor = state.mode === 'pre' ? '#b91c1c' : '#1d4ed8';
  const labelColor = state.mode === 'pre' ? '#991b1b' : '#1e3a8a';
  // In post-2025 mode, Hoang Sa and Truong Sa are special administrative zones (Đặc khu).
  const labelExpression: maplibregl.ExpressionSpecification =
    state.mode === 'post'
      ? locale === 'en'
        ? ['concat', 'Special Zone ', ['get', 'name_short_en']]
        : ['concat', 'Đặc khu ', ['get', 'name_short_vi']]
      : locale === 'en'
        ? ['get', 'name_en']
        : ['get', 'name_vi'];

  return [
    {
      groupId: 'offshore-islands',
      layer: {
        id: boundaryLayerIds.islandsFill,
        layout: { visibility: islandsVisible ? 'visible' : 'none' },
        paint: { 'fill-color': fillColor, 'fill-opacity': 0.1 },
        source: boundarySourceIds.islands,
        'source-layer': boundarySourceLayers.islands,
        type: 'fill',
      },
    },
    {
      groupId: 'offshore-islands',
      layer: {
        id: boundaryLayerIds.islandsOutlineHalo,
        layout: { visibility: islandsVisible ? 'visible' : 'none' },
        paint: {
          'line-color': '#f8fafc',
          'line-opacity': 0.95,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3, 7, 5],
        },
        source: boundarySourceIds.islands,
        'source-layer': boundarySourceLayers.islands,
        type: 'line',
      },
    },
    {
      groupId: 'offshore-islands',
      layer: {
        id: boundaryLayerIds.islandsOutline,
        layout: { visibility: islandsVisible ? 'visible' : 'none' },
        paint: {
          'line-color': outlineColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.5, 7, 2.25],
        },
        source: boundarySourceIds.islands,
        'source-layer': boundarySourceLayers.islands,
        type: 'line',
      },
    },
    {
      groupId: 'offshore-islands',
      layer: {
        id: boundaryLayerIds.islandsLabel,
        layout: {
          'text-allow-overlap': true,
          'text-anchor': 'center',
          'text-field': labelExpression,
          'text-ignore-placement': true,
          'text-size': zoomRamp(labelZoomStops.offshoreIslands.min, 12, 7, 15),
          visibility: islandsVisible ? 'visible' : 'none',
        },
        minzoom: labelZoomStops.offshoreIslands.min,
        paint: {
          'text-color': labelColor,
          'text-halo-blur': 0.5,
          'text-halo-color': '#fff',
          'text-halo-width': 2.5,
          'text-opacity': zoomRamp(
            labelZoomStops.offshoreIslands.min,
            0,
            labelZoomStops.offshoreIslands.full,
            1,
          ),
        },
        source: boundarySourceIds.islandLabels,
        type: 'symbol',
      },
    },
  ];
}

function getNestedCandidateLayerDefinitions(
  locale: string,
  state: MapViewState,
  options: BoundaryLayerOptions,
): BoundaryLayerDefinition[] {
  const preVisible =
    Boolean(options.includePreDistrictCandidates || options.includePreDistrictCandidateLabels) &&
    state.mode === 'pre' &&
    state.layers.nestedCandidates;
  const postVisible =
    Boolean(options.includePostWardCandidates || options.includePostWardCandidateLabels) &&
    state.mode === 'post' &&
    state.layers.nestedCandidates;
  const labelField: maplibregl.ExpressionSpecification =
    locale === 'en' ? ['coalesce', ['get', 'name_en'], ['get', 'name']] : ['get', 'name'];
  const layers: BoundaryLayerDefinition[] = [];

  if (options.includePreDistrictCandidates) {
    layers.push(
      {
        groupId: 'pre-districts-candidate',
        layer: {
          id: boundaryLayerIds.preDistrictsCandidateFill,
          layout: { visibility: preVisible ? 'visible' : 'none' },
          minzoom: 7,
          paint: { 'fill-color': '#d44', 'fill-opacity': 0.04 },
          source: boundarySourceIds.preDistrictsCandidate,
          'source-layer': boundarySourceLayers.preDistrictsCandidate,
          type: 'fill',
        },
      },
      {
        groupId: 'pre-districts-candidate',
        layer: {
          id: boundaryLayerIds.preDistrictsCandidateOutline,
          layout: { visibility: preVisible ? 'visible' : 'none' },
          minzoom: 7,
          paint: {
            'line-color': '#b91c1c',
            'line-opacity': zoomRamp(7, 0.35, 8.75, 0.72),
            'line-width': zoomRamp(7, 0.28, 10, 0.78),
          },
          source: boundarySourceIds.preDistrictsCandidate,
          'source-layer': boundarySourceLayers.preDistrictsCandidate,
          type: 'line',
        },
      },
    );
  }

  if (options.includePreDistrictCandidateLabels) {
    layers.push({
      groupId: 'pre-districts-candidate',
      layer: {
        filter: ['has', 'name'],
        id: boundaryLayerIds.preDistrictsCandidateLabel,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': labelField,
          'text-ignore-placement': false,
          'text-max-width': 8,
          'text-padding': 4,
          'text-size': zoomRamp(labelZoomStops.preDistrictCandidates.min, 11, 11, 13),
          visibility: preVisible ? 'visible' : 'none',
        },
        minzoom: labelZoomStops.preDistrictCandidates.min,
        paint: {
          'text-color': '#991b1b',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          'text-opacity': zoomRamp(
            labelZoomStops.preDistrictCandidates.min,
            0,
            labelZoomStops.preDistrictCandidates.full,
            1,
          ),
        },
        source: boundarySourceIds.preDistrictsCandidateLabels,
        'source-layer': boundarySourceLayers.preDistrictsCandidateLabels,
        type: 'symbol',
      },
    });
  }

  if (options.includePostWardCandidates) {
    layers.push(
      {
        groupId: 'post-wards-candidate',
        layer: {
          id: boundaryLayerIds.postWardsCandidateFill,
          layout: { visibility: postVisible ? 'visible' : 'none' },
          minzoom: 8,
          paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.03 },
          source: boundarySourceIds.postWardsCandidate,
          'source-layer': boundarySourceLayers.postWardsCandidate,
          type: 'fill',
        },
      },
      {
        groupId: 'post-wards-candidate',
        layer: {
          id: boundaryLayerIds.postWardsCandidateOutline,
          layout: { visibility: postVisible ? 'visible' : 'none' },
          minzoom: 8,
          paint: {
            'line-color': '#1d4ed8',
            'line-opacity': zoomRamp(8, 0.28, 10, 0.68),
            'line-width': zoomRamp(8, 0.22, 11, 0.62),
          },
          source: boundarySourceIds.postWardsCandidate,
          'source-layer': boundarySourceLayers.postWardsCandidate,
          type: 'line',
        },
      },
    );
  }

  if (options.includePostWardCandidateLabels) {
    layers.push({
      groupId: 'post-wards-candidate',
      layer: {
        filter: ['has', 'name'],
        id: boundaryLayerIds.postWardsCandidateLabel,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': labelField,
          'text-ignore-placement': false,
          'text-max-width': 7,
          'text-padding': 3,
          'text-size': zoomRamp(labelZoomStops.postWardCandidates.min, 10.5, 12, 12.5),
          visibility: postVisible ? 'visible' : 'none',
        },
        minzoom: labelZoomStops.postWardCandidates.min,
        paint: {
          'text-color': '#1e3a8a',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          'text-opacity': zoomRamp(
            labelZoomStops.postWardCandidates.min,
            0,
            labelZoomStops.postWardCandidates.full,
            1,
          ),
        },
        source: boundarySourceIds.postWardsCandidateLabels,
        'source-layer': boundarySourceLayers.postWardsCandidateLabels,
        type: 'symbol',
      },
    });
  }

  return layers;
}

const provinceFillLayerIds = new Set<string>([boundaryLayerIds.preFill, boundaryLayerIds.postFill]);
const nestedCandidateLabelLayerIds = new Set<string>([
  boundaryLayerIds.preDistrictsCandidateLabel,
  boundaryLayerIds.postWardsCandidateLabel,
]);

function hasLayerId(definition: BoundaryLayerDefinition, layerIds: Set<string>) {
  return layerIds.has(definition.layer.id);
}

export function getBoundaryLayerDefinitions(
  locale: string,
  state: MapViewState,
  options: BoundaryLayerOptions = {},
): BoundaryLayerDefinition[] {
  const provinceLayers = getProvinceLayerDefinitions(locale, state);
  const provinceFillLayers = provinceLayers.filter(definition =>
    hasLayerId(definition, provinceFillLayerIds),
  );
  const provincePriorityLayers = provinceLayers.filter(
    definition => !hasLayerId(definition, provinceFillLayerIds),
  );
  const nestedCandidateLayers = getNestedCandidateLayerDefinitions(locale, state, options);
  const nestedCandidateGeometryLayers = nestedCandidateLayers.filter(
    definition => !hasLayerId(definition, nestedCandidateLabelLayerIds),
  );
  const nestedCandidateLabelLayers = nestedCandidateLayers.filter(definition =>
    hasLayerId(definition, nestedCandidateLabelLayerIds),
  );
  const orderedLayers = [
    ...provinceFillLayers,
    ...nestedCandidateGeometryLayers,
    ...provincePriorityLayers,
    ...nestedCandidateLabelLayers,
  ];

  if (options.includeOffshoreIslands === false) {
    return orderedLayers;
  }

  return [
    ...provinceFillLayers,
    ...getOffshoreIslandLayerDefinitions(locale, state),
    ...nestedCandidateGeometryLayers,
    ...provincePriorityLayers,
    ...nestedCandidateLabelLayers,
  ];
}
