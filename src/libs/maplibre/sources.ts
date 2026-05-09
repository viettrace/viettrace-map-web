import type maplibregl from 'maplibre-gl';

export function ensureSource(
  map: maplibregl.Map,
  id: string,
  source: maplibregl.SourceSpecification,
) {
  if (!map.getSource(id)) {
    map.addSource(id, source);
  }
}
