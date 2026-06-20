import type maplibregl from 'maplibre-gl';

// `beforeId` inserts the layer immediately below an existing layer (MapLibre's addLayer
// `before` arg). Used to keep boundary geometry beneath the basemap's label layers so the
// red/blue outlines don't paint over place names. Ignored if the target layer is absent.
export function replaceLayer(
  map: maplibregl.Map,
  layer: maplibregl.LayerSpecification,
  beforeId?: string,
) {
  if (map.getLayer(layer.id)) {
    map.removeLayer(layer.id);
  }

  const before = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
  map.addLayer(layer, before);
}
