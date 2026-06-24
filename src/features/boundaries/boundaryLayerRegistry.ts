import type maplibregl from 'maplibre-gl';
import type { MapMode, MapViewState } from '@src/features/map-state/mapViewTypes';
import type { PublicEnv } from '@src/libs/config/publicEnv';
import { buildTileTemplate } from '@src/libs/maplibre/tileUrl';

export const boundarySourceIds = {
  islands: 'vn-offshore-islands',
  islandsReef: 'vn-offshore-reefs',
  islandsLand: 'vn-islands-land',
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

export const boundaryLayerIds = {
  islandsLandFill: 'islands-land-fill',
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

export const boundarySourceLayers = {
  islands: 'vn_offshore_islands',
  islandsReef: 'vn_offshore_reefs',
  islandsLand: 'vn_islands_fill',
  post: 'vn_provinces_post_2025',
  postWardsCandidateLabels: 'vn_wards_post_2025_candidate_labels',
  postWardsCandidate: 'vn_wards_post_2025_candidate',
  pre: 'vn_provinces_pre_2025',
  preDistrictsCandidateLabels: 'vn_districts_pre_2025_candidate_labels',
  preDistrictsCandidate: 'vn_districts_pre_2025_candidate',
} as const;

export const labelZoomStops = {
  cityLabels: {
    full: 4.75,
    min: 4.0,
  },
  nationalCapital: {
    full: 4.5,
    min: 4.0,
  },
  offshoreIslands: {
    full: 5.95,
    min: 5.25,
  },
  // Ward labels defer to z10.5+ so province (z5–9) → district (z8.5–11) → ward (z10.5+) hand off
  // cleanly instead of all competing for the same collision slots in the dense Red River Delta.
  postWardCandidates: {
    full: 11.5,
    min: 10.5,
  },
  postProvinces: {
    full: 5.5,
    min: 4.5,
  },
  // District labels defer to z8.5+ so provinces own the z5–9 overview (otherwise the ~700 district
  // labels flood in at z7 and out-collide the province labels — see image-120 regression).
  preDistrictCandidates: {
    full: 9.5,
    min: 8.5,
  },
  preProvinces: {
    full: 5.75,
    min: 4.75,
  },
} as const;

const nestedCandidateBasemapPlaceLayerIds = [
  // City dots/labels (zoom 5-7): appear before district labels and compete for space
  'place_city_dot_r4',
  'place_city_dot_r7',
  'place_city_dot_z7',
  'place_capital_dot_z7',
  // City name labels (zoom 8): overlap with dense urban district labels
  'place_city_r5',
  'place_city_r6',
  // Settlement labels (zoom 8-12)
  'place_town',
  'place_villages',
  'place_suburbs',
  'place_hamlet',
] as const;

export interface OffshoreIslandModeStyle {
  fillColor: string;
  labelColor: string;
  outlineColor: string;
}

export function getOffshoreIslandModeStyle(mode: MapMode): OffshoreIslandModeStyle {
  return mode === 'pre'
    ? { fillColor: '#d44', labelColor: '#991b1b', outlineColor: '#b91c1c' }
    : { fillColor: '#3388ff', labelColor: '#1e3a8a', outlineColor: '#1d4ed8' };
}

// Reef/shallows fill for the OSM-derived Hoàng Sa / Trường Sa reef polygons. A pale turquoise
// clearly lighter+greener than the basemap's teal sea (#a9cdd0), so each reef/atoll reads as
// shallows instead of open water. Mode-independent (a reef isn't political) — the red/blue
// OUTLINE + label carry the pre/post territorial signal. Eased off at close zoom so the
// basemap's own reef detail shows through.
const REEF_SHALLOWS_FILL = '#86d6c6';

// The offshore-islands overlay is the canonical Hoàng Sa / Trường Sa boundary (accurate OSM reef
// geometry). Exclude the archipelago special-zone/district gap-fills from the nested candidate
// layers — their coarser land-clipped geometry otherwise draws a second, offset boundary inside the
// offshore reef outline. Filter on the ASCII `name_en` (not the Vietnamese `name`, which fails on
// NFC/NFD normalization mismatches, nor `within`, which is unreliable for polygon features). These
// four name_en values are unique to the archipelago; mainland nested candidates are untouched.
const EXCLUDE_ARCHIPELAGO_FILTER = [
  'all',
  ['!=', ['get', 'name_en'], 'Hoang Sa District'],
  ['!=', ['get', 'name_en'], 'Truong Sa District'],
  ['!=', ['get', 'name_en'], 'Hoang Sa Special Zone'],
  ['!=', ['get', 'name_en'], 'Truong Sa Special Zone'],
] as maplibregl.ExpressionSpecification;

// Self-built OMT basemap settlement-label layers. The style generator bakes a spatial filter
// `['all', <class…>, ['!', ['within', VN_OUTLINE]]]` (the OUTSIDE_VN clause) onto these so VN labels
// are hidden while the boundary overlay owns them. When the OSM-boundaries toggle is OFF, the
// OUTSIDE_VN clause is stripped at runtime (see BoundaryLayers) so VN labels show too. Absent on the
// CARTO/Protomaps fallback styles (guarded by map.getLayer at the call site).
export const BASEMAP_SETTLEMENT_LABEL_LAYERS = [
  'place-city',
  'place-town',
  'place-village',
  'place-state',
  'world-place-city',
  'world-place-city-dot',
] as const;

// place-commune (phường + small subdivisions) is `visibility: none` in the style; shown only when
// the boundary overlay is toggled OFF.
export const BASEMAP_COMMUNE_LAYER = 'place-commune';

// Strip the trailing `['!', ['within', …]]` element (the OUTSIDE_VN clause) from an `['all', …]`
// filter so the layer renders VN features too. Defensive: returns the filter unchanged if it doesn't
// match that shape (the generator owns the shape; a change here degrades to a no-op, not a crash).
export function dropWithinClause(
  filter: maplibregl.FilterSpecification,
): maplibregl.FilterSpecification {
  if (!Array.isArray(filter) || filter[0] !== 'all' || filter.length < 2) {
    return filter;
  }
  const last = filter[filter.length - 1];
  const isOutsideVn =
    Array.isArray(last) && last[0] === '!' && Array.isArray(last[1]) && last[1][0] === 'within';
  return isOutsideVn ? (filter.slice(0, -1) as maplibregl.FilterSpecification) : filter;
}

export const offshoreIslandLayerIds = {
  fill: 'offshore-islands-fill',
  label: 'offshore-islands-label',
  outline: 'offshore-islands-outline',
} as const;

export function getOffshoreIslandLabelTextField(
  mode: MapMode,
  locale: string,
): maplibregl.ExpressionSpecification {
  // In post-2025 mode, Hoang Sa and Truong Sa are special administrative zones (Đặc khu).
  if (mode === 'post') {
    return locale === 'en'
      ? ['concat', 'Special Zone ', ['get', 'name_short_en']]
      : ['concat', 'Đặc khu ', ['get', 'name_short_vi']];
  }

  return locale === 'en' ? ['get', 'name_en'] : ['get', 'name_vi'];
}

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
  includeIslandsLand?: boolean;
  includeIslandsReef?: boolean;
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
    isVisible: state => state.mode === 'pre' && state.layers.boundaries,
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
    isVisible: state => state.mode === 'post' && state.layers.boundaries,
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
  isVisible: state =>
    state.mode === 'pre' && state.layers.nestedCandidates && state.layers.boundaries,
  layerIds: [
    boundaryLayerIds.preDistrictsCandidateFill,
    boundaryLayerIds.preDistrictsCandidateOutline,
    boundaryLayerIds.preDistrictsCandidateLabel,
  ],
};

const postWardCandidateLayerGroup: BoundaryLayerGroup = {
  id: 'post-wards-candidate',
  isVisible: state =>
    state.mode === 'post' && state.layers.nestedCandidates && state.layers.boundaries,
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
  // A polygon vector source: static PMTiles when a `pmtiles://` URL is configured (min/max zoom come
  // from the PMTiles header), else Martin dynamic tiles. Lets provinces/islands move to PMTiles by
  // env alone, mirroring the nested-candidate pattern. `pmtilesMaxzoom` matches the generated tiles.
  const vec = (
    pmtilesUrl: string | undefined,
    martinUrl: string | undefined,
    pmtilesMaxzoom: number,
  ): maplibregl.SourceSpecification =>
    pmtilesUrl
      ? { type: 'vector', minzoom: 0, maxzoom: pmtilesMaxzoom, url: `pmtiles://${pmtilesUrl}` }
      : {
          type: 'vector',
          minzoom: 0,
          maxzoom: 10,
          tiles: [buildTileTemplate(martinUrl ?? '', env.tileCacheBuster)],
        };

  const sourceDefinitions: BoundarySourceDefinition[] = [
    { id: boundarySourceIds.pre, source: vec(env.pmtilesUrlPre, env.tileUrlPre, 12) },
    { id: boundarySourceIds.post, source: vec(env.pmtilesUrlPost, env.tileUrlPost, 12) },
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

  // Track A — islands the Protomaps basemap lacks (Hoàng Sa/Trường Sa, bay islands),
  // rendered as an earth-coloured land fill beneath the boundaries.
  if (env.tileUrlIslandsFill) {
    sourceDefinitions.push({
      id: boundarySourceIds.islandsLand,
      source: {
        maxzoom: 12,
        minzoom: 0,
        tiles: [buildTileTemplate(env.tileUrlIslandsFill, env.tileCacheBuster)],
        type: 'vector',
      },
    });
  }

  if (!env.tileUrlIslands && !env.pmtilesUrlIslands) {
    return getNestedCandidateSourceDefinitions(env, sourceDefinitions);
  }

  const islandSourceDefinitions: BoundarySourceDefinition[] = [
    ...sourceDefinitions,
    {
      id: boundarySourceIds.islandLabels,
      source: {
        data: '/data/offshore-island-labels.json',
        type: 'geojson',
      },
    },
    { id: boundarySourceIds.islands, source: vec(env.pmtilesUrlIslands, env.tileUrlIslands, 14) },
  ];

  // Reef-shallows source (reef ∩ basemap-water) for the turquoise fill — separate from the
  // full-extent islands source so the fill excludes the islands while the outline stays a single
  // clean perimeter. Falls back to the islands source when unset (older deployments).
  if (env.tileUrlIslandsReef || env.pmtilesUrlIslandsReef) {
    islandSourceDefinitions.push({
      id: boundarySourceIds.islandsReef,
      source: vec(env.pmtilesUrlIslandsReef, env.tileUrlIslandsReef, 14),
    });
  }

  return getNestedCandidateSourceDefinitions(env, islandSourceDefinitions);
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
  // Province + nested overlay hides entirely when the OSM-boundaries toggle is off (offshore
  // islands are NOT gated on this — they stay visible, see offshoreIslandLayerGroup).
  const preVisible = state.mode === 'pre' && state.layers.boundaries;
  const postVisible = state.mode === 'post' && state.layers.boundaries;
  const labelField = locale === 'en' ? 'name_en' : 'name';

  return [
    {
      groupId: 'pre-provinces',
      layer: {
        id: boundaryLayerIds.preFill,
        layout: { visibility: preVisible ? 'visible' : 'none' },
        // Tint the province at overview zoom (which-province read), then fade the
        // fill out by z12 so it stops washing over the basemap at street zoom —
        // the red outline still marks the boundary. See zoomRamp.
        paint: { 'fill-color': '#d44', 'fill-opacity': zoomRamp(9, 0.1, 12, 0) },
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
        // Same overview-tint-then-fade behaviour as the pre fill (see preFill).
        paint: { 'fill-color': '#3388ff', 'fill-opacity': zoomRamp(9, 0.1, 12, 0) },
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
          // Collision ON (no pile, and no overdraw — district labels respect the same collision
          // index so they no longer paint over province labels). Visible to maxzoom 12 so dense-delta
          // provinces (Nam Định/Thái Bình/…) appear once you zoom in enough for their labels to fit —
          // NO early fade-out (that previously hid them at z9+ before they could ever show). The
          // basemap's own VN place labels are hidden while boundaries are on (see BoundaryLayers), so
          // province labels win their band instead of losing the global collision to a basemap city.
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': ['get', labelField],
          'text-font': ['Noto Sans Medium'],
          'text-ignore-placement': false,
          'text-size': zoomRamp(labelZoomStops.preProvinces.min, 12.5, 7, 14),
          visibility: preVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.preProvinces.min,
        paint: {
          'text-color': '#d44',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          // Fade in z4.75→5.75; FULL through z9.5 (so dense-delta provinces have a wide window to
          // appear as they spread, with no basemap labels competing); fade out z9.5→11 to hand off
          // to the district labels (which fade in z8.5→9.5). Gone by z11, before the ward tier.
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            labelZoomStops.preProvinces.min,
            0,
            labelZoomStops.preProvinces.full,
            1,
            9.5,
            1,
            11,
            0,
          ],
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
          'text-font': ['Noto Sans Medium'],
          'text-ignore-placement': true,
          'text-size': zoomRamp(labelZoomStops.cityLabels.min, 12.5, 7, 14.5),
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
          'text-font': ['Noto Sans Medium'],
          'text-ignore-placement': true,
          'text-offset': [0, 1.1],
          'text-size': zoomRamp(labelZoomStops.nationalCapital.min, 14, 7, 16),
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
          // Collision ON (no pile); own z5–8 then fade out z8→9.5 to hand off to ward labels.
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': ['get', labelField],
          'text-font': ['Noto Sans Medium'],
          'text-ignore-placement': false,
          'text-size': zoomRamp(labelZoomStops.postProvinces.min, 12.5, 7, 14),
          visibility: postVisible ? 'visible' : 'none',
        },
        maxzoom: 12,
        minzoom: labelZoomStops.postProvinces.min,
        paint: {
          'text-color': '#2563eb',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          // Mirror of preLabel: full through z9.5, fade out z9.5→11 to hand off to the ward labels.
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            labelZoomStops.postProvinces.min,
            0,
            labelZoomStops.postProvinces.full,
            1,
            9.5,
            1,
            11,
            0,
          ],
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
          'text-font': ['Noto Sans Medium'],
          'text-ignore-placement': true,
          'text-size': zoomRamp(labelZoomStops.cityLabels.min, 12.5, 7, 14.5),
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
          'text-font': ['Noto Sans Medium'],
          'text-ignore-placement': true,
          'text-offset': [0, 1.1],
          'text-size': zoomRamp(labelZoomStops.nationalCapital.min, 14, 7, 16),
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
  reefTilesAvailable: boolean,
): BoundaryLayerDefinition[] {
  const islandsVisible = state.layers.offshoreIslands;
  // Outline + label track the active mode (territorial signal); the reef fill is mode-independent.
  const { labelColor, outlineColor } = getOffshoreIslandModeStyle(state.mode);
  const labelExpression = getOffshoreIslandLabelTextField(state.mode, locale);
  // The turquoise fill uses the reef-minus-land source (islands punched out as holes) when
  // available, so the islands show the basemap land colour; the OUTLINE/label use the full-extent
  // islands source so only the reef perimeter is outlined (no inner island rings). Fall back to
  // the islands source for the fill if the reef tiles aren't configured.
  const reefFillSource = reefTilesAvailable
    ? boundarySourceIds.islandsReef
    : boundarySourceIds.islands;
  const reefFillSourceLayer = reefTilesAvailable
    ? boundarySourceLayers.islandsReef
    : boundarySourceLayers.islands;

  return [
    {
      groupId: 'offshore-islands',
      layer: {
        id: boundaryLayerIds.islandsFill,
        layout: { visibility: islandsVisible ? 'visible' : 'none' },
        paint: { 'fill-color': REEF_SHALLOWS_FILL, 'fill-opacity': zoomRamp(4, 0.82, 13, 0.72) },
        source: reefFillSource,
        'source-layer': reefFillSourceLayer,
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
          'text-font': ['Noto Sans Medium'],
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
          filter: EXCLUDE_ARCHIPELAGO_FILTER,
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
          filter: EXCLUDE_ARCHIPELAGO_FILTER,
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
        filter: ['all', ['has', 'name'], EXCLUDE_ARCHIPELAGO_FILTER],
        id: boundaryLayerIds.preDistrictsCandidateLabel,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': labelField,
          'text-font': ['Noto Sans Regular'],
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
          filter: EXCLUDE_ARCHIPELAGO_FILTER,
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
          filter: EXCLUDE_ARCHIPELAGO_FILTER,
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
        filter: ['all', ['has', 'name'], EXCLUDE_ARCHIPELAGO_FILTER],
        id: boundaryLayerIds.postWardsCandidateLabel,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'center',
          'text-field': labelField,
          'text-font': ['Noto Sans Regular'],
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
  // Track A — islands missing from the Protomaps basemap (Hoàng Sa/Trường Sa, bay
  // islands) rendered as an earth-coloured land fill. Bottom-most so the boundary
  // fills/outlines draw on top; matches the basemap earth colour so islands read as land.
  const islandsLandLayers: BoundaryLayerDefinition[] = options.includeIslandsLand
    ? [
        {
          groupId: 'islands-land',
          layer: {
            id: boundaryLayerIds.islandsLandFill,
            type: 'fill',
            source: boundarySourceIds.islandsLand,
            'source-layer': boundarySourceLayers.islandsLand,
            layout: { visibility: 'visible' },
            paint: { 'fill-color': '#f4f1ea', 'fill-opacity': 1 },
          },
        },
      ]
    : [];

  const orderedLayers = [
    ...islandsLandLayers,
    ...provinceFillLayers,
    ...nestedCandidateGeometryLayers,
    ...provincePriorityLayers,
    ...nestedCandidateLabelLayers,
  ];

  if (options.includeOffshoreIslands === false) {
    return orderedLayers;
  }

  return [
    ...islandsLandLayers,
    ...provinceFillLayers,
    ...getOffshoreIslandLayerDefinitions(locale, state, Boolean(options.includeIslandsReef)),
    ...nestedCandidateGeometryLayers,
    ...provincePriorityLayers,
    ...nestedCandidateLabelLayers,
  ];
}
