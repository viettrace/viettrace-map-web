'use client';

import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { useLocale } from 'next-intl';

const TILE_URL_PRE = process.env.NEXT_PUBLIC_TILE_URL_PRE!;
const TILE_URL_POST = process.env.NEXT_PUBLIC_TILE_URL_POST!;
const TILE_URL_ISLANDS = process.env.NEXT_PUBLIC_TILE_URL_ISLANDS!;

const SOURCE_PRE = 'vn-provinces-pre';
const SOURCE_POST = 'vn-provinces-post';
const SOURCE_ISLANDS = 'vn-offshore-islands';
const SOURCE_PRE_LABELS = 'province-labels-pre';
const SOURCE_POST_LABELS = 'province-labels-post';
const SOURCE_ISLAND_LABELS = 'offshore-island-labels';

const LAYER_PRE_FILL = 'provinces-pre-fill';
const LAYER_PRE_OUTLINE = 'provinces-pre-outline';
const LAYER_PRE_LABEL = 'provinces-pre-label';
const LAYER_POST_FILL = 'provinces-post-fill';
const LAYER_POST_OUTLINE = 'provinces-post-outline';
const LAYER_POST_LABEL = 'provinces-post-label';
const LAYER_ISLANDS_FILL = 'offshore-islands-fill';
const LAYER_ISLANDS_OUTLINE_HALO = 'offshore-islands-outline-halo';
const LAYER_ISLANDS_OUTLINE = 'offshore-islands-outline';
const LAYER_ISLANDS_LABEL = 'offshore-islands-label';

interface ProvinceLayerProps {
  map: maplibregl.Map | null;
  mode: 'pre' | 'post';
  showIslands: boolean;
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

export default function ProvinceLayer({ map, mode, showIslands }: ProvinceLayerProps) {
  const locale = useLocale();

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

      addSourceIfMissing(map, SOURCE_ISLAND_LABELS, {
        type: 'geojson',
        data: '/data/offshore-island-labels.json',
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

      addSourceIfMissing(map, SOURCE_ISLANDS, {
        type: 'vector',
        tiles: [`${TILE_URL_ISLANDS}/{z}/{x}/{y}`],
        minzoom: 0,
        maxzoom: 10,
      });

      addOrReplaceLayer(map, LAYER_ISLANDS_FILL, {
        id: LAYER_ISLANDS_FILL,
        type: 'fill',
        source: SOURCE_ISLANDS,
        'source-layer': 'vn_offshore_islands',
        layout: { visibility: showIslands ? 'visible' : 'none' },
        paint: { 'fill-color': '#0f766e', 'fill-opacity': 0.16 },
      });

      addOrReplaceLayer(map, LAYER_ISLANDS_OUTLINE_HALO, {
        id: LAYER_ISLANDS_OUTLINE_HALO,
        type: 'line',
        source: SOURCE_ISLANDS,
        'source-layer': 'vn_offshore_islands',
        layout: { visibility: showIslands ? 'visible' : 'none' },
        paint: {
          'line-color': '#f8fafc',
          'line-opacity': 0.95,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3, 7, 5],
        },
      });

      addOrReplaceLayer(map, LAYER_ISLANDS_OUTLINE, {
        id: LAYER_ISLANDS_OUTLINE,
        type: 'line',
        source: SOURCE_ISLANDS,
        'source-layer': 'vn_offshore_islands',
        layout: { visibility: showIslands ? 'visible' : 'none' },
        paint: {
          'line-color': '#0f766e',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.5, 7, 2.25],
        },
      });

      addOrReplaceLayer(map, LAYER_ISLANDS_LABEL, {
        id: LAYER_ISLANDS_LABEL,
        type: 'symbol',
        source: SOURCE_ISLAND_LABELS,
        minzoom: 4,
        layout: {
          visibility: showIslands ? 'visible' : 'none',
          'text-field': locale === 'en' ? ['get', 'name_en'] : ['get', 'name_vi'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 12, 7, 15],
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#0f766e',
          'text-halo-color': '#fff',
          'text-halo-width': 2.5,
          'text-halo-blur': 0.5,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mode/showIslands intentionally excluded: visibility effect owns runtime toggles
  }, [map, locale]);

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
    setVisibility(map, LAYER_ISLANDS_FILL, showIslands);
    setVisibility(map, LAYER_ISLANDS_OUTLINE_HALO, showIslands);
    setVisibility(map, LAYER_ISLANDS_OUTLINE, showIslands);
    setVisibility(map, LAYER_ISLANDS_LABEL, showIslands);
  }, [map, mode, showIslands]);

  return null;
}
