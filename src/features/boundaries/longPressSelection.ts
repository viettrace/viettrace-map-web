import type maplibregl from 'maplibre-gl';

/**
 * Mobile selection on the map uses a long-press gesture instead of a tap so a
 * user can pan/zoom with quick touches without accidentally opening a detail
 * panel. On desktop, mouse clicks select immediately.
 *
 * Touch flow:
 *   - touchstart with 1 finger → start a 500ms timer.
 *   - touchmove > 10px or extra fingers → cancel.
 *   - timer fires → call onSelect with the press point (and a haptic buzz on
 *     supported devices).
 *   - touchend within the suppression window → swallow the synthetic click
 *     so a short tap never triggers a selection.
 */

export const LONG_PRESS_DURATION_MS = 500;
export const LONG_PRESS_MOVE_TOLERANCE_PX = 10;
const TOUCH_CLICK_SUPPRESS_WINDOW_MS = 600;

interface AttachLongPressOptions {
  map: maplibregl.Map;
  onSelect: (point: maplibregl.Point) => void;
}

export function attachLongPressSelection({ map, onSelect }: AttachLongPressOptions) {
  let touchStart: { time: number; x: number; y: number } | null = null;
  let touchMoved = false;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressFiredAt: number | null = null;
  let touchEndAt: number | null = null;

  function clearTimer() {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function onTouchStart(event: maplibregl.MapTouchEvent) {
    const point = event.points[0];

    // Multi-finger gestures (pinch zoom, two-finger pan) are never a selection.
    if (event.points.length !== 1 || !point) {
      clearTimer();
      touchStart = null;
      touchMoved = true;
      return;
    }

    touchStart = { time: Date.now(), x: point.x, y: point.y };
    touchMoved = false;
    clearTimer();

    longPressTimer = setTimeout(() => {
      if (!touchStart || touchMoved) {
        return;
      }

      longPressFiredAt = Date.now();

      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        // Best-effort haptic confirmation that selection fired. Browsers that
        // do not support `vibrate` simply ignore the call.
        try {
          navigator.vibrate(12);
        } catch {
          // Vibration is not allowed in some embedded contexts; ignore.
        }
      }

      onSelect(point);
    }, LONG_PRESS_DURATION_MS);
  }

  function onTouchMove(event: maplibregl.MapTouchEvent) {
    if (!touchStart) {
      return;
    }

    const p = event.points[0];

    if (event.points.length !== 1 || !p) {
      touchMoved = true;
      clearTimer();
      return;
    }

    const dx = p.x - touchStart.x;
    const dy = p.y - touchStart.y;

    if (dx * dx + dy * dy > LONG_PRESS_MOVE_TOLERANCE_PX * LONG_PRESS_MOVE_TOLERANCE_PX) {
      touchMoved = true;
      clearTimer();
    }
  }

  function onTouchEnd() {
    clearTimer();
    touchEndAt = Date.now();
    touchStart = null;
  }

  function onClick(event: maplibregl.MapMouseEvent) {
    const now = Date.now();

    // Long-press already fired the selection inside the timer; the synthetic
    // click that follows on touchend should be ignored.
    if (longPressFiredAt !== null && now - longPressFiredAt < TOUCH_CLICK_SUPPRESS_WINDOW_MS) {
      return;
    }

    // Short tap that did not reach the long-press threshold. We treat it as a
    // pan/zoom gesture and never select on it.
    if (touchEndAt !== null && now - touchEndAt < TOUCH_CLICK_SUPPRESS_WINDOW_MS) {
      return;
    }

    onSelect(event.point);
  }

  map.on('touchstart', onTouchStart);
  map.on('touchmove', onTouchMove);
  map.on('touchend', onTouchEnd);
  map.on('touchcancel', onTouchEnd);
  map.on('click', onClick);

  return () => {
    clearTimer();

    try {
      map.off('touchstart', onTouchStart);
      map.off('touchmove', onTouchMove);
      map.off('touchend', onTouchEnd);
      map.off('touchcancel', onTouchEnd);
      map.off('click', onClick);
    } catch {
      // Map may already be torn down.
    }
  };
}
