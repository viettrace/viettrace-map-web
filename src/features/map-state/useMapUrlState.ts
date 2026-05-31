'use client';

import type { Dispatch } from 'react';
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

    // In swipe mode the user's selection-on-load is intentionally cleared by
    // the reducer; skip reapplying province/nested URL params so we don't
    // reopen the detail panel that swipe suppresses.
    if (parsedState.compareMode === 'swipe') {
      if (urlMode) {
        dispatch({ mode: urlMode, type: 'setMode' });
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
    } else if (urlMode) {
      dispatch({ mode: urlMode, type: 'setMode' });
    }

    restoredRef.current = true;
    setIsRestored(true);
  }, [dispatch, entries, isMapReady, map, nestedEntries]);

  useEffect(() => {
    if (!isRestored) {
      return;
    }

    const url = new URL(window.location.href);
    const nextSearchParams = writeMapUrlState(url.searchParams, state);
    const nextSearch = nextSearchParams.toString();
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
    const currentUrl = `${url.pathname}${url.search}${url.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [isRestored, state]);
}
