'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type GeolocationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'denied'
  | 'unavailable'
  | 'tracking';

export interface GeolocationPosition {
  lat: number;
  lng: number;
  heading: number | null;
  accuracy: number;
}

interface UseGeolocationOptions {
  /** Auto-stop tracking after this many ms (default 10 min) */
  trackingTimeout?: number;
}

const DEFAULT_TRACKING_TIMEOUT = 10 * 60 * 1000;

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
};

function mapError(error: GeolocationPositionError): GeolocationStatus {
  if (error.code === error.PERMISSION_DENIED) {
    return 'denied';
  }

  return 'unavailable';
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { trackingTimeout = DEFAULT_TRACKING_TIMEOUT } = options;

  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTrackingRef = useRef(false);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    isTrackingRef.current = false;
  }, []);

  const handlePosition = useCallback((pos: globalThis.GeolocationPosition) => {
    setPosition({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading,
      accuracy: pos.coords.accuracy,
    });

    if (isTrackingRef.current) {
      setStatus('tracking');
    } else {
      setStatus('success');
    }
  }, []);

  const handleError = useCallback(
    (error: GeolocationPositionError) => {
      console.warn('[Geolocation] error:', error.code, error.message);
      setStatus(mapError(error));
      clearWatch();
    },
    [clearWatch],
  );

  /** One-shot locate */
  const locate = useCallback(() => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setStatus('unavailable');
      return;
    }

    setStatus('loading');
    navigator.geolocation.getCurrentPosition(handlePosition, handleError, GEO_OPTIONS);
  }, [handlePosition, handleError]);

  /** Stop continuous tracking */
  const stopTracking = useCallback(() => {
    clearWatch();

    if (position) {
      setStatus('success');
    } else {
      setStatus('idle');
    }
  }, [clearWatch, position]);

  /** Start continuous tracking */
  const startTracking = useCallback(() => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setStatus('unavailable');
      return;
    }

    clearWatch();
    isTrackingRef.current = true;
    setStatus('loading');

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      GEO_OPTIONS,
    );

    // Auto-stop after timeout
    timeoutIdRef.current = setTimeout(() => {
      stopTracking();
    }, trackingTimeout);
  }, [clearWatch, handlePosition, handleError, trackingTimeout, stopTracking]);

  // Stop tracking on tab hidden, resume on focus
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && isTrackingRef.current) {
        clearWatch();
        // Keep status as 'success' so marker stays, but stop battery drain
        if (position) {
          setStatus('success');
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [clearWatch, position]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearWatch();
    };
  }, [clearWatch]);

  return {
    status,
    position,
    isTracking: status === 'tracking',
    locate,
    startTracking,
    stopTracking,
  };
}
