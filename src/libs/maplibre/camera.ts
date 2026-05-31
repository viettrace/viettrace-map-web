import type maplibregl from 'maplibre-gl';

type LngLatBbox = readonly [number, number, number, number];

interface FitBboxOptions {
  bottomPadding?: number;
  duration?: number;
  maxZoom?: number;
  topPadding?: number;
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
        bottom: options.bottomPadding ?? 96,
        left: 64,
        right: 64,
        top: options.topPadding ?? 96,
      },
    },
  );
}
