import { describe, expect, it, vi } from 'vitest';
import type maplibregl from 'maplibre-gl';
import { applyWhenStyleReady } from './styleReady';

interface FakeMap {
  map: maplibregl.Map;
  emit: (type: string) => void;
  listenerCount: (type: string) => number;
}

// Minimal stand-in for the three things applyWhenStyleReady touches: the parsed flag, the
// (deliberately unreliable) isStyleLoaded() report, and the event emitter.
function createFakeMap({
  parsed,
  styleLoaded,
}: {
  parsed: boolean;
  styleLoaded: boolean;
}): FakeMap {
  const listeners = new Map<string, Set<() => void>>();

  const add = (type: string, listener: () => void) => {
    const set = listeners.get(type) ?? new Set<() => void>();
    set.add(listener);
    listeners.set(type, set);
  };

  const map = {
    style: { _loaded: parsed },
    isStyleLoaded: () => styleLoaded,
    on: (type: string, listener: () => void) => add(type, listener),
    once: (type: string, listener: () => void) => add(type, listener),
    off: (type: string, listener: () => void) => listeners.get(type)?.delete(listener),
  } as unknown as maplibregl.Map;

  return {
    map,
    emit: type => {
      for (const listener of [...(listeners.get(type) ?? [])]) listener();
    },
    listenerCount: type => listeners.get(type)?.size ?? 0,
  };
}

describe('applyWhenStyleReady', () => {
  // The regression this guards: MapLibre's isStyleLoaded() also reports false while a source
  // reload is queued, and setLayoutProperty(id, 'visibility', …) queues one synchronously. Gating
  // style edits on it (with a map.once('load', …) fallback that never fires again) silently dropped
  // every color-mode repaint that followed a visibility toggle.
  it('applies immediately when the style is parsed even if isStyleLoaded() reports false', () => {
    const apply = vi.fn();
    const { map } = createFakeMap({ parsed: true, styleLoaded: false });

    applyWhenStyleReady(map, apply);

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('applies immediately when the style is fully loaded', () => {
    const apply = vi.fn();
    const { map } = createFakeMap({ parsed: true, styleLoaded: true });

    applyWhenStyleReady(map, apply);

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('defers to style.load when the style is not parsed yet', () => {
    const apply = vi.fn();
    const fake = createFakeMap({ parsed: false, styleLoaded: false });

    applyWhenStyleReady(fake.map, apply);
    expect(apply).not.toHaveBeenCalled();

    // style.load fires after Style._loaded flips, so the parse guard passes on the retry.
    (fake.map.style as unknown as { _loaded: boolean })._loaded = true;
    fake.emit('style.load');

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('falls back to the idle net when the style parses without a style.load listener tick', () => {
    const apply = vi.fn();
    const fake = createFakeMap({ parsed: false, styleLoaded: false });

    applyWhenStyleReady(fake.map, apply);
    (fake.map.style as unknown as { _loaded: boolean })._loaded = true;
    fake.emit('idle');

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('does not apply on a deferred tick while the style is still unparsed', () => {
    const apply = vi.fn();
    const fake = createFakeMap({ parsed: false, styleLoaded: false });

    applyWhenStyleReady(fake.map, apply);
    fake.emit('idle');
    fake.emit('style.load');

    expect(apply).not.toHaveBeenCalled();
  });

  it('removes its listeners on dispose', () => {
    const apply = vi.fn();
    const fake = createFakeMap({ parsed: false, styleLoaded: false });

    const dispose = applyWhenStyleReady(fake.map, apply);
    expect(fake.listenerCount('idle')).toBe(1);
    expect(fake.listenerCount('style.load')).toBe(1);

    dispose();

    expect(fake.listenerCount('idle')).toBe(0);
    expect(fake.listenerCount('style.load')).toBe(0);
    (fake.map.style as unknown as { _loaded: boolean })._loaded = true;
    fake.emit('style.load');
    expect(apply).not.toHaveBeenCalled();
  });
});
