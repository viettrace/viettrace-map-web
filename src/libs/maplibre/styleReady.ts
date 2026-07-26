import type maplibregl from 'maplibre-gl';

// True once the style JSON has been parsed — its sources and layers exist, so `addSource`,
// `addLayer` and `set*Property` are all safe to call.
//
// Deliberately NOT `map.isStyleLoaded()`. That method answers a much stricter question: "is the
// style parsed AND is every source fully loaded AND is no source reload queued?" It returns false
// while any tile is in flight, and — the trap — it returns false *synchronously* after any layer
// edit that queues a source reload, because `Style._updateLayer` sets
// `_updatedSources[layer.source] = 'reload'` and `Style.loaded()` bails on a non-empty
// `_updatedSources`. `setLayoutProperty(id, 'visibility', …)` goes through that path, so a
// visibility toggle makes the very next `isStyleLoaded()` call report false for reasons that have
// nothing to do with whether a style edit is safe.
function isStyleParsed(map: maplibregl.Map): boolean {
  // `isStyleLoaded()` is typed `boolean | void` (it returns void after warning when there is no
  // style at all), hence the Boolean cast.
  return Boolean(map.style?._loaded || map.isStyleLoaded());
}

/**
 * Runs `apply` against the map's style — now if the style is parsed, otherwise as soon as it is —
 * and again after a style reload (`setStyle`). Returns a disposer for the listeners it attached.
 *
 * Replaces the `if (map.isStyleLoaded()) apply(); else map.once('load', apply)` idiom, which
 * silently drops the work *forever*: `isStyleLoaded()` reports false for unrelated reasons (see
 * above), and MapLibre fires `load` exactly once per map instance without replaying it, so a
 * listener attached after that first load is never called. `style.load` (fired on the initial
 * parse and on every `setStyle`, after `_loaded` flips and the layers exist) plus a one-shot
 * `idle` net covers the genuinely-not-ready case instead.
 *
 * `apply` must be idempotent — it can run more than once for the same state.
 */
export function applyWhenStyleReady(map: maplibregl.Map, apply: () => void): () => void {
  const run = () => {
    if (!isStyleParsed(map)) return;
    apply();
  };

  run();

  // Net for the pre-parse case. `idle` fires every time the map settles, unlike the one-shot
  // `load`, so it still lands for a listener attached mid-flight.
  if (!isStyleParsed(map)) map.once('idle', run);
  map.on('style.load', run);

  return () => {
    map.off('idle', run);
    map.off('style.load', run);
  };
}
