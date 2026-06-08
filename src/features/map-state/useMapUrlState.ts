'use client';

import type { Dispatch, MutableRefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import type maplibregl from 'maplibre-gl';
import { findProvinceBySlug } from '@src/features/province-index/provinceIndexSearch';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { findNestedBySlug } from '@src/features/nested-index/nestedIndexSearch';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';
import { highlightFeature } from '@src/features/boundaries/featureHighlight';
import { fitBbox } from '@src/libs/maplibre/camera';
import type { MapViewAction, MapViewState } from './mapViewTypes';
import { readMapUrlState, writeMapUrlState } from './urlState';

interface UseMapUrlStateOptions {
  dispatch: Dispatch<MapViewAction>;
  entries: ProvinceIndexEntry[];
  nestedEntries: NestedIndexEntry[];
  isMapReady: boolean;
  map: maplibregl.Map | null;
  state: MapViewState;
}

export function useMapUrlState({
  dispatch,
  entries,
  nestedEntries,
  isMapReady,
  map,
  state,
}: UseMapUrlStateOptions) {
  const locale = useLocale();
  const restoredRef = useRef(false);
  const [isRestored, setIsRestored] = useState(false);
  const cameraRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  // Capture the route's search params via Next.js's useSearchParams() rather
  // than window.location.search.  In React 18 concurrent mode, Next.js may
  // start a tentative render of this page BEFORE history.pushState updates
  // the browser URL — so window.location.search would reflect the *previous*
  // page's URL (e.g. /vi/stats, no params), causing the province restore to
  // read empty params and eventually overwrite the URL with ?mode=pre.
  // useSearchParams() reads from React's routing context, which always carries
  // the params for the route being rendered, regardless of pushState timing.
  const routerSearchParams = useSearchParams();
  const initialSearchRef = useRef<string | null>(null);
  if (initialSearchRef.current === null) {
    initialSearchRef.current = routerSearchParams.toString();
  }

  useEffect(() => {
    if (restoredRef.current || !isMapReady || !map || entries.length === 0) {
      return;
    }

    const parsedState = readMapUrlState(new URLSearchParams(initialSearchRef.current ?? ''));
    const urlMode = parsedState.mode;
    const selectedNested =
      urlMode && parsedState.nestedSlug && parsedState.nestedType && nestedEntries.length > 0
        ? findNestedBySlug(nestedEntries, urlMode, parsedState.nestedType, parsedState.nestedSlug)
        : null;
    const selectedEntry =
      !selectedNested && urlMode && parsedState.provinceSlug
        ? findProvinceBySlug(entries, urlMode, parsedState.provinceSlug)
        : null;

    if (parsedState.compareMode) {
      dispatch({ compareMode: parsedState.compareMode, type: 'setCompareMode' });
    }

    if (parsedState.compareDividerX !== null) {
      dispatch({ dividerX: parsedState.compareDividerX, type: 'setCompareDividerX' });
    }

    // Restore camera position from URL if present and no feature is selected
    // (feature selection takes priority with fitBbox).
    const hasUrlCamera = parsedState.lat !== null && parsedState.lng !== null;

    // In swipe mode the user's selection-on-load is intentionally cleared by
    // the reducer; skip reapplying province/nested URL params so we don't
    // reopen the detail panel that swipe suppresses.
    if (parsedState.compareMode === 'swipe') {
      if (urlMode) {
        dispatch({ mode: urlMode, type: 'setMode' });
      }

      if (hasUrlCamera) {
        map.jumpTo({
          center: [parsedState.lng!, parsedState.lat!],
          zoom: parsedState.zoom ?? undefined,
        });
      }

      restoredRef.current = true;
      setIsRestored(true);
      return;
    }

    if (selectedNested) {
      dispatch({
        feature: {
          featureType: selectedNested.type,
          mode: selectedNested.mode,
          slug: selectedNested.slug,
          type: 'nested',
        },
        type: 'selectFeature',
      });
      fitBbox(map, selectedNested.bbox, { duration: 0 });
      highlightFeature({
        map,
        center: [selectedNested.center[0], selectedNested.center[1]],
        label:
          locale === 'en' && selectedNested.name_en ? selectedNested.name_en : selectedNested.name,
        color: selectedNested.mode === 'pre' ? '#dc2626' : '#1d4ed8',
        mode: selectedNested.mode,
        featureName: selectedNested.name,
        featureType: selectedNested.type === 'district' ? 'district' : 'ward',
      });
    } else if (selectedEntry) {
      dispatch({
        feature: {
          mode: selectedEntry.mode,
          slug: selectedEntry.slug,
          type: 'province',
        },
        type: 'selectFeature',
      });
      fitBbox(map, selectedEntry.bbox, { duration: 0 });
      highlightFeature({
        map,
        center: [selectedEntry.center[0], selectedEntry.center[1]],
        label: locale === 'en' ? selectedEntry.name_en : selectedEntry.name,
        color: selectedEntry.mode === 'pre' ? '#dc2626' : '#1d4ed8',
        mode: selectedEntry.mode,
        featureName: selectedEntry.name,
        featureType: 'province',
      });
    } else if (hasUrlCamera) {
      if (urlMode) {
        dispatch({ mode: urlMode, type: 'setMode' });
      }

      map.jumpTo({
        center: [parsedState.lng!, parsedState.lat!],
        zoom: parsedState.zoom ?? undefined,
      });
    } else if (urlMode) {
      dispatch({ mode: urlMode, type: 'setMode' });
    }

    restoredRef.current = true;
    setIsRestored(true);

    return () => {
      // Reset the guard so a subsequent map mount (React StrictMode remount,
      // or switching swipe→single) re-runs the restore and calls fitBbox on
      // the new instance.  We intentionally do NOT reset isRestored here:
      // calling setIsRestored(false) can race with the new restore's
      // setIsRestored(true) and briefly leave isRestored=false, which causes
      // syncUrl to run with stale state.
      restoredRef.current = false;
    };
  }, [dispatch, entries, isMapReady, map, nestedEntries, locale]);

  // Persist camera position on map moveend
  useEffect(() => {
    if (!map || !isRestored) {
      return;
    }

    const onMoveEnd = () => {
      const center = map.getCenter();
      cameraRef.current = { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
      syncUrl(state, cameraRef);
    };

    map.on('moveend', onMoveEnd);

    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [map, isRestored, state]);

  useEffect(() => {
    if (!isRestored) {
      return;
    }

    syncUrl(state, cameraRef);
  }, [isRestored, state]);
}

function syncUrl(
  state: MapViewState,
  cameraRef: MutableRefObject<{ lat: number; lng: number; zoom: number } | null>,
) {
  const url = new URL(window.location.href);
  const nextSearchParams = writeMapUrlState(url.searchParams, state, cameraRef.current);
  const nextSearch = nextSearchParams.toString();
  const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
  const currentUrl = `${url.pathname}${url.search}${url.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(window.history.state, '', nextUrl);
  }
}
