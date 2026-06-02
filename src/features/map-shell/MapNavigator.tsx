'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { LocateIcon, TrackingIcon, RecenterIcon } from '@src/components/Map/MapChromeIcons';
import { useGeolocation } from '@src/features/geolocation/useGeolocation';
import { useTranslations } from 'next-intl';
import GeolocationContextCard from '@src/features/geolocation/GeolocationContextCard';

interface MapNavigatorProps {
  map: maplibregl.Map | null;
}

function CompassIcon({ bearing }: { bearing: number }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      style={{ transform: `rotate(${-bearing}deg)` }}
      viewBox="0 0 24 24"
    >
      <path d="M12 2L12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 2L9 7H15L12 2Z" fill="currentColor" />
    </svg>
  );
}

export default function MapNavigator({ map }: MapNavigatorProps) {
  const t = useTranslations('geolocation');
  const { status, position, isTracking, locate, startTracking, stopTracking } = useGeolocation();
  const [bearing, setBearing] = useState(0);
  const [isContextReady, setIsContextReady] = useState(false);
  const [isPannedAway, setIsPannedAway] = useState(false);
  const [showError, setShowError] = useState(false);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const wasLoadingRef = useRef(false);

  // Track bearing for compass
  useEffect(() => {
    if (!map) return;
    const onRotate = () => setBearing(map.getBearing());
    map.on('rotate', onRotate);
    return () => { map.off('rotate', onRotate); };
  }, [map]);

  // Create/update geolocation marker on map
  useEffect(() => {
    if (!map || !position) return;

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'geolocation-marker';

      const dot = document.createElement('div');
      dot.className = 'geolocation-dot';
      el.appendChild(dot);

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([position.lng, position.lat]);
    }
  }, [map, position]);

  // Remove marker when geolocation stops
  useEffect(() => {
    if (status === 'idle' && markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [status]);

  // Show error toast briefly
  useEffect(() => {
    if (status === 'denied' || status === 'unavailable') {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 4000);
      return () => clearTimeout(timer);
    }
    setShowError(false);
    return undefined;
  }, [status]);

  useEffect(() => {
    if (status === 'loading') {
      wasLoadingRef.current = true;
      setIsContextReady(false);
      return;
    }

    if (!map || !position) {
      setIsContextReady(false);
      return;
    }

    if (wasLoadingRef.current && (status === 'success' || status === 'tracking')) {
      wasLoadingRef.current = false;
      setIsContextReady(false);

      const onIdle = () => {
        setIsContextReady(true);
      };

      map.once('idle', onIdle);
      map.flyTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), 13) });
      return () => { map.off('idle', onIdle); };
    }

    setIsContextReady(true);
    return undefined;
  }, [map, position, status]);

  // Track if user panned away from GPS position
  useEffect(() => {
    if (!map || !isTracking || !position) return;
    const onMove = () => {
      const center = map.getCenter();
      const dist = Math.abs(center.lat - position.lat) + Math.abs(center.lng - position.lng);
      setIsPannedAway(dist > 0.001);
    };
    map.on('moveend', onMove);
    return () => { map.off('moveend', onMove); };
  }, [map, isTracking, position]);

  const handleLocate = useCallback(() => {
    if (!map) return;
    if (isTracking) {
      stopTracking();
      return;
    }
    // If we already have a position, start tracking; otherwise one-shot locate
    if (position) {
      setIsContextReady(false);
      startTracking();
      map.flyTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), 13) });
    } else {
      locate();
    }
  }, [map, isTracking, position, locate, startTracking, stopTracking]);

  const flyToPosition = useCallback(() => {
    if (!map || !position) return;
    setIsContextReady(false);
    map.flyTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), 13) });
    map.once('idle', () => setIsContextReady(true));
    setIsPannedAway(false);
  }, [map, position]);

  const handleZoomIn = useCallback(() => map?.zoomIn(), [map]);
  const handleZoomOut = useCallback(() => map?.zoomOut(), [map]);
  const handleResetNorth = useCallback(() => {
    map?.easeTo({ bearing: 0, pitch: 0 });
  }, [map]);

  const btnBase =
    'flex h-[30px] w-[30px] items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40';
  const divider = 'border-t border-gray-200 dark:border-gray-600';

  return (
    <div className="absolute bottom-[var(--map-control-bottom-offset)] right-2.5 z-10 sm:right-3">
      <div className="relative flex flex-col overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800">
        {/* GPS */}
        <button
          aria-label={isTracking ? t('stopTracking') : t('locateMe')}
          className={`${btnBase} ${isTracking ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'} ${status === 'loading' ? 'animate-pulse' : ''}`}
          onClick={handleLocate}
          title={isTracking ? t('stopTracking') : t('locateMe')}
          type="button"
        >
          {isTracking ? (
            <TrackingIcon className="h-4 w-4" />
          ) : (
            <LocateIcon className="h-4 w-4" />
          )}
        </button>

        {/* Recenter (only when tracking + panned away) */}
        {isPannedAway && isTracking && (
          <>
            <div className={divider} />
            <button
              aria-label={t('recenter')}
              className={`${btnBase} text-blue-600`}
              onClick={flyToPosition}
              title={t('recenter')}
              type="button"
            >
              <RecenterIcon className="h-4 w-4" />
            </button>
          </>
        )}

        <div className={divider} />

        {/* Zoom In */}
        <button
          aria-label="Zoom in"
          className={`${btnBase} text-gray-700 dark:text-gray-300`}
          onClick={handleZoomIn}
          title="Zoom in"
          type="button"
        >
          <span className="text-lg font-light leading-none">+</span>
        </button>

        <div className={divider} />

        {/* Zoom Out */}
        <button
          aria-label="Zoom out"
          className={`${btnBase} text-gray-700 dark:text-gray-300`}
          onClick={handleZoomOut}
          title="Zoom out"
          type="button"
        >
          <span className="text-lg font-light leading-none">&minus;</span>
        </button>

        <div className={divider} />

        {/* Compass */}
        <button
          aria-label="Reset north"
          className={`${btnBase} text-gray-700 dark:text-gray-300`}
          onClick={handleResetNorth}
          title="Reset north"
          type="button"
        >
          <CompassIcon bearing={bearing} />
        </button>
      </div>

      {/* Error toast */}
      {showError && (
        <div
          className="absolute top-0 right-full mr-2 w-48 rounded-md bg-red-800/90 p-2 text-xs text-white shadow-md"
          role="alert"
        >
          {status === 'denied' ? t('denied') : t('unavailable')}
        </div>
      )}

      {/* Geolocation context card */}
      <div className="fixed top-[4.25rem] right-3 z-20 lg:top-[4.75rem] lg:right-4">
        <GeolocationContextCard
          isReady={isContextReady}
          map={map}
          position={position}
          isTracking={isTracking}
        />
      </div>
    </div>
  );
}
