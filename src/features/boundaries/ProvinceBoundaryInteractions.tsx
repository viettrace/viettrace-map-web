'use client';

import { useEffect } from 'react';
import type maplibregl from 'maplibre-gl';
import { findProvinceByMapFeature } from '@src/features/province-index/provinceIndexSearch';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import type { MapMode } from '@src/features/map-state/mapViewTypes';
import { getProvinceHitLayerId } from './boundaryLayerRegistry';
import { attachLongPressSelection } from './longPressSelection';

interface ProvinceBoundaryInteractionsProps {
  entries: ProvinceIndexEntry[];
  map: maplibregl.Map | null;
  mode: MapMode;
  onSelect: (entry: ProvinceIndexEntry) => void;
  priorityHitLayerIds?: string[];
}

export default function ProvinceBoundaryInteractions({
  entries,
  map,
  mode,
  onSelect,
  priorityHitLayerIds,
}: ProvinceBoundaryInteractionsProps) {
  useEffect(() => {
    if (!map || entries.length === 0) {
      return;
    }

    const layerId = getProvinceHitLayerId(mode);

    const handlePoint = (point: maplibregl.Point) => {
      if (!map.getLayer(layerId)) {
        return;
      }

      try {
        // Defer to nested district/ward selection when a nested feature is rendered at the click point.
        const priorityLayers = (priorityHitLayerIds ?? []).filter(id => map.getLayer(id));

        if (priorityLayers.length > 0) {
          const priorityHits = map.queryRenderedFeatures(point, { layers: priorityLayers });

          if (priorityHits.length > 0) {
            return;
          }
        }

        const features = map.queryRenderedFeatures(point, { layers: [layerId] });
        const feature = features[0];

        if (!feature?.properties) {
          return;
        }

        const entry = findProvinceByMapFeature(entries, mode, feature.properties);

        if (entry) {
          onSelect(entry);
        }
      } catch {
        // Boundary selection is non-critical; keep the map responsive if a tile feature is malformed.
      }
    };

    const mouseEnterHandler = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const mouseLeaveHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    const detachLongPress = attachLongPressSelection({ map, onSelect: handlePoint });

    if (map.getLayer(layerId)) {
      map.on('mouseenter', layerId, mouseEnterHandler);
      map.on('mouseleave', layerId, mouseLeaveHandler);
    }

    return () => {
      try {
        detachLongPress();

        if (map.getLayer(layerId)) {
          map.off('mouseenter', layerId, mouseEnterHandler);
          map.off('mouseleave', layerId, mouseLeaveHandler);
        }
      } catch {
        // Ignore cleanup errors from MapLibre teardown.
      }
    };
  }, [entries, map, mode, onSelect, priorityHitLayerIds]);

  return null;
}
