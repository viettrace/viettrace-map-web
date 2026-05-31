'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  clampCompareDivider,
  COMPARE_DIVIDER_MAX,
  COMPARE_DIVIDER_MIN,
} from '@src/features/map-state/mapViewTypes';

interface SwipeDividerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  dividerX: number;
  onDividerChange: (dividerX: number) => void;
}

const KEYBOARD_STEP = 0.02;
const KEYBOARD_LARGE_STEP = 0.1;

export default function SwipeDivider({ containerRef, dividerX, onDividerChange }: SwipeDividerProps) {
  const t = useTranslations('Map');
  const handleRef = useRef<HTMLDivElement>(null);
  const draggingPointerIdRef = useRef<number | null>(null);
  // Cache the container rect at pointerdown so the pointermove path never
  // forces a layout read. Reading getBoundingClientRect() on every move is
  // what makes the drag feel "sticky" on mobile, especially while the
  // surrounding map canvases are repainting.
  const dragRectRef = useRef<DOMRect | null>(null);
  // Coalesce rapid pointer moves into one update per animation frame so a
  // fast drag does not dispatch dozens of state updates and re-renders per
  // frame.
  const pendingFrameRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number>(0);

  const applyClientX = useCallback(
    (clientX: number) => {
      const rect = dragRectRef.current ?? containerRef.current?.getBoundingClientRect() ?? null;

      if (!rect || rect.width <= 0) {
        return;
      }

      const ratio = (clientX - rect.left) / rect.width;
      onDividerChange(clampCompareDivider(ratio));
    },
    [containerRef, onDividerChange],
  );

  const flushPendingMove = useCallback(() => {
    pendingFrameRef.current = null;
    applyClientX(pendingClientXRef.current);
  }, [applyClientX]);

  const scheduleMove = useCallback(
    (clientX: number) => {
      pendingClientXRef.current = clientX;

      if (pendingFrameRef.current !== null) {
        return;
      }

      pendingFrameRef.current = requestAnimationFrame(flushPendingMove);
    },
    [flushPendingMove],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      event.preventDefault();
      draggingPointerIdRef.current = event.pointerId;
      dragRectRef.current = container.getBoundingClientRect();
      handleRef.current?.setPointerCapture(event.pointerId);
      // preventDefault() above stops the browser from auto-focusing the
      // handle (so the page does not jump to it on click), so explicitly
      // route focus to the handle for keyboard nudges.
      handleRef.current?.focus({ preventScroll: true });
      applyClientX(event.clientX);
    },
    [applyClientX, containerRef],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (draggingPointerIdRef.current !== event.pointerId) {
        return;
      }

      scheduleMove(event.clientX);
    },
    [scheduleMove],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (draggingPointerIdRef.current !== event.pointerId) {
        return;
      }

      draggingPointerIdRef.current = null;
      dragRectRef.current = null;

      // Make sure the resting position matches the last sample even if a
      // frame was still pending when the user lifted their finger.
      if (pendingFrameRef.current !== null) {
        cancelAnimationFrame(pendingFrameRef.current);
        pendingFrameRef.current = null;
        applyClientX(pendingClientXRef.current);
      }

      handleRef.current?.releasePointerCapture(event.pointerId);
    },
    [applyClientX],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      let next = dividerX;

      switch (event.key) {
        case 'ArrowLeft':
          next = dividerX - KEYBOARD_STEP;
          break;
        case 'ArrowRight':
          next = dividerX + KEYBOARD_STEP;
          break;
        case 'PageDown':
          next = dividerX - KEYBOARD_LARGE_STEP;
          break;
        case 'PageUp':
          next = dividerX + KEYBOARD_LARGE_STEP;
          break;
        case 'Home':
          next = COMPARE_DIVIDER_MIN;
          break;
        case 'End':
          next = COMPARE_DIVIDER_MAX;
          break;
        default:
          return;
      }

      event.preventDefault();
      onDividerChange(clampCompareDivider(next));
    },
    [dividerX, onDividerChange],
  );

  // Release pointer capture if the component unmounts mid-drag (e.g. user
  // exits swipe mode while dragging) so the page does not stay in a captured
  // state.
  useEffect(() => {
    const handle = handleRef.current;

    return () => {
      const pointerId = draggingPointerIdRef.current;

      if (handle && pointerId !== null) {
        try {
          handle.releasePointerCapture(pointerId);
        } catch {
          // Pointer capture may already be released by the browser.
        }
      }

      draggingPointerIdRef.current = null;
      dragRectRef.current = null;

      if (pendingFrameRef.current !== null) {
        cancelAnimationFrame(pendingFrameRef.current);
        pendingFrameRef.current = null;
      }
    };
  }, []);

  const leftPercent = `${(dividerX * 100).toFixed(2)}%`;

  return (
    <div
      aria-hidden="false"
      className="pointer-events-none absolute inset-y-0 z-30"
      style={{ left: leftPercent, transform: 'translateX(-50%)' }}
    >
      <div className="pointer-events-none relative h-full w-px bg-white/90 shadow-[0_0_0_1px_rgba(15,23,42,0.25)]" />
      {/* Invisible touch strip that runs the full height of the divider so a
          user can grab anywhere along the line and drag, not just the
          centered handle. Uses touchAction:'none' to keep the browser from
          interpreting horizontal swipes as page scroll/back-gestures and
          aborting the pointer with `pointercancel`. */}
      <div
        aria-hidden="true"
        className="pointer-events-auto absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 cursor-ew-resize"
        style={{ touchAction: 'none', userSelect: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <div
        ref={handleRef}
        role="slider"
        tabIndex={0}
        aria-label={t('compareDividerLabel')}
        aria-orientation="vertical"
        aria-valuemin={Math.round(COMPARE_DIVIDER_MIN * 100)}
        aria-valuemax={Math.round(COMPARE_DIVIDER_MAX * 100)}
        aria-valuenow={Math.round(dividerX * 100)}
        aria-valuetext={t('compareDividerValueText', { percent: Math.round(dividerX * 100) })}
        className="pointer-events-auto absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none sm:h-12 sm:w-12"
        style={{ touchAction: 'none', userSelect: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <SwipeDividerHandleIcon />
      </div>
    </div>
  );
}

function SwipeDividerHandleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M9 6 4 12l5 6" />
      <path d="m15 6 5 6-5 6" />
    </svg>
  );
}
