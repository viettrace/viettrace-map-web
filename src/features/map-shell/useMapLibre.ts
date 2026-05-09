'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

interface UseMapLibreOptions {
  center: [number, number];
  style: string;
  zoom: number;
}

export function useMapLibre({ center, style, zoom }: UseMapLibreOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const mapInstance = new maplibregl.Map({
        attributionControl: {
          compact: true,
        },
        center,
        container: containerRef.current,
        style,
        zoom,
      });

      mapInstance.addControl(new maplibregl.NavigationControl(), 'bottom-right');

      mapInstance.on('load', () => {
        setIsReady(true);
      });

      mapInstance.on('error', event => {
        setError(String(event.error || 'Unknown map error'));
      });

      mapRef.current = mapInstance;
      setMap(mapInstance);
    } catch (err) {
      setError(String(err));
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      setMap(null);
      setIsReady(false);
    };
  }, [center, style, zoom]);

  return {
    containerRef,
    error,
    isReady,
    map,
  };
}
