import type maplibregl from 'maplibre-gl';
import type { MapMode, MapViewState } from '@src/features/map-state/mapViewTypes';
import type { PublicEnv } from '@src/libs/config/publicEnv';
import { buildTileTemplate } from '@src/libs/maplibre/tileUrl';

export const boundarySourceIds = {
  islands: 'vn-offshore-islands',
  islandLabels: 'offshore-island-labels',
  post: 'vn-provinces-post',
  postLabels: 'province-labels-post',
  pre: 'vn-provinces-pre',
  preLabels: 'province-labels-pre',
} as const;

const boundaryLayerIds = {
  islandsFill: 'offshore-islands-fill',
  islandsLabel: 'offshore-islands-label',
  islandsOutline: 'offshore-islands-outline',
  islandsOutlineHalo: 'offshore-islands-outline-halo',
  postCityLabel: 'provinces-post-city-label',
  postFill: 'provinces-post-fill',
  postNationalCapitalLabel: 'provinces-post-national-capital-label',
  postNationalCapitalMarker: 'provinces-post-national-capital-marker',
  postLabel: 'provinces-post-label',
  postOutline: 'provinces-post-outline',
  preCityLabel: 'provinces-pre-city-label',
  preFill: 'provinces-pre-fill',
  preNationalCapitalLabel: 'provinces-pre-national-capital-label',
  preNationalCapitalMarker: 'provinces-pre-national-capital-marker',
  preLabel: 'provinces-pre-label',
  preOutline: 'provinces-pre-outline',
} as const;

const boundarySourceLayers = {
  islands: 'vn_offshore_islands',
  post: 'vn_provinces_post_2025',
  pre: 'vn_provinces_pre_2025',
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
  postProvinces: {
    full: 5.8,
    min: 5.05,
  },
  preProvinces: {
    full: 6.05,
    min: 5.25,
  },
} as const;

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
}

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

export function getBoundaryLayerGroups(includeOffshoreIslands: boolean): BoundaryLayerGroup[] {
  return includeOffshoreIslands
    ? [...provinceBoundaryLayerGroups, offshoreIslandLayerGroup]
    : provinceBoundaryLayerGroups;
}

export const boundaryLayerGroups = getBoundaryLayerGroups(true);

export function getProvinceHitLayerId(mode: MapMode) {
  return mode === 'pre' ? boundaryLayerIds.preFill : boundaryLayerIds.postFill;
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
    return sourceDefinitions;
  }

  return [
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
  ];
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
        paint: { 'line-color': '#d44', 'line-width': 1.5 },
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
        paint: { 'line-color': '#3388ff', 'line-width': 1.5 },
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

  return [
    {
      groupId: 'offshore-islands',
      layer: {
        id: boundaryLayerIds.islandsFill,
        layout: { visibility: islandsVisible ? 'visible' : 'none' },
        paint: { 'fill-color': '#0f766e', 'fill-opacity': 0.16 },
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
          'line-color': '#0f766e',
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
          'text-field': locale === 'en' ? ['get', 'name_en'] : ['get', 'name_vi'],
          'text-ignore-placement': true,
          'text-size': zoomRamp(labelZoomStops.offshoreIslands.min, 12, 7, 15),
          visibility: islandsVisible ? 'visible' : 'none',
        },
        minzoom: labelZoomStops.offshoreIslands.min,
        paint: {
          'text-color': '#0f766e',
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

export function getBoundaryLayerDefinitions(
  locale: string,
  state: MapViewState,
  options: BoundaryLayerOptions = {},
): BoundaryLayerDefinition[] {
  const provinceLayers = getProvinceLayerDefinitions(locale, state);

  if (options.includeOffshoreIslands === false) {
    return provinceLayers;
  }

  return [...provinceLayers, ...getOffshoreIslandLayerDefinitions(locale, state)];
}
