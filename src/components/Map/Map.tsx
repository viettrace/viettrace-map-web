'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslations } from 'next-intl';
import ProvinceLayer from './ProvinceLayer';
import MapToggle from './MapToggle';
import ProvincePopup from './ProvincePopup';
import MapAttribution from './MapAttribution';

const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export default function Map() {
  const [mode, setMode] = useState<'pre' | 'post'>('pre');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const t = useTranslations('Map');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [105.8, 21.0],
        zoom: 5,
        attributionControl: {
          compact: true,
        },
      });

      map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

      map.on('load', () => {
        setIsReady(true);
      });

      map.on('error', (e) => {
        setError(String(e.error || 'Unknown map error'));
      });

      mapRef.current = map;
    } catch (err) {
      setError(String(err));
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setIsReady(false);
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-950">{t('errorTitle')}</p>
          <p className="mt-2 text-sm text-slate-600">{t('errorTileServer')}</p>
          <p className="mt-3 break-words text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="viettrace-map-shell relative h-screen w-full md:h-dvh">
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

      {isReady && mapRef.current && (
        <>
          <ProvinceLayer map={mapRef.current} mode={mode} />
          <ProvincePopup map={mapRef.current} mode={mode} />
        </>
      )}

      <MapToggle mode={mode} onToggle={setMode} />
      <MapAttribution />
    </div>
  );
}
