'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type maplibregl from 'maplibre-gl';
import MapAttribution from '@src/components/Map/MapAttribution';
import MapSettingsPanel from '@src/components/Map/MapSettingsPanel';
import MapDataNotice from '@src/components/Map/MapDataNotice';
import { clearHighlight, highlightFeature } from '@src/features/boundaries/featureHighlight';
import CompareMapShell from '@src/features/compare/CompareMapShell';
import { initialMapViewState, mapViewReducer } from '@src/features/map-state/mapViewReducer';
import type { CompareMode } from '@src/features/map-state/mapViewTypes';
import { readMapUrlState, writeMapUrlState } from '@src/features/map-state/urlState';
import { useNestedIndex } from '@src/features/nested-index/useNestedIndex';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';
import { useProvinceIndex } from '@src/features/province-index/useProvinceIndex';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import ProvinceSearch from '@src/features/province-search/ProvinceSearch';
import { readPublicEnv } from '@src/libs/config/publicEnv';
import { fitBbox } from '@src/libs/maplibre/camera';
import SingleMapShell from './SingleMapShell';

const DEFAULT_CENTER: [number, number] = [105.8, 21.0];
const DEFAULT_ZOOM = 5;

/**
 * On mobile the detail panel covers ~42dvh from the bottom, so a fly-to that
 * lands the feature in the middle of the viewport hides the highlight behind
 * the panel. We push the bottom padding up so the highlight stays in the
 * visible top half of the map. Desktop layout keeps the panel on the right
 * side and uses the default symmetric padding.
 */
function getDetailPanelFitPadding() {
  if (typeof window === 'undefined') {
    return {};
  }

  const isMobile = window.matchMedia('(max-width: 767px)').matches;

  if (!isMobile) {
    return {};
  }

  const panelHeight = Math.round(window.innerHeight * 0.42);

  return { bottomPadding: panelHeight + 32, topPadding: 64 };
}

export default function MapShell() {
  const [state, dispatch] = useReducer(mapViewReducer, initialMapViewState);
  const compareRestoredRef = useRef(false);
  // The active single-map instance, populated by SingleMapShell once MapLibre
  // finishes mounting. Kept in MapShell so search-driven fly-to can run from
  // the same place that owns the search component. CompareMapShell handles
  // its own fly-to internally via its `selectedFeature` effect.
  const [singleMap, setSingleMap] = useState<maplibregl.Map | null>(null);
  const publicEnv = readPublicEnv();
  const provinceIndex = useProvinceIndex();
  const nestedIndex = useNestedIndex();
  const provinceEntries = provinceIndex.data?.provinces ?? [];
  const nestedEntries = nestedIndex.data?.features ?? [];

  // Restore compare-mode and divider position from the URL on mount. Done in
  // an effect (rather than the reducer initializer) so SSR and the first
  // client render always start from `initialMapViewState`, avoiding hydration
  // mismatches when the URL already carries compare params.
  useEffect(() => {
    if (compareRestoredRef.current) {
      return;
    }

    compareRestoredRef.current = true;
    const parsed = readMapUrlState(new URLSearchParams(window.location.search));

    if (parsed.compareMode) {
      dispatch({ compareMode: parsed.compareMode, type: 'setCompareMode' });
    }

    if (parsed.compareDividerX !== null) {
      dispatch({ dividerX: parsed.compareDividerX, type: 'setCompareDividerX' });
    }
  }, []);

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

      // Search-driven selection flies the map to the entry. Map-click selection
      // passes `{ fit: false }` so the user keeps their current camera.
      // CompareMapShell drives fly-to from its own `selectedFeature` effect, so
      // we only fit here when a single map is active.
      if (!singleMap) {
        return;
      }

      if (options.fit !== false) {
        fitBbox(singleMap, entry.bbox, getDetailPanelFitPadding());

        // Search-driven selection also gets a temporary highlight (centered
        // dot + bold label) so the user can see exactly which province was
        // chosen even at modest zoom levels where the basemap label has not
        // faded in yet.
        highlightFeature({
          map: singleMap,
          center: [entry.center[0], entry.center[1]],
          label: entry.name,
          color: entry.mode === 'pre' ? '#dc2626' : '#1d4ed8',
          mode: entry.mode,
          featureName: entry.name,
          featureType: 'province',
        });
      } else {
        // Map-click selection: drop any lingering search highlight so the
        // detail panel and the highlighted feature stay in sync.
        clearHighlight(singleMap);
      }
    },
    [singleMap],
  );

  const selectProvinceFromMap = useCallback(
    (entry: ProvinceIndexEntry) => {
      selectProvince(entry, { fit: false });
    },
    [selectProvince],
  );

  const selectNested = useCallback(
    (entry: NestedIndexEntry, options: { fit?: boolean } = {}) => {
      dispatch({
        feature: {
          featureType: entry.type,
          mode: entry.mode,
          slug: entry.slug,
          type: 'nested',
        },
        type: 'selectFeature',
      });

      if (!singleMap) {
        return;
      }

      if (options.fit !== false) {
        fitBbox(singleMap, entry.bbox, getDetailPanelFitPadding());

        highlightFeature({
          map: singleMap,
          center: [entry.center[0], entry.center[1]],
          label: entry.name,
          color: entry.mode === 'pre' ? '#dc2626' : '#1d4ed8',
          mode: entry.mode,
          featureName: entry.name,
          featureType: entry.type,
        });
      } else {
        clearHighlight(singleMap);
      }
    },
    [singleMap],
  );

  const selectNestedFromMap = useCallback(
    (entry: NestedIndexEntry) => {
      selectNested(entry, { fit: false });
    },
    [selectNested],
  );

  // Clear the search highlight when the detail panel closes (or selection is
  // cleared by switching mode/compare). The highlight is purely a wayfinding
  // aid for the search flow; once the user dismisses the detail panel we
  // expect the map to look normal again.
  useEffect(() => {
    if (!singleMap) {
      return;
    }

    if (!state.panels.detail || !state.selectedFeature) {
      clearHighlight(singleMap);
    }
  }, [singleMap, state.panels.detail, state.selectedFeature]);

  // Mirror compareMode/dividerX changes to the URL. Province/nested selection
  // is mirrored separately by useMapUrlState inside SingleMapShell, but that
  // hook only runs in single-map mode. This effect is the dedicated writer
  // for compare-related params so swipe state survives reloads even when
  // SingleMapShell is unmounted.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const next = writeMapUrlState(url.searchParams, state);
    const search = next.toString();
    const nextUrl = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
    const currentUrl = `${url.pathname}${url.search}${url.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [state]);

  function handleCompareModeChange(compareMode: CompareMode) {
    dispatch({ compareMode, type: 'setCompareMode' });
  }

  function handleDividerChange(dividerX: number) {
    dispatch({ dividerX, type: 'setCompareDividerX' });
  }

  return (
    <div className="viettrace-map-shell relative w-full overflow-hidden">
      {state.compareMode === 'swipe' ? (
        <CompareMapShell
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          dividerX={state.compareDividerX}
          mapStyle={publicEnv.mapStyle}
          nestedEntries={nestedEntries}
          onDividerChange={handleDividerChange}
          provinceEntries={provinceEntries}
          state={state}
        />
      ) : (
        <SingleMapShell
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          dispatch={dispatch}
          mapStyle={publicEnv.mapStyle}
          nestedEntries={nestedEntries}
          onMapChange={setSingleMap}
          onSelectNestedFromMap={selectNestedFromMap}
          onSelectProvinceFromMap={selectProvinceFromMap}
          provinceEntries={provinceEntries}
          state={state}
        />
      )}

      <ProvinceSearch
        entries={provinceEntries}
        hasError={Boolean(provinceIndex.error)}
        isLoading={provinceIndex.isLoading}
        mode={state.mode}
        compareMode={state.compareMode}
        onSelect={selectProvince}
        nestedEntries={nestedEntries}
        onSelectNested={selectNested}
      />

      <MapSettingsPanel
        compareMode={state.compareMode}
        mode={state.mode}
        onCompareModeChange={handleCompareModeChange}
        onToggle={mode => dispatch({ mode, type: 'setMode' })}
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
