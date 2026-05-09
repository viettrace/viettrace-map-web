'use client';

import type { Dispatch } from 'react';
import { useEffect, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { findProvinceBySlug } from '@src/features/province-index/provinceIndexSearch';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { fitBbox } from '@src/libs/maplibre/camera';
import type { MapViewAction, MapViewState } from './mapViewTypes';
import { readMapUrlState, writeMapUrlState } from './urlState';

interface UseMapUrlStateOptions {
  dispatch: Dispatch<MapViewAction>;
  entries: ProvinceIndexEntry[];
  isMapReady: boolean;
  map: maplibregl.Map | null;
  state: MapViewState;
}

export function useMapUrlState({
  dispatch,
  entries,
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
    const selectedEntry =
      urlMode && parsedState.provinceSlug
        ? findProvinceBySlug(entries, urlMode, parsedState.provinceSlug)
        : null;

    if (selectedEntry) {
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
  }, [dispatch, entries, isMapReady, map]);

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
