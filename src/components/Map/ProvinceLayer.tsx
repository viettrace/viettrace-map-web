'use client';

import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';

const TILE_URL_PRE = process.env.NEXT_PUBLIC_TILE_URL_PRE!;
const TILE_URL_POST = process.env.NEXT_PUBLIC_TILE_URL_POST!;

const SOURCE_PRE = 'vn-provinces-pre';
const SOURCE_POST = 'vn-provinces-post';
const SOURCE_PRE_LABELS = 'province-labels-pre';
const SOURCE_POST_LABELS = 'province-labels-post';

const LAYER_PRE_FILL = 'provinces-pre-fill';
const LAYER_PRE_OUTLINE = 'provinces-pre-outline';
const LAYER_PRE_LABEL = 'provinces-pre-label';
const LAYER_POST_FILL = 'provinces-post-fill';
const LAYER_POST_OUTLINE = 'provinces-post-outline';
const LAYER_POST_LABEL = 'provinces-post-label';

interface ProvinceLayerProps {
  map: maplibregl.Map | null;
  mode: 'pre' | 'post';
}

function setVisibility(map: maplibregl.Map, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

function addOrReplaceLayer(
  map: maplibregl.Map,
  id: string,
  config: maplibregl.LayerSpecification,
) {
  if (map.getLayer(id)) {
    map.removeLayer(id);
  }
  map.addLayer(config);
}

function addSourceIfMissing(
  map: maplibregl.Map,
  id: string,
  config: maplibregl.SourceSpecification,
) {
  if (!map.getSource(id)) {
    map.addSource(id, config);
  }
}

export default function ProvinceLayer({ map, mode }: ProvinceLayerProps) {
  useEffect(() => {
    if (!map) return;

    function addSourcesAndLayers() {
      if (!map) return;

      addSourceIfMissing(map, SOURCE_PRE, {
        type: 'vector',
        tiles: [`${TILE_URL_PRE}/{z}/{x}/{y}`],
        minzoom: 0,
        maxzoom: 10,
      });

      addSourceIfMissing(map, SOURCE_POST, {
        type: 'vector',
        tiles: [`${TILE_URL_POST}/{z}/{x}/{y}`],
        minzoom: 0,
        maxzoom: 10,
      });

      addSourceIfMissing(map, SOURCE_PRE_LABELS, {
        type: 'geojson',
        data: '/data/province-labels-pre.json',
      });

      addSourceIfMissing(map, SOURCE_POST_LABELS, {
        type: 'geojson',
        data: '/data/province-labels-post.json',
      });

      const preVisible = mode === 'pre';
      const postVisible = mode === 'post';

      addOrReplaceLayer(map, LAYER_PRE_FILL, {
        id: LAYER_PRE_FILL,
        type: 'fill',
        source: SOURCE_PRE,
        'source-layer': 'vn_provinces_pre_2025',
        layout: { visibility: preVisible ? 'visible' : 'none' },
        paint: { 'fill-color': '#d44', 'fill-opacity': 0.1 },
      });

      addOrReplaceLayer(map, LAYER_PRE_OUTLINE, {
        id: LAYER_PRE_OUTLINE,
        type: 'line',
        source: SOURCE_PRE,
        'source-layer': 'vn_provinces_pre_2025',
        layout: { visibility: preVisible ? 'visible' : 'none' },
        paint: { 'line-color': '#d44', 'line-width': 1.5 },
      });

      addOrReplaceLayer(map, LAYER_POST_FILL, {
        id: LAYER_POST_FILL,
        type: 'fill',
        source: SOURCE_POST,
        'source-layer': 'vn_provinces_post_2025',
        layout: { visibility: postVisible ? 'visible' : 'none' },
        paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.1 },
      });

      addOrReplaceLayer(map, LAYER_POST_OUTLINE, {
        id: LAYER_POST_OUTLINE,
        type: 'line',
        source: SOURCE_POST,
        'source-layer': 'vn_provinces_post_2025',
        layout: { visibility: postVisible ? 'visible' : 'none' },
        paint: { 'line-color': '#3388ff', 'line-width': 1.5 },
      });

      addOrReplaceLayer(map, LAYER_PRE_LABEL, {
        id: LAYER_PRE_LABEL,
        type: 'symbol',
        source: SOURCE_PRE_LABELS,
        layout: {
          visibility: preVisible ? 'visible' : 'none',
          'text-field': ['get', 'name'],
          'text-size': 13,
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#d44',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
        },
      });

      addOrReplaceLayer(map, LAYER_POST_LABEL, {
        id: LAYER_POST_LABEL,
        type: 'symbol',
        source: SOURCE_POST_LABELS,
        layout: {
          visibility: postVisible ? 'visible' : 'none',
          'text-field': ['get', 'name'],
          'text-size': 13,
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#2563eb',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
        },
      });
    }

    if (map.loaded()) {
      addSourcesAndLayers();
    } else {
      map.once('load', addSourcesAndLayers);
    }

    return () => {
      // Do NOT remove layers/sources here.
      // Strict Mode remounts reuse the same `map` ref, so the effect
      // does not re-fire on remount. Removing layers here would make
      // them disappear forever.
      if (map) {
        map.off('load', addSourcesAndLayers);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mode intentionally excluded: layers added once only
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const preVisible = mode === 'pre';
    const postVisible = mode === 'post';

    setVisibility(map, LAYER_PRE_FILL, preVisible);
    setVisibility(map, LAYER_PRE_OUTLINE, preVisible);
    setVisibility(map, LAYER_PRE_LABEL, preVisible);
    setVisibility(map, LAYER_POST_FILL, postVisible);
    setVisibility(map, LAYER_POST_OUTLINE, postVisible);
    setVisibility(map, LAYER_POST_LABEL, postVisible);
  }, [map, mode]);

  return null;
}
