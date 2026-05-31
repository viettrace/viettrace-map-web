'use client';

import { useEffect, useMemo, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslations } from 'next-intl';
import BoundaryLayers from '@src/features/boundaries/BoundaryLayers';
import { useMapLibre } from '@src/features/map-shell/useMapLibre';
import type { MapViewState } from '@src/features/map-state/mapViewTypes';
import { findNestedBySelection } from '@src/features/nested-index/nestedIndexSearch';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';
import { findProvinceBySelection } from '@src/features/province-index/provinceIndexSearch';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { fitBbox } from '@src/libs/maplibre/camera';
import SwipeDivider from './SwipeDivider';
import { useSyncedMaps } from './useSyncedMaps';

interface CompareMapShellProps {
  defaultCenter: [number, number];
  defaultZoom: number;
  dividerX: number;
  mapStyle: string;
  nestedEntries: NestedIndexEntry[];
  onDividerChange: (dividerX: number) => void;
  provinceEntries: ProvinceIndexEntry[];
  state: MapViewState;
}

export default function CompareMapShell({
  defaultCenter,
  defaultZoom,
  dividerX,
  mapStyle,
  nestedEntries,
  onDividerChange,
  provinceEntries,
  state,
}: CompareMapShellProps) {
  const t = useTranslations('Map');
  const containerRef = useRef<HTMLDivElement>(null);

  const preMap = useMapLibre({ center: defaultCenter, style: mapStyle, zoom: defaultZoom });
  const postMap = useMapLibre({ center: defaultCenter, style: mapStyle, zoom: defaultZoom });

  useSyncedMaps({ primary: preMap.map, secondary: postMap.map });

  const preState = useMemo<MapViewState>(() => ({ ...state, mode: 'pre' }), [state]);
  const postState = useMemo<MapViewState>(() => ({ ...state, mode: 'post' }), [state]);

  // Fly-to for search-driven selections in compare mode. The single-map shell
  // intentionally keeps the user's current zoom for search, but in swipe mode
  // there is no detail panel to confirm the selection — the user expects the
  // map to navigate. Both maps stay aligned via `useSyncedMaps`, so only the
  // primary map needs `fitBounds`; the secondary mirrors the camera as it
  // animates.
  useEffect(() => {
    const map = preMap.map;

    if (!map || !preMap.isReady || !state.selectedFeature) {
      return;
    }

    const province = findProvinceBySelection(provinceEntries, state.selectedFeature);
    const nested = findNestedBySelection(nestedEntries, state.selectedFeature);
    const bbox = nested?.bbox ?? province?.bbox;

    if (bbox) {
      fitBbox(map, bbox);
    }
  }, [
    nestedEntries,
    preMap.isReady,
    preMap.map,
    provinceEntries,
    state.selectedFeature,
  ]);

  // The two map containers resize as the divider moves; MapLibre needs an
  // explicit resize() to repaint the canvas to the new pixel dimensions.
  // Both maps render at the full viewport size and we control visibility with
  // CSS `clip-path` so the canvases never have to resize during drag — that
  // was producing a black flash because MapLibre's ResizeObserver could not
  // keep the framebuffer in sync with fast container width changes.

  const error = preMap.error ?? postMap.error;

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

  const isReady = preMap.isReady && postMap.isReady;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-red-500" />
            <p className="text-sm text-gray-500">{t('loading')}</p>
          </div>
        </div>
      )}

      {/* Left (pre) side: clipped to dividerX. */}
      <div
        className="absolute inset-0 z-10"
        style={{ clipPath: `inset(0 ${(100 - dividerX * 100).toFixed(2)}% 0 0)` }}
      >
        <div ref={preMap.containerRef} className="h-full w-full" />
      </div>

      {/* Right (post) side: clipped from dividerX onward. */}
      <div
        className="absolute inset-0 z-0"
        style={{ clipPath: `inset(0 0 0 ${(dividerX * 100).toFixed(2)}%)` }}
      >
        <div ref={postMap.containerRef} className="h-full w-full" />
      </div>

      {preMap.map && (
        <BoundaryLayers map={preMap.map} state={preState} />
      )}
      {postMap.map && (
        <BoundaryLayers map={postMap.map} state={postState} />
      )}

      <CompareModeLegend />
      <SwipeDivider
        containerRef={containerRef}
        dividerX={dividerX}
        onDividerChange={onDividerChange}
      />
    </div>
  );
}

// Compact legend for compare mode: a single pill with color swatches mapping
// red -> pre-merger boundaries (left side) and blue -> post-merger (right
// side). Replaces two free-floating badges that read awkwardly on wider
// viewports.
function CompareModeLegend() {
  const t = useTranslations('Map');

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-30 flex justify-center px-3 sm:top-20 lg:top-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-sm sm:gap-3 sm:text-xs">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-red-600" />
          <span>{t('togglePre')}</span>
          <span className="hidden text-slate-500 sm:inline">{t('togglePreLabel')}</span>
        </span>
        <span aria-hidden className="h-3 w-px bg-slate-300" />
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-blue-600" />
          <span>{t('togglePost')}</span>
          <span className="hidden text-slate-500 sm:inline">{t('togglePostLabel')}</span>
        </span>
      </div>
    </div>
  );
}
