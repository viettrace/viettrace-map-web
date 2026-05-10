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
        attributionControl: false,
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

  useEffect(() => {
    if (!map) return;

    let animationFrame: number | null = null;
    const visualViewport = window.visualViewport;

    const resizeMap = () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(() => {
        map.resize();
        animationFrame = null;
      });
    };

    window.addEventListener('resize', resizeMap);
    visualViewport?.addEventListener('resize', resizeMap);
    visualViewport?.addEventListener('scroll', resizeMap);
    resizeMap();

    return () => {
      window.removeEventListener('resize', resizeMap);
      visualViewport?.removeEventListener('resize', resizeMap);
      visualViewport?.removeEventListener('scroll', resizeMap);

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [map]);

  return {
    containerRef,
    error,
    isReady,
    map,
  };
}
