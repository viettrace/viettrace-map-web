'use client';

import { useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import { useLocale } from 'next-intl';
import type { ColorMode, MapViewState } from '@src/features/map-state/mapViewTypes';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { readPublicEnv } from '@src/libs/config/publicEnv';
import { replaceLayer } from '@src/libs/maplibre/layers';
import { ensureSource } from '@src/libs/maplibre/sources';
import { setLayerGroupVisibility } from '@src/libs/maplibre/visibility';
import { loadRegionalClassification, type Region } from '@src/types/regional-classification';
import {
  BASEMAP_COMMUNE_LAYER,
  BASEMAP_SETTLEMENT_LABEL_LAYERS,
  boundaryLayerIds,
  dropWithinClause,
  getBoundaryLayerDefinitions,
  getBoundaryLayerGroups,
  getBoundarySourceDefinitions,
  getNestedCandidateBasemapPlaceLayerIds,
  getOffshoreIslandLabelTextField,
  getOffshoreIslandModeStyle,
  offshoreIslandLayerIds,
} from './boundaryLayerRegistry';

const NATIONAL_CAPITAL_ICON_ID = 'national-capital-star';

// Hues evenly spread across the color wheel so regions stay visually distinct even at
// reduced opacity. Opacity is raised to 0.3 in region mode (vs the default 0.1) to
// compensate for the lighter appearance of the basemap bleed-through.
const REGION_FILL_COLORS: Record<Region, string> = {
  Northern_Midlands_Mountains: '#7c3aed', // violet
  Red_River_Delta: '#dc2626',             // red
  North_Central_Coast: '#0891b2',         // cyan-teal
  South_Central_Coast_Highlands: '#d97706', // amber
  Southeast: '#15803d',                   // forest green
  Mekong_River_Delta: '#1d4ed8',          // blue
};

const REGION_LABELS_SOURCE_ID = 'region-labels-source';
const REGION_LABELS_LAYER_ID = 'region-labels-layer';

// NOTE: hiding Vietnam's basemap settlement labels (so the boundary overlay owns VN admin labels)
// is done in the STYLE itself — the generator filters each settlement layer to features OUTSIDE
// Vietnam via a `within` expression (see scripts/generate-omt-basemap-style.mjs). Baking it into the
// style avoids the runtime-timing races that made an earlier setLayoutProperty approach unreliable,
// and it keeps neighbour (non-VN) city/town/province labels visible for context.

function removeRegionLabelsFromMap(map: maplibregl.Map): void {
  try {
    if (map.getLayer(REGION_LABELS_LAYER_ID)) map.removeLayer(REGION_LABELS_LAYER_ID);
    if (map.getSource(REGION_LABELS_SOURCE_ID)) map.removeSource(REGION_LABELS_SOURCE_ID);
  } catch {
    // layer/source may not exist — safe to ignore
  }
}

// Idempotent: moves labels to top if already present, otherwise adds them.
async function ensureRegionLabels(map: maplibregl.Map, locale: string): Promise<void> {
  if (map.getSource(REGION_LABELS_SOURCE_ID)) {
    if (map.getLayer(REGION_LABELS_LAYER_ID)) map.moveLayer(REGION_LABELS_LAYER_ID);
    return;
  }

  const data = await loadRegionalClassification();

  // Check again after the async gap — another caller may have added the source.
  if (map.getSource(REGION_LABELS_SOURCE_ID)) {
    if (map.getLayer(REGION_LABELS_LAYER_ID)) map.moveLayer(REGION_LABELS_LAYER_ID);
    return;
  }

  const features = (Object.entries(REGION_LABEL_POSITIONS) as [Region, [number, number]][]).map(
    ([region, [lng, lat]]) => {
      const def = data.regions[region];
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [lng, lat] },
        properties: {
          name_vi: def?.name_vi ?? region,
          name_en: def?.name_en ?? region,
          color: REGION_FILL_COLORS[region] ?? '#555555',
        },
      };
    },
  );

  try {
    map.addSource(REGION_LABELS_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });
    map.addLayer({
      id: REGION_LABELS_LAYER_ID,
      type: 'symbol',
      source: REGION_LABELS_SOURCE_ID,
      minzoom: 4,
      maxzoom: 7.5,
      layout: {
        'text-field': locale === 'en' ? ['get', 'name_en'] : ['get', 'name_vi'],
        'text-size': 14,
        'text-font': ['Noto Sans Medium'],
        'text-anchor': 'center',
        'text-max-width': 8,
        'text-allow-overlap': true,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
      },
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': 'rgba(255,255,255,0.95)',
        'text-halo-width': 2.5,
      },
    });
  } catch {
    // map destroyed mid-flight or concurrent call already added the source/layer
  }
}

// Approximate geographic centroids for each region's name label.
// Positioned to avoid dense province-label clusters (e.g. Red River Delta).
const REGION_LABEL_POSITIONS: Record<Region, [number, number]> = {
  Northern_Midlands_Mountains: [105.4, 21.9],  // between Tuyên Quang and Thái Nguyên
  Red_River_Delta: [106.3, 20.4],
  North_Central_Coast: [105.9, 17.9],           // between Hà Tĩnh and Quảng Bình
  South_Central_Coast_Highlands: [108.1, 13.8],
  Southeast: [107.0, 11.3],
  Mekong_River_Delta: [105.3, 10.0],
};

// Province fill fades from its full tint at overview zoom to transparent by z12,
// so it stops washing over the (deliberately muted) basemap at street zoom — the
// red/blue outline still marks the boundary. The full tint is kept for the
// which-province read when zoomed out. This must live here (not just in
// boundaryLayerRegistry) because this effect runtime-overrides fill-opacity for
// the color-mode feature and would otherwise clobber the registry's ramp.
function provinceFillOpacityRamp(full: number): maplibregl.DataDrivenPropertyValueSpecification<number> {
  return ['interpolate', ['linear'], ['zoom'], 9, full, 12, 0] as unknown as maplibregl.DataDrivenPropertyValueSpecification<number>;
}

// Extracted to module level so the registration effect can call it synchronously after
// recreating layers (replaceLayer resets paint to defaults). Effect A also calls this
// on colorMode/provinceEntries changes, but no longer needs state.mode in its deps.
function applyRegionFillColors(
  map: maplibregl.Map,
  colorMode: ColorMode,
  provinceEntries: ProvinceIndexEntry[],
): void {
  const preFillId = boundaryLayerIds.preFill;
  const postFillId = boundaryLayerIds.postFill;

  if (colorMode === 'default') {
    if (map.getLayer(preFillId)) {
      map.setPaintProperty(preFillId, 'fill-color', '#d44');
      map.setPaintProperty(preFillId, 'fill-opacity', provinceFillOpacityRamp(0.1));
    }
    if (map.getLayer(postFillId)) {
      map.setPaintProperty(postFillId, 'fill-color', '#3388ff');
      map.setPaintProperty(postFillId, 'fill-opacity', provinceFillOpacityRamp(0.1));
    }
    return;
  }

  if (provinceEntries.length === 0) return;

  loadRegionalClassification()
    .then(data => {
      const regionNames = new Map<Region, string[]>();
      for (const entry of provinceEntries) {
        const region = data.provinceToRegion[entry.slug] as Region | undefined;
        if (!region) continue;
        if (!regionNames.has(region)) regionNames.set(region, []);
        const names = regionNames.get(region)!;
        for (const variant of [entry.name, `Thành phố ${entry.name}`, `Tỉnh ${entry.name}`]) {
          if (!names.includes(variant)) names.push(variant);
        }
      }
      const arms: unknown[] = [];
      for (const [region, names] of regionNames) {
        arms.push(names, REGION_FILL_COLORS[region as Region] ?? '#aaaaaa');
      }
      const matchExpr = ['match', ['get', 'name'], ...arms, '#aaaaaa'] as unknown;
      const fillColorExpr = matchExpr as maplibregl.DataDrivenPropertyValueSpecification<maplibregl.ColorSpecification>;
      if (map.getLayer(preFillId)) {
        map.setPaintProperty(preFillId, 'fill-color', fillColorExpr);
        map.setPaintProperty(preFillId, 'fill-opacity', provinceFillOpacityRamp(0.3));
      }
      if (map.getLayer(postFillId)) {
        map.setPaintProperty(postFillId, 'fill-color', fillColorExpr);
        map.setPaintProperty(postFillId, 'fill-opacity', provinceFillOpacityRamp(0.3));
      }
    })
    .catch(() => {});
}

interface BoundaryLayersProps {
  map: maplibregl.Map | null;
  state: MapViewState;
  provinceEntries?: ProvinceIndexEntry[];
}

export default function BoundaryLayers({ map, state, provinceEntries = [] }: BoundaryLayersProps) {
  const locale = useLocale();
  const publicEnv = readPublicEnv();
  // Caches each basemap settlement layer's style-default filter (OUTSIDE_VN present) so the
  // OSM-boundaries toggle can strip/restore the clause without re-reading a possibly-stripped filter.
  const basemapSettlementFiltersRef = useRef<Map<string, maplibregl.FilterSpecification>>(new Map());
  const {
    enableQaLayers,
    pmtilesUrlPostWardsCandidateLabels,
    pmtilesUrlPostWardsCandidate,
    pmtilesUrlPreDistrictsCandidateLabels,
    pmtilesUrlPreDistrictsCandidate,
    tileCacheBuster,
    tileUrlIslands,
    tileUrlPost,
    tileUrlPostWardsCandidateLabels,
    tileUrlPostWardsCandidate,
    tileUrlPre,
    tileUrlPreDistrictsCandidateLabels,
    tileUrlPreDistrictsCandidate,
  } = publicEnv;
  const includeOffshoreIslands = Boolean(tileUrlIslands || publicEnv.pmtilesUrlIslands);
  // Polygon candidate sources are public when PMTiles URLs are set; otherwise gated to QA.
  const includePreDistrictCandidates =
    Boolean(pmtilesUrlPreDistrictsCandidate) ||
    (enableQaLayers && Boolean(tileUrlPreDistrictsCandidate));
  const includePostWardCandidates =
    Boolean(pmtilesUrlPostWardsCandidate) ||
    (enableQaLayers && Boolean(tileUrlPostWardsCandidate));
  // Label sources are public when PMTiles label URLs are set; otherwise gated to QA.
  const includePostWardCandidateLabels =
    Boolean(pmtilesUrlPostWardsCandidateLabels) ||
    (enableQaLayers && Boolean(tileUrlPostWardsCandidateLabels));
  const includePreDistrictCandidateLabels =
    Boolean(pmtilesUrlPreDistrictsCandidateLabels) ||
    (enableQaLayers && Boolean(tileUrlPreDistrictsCandidateLabels));

  useEffect(() => {
    if (!map) return;

    function registerBoundaryLayers() {
      if (!map) return;

      const env = {
        ...publicEnv,
        pmtilesUrlPostWardsCandidateLabels: includePostWardCandidateLabels
          ? pmtilesUrlPostWardsCandidateLabels
          : undefined,
        pmtilesUrlPostWardsCandidate: includePostWardCandidates
          ? pmtilesUrlPostWardsCandidate
          : undefined,
        pmtilesUrlPreDistrictsCandidateLabels: includePreDistrictCandidateLabels
          ? pmtilesUrlPreDistrictsCandidateLabels
          : undefined,
        pmtilesUrlPreDistrictsCandidate: includePreDistrictCandidates
          ? pmtilesUrlPreDistrictsCandidate
          : undefined,
        tileCacheBuster,
        tileUrlIslands,
        tileUrlPost,
        tileUrlPostWardsCandidateLabels: includePostWardCandidateLabels
          ? tileUrlPostWardsCandidateLabels
          : undefined,
        tileUrlPostWardsCandidate: includePostWardCandidates
          ? tileUrlPostWardsCandidate
          : undefined,
        tileUrlPre,
        tileUrlPreDistrictsCandidateLabels: includePreDistrictCandidateLabels
          ? tileUrlPreDistrictsCandidateLabels
          : undefined,
        tileUrlPreDistrictsCandidate: includePreDistrictCandidates
          ? tileUrlPreDistrictsCandidate
          : undefined,
      };

      ensureNationalCapitalIcon(map);

      for (const sourceDefinition of getBoundarySourceDefinitions(env)) {
        ensureSource(map, sourceDefinition.id, sourceDefinition.source);
      }

      // Keep boundary geometry (fills/outlines) BELOW the basemap's first label layer so the
      // red/blue outlines never paint over place names; boundary labels (symbols) stay on top.
      const firstBasemapLabelId = (map.getStyle().layers ?? []).find(l => l.type === 'symbol')?.id;

      for (const layerDefinition of getBoundaryLayerDefinitions(locale, state, {
        includeIslandsLand: Boolean(publicEnv.tileUrlIslandsFill),
        includeIslandsReef: Boolean(publicEnv.tileUrlIslandsReef || publicEnv.pmtilesUrlIslandsReef),
        includeOffshoreIslands,
        includePostWardCandidateLabels,
        includePostWardCandidates,
        includePreDistrictCandidateLabels,
        includePreDistrictCandidates,
      })) {
        const isLabel = layerDefinition.layer.type === 'symbol';
        replaceLayer(map, layerDefinition.layer, isLabel ? undefined : firstBasemapLabelId);
      }

      // Re-apply region colors after layer recreation so switching pre/post mode while in
      // region color mode doesn't reset fill-color back to the layer defaults.
      applyRegionFillColors(map, state.colorMode, provinceEntries);

      // Province label layers are re-added above the region label layer by replaceLayer.
      // ensureRegionLabels moves them back to the top when already present, or adds them
      // from scratch on fresh mounts where Effect B hasn't had a chance to run yet.
      if (state.colorMode === 'region') {
        ensureRegionLabels(map, locale).catch(() => {});
      }
    }

    if (map.isStyleLoaded()) {
      registerBoundaryLayers();
    } else {
      map.once('load', registerBoundaryLayers);
    }

    return () => {
      map.off('load', registerBoundaryLayers);
    };
    // Visibility changes are applied in a separate effect so toggles do not recreate layers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    map,
    locale,
    state.mode,
    pmtilesUrlPostWardsCandidateLabels,
    pmtilesUrlPostWardsCandidate,
    pmtilesUrlPreDistrictsCandidateLabels,
    pmtilesUrlPreDistrictsCandidate,
    includeOffshoreIslands,
    includePostWardCandidateLabels,
    includePostWardCandidates,
    includePreDistrictCandidateLabels,
    includePreDistrictCandidates,
    tileCacheBuster,
    tileUrlIslands,
    tileUrlPost,
    tileUrlPostWardsCandidateLabels,
    tileUrlPostWardsCandidate,
    tileUrlPre,
    tileUrlPreDistrictsCandidateLabels,
    tileUrlPreDistrictsCandidate,
  ]);

  useEffect(() => {
    if (!map) return;

    for (const group of getBoundaryLayerGroups({
      includeOffshoreIslands,
      includePostWardCandidateLabels,
      includePostWardCandidates,
      includePreDistrictCandidateLabels,
      includePreDistrictCandidates,
    })) {
      setLayerGroupVisibility(map, group.layerIds, group.isVisible(state));
    }

    // Ensure offshore island styling tracks the active mode even when the
    // registration effect skipped a re-run (for example when the style was
    // not flagged as loaded at the moment URL state restore dispatched a mode
    // change). Without this sync, reopening the app with `?mode=post` can
    // leave Hoang Sa and Truong Sa rendered with the pre-mode (red) palette.
    if (includeOffshoreIslands && state.layers.offshoreIslands) {
      // Reef fill is mode-independent (set once in the layer def); only the outline + label
      // track the active mode here.
      const { labelColor, outlineColor } = getOffshoreIslandModeStyle(state.mode);

      if (map.getLayer(offshoreIslandLayerIds.outline)) {
        map.setPaintProperty(offshoreIslandLayerIds.outline, 'line-color', outlineColor);
      }

      if (map.getLayer(offshoreIslandLayerIds.label)) {
        map.setPaintProperty(offshoreIslandLayerIds.label, 'text-color', labelColor);
        map.setLayoutProperty(
          offshoreIslandLayerIds.label,
          'text-field',
          getOffshoreIslandLabelTextField(state.mode, locale),
        );
      }
    }
  }, [
    includeOffshoreIslands,
    includePostWardCandidateLabels,
    includePostWardCandidates,
    includePreDistrictCandidateLabels,
    includePreDistrictCandidates,
    locale,
    map,
    state,
  ]);

  // Effect A: apply region fill-color and fill-opacity.
  // state.mode is intentionally absent from deps — the registration effect handles
  // re-applying colors after layer recreation, so this effect only needs to fire when
  // colorMode or provinceEntries change.
  useEffect(() => {
    if (!map) return;

    function applyFillColors() {
      if (!map) return;
      applyRegionFillColors(map, state.colorMode, provinceEntries);
    }

    if (map.isStyleLoaded()) {
      applyFillColors();
    } else {
      map.once('load', applyFillColors);
    }

    return () => {
      map.off('load', applyFillColors);
    };
  }, [map, state.colorMode, provinceEntries]);

  // Effect B: authoritative manager for the region label layer.
  // Removes labels when colorMode leaves 'region', adds/restores them when it returns.
  // Independent of state.mode so labels don't flicker on pre/post toggle.
  useEffect(() => {
    if (!map) return;
    const mapInstance = map;
    let cancelled = false;

    function applyRegionLabels() {
      if (cancelled) return;

      removeRegionLabelsFromMap(mapInstance);

      // Region labels are part of the boundary overlay — hide them when boundaries are toggled off.
      if (state.colorMode !== 'region' || !state.layers.boundaries) return;

      ensureRegionLabels(mapInstance, locale)
        .then(() => {
          // If the effect was cleaned up while the async was in-flight, remove
          // any labels that were just added so the map isn't left in a dirty state.
          if (cancelled) removeRegionLabelsFromMap(mapInstance);
        })
        .catch(() => {});
    }

    if (mapInstance.isStyleLoaded()) {
      applyRegionLabels();
    } else {
      mapInstance.once('load', applyRegionLabels);
    }

    return () => {
      cancelled = true;
      mapInstance.off('load', applyRegionLabels);
      removeRegionLabelsFromMap(mapInstance);
    };
  }, [map, state.colorMode, state.layers.boundaries, locale]);

  useEffect(() => {
    if (!map) return;

    function syncBasemapPlaceLabels() {
      if (!map) return;

      const basemapPlaceLayerVisibility = state.layers.nestedCandidates ? 'none' : 'visible';

      for (const layerId of getNestedCandidateBasemapPlaceLayerIds()) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', basemapPlaceLayerVisibility);
        }
      }
    }

    if (map.isStyleLoaded()) {
      syncBasemapPlaceLabels();
    } else {
      map.once('load', syncBasemapPlaceLabels);
    }

    return () => {
      map.off('load', syncBasemapPlaceLabels);
    };
  }, [map, state.layers.nestedCandidates]);

  // OSM-boundaries toggle → reveal/hide the basemap's own VN settlement labels.
  // OFF: strip the OUTSIDE_VN clause from the settlement layers (VN labels show too) + reveal
  // place-commune. ON: restore the style-default (VN labels hidden so the overlay owns them).
  // Caches the style-default filter per layer; re-caches on `style.load` (a locale switch reloads
  // the style and resets the filters). No-op on the CARTO/Protomaps fallback styles (getLayer guard).
  useEffect(() => {
    if (!map) return;
    const mapInstance = map;
    const cache = basemapSettlementFiltersRef.current;
    const showVnLabels = !state.layers.boundaries;

    function applyBoundaryLabelMode() {
      for (const layerId of BASEMAP_SETTLEMENT_LABEL_LAYERS) {
        if (!mapInstance.getLayer(layerId)) continue;
        if (!cache.has(layerId)) {
          const original = mapInstance.getFilter(layerId) as
            | maplibregl.FilterSpecification
            | undefined;
          if (original) cache.set(layerId, original);
        }
        const original = cache.get(layerId);
        if (original) {
          mapInstance.setFilter(layerId, showVnLabels ? dropWithinClause(original) : original);
        }
      }
      if (mapInstance.getLayer(BASEMAP_COMMUNE_LAYER)) {
        mapInstance.setLayoutProperty(
          BASEMAP_COMMUNE_LAYER,
          'visibility',
          showVnLabels ? 'visible' : 'none',
        );
      }
    }

    function handleStyleReload() {
      // A reloaded style resets the settlement filters to their default → re-cache, then re-apply.
      cache.clear();
      applyBoundaryLabelMode();
    }

    if (mapInstance.isStyleLoaded()) applyBoundaryLabelMode();
    mapInstance.on('style.load', handleStyleReload);

    return () => {
      mapInstance.off('style.load', handleStyleReload);
    };
  }, [map, state.layers.boundaries]);

  return null;
}

function ensureNationalCapitalIcon(map: maplibregl.Map) {
  if (map.hasImage(NATIONAL_CAPITAL_ICON_ID)) {
    return;
  }

  const pixelRatio = 2;
  const logicalSize = 40;
  const size = logicalSize * pixelRatio;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  context.scale(pixelRatio, pixelRatio);
  traceStarPath(context, logicalSize / 2, 16, 6.4);

  context.lineJoin = 'round';
  context.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  context.lineWidth = 5;
  context.stroke();

  context.fillStyle = '#facc15';
  context.fill();

  context.strokeStyle = '#92400e';
  context.lineWidth = 1.3;
  context.stroke();

  map.addImage(NATIONAL_CAPITAL_ICON_ID, context.getImageData(0, 0, size, size), {
    pixelRatio,
  });
}

function traceStarPath(
  context: CanvasRenderingContext2D,
  center: number,
  outerRadius: number,
  innerRadius: number,
) {
  context.beginPath();

  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.closePath();
}
