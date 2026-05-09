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
  postFill: 'provinces-post-fill',
  postLabel: 'provinces-post-label',
  postOutline: 'provinces-post-outline',
  preFill: 'provinces-pre-fill',
  preLabel: 'provinces-pre-label',
  preOutline: 'provinces-pre-outline',
} as const;

const boundarySourceLayers = {
  islands: 'vn_offshore_islands',
  post: 'vn_provinces_post_2025',
  pre: 'vn_provinces_pre_2025',
} as const;

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
    layerIds: [boundaryLayerIds.preFill, boundaryLayerIds.preOutline, boundaryLayerIds.preLabel],
  },
  {
    id: 'post-provinces',
    isVisible: state => state.mode === 'post',
    layerIds: [boundaryLayerIds.postFill, boundaryLayerIds.postOutline, boundaryLayerIds.postLabel],
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

function getProvinceLayerDefinitions(state: MapViewState): BoundaryLayerDefinition[] {
  const preVisible = state.mode === 'pre';
  const postVisible = state.mode === 'post';

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
        id: boundaryLayerIds.preLabel,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': ['get', 'name'],
          'text-ignore-placement': false,
          'text-size': 13,
          visibility: preVisible ? 'visible' : 'none',
        },
        paint: {
          'text-color': '#d44',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
        },
        source: boundarySourceIds.preLabels,
        type: 'symbol',
      },
    },
    {
      groupId: 'post-provinces',
      layer: {
        id: boundaryLayerIds.postLabel,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': ['get', 'name'],
          'text-ignore-placement': false,
          'text-size': 13,
          visibility: postVisible ? 'visible' : 'none',
        },
        paint: {
          'text-color': '#2563eb',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
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
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 12, 7, 15],
          visibility: islandsVisible ? 'visible' : 'none',
        },
        minzoom: 4,
        paint: {
          'text-color': '#0f766e',
          'text-halo-blur': 0.5,
          'text-halo-color': '#fff',
          'text-halo-width': 2.5,
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
  const provinceLayers = getProvinceLayerDefinitions(state);

  if (options.includeOffshoreIslands === false) {
    return provinceLayers;
  }

  return [...provinceLayers, ...getOffshoreIslandLayerDefinitions(locale, state)];
}
