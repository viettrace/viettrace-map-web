'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useMapLibre } from '@src/features/map-shell/useMapLibre';
import { localizeBasemapStyle } from '@src/libs/config/publicEnv';
import type { AddressResult } from './addressConversion';

// A small result map: a blue marker at each new-ward centroid (>1 for a divided old ward). Fully
// decorative — on any map error it renders nothing so the converter still works without it.
export default function AddressResultMap({ results }: { results: AddressResult[] }) {
  const locale = useLocale();
  const style = localizeBasemapStyle(
    process.env.NEXT_PUBLIC_MAP_STYLE ?? '/omt-basemap-style.json',
    locale,
  );

  const first = results[0];
  // Memoize center so useMapLibre doesn't recreate the map on every render (its effect deps include
  // center) — same guard ProvinceMiniMap uses.
  const center = useMemo<[number, number]>(
    () => [first?.lon ?? 106, first?.lat ?? 16],
    [first?.lon, first?.lat],
  );
  const { containerRef, error, isReady, map } = useMapLibre({ center, style, zoom: 11 });
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!map || !isReady) return;
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    for (const m of markersRef.current) m.remove();
    markersRef.current = [];

    const points = results.filter(
      (r): r is AddressResult & { lat: number; lon: number } => r.lat !== null && r.lon !== null,
    );
    if (points.length === 0) return;

    for (const r of points) {
      const marker = new maplibregl.Marker({ color: '#1d4ed8' })
        .setLngLat([r.lon, r.lat])
        .setPopup(new maplibregl.Popup({ offset: 24, closeButton: false }).setText(r.newWard))
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (points.length === 1) {
      const p0 = points[0]!;
      map.jumpTo({ center: [p0.lon, p0.lat], zoom: 11 });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      for (const r of points) bounds.extend([r.lon, r.lat]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 0 });
    }

    return () => {
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
    };
  }, [map, isReady, results]);

  if (error) return null;

  return (
    <div
      ref={containerRef}
      className="h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 md:h-64 dark:border-slate-700"
    />
  );
}
