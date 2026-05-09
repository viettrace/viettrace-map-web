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
} from './boundaryLayerRegistry';

interface BoundaryLayersProps {
  map: maplibregl.Map | null;
  state: MapViewState;
}

export default function BoundaryLayers({ map, state }: BoundaryLayersProps) {
  const locale = useLocale();
  const publicEnv = readPublicEnv();
  const { tileCacheBuster, tileUrlIslands, tileUrlPost, tileUrlPre } = publicEnv;
  const includeOffshoreIslands = Boolean(tileUrlIslands);

  useEffect(() => {
    if (!map) return;

    function registerBoundaryLayers() {
      if (!map) return;

      const env = { ...publicEnv, tileCacheBuster, tileUrlIslands, tileUrlPost, tileUrlPre };

      for (const sourceDefinition of getBoundarySourceDefinitions(env)) {
        ensureSource(map, sourceDefinition.id, sourceDefinition.source);
      }

      for (const layerDefinition of getBoundaryLayerDefinitions(locale, state, {
        includeOffshoreIslands,
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
  }, [map, locale, includeOffshoreIslands, tileCacheBuster, tileUrlIslands, tileUrlPost, tileUrlPre]);

  useEffect(() => {
    if (!map) return;

    for (const group of getBoundaryLayerGroups(includeOffshoreIslands)) {
      setLayerGroupVisibility(map, group.layerIds, group.isVisible(state));
    }
  }, [includeOffshoreIslands, map, state]);

  return null;
}
