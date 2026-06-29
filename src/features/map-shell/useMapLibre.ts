'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

interface UseMapLibreOptions {
  center: [number, number];
  style: string;
  zoom: number;
}

export function useMapLibre({ center, style, zoom }: UseMapLibreOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const protocolRef = useRef<Protocol | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Register pmtiles protocol for static vector tile sources
    if (!protocolRef.current) {
      protocolRef.current = new Protocol();
      maplibregl.addProtocol('pmtiles', protocolRef.current.tile);
    }

    try {
      const mapInstance = new maplibregl.Map({
        attributionControl: false,
        center,
        container: containerRef.current,
        style,
        zoom,
      });

      // Track load so we can tell a fatal init failure (style won't load → no map) apart from the
      // transient tile/source fetch errors MapLibre fires during normal use.
      let hasLoaded = false;

      mapInstance.on('load', () => {
        hasLoaded = true;
        setIsReady(true);
      });

      mapInstance.on('error', event => {
        // After the map has loaded, `error` events are almost always recoverable tile/source fetch
        // blips — most commonly a range request aborted by rapid zoom/pan (surfaces as "Failed to
        // fetch"). The map recovers on the next frame, so surfacing a full-screen fatal overlay here
        // would blank a working map over a momentary network hiccup. Log and keep going; only treat
        // pre-load errors (e.g. the style itself failing) as fatal.
        if (hasLoaded) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('MapLibre non-fatal error:', event.error);
          }
          return;
        }
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

      if (protocolRef.current) {
        maplibregl.removeProtocol('pmtiles');
        protocolRef.current = null;
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
