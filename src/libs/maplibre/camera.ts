import type maplibregl from 'maplibre-gl';

type LngLatBbox = readonly [number, number, number, number];

interface FitBboxOptions {
  duration?: number;
  maxZoom?: number;
}

export function fitBbox(map: maplibregl.Map, bbox: LngLatBbox, options: FitBboxOptions = {}) {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      duration: options.duration ?? 700,
      maxZoom: options.maxZoom ?? 8.5,
      padding: {
        bottom: 96,
        left: 64,
        right: 64,
        top: 96,
      },
    },
  );
}
