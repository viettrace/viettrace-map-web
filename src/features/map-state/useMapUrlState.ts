'use client';

import type { Dispatch, MutableRefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { findProvinceBySlug } from '@src/features/province-index/provinceIndexSearch';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { findNestedBySlug } from '@src/features/nested-index/nestedIndexSearch';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';
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
  const restoredRef = useRef(false);
  const [isRestored, setIsRestored] = useState(false);
  const cameraRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  useEffect(() => {
    if (restoredRef.current || !isMapReady || !map || entries.length === 0) {
      return;
    }

    const parsedState = readMapUrlState(new URLSearchParams(window.location.search));
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
  }, [dispatch, entries, isMapReady, map, nestedEntries]);

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
