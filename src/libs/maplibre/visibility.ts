import type maplibregl from 'maplibre-gl';

function setLayerVisibility(map: maplibregl.Map, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

export function setLayerGroupVisibility(map: maplibregl.Map, layerIds: string[], visible: boolean) {
  for (const layerId of layerIds) {
    setLayerVisibility(map, layerId, visible);
  }
}
