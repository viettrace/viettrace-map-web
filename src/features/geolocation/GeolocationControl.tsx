'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type maplibregl from 'maplibre-gl';
import LocateButton from './LocateButton';

/**
 * Renders the LocateButton inside the MapLibre bottom-right control group
 * as a custom IControl, so it sits in the same bar as zoom/compass.
 */
export default function GeolocationControl({ map }: { map: maplibregl.Map | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlRef = useRef<{ container: HTMLDivElement } | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    containerRef.current = container;

    const control: maplibregl.IControl = {
      onAdd: () => container,
      onRemove: () => {
        container.remove();
        containerRef.current = null;
      },
    };

    controlRef.current = { container };
    map.addControl(control, 'bottom-right');

    return () => {
      map.removeControl(control);
      controlRef.current = null;
      containerRef.current = null;
    };
  }, [map]);

  if (!containerRef.current || !map) {
    return null;
  }

  return createPortal(<LocateButton map={map} />, containerRef.current);
}
