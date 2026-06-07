'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, type Dispatch } from 'react';
import type maplibregl from 'maplibre-gl';
import { useTranslations } from 'next-intl';
import BoundaryLayers from '@src/features/boundaries/BoundaryLayers';
import NestedBoundaryInteractions from '@src/features/boundaries/NestedBoundaryInteractions';
import ProvinceBoundaryInteractions from '@src/features/boundaries/ProvinceBoundaryInteractions';
import { useMapUrlState } from '@src/features/map-state/useMapUrlState';
import type { MapViewAction, MapViewState } from '@src/features/map-state/mapViewTypes';
import NestedDetailPanel from '@src/features/nested-detail/NestedDetailPanel';
import { findNestedBySelection } from '@src/features/nested-index/nestedIndexSearch';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';
import ProvinceDetailPanel from '@src/features/province-detail/ProvinceDetailPanel';
import { findProvinceBySelection } from '@src/features/province-index/provinceIndexSearch';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { useMapLibre } from './useMapLibre';

const NESTED_HIT_LAYER_IDS = [
  'districts-pre-2025-candidate-fill',
  'wards-post-2025-candidate-fill',
];

interface SingleMapShellProps {
  defaultCenter: [number, number];
  defaultZoom: number;
  dispatch: Dispatch<MapViewAction>;
  mapStyle: string;
  nestedEntries: NestedIndexEntry[];
  onMapChange?: (map: maplibregl.Map | null) => void;
  onSelectNestedFromMap: (entry: NestedIndexEntry) => void;
  onSelectProvinceFromMap: (entry: ProvinceIndexEntry) => void;
  provinceEntries: ProvinceIndexEntry[];
  state: MapViewState;
}

export default function SingleMapShell({
  defaultCenter,
  defaultZoom,
  dispatch,
  mapStyle,
  nestedEntries,
  onMapChange,
  onSelectNestedFromMap,
  onSelectProvinceFromMap,
  provinceEntries,
  state,
}: SingleMapShellProps) {
  const t = useTranslations('Map');
  const { containerRef, error, isReady, map } = useMapLibre({
    center: defaultCenter,
    style: mapStyle,
    zoom: defaultZoom,
  });
  const selectedProvince = findProvinceBySelection(provinceEntries, state.selectedFeature);
  const selectedNested = findNestedBySelection(nestedEntries, state.selectedFeature);

  // Expose the live map instance back up so MapShell can drive search fly-to
  // without owning the MapLibre lifecycle. Cleanup hands back null on unmount
  // (e.g. when switching to swipe compare mode).
  useEffect(() => {
    onMapChange?.(map);

    return () => {
      onMapChange?.(null);
    };
  }, [map, onMapChange]);

  useMapUrlState({
    dispatch,
    entries: provinceEntries,
    nestedEntries,
    isMapReady: isReady,
    map,
    state,
  });

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-950">{t('errorTitle')}</p>
          <p className="mt-2 text-sm text-slate-600">{t('errorTileServer')}</p>
          <p className="mt-3 text-xs break-words text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-red-500" />
            <p className="text-sm text-gray-500">{t('loading')}</p>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ opacity: isReady ? 1 : 0, transition: 'opacity 0.3s' }}
      />

      {isReady && map && (
        <>
          <BoundaryLayers map={map} state={state} provinceEntries={provinceEntries} />
          <ProvinceBoundaryInteractions
            entries={provinceEntries}
            map={map}
            mode={state.mode}
            onSelect={onSelectProvinceFromMap}
            priorityHitLayerIds={NESTED_HIT_LAYER_IDS}
          />
          <NestedBoundaryInteractions
            entries={nestedEntries}
            map={map}
            mode={state.mode}
            onSelect={onSelectNestedFromMap}
          />
        </>
      )}

      {state.panels.detail && selectedProvince && (
        <ProvinceDetailPanel
          entry={selectedProvince}
          onClose={() => dispatch({ feature: null, type: 'selectFeature' })}
        />
      )}

      {state.panels.detail && selectedNested && (
        <NestedDetailPanel
          entry={selectedNested}
          onClose={() => dispatch({ feature: null, type: 'selectFeature' })}
        />
      )}
    </div>
  );
}
