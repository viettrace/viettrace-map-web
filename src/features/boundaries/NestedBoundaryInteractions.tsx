'use client';

import { useEffect } from 'react';
import type maplibregl from 'maplibre-gl';
import type { MapMode } from '@src/features/map-state/mapViewTypes';
import { findNestedByMapFeature } from '@src/features/nested-index/nestedIndexSearch';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';

const NESTED_HIT_LAYER_BY_MODE: Record<MapMode, { layerId: string; type: 'district' | 'ward' }> = {
  pre: { layerId: 'districts-pre-2025-candidate-fill', type: 'district' },
  post: { layerId: 'wards-post-2025-candidate-fill', type: 'ward' },
};

interface NestedBoundaryInteractionsProps {
  entries: NestedIndexEntry[];
  map: maplibregl.Map | null;
  mode: MapMode;
  onSelect: (entry: NestedIndexEntry) => void;
}

export default function NestedBoundaryInteractions({
  entries,
  map,
  mode,
  onSelect,
}: NestedBoundaryInteractionsProps) {
  useEffect(() => {
    if (!map || entries.length === 0) {
      return;
    }

    const { layerId, type } = NESTED_HIT_LAYER_BY_MODE[mode];

    const clickHandler = (event: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(layerId)) {
        return;
      }

      try {
        const features = map.queryRenderedFeatures(event.point, { layers: [layerId] });
        const feature = features[0];

        if (!feature?.properties) {
          return;
        }

        const entry = findNestedByMapFeature(entries, mode, type, feature.properties);

        if (entry) {
          // Stop event from also triggering province selection in the same click cycle.
          event.originalEvent?.stopPropagation();
          onSelect(entry);
        }
      } catch {
        // Nested selection is non-critical; keep the map responsive if a tile feature is malformed.
      }
    };

    const mouseEnterHandler = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const mouseLeaveHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', layerId, clickHandler);

    if (map.getLayer(layerId)) {
      map.on('mouseenter', layerId, mouseEnterHandler);
      map.on('mouseleave', layerId, mouseLeaveHandler);
    }

    return () => {
      try {
        map.off('click', layerId, clickHandler);

        if (map.getLayer(layerId)) {
          map.off('mouseenter', layerId, mouseEnterHandler);
          map.off('mouseleave', layerId, mouseLeaveHandler);
        }
      } catch {
        // Ignore cleanup errors from MapLibre teardown.
      }
    };
  }, [entries, map, mode, onSelect]);

  return null;
}
