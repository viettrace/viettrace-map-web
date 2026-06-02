'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useTranslations } from 'next-intl';
import { LocateIcon, RecenterIcon, TrackingIcon } from '@src/components/Map/MapChromeIcons';
import { useGeolocation, type GeolocationStatus } from './useGeolocation';
import GeolocationContextCard from './GeolocationContextCard';

interface LocateButtonProps {
  map: maplibregl.Map | null;
}

export default function LocateButton({ map }: LocateButtonProps) {
  const t = useTranslations('geolocation');
  const { status, position, isTracking, locate, startTracking, stopTracking } = useGeolocation();
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const headingRef = useRef<HTMLDivElement | null>(null);
  const [isPannedAway, setIsPannedAway] = useState(false);
  const lastClickRef = useRef(0);

  // Create/update marker when position changes
  useEffect(() => {
    if (!map || !position) {
      return;
    }

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'geolocation-marker';

      const dot = document.createElement('div');
      dot.className = 'geolocation-dot';
      el.appendChild(dot);

      const heading = document.createElement('div');
      heading.className = 'geolocation-heading';
      el.appendChild(heading);
      headingRef.current = heading;

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([position.lng, position.lat]);
    }

    // Update heading indicator
    if (headingRef.current) {
      if (position.heading !== null) {
        headingRef.current.style.transform = `rotate(${position.heading}deg)`;
        headingRef.current.style.display = 'block';
      } else {
        headingRef.current.style.display = 'none';
      }
    }
  }, [map, position]);

  // Fly to position on first locate or when re-centering
  const flyToPosition = useCallback(() => {
    if (!map || !position) {
      return;
    }

    map.flyTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), 12) });
    setIsPannedAway(false);
  }, [map, position]);

  // Fly to on initial success
  const prevStatusRef = useRef<GeolocationStatus>('idle');

  useEffect(() => {
    const wasLoading = prevStatusRef.current === 'loading';
    prevStatusRef.current = status;

    if (wasLoading && (status === 'success' || status === 'tracking') && map && position) {
      map.flyTo({ center: [position.lng, position.lat], zoom: Math.max(map.getZoom(), 12) });
      setIsPannedAway(false);
    }
  }, [status, map, position]);

  // Detect when user pans away during tracking
  useEffect(() => {
    if (!map || !isTracking || !position) {
      return;
    }

    const onMoveEnd = () => {
      const center = map.getCenter();
      const dist = Math.sqrt(
        Math.pow(center.lat - position.lat, 2) + Math.pow(center.lng - position.lng, 2),
      );

      // If panned more than ~500m at typical zoom, show re-center
      setIsPannedAway(dist > 0.005);
    };

    map.on('moveend', onMoveEnd);

    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [map, isTracking, position]);

  // Cleanup marker on unmount
  useEffect(() => {
    return () => {
      markerRef.current?.remove();
    };
  }, []);

  const handleClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickRef.current;
    lastClickRef.current = now;

    if (isTracking) {
      stopTracking();
      return;
    }

    // Double-tap (within 300ms) starts tracking
    if (timeSinceLastClick < 300 && (status === 'success' || status === 'idle')) {
      startTracking();
      return;
    }

    // Single tap: one-shot locate
    locate();
  }, [isTracking, status, locate, startTracking, stopTracking]);

  const handleLongPress = useCallback(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  // Long-press detection
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPointerDown = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      handleLongPress();
    }, 500);
  }, [handleLongPress]);

  const onPointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const buttonLabel = isTracking
    ? t('stopTracking')
    : status === 'loading'
      ? t('locating')
      : t('locateMe');

  return (
    <div className="relative flex flex-col gap-1">
      <button
        aria-label={buttonLabel}
        className={`maplibregl-ctrl-icon flex h-[29px] w-[29px] items-center justify-center border-b border-gray-200 bg-white transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 ${
          isTracking ? 'bg-blue-50 dark:bg-blue-900/30' : ''
        } ${status === 'loading' ? 'animate-pulse' : ''}`}
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        title={buttonLabel}
        type="button"
      >
        {isTracking ? (
          <TrackingIcon className="h-4 w-4 text-blue-600" />
        ) : (
          <LocateIcon
            className={`h-4 w-4 ${status === 'success' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}
          />
        )}
      </button>

      {isPannedAway && isTracking && (
        <button
          aria-label={t('recenter')}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 shadow-md text-white transition-colors hover:bg-blue-600"
          onClick={flyToPosition}
          title={t('recenter')}
          type="button"
        >
          <RecenterIcon className="h-4 w-4" />
        </button>
      )}

      {(status === 'denied' || status === 'unavailable') && (
        <div
          className="absolute right-full top-0 mr-2 w-48 rounded-md bg-red-800/90 p-2 text-xs text-white shadow-md"
          role="alert"
        >
          {status === 'denied' ? t('denied') : t('unavailable')}
        </div>
      )}

      {(status === 'success' || status === 'tracking') && (
        <GeolocationContextCard
          isReady
          map={map}
          position={position}
          isTracking={isTracking}
        />
      )}
    </div>
  );
}
