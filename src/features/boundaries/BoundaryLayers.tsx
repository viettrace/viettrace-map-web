'use client';

import { useEffect } from 'react';
import type maplibregl from 'maplibre-gl';
import { useLocale } from 'next-intl';
import type { MapViewState } from '@src/features/map-state/mapViewTypes';
import { readPublicEnv } from '@src/libs/config/publicEnv';
import { replaceLayer } from '@src/libs/maplibre/layers';
import { ensureSource } from '@src/libs/maplibre/sources';
import { setLayerGroupVisibility } from '@src/libs/maplibre/visibility';
import {
  getBoundaryLayerDefinitions,
  getBoundaryLayerGroups,
  getBoundarySourceDefinitions,
  getNestedCandidateBasemapPlaceLayerIds,
} from './boundaryLayerRegistry';

const NATIONAL_CAPITAL_ICON_ID = 'national-capital-star';

interface BoundaryLayersProps {
  map: maplibregl.Map | null;
  state: MapViewState;
}

export default function BoundaryLayers({ map, state }: BoundaryLayersProps) {
  const locale = useLocale();
  const publicEnv = readPublicEnv();
  const {
    enableQaLayers,
    tileCacheBuster,
    tileUrlIslands,
    tileUrlPost,
    tileUrlPostWardsCandidateLabels,
    tileUrlPostWardsCandidate,
    tileUrlPre,
    tileUrlPreDistrictsCandidateLabels,
    tileUrlPreDistrictsCandidate,
  } = publicEnv;
  const includeOffshoreIslands = Boolean(tileUrlIslands);
  const includePostWardCandidateLabels =
    enableQaLayers && Boolean(tileUrlPostWardsCandidateLabels);
  const includePostWardCandidates = enableQaLayers && Boolean(tileUrlPostWardsCandidate);
  const includePreDistrictCandidateLabels =
    enableQaLayers && Boolean(tileUrlPreDistrictsCandidateLabels);
  const includePreDistrictCandidates = enableQaLayers && Boolean(tileUrlPreDistrictsCandidate);

  useEffect(() => {
    if (!map) return;

    function registerBoundaryLayers() {
      if (!map) return;

      const env = {
        ...publicEnv,
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

      for (const layerDefinition of getBoundaryLayerDefinitions(locale, state, {
        includeOffshoreIslands,
        includePostWardCandidateLabels,
        includePostWardCandidates,
        includePreDistrictCandidateLabels,
        includePreDistrictCandidates,
      })) {
        replaceLayer(map, layerDefinition.layer);
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
  }, [
    includeOffshoreIslands,
    includePostWardCandidateLabels,
    includePostWardCandidates,
    includePreDistrictCandidateLabels,
    includePreDistrictCandidates,
    map,
    state,
  ]);

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
