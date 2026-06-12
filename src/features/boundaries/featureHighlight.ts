import type maplibregl from 'maplibre-gl';
import {
  boundaryLayerIds,
  boundarySourceIds,
  boundarySourceLayers,
  labelZoomStops,
} from './boundaryLayerRegistry';

/**
 * Temporarily highlights a selected feature with a centered marker and a
 * bold label that always renders, even at zoom levels where the regular
 * boundary label would still be invisible. Used right after a search-driven
 * selection so the user can see exactly which feature was chosen.
 *
 * The highlight stays until `clearHighlight()` is called (typically when the
 * detail panel closes).
 */

const HIGHLIGHT_SOURCE_ID = 'viettrace-feature-highlight';
const HIGHLIGHT_HALO_LAYER_ID = 'viettrace-feature-highlight-halo';
const HIGHLIGHT_DOT_LAYER_ID = 'viettrace-feature-highlight-dot';
const HIGHLIGHT_LABEL_LAYER_ID = 'viettrace-feature-highlight-label';
const HIGHLIGHT_BOUNDARY_FILL_LAYER_ID = 'viettrace-feature-highlight-boundary-fill';
const HIGHLIGHT_BOUNDARY_OUTLINE_LAYER_ID = 'viettrace-feature-highlight-boundary-outline';

// Cache of original filters for label layers we mutate, so we can restore
// them exactly even if the original was built with locale or state-dependent
// expressions in the future. Keyed per map instance via a WeakMap.
const ORIGINAL_LABEL_FILTERS = new WeakMap<
  maplibregl.Map,
  Map<string, maplibregl.FilterSpecification | undefined>
>();

// Offshore island label positions mirror offshore-island-labels.json.
// Used to position the highlight label where the normal island label was.
const OFFSHORE_ISLAND_POSITIONS: Record<string, [number, number]> = {
  'Hoang Sa': [111.95, 16.45],
  'Truong Sa': [114.5, 10.2],
};

function getOffshoreIslandKey(featureName: string): string | null {
  if (/hoàng\s*sa|hoang\s*sa/i.test(featureName)) return 'Hoang Sa';
  if (/trường\s*sa|truong\s*sa/i.test(featureName)) return 'Truong Sa';
  return null;
}

interface HighlightFeatureOptions {
  map: maplibregl.Map;
  center: [number, number];
  label: string;
  color: string;
  mode: 'pre' | 'post';
  featureName: string;
  featureType: 'province' | 'district' | 'ward';
}

export function highlightFeature({
  map,
  center,
  label,
  color,
  mode,
  featureName,
  featureType,
}: HighlightFeatureOptions) {
  clearHighlight(map);

  const { sourceId, sourceLayer, labelLayerIds, minZoom } = getFeatureLayerInfo(mode, featureType);
  void minZoom;

  // Hide the regular label for this specific feature to avoid duplicate.
  // Cache the original filter first so clearHighlight can restore it.
  hideLabelForFeature(map, labelLayerIds, featureName);

  // For Hoàng Sa / Trường Sa features the authoritative label comes from the
  // offshore island label layer (name: "Hoang Sa" / "Truong Sa"), not from the
  // province/district layers above. Hide it and position the dot there instead.
  const offshoreKey = getOffshoreIslandKey(featureName);
  const effectiveCenter: [number, number] = offshoreKey
    ? (OFFSHORE_ISLAND_POSITIONS[offshoreKey] ?? center)
    : center;
  if (offshoreKey) {
    hideLabelForFeature(map, [boundaryLayerIds.islandsLabel], offshoreKey);
  }

  // Add boundary highlight (fill + outline) from the tile source
  const boundaryFilter: maplibregl.FilterSpecification = [
    'all',
    ['==', ['get', 'boundary'], 'administrative'],
    ['==', ['get', 'name'], featureName],
  ];

  map.addLayer({
    id: HIGHLIGHT_BOUNDARY_FILL_LAYER_ID,
    type: 'fill',
    source: sourceId,
    'source-layer': sourceLayer,
    filter: boundaryFilter,
    paint: {
      'fill-color': color,
      'fill-opacity': 0.22,
    },
  });

  map.addLayer({
    id: HIGHLIGHT_BOUNDARY_OUTLINE_LAYER_ID,
    type: 'line',
    source: sourceId,
    'source-layer': sourceLayer,
    filter: boundaryFilter,
    paint: {
      'line-color': color,
      'line-opacity': 1,
      'line-width': 3.5,
    },
  });

  const source: maplibregl.GeoJSONSourceSpecification = {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [effectiveCenter[0], effectiveCenter[1]] },
      properties: { label },
    },
  };

  map.addSource(HIGHLIGHT_SOURCE_ID, source);

  // A semi-transparent halo behind the dot so the marker reads on busy basemaps.
  map.addLayer({
    id: HIGHLIGHT_HALO_LAYER_ID,
    type: 'circle',
    source: HIGHLIGHT_SOURCE_ID,
    paint: {
      'circle-color': color,
      'circle-opacity': 0.18,
      'circle-radius': 22,
      'circle-stroke-color': color,
      'circle-stroke-opacity': 0.6,
      'circle-stroke-width': 1.5,
    },
  });

  map.addLayer({
    id: HIGHLIGHT_DOT_LAYER_ID,
    type: 'circle',
    source: HIGHLIGHT_SOURCE_ID,
    paint: {
      'circle-color': color,
      'circle-radius': 7,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 2,
    },
  });

  map.addLayer({
    id: HIGHLIGHT_LABEL_LAYER_ID,
    type: 'symbol',
    source: HIGHLIGHT_SOURCE_ID,
    layout: {
      'text-field': ['get', 'label'],
      'text-size': 15,
      'text-anchor': 'top',
      'text-offset': [0, 1.0],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-font': ['Noto Sans Medium'],
      'text-max-width': 9,
    },
    paint: {
      'text-color': color,
      'text-halo-color': '#fff',
      'text-halo-width': 2.5,
      'text-halo-blur': 0.5,
    },
  });

  // Note: The caller pairs `highlightFeature` with `fitBbox`, which produces
  // a camera that always lands well above each feature's label-fade-in zoom
  // (provinces ~7-9, districts ~10-12, wards ~13-14). The original-feature
  // label is hidden via the per-layer name filter regardless of zoom, and
  // the dot+label highlight is always visible, so we do not need an extra
  // zoom nudge here.
}

export function clearHighlight(map: maplibregl.Map) {
  try {
    if (map.getLayer(HIGHLIGHT_BOUNDARY_OUTLINE_LAYER_ID)) {
      map.removeLayer(HIGHLIGHT_BOUNDARY_OUTLINE_LAYER_ID);
    }

    if (map.getLayer(HIGHLIGHT_BOUNDARY_FILL_LAYER_ID)) {
      map.removeLayer(HIGHLIGHT_BOUNDARY_FILL_LAYER_ID);
    }

    if (map.getLayer(HIGHLIGHT_LABEL_LAYER_ID)) {
      map.removeLayer(HIGHLIGHT_LABEL_LAYER_ID);
    }

    if (map.getLayer(HIGHLIGHT_DOT_LAYER_ID)) {
      map.removeLayer(HIGHLIGHT_DOT_LAYER_ID);
    }

    if (map.getLayer(HIGHLIGHT_HALO_LAYER_ID)) {
      map.removeLayer(HIGHLIGHT_HALO_LAYER_ID);
    }

    if (map.getSource(HIGHLIGHT_SOURCE_ID)) {
      map.removeSource(HIGHLIGHT_SOURCE_ID);
    }

    restoreLabelFilters(map);
  } catch {
    // Layers/sources may already be removed during map teardown.
  }
}

function getFeatureLayerInfo(mode: 'pre' | 'post', featureType: 'province' | 'district' | 'ward') {
  if (featureType === 'province') {
    return {
      sourceId: mode === 'pre' ? boundarySourceIds.pre : boundarySourceIds.post,
      sourceLayer: mode === 'pre' ? boundarySourceLayers.pre : boundarySourceLayers.post,
      labelLayerIds:
        mode === 'pre'
          ? [
              boundaryLayerIds.preLabel,
              boundaryLayerIds.preCityLabel,
              boundaryLayerIds.preNationalCapitalLabel,
            ]
          : [
              boundaryLayerIds.postLabel,
              boundaryLayerIds.postCityLabel,
              boundaryLayerIds.postNationalCapitalLabel,
            ],
      minZoom:
        mode === 'pre' ? labelZoomStops.preProvinces.full : labelZoomStops.postProvinces.full,
    };
  }

  if (featureType === 'district') {
    return {
      sourceId: boundarySourceIds.preDistrictsCandidate,
      sourceLayer: boundarySourceLayers.preDistrictsCandidate,
      labelLayerIds: [boundaryLayerIds.preDistrictsCandidateLabel],
      minZoom: labelZoomStops.preDistrictCandidates.full,
    };
  }

  return {
    sourceId: boundarySourceIds.postWardsCandidate,
    sourceLayer: boundarySourceLayers.postWardsCandidate,
    labelLayerIds: [boundaryLayerIds.postWardsCandidateLabel],
    minZoom: labelZoomStops.postWardCandidates.full,
  };
}

function hideLabelForFeature(
  map: maplibregl.Map,
  labelLayerIds: readonly string[],
  featureName: string,
) {
  let cache = ORIGINAL_LABEL_FILTERS.get(map);

  if (!cache) {
    cache = new Map();
    ORIGINAL_LABEL_FILTERS.set(map, cache);
  }

  for (const layerId of labelLayerIds) {
    if (!map.getLayer(layerId)) continue;

    if (!cache.has(layerId)) {
      const originalFilter = map.getFilter(layerId) as maplibregl.FilterSpecification | undefined;
      cache.set(layerId, originalFilter);
    }

    const baseFilter = cache.get(layerId);
    const exclusion = ['!=', ['get', 'name'], featureName] as maplibregl.FilterSpecification;
    const nextFilter = (
      baseFilter ? ['all', baseFilter, exclusion] : exclusion
    ) as maplibregl.FilterSpecification;

    map.setFilter(layerId, nextFilter);
  }
}

function restoreLabelFilters(map: maplibregl.Map) {
  const cache = ORIGINAL_LABEL_FILTERS.get(map);

  if (!cache) return;

  for (const [layerId, originalFilter] of cache) {
    if (!map.getLayer(layerId)) continue;

    map.setFilter(layerId, originalFilter ?? null);
  }

  cache.clear();
}
