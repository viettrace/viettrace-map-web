'use client';

import { useCallback, useReducer } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslations } from 'next-intl';
import MapAttribution from '@src/components/Map/MapAttribution';
import MapControlPanel from '@src/components/Map/MapControlPanel';
import MapDataNotice from '@src/components/Map/MapDataNotice';
import BoundaryLayers from '@src/features/boundaries/BoundaryLayers';
import ProvinceBoundaryInteractions from '@src/features/boundaries/ProvinceBoundaryInteractions';
import { initialMapViewState, mapViewReducer } from '@src/features/map-state/mapViewReducer';
import { useMapUrlState } from '@src/features/map-state/useMapUrlState';
import ProvinceDetailPanel from '@src/features/province-detail/ProvinceDetailPanel';
import { findProvinceBySelection } from '@src/features/province-index/provinceIndexSearch';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { useProvinceIndex } from '@src/features/province-index/useProvinceIndex';
import ProvinceSearch from '@src/features/province-search/ProvinceSearch';
import { readPublicEnv } from '@src/libs/config/publicEnv';
import { fitBbox } from '@src/libs/maplibre/camera';
import { useMapLibre } from './useMapLibre';

const DEFAULT_CENTER: [number, number] = [105.8, 21.0];
const DEFAULT_ZOOM = 5;

export default function MapShell() {
  const [state, dispatch] = useReducer(mapViewReducer, initialMapViewState);
  const t = useTranslations('Map');
  const publicEnv = readPublicEnv();
  const provinceIndex = useProvinceIndex();
  const provinceEntries = provinceIndex.data?.provinces ?? [];
  const { containerRef, error, isReady, map } = useMapLibre({
    center: DEFAULT_CENTER,
    style: publicEnv.mapStyle,
    zoom: DEFAULT_ZOOM,
  });
  const selectedProvince = findProvinceBySelection(provinceEntries, state.selectedFeature);

  const selectProvince = useCallback(
    (entry: ProvinceIndexEntry, options: { fit?: boolean } = {}) => {
      dispatch({
        feature: {
          mode: entry.mode,
          slug: entry.slug,
          type: 'province',
        },
        type: 'selectFeature',
      });

      if (map && options.fit !== false) {
        fitBbox(map, entry.bbox);
      }
    },
    [map],
  );
  const selectProvinceFromMap = useCallback(
    (entry: ProvinceIndexEntry) => {
      selectProvince(entry, { fit: false });
    },
    [selectProvince],
  );

  useMapUrlState({
    dispatch,
    entries: provinceEntries,
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
    <div className="viettrace-map-shell relative w-full overflow-hidden">
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
          <BoundaryLayers map={map} state={state} />
          <ProvinceBoundaryInteractions
            entries={provinceEntries}
            map={map}
            mode={state.mode}
            onSelect={selectProvinceFromMap}
          />
        </>
      )}

      <ProvinceSearch
        entries={provinceEntries}
        hasError={Boolean(provinceIndex.error)}
        isLoading={provinceIndex.isLoading}
        onSelect={selectProvince}
      />

      {state.panels.detail && selectedProvince && (
        <ProvinceDetailPanel
          entry={selectedProvince}
          onClose={() => dispatch({ feature: null, type: 'selectFeature' })}
        />
      )}

      <MapControlPanel
        canToggleIslands={Boolean(publicEnv.tileUrlIslands)}
        canToggleNestedCandidates={Boolean(
          publicEnv.tileUrlPreDistrictsCandidate || publicEnv.tileUrlPostWardsCandidate,
        )}
        mode={state.mode}
        onToggle={mode => dispatch({ mode, type: 'setMode' })}
        showNestedCandidates={state.layers.nestedCandidates}
        onToggleNestedCandidates={visible =>
          dispatch({ type: 'setNestedCandidatesVisible', visible })
        }
        showIslands={state.layers.offshoreIslands}
        onToggleIslands={visible => dispatch({ type: 'setOffshoreIslandsVisible', visible })}
      />
      {state.panels.dataNotice && (
        <MapDataNotice onClose={() => dispatch({ open: false, type: 'setDataNoticeOpen' })} />
      )}
      <MapAttribution
        isDataNoticeOpen={state.panels.dataNotice}
        onToggleDataNotice={() => dispatch({ type: 'toggleDataNotice' })}
      />
    </div>
  );
}
