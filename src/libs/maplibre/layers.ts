import type maplibregl from 'maplibre-gl';

export function replaceLayer(map: maplibregl.Map, layer: maplibregl.LayerSpecification) {
  if (map.getLayer(layer.id)) {
    map.removeLayer(layer.id);
  }

  map.addLayer(layer);
}
