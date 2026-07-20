'use client';

import { useEffect } from 'react';
import type maplibregl from 'maplibre-gl';
import type { MapMode } from '@src/features/map-state/mapViewTypes';
import { findNestedByMapFeature } from '@src/features/nested-index/nestedIndexSearch';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';
import { attachLongPressSelection } from './longPressSelection';

const NESTED_HIT_LAYER_BY_MODE: Record<MapMode, { layerId: string; type: 'district' | 'ward' }> = {
  pre: { layerId: 'districts-pre-2025-candidate-fill', type: 'district' },
  post: { layerId: 'wards-post-2025-candidate-fill', type: 'ward' },
};

// Pre-2025 OSM-tier ward fill. In pre mode a ward click takes priority over its district (finer unit).
const PRE_WARD_HIT_LAYER = 'wards-pre-2025-osm-fill';

interface NestedBoundaryInteractionsProps {
  entries: NestedIndexEntry[];
  map: maplibregl.Map | null;
  mode: MapMode;
  onSelect: (entry: NestedIndexEntry) => void;
  // Pre mode only: a pre-2025 ward was clicked (finer than a district). Receives the clicked tile
  // feature's raw properties; the caller builds the ward selection from them (no nested-index lookup).
  onSelectPreWard?: (properties: Record<string, unknown>) => void;
}

export default function NestedBoundaryInteractions({
  entries,
  map,
  mode,
  onSelect,
  onSelectPreWard,
}: NestedBoundaryInteractionsProps) {
  useEffect(() => {
    if (!map) {
      return;
    }

    const { layerId, type } = NESTED_HIT_LAYER_BY_MODE[mode];

    const handlePoint = (point: maplibregl.Point) => {
      // Pre mode: a pre-2025 ward (finer unit) takes priority over its district.
      if (mode === 'pre' && onSelectPreWard && map.getLayer(PRE_WARD_HIT_LAYER)) {
        try {
          const wardFeature = map.queryRenderedFeatures(point, {
            layers: [PRE_WARD_HIT_LAYER],
          })[0];

          if (wardFeature?.properties) {
            onSelectPreWard(wardFeature.properties);
            return;
          }
        } catch {
          // Ward hit-test failed — fall through to district selection.
        }
      }

      if (!map.getLayer(layerId)) {
        return;
      }

      try {
        const features = map.queryRenderedFeatures(point, { layers: [layerId] });
        const feature = features[0];

        if (!feature?.properties) {
          return;
        }

        const entry = findNestedByMapFeature(entries, mode, type, feature.properties);

        if (entry) {
          // Province selection runs through the same long-press helper and
          // already defers to nested via `priorityHitLayerIds`, so we no
          // longer need to stop propagation on the original event.
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
  }, [entries, map, mode, onSelect, onSelectPreWard]);

  return null;
}
