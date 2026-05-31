'use client';

import { useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';

interface UseSyncedMapsOptions {
  primary: maplibregl.Map | null;
  secondary: maplibregl.Map | null;
}

const SYNCED_EVENTS = ['move', 'zoom', 'rotate', 'pitch', 'pitchend'] as const;

/**
 * Keeps two MapLibre instances in lockstep so they share the same camera
 * (center, zoom, bearing, pitch). Either map can be the source of a movement
 * — a `syncing` ref breaks the feedback loop when the listener triggers
 * `jumpTo` on the other instance.
 */
export function useSyncedMaps({ primary, secondary }: UseSyncedMapsOptions) {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!primary || !secondary) {
      return;
    }

    function mirror(source: maplibregl.Map, target: maplibregl.Map) {
      if (syncingRef.current) {
        return;
      }

      syncingRef.current = true;

      try {
        target.jumpTo({
          bearing: source.getBearing(),
          center: source.getCenter(),
          pitch: source.getPitch(),
          zoom: source.getZoom(),
        });
      } finally {
        syncingRef.current = false;
      }
    }

    const onPrimaryMove = () => mirror(primary, secondary);
    const onSecondaryMove = () => mirror(secondary, primary);

    SYNCED_EVENTS.forEach(eventName => {
      primary.on(eventName, onPrimaryMove);
      secondary.on(eventName, onSecondaryMove);
    });

    // Initial alignment so the secondary map opens at the same camera as the
    // primary one when compare mode mounts.
    mirror(primary, secondary);

    return () => {
      SYNCED_EVENTS.forEach(eventName => {
        primary.off(eventName, onPrimaryMove);
        secondary.off(eventName, onSecondaryMove);
      });
    };
  }, [primary, secondary]);
}
