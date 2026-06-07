'use client';

import { useEffect, useRef, useState } from 'react';

type StatsCountUpProps = {
  to: number;
  durationMs?: number;
  className?: string;
};

/**
 * Counts up from 0 to `to` once, when scrolled into view.
 * Respects prefers-reduced-motion (shows the final value immediately).
 */
export function StatsCountUp({ to, durationMs = 900, className }: StatsCountUpProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setValue(to);
      return;
    }

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * to));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [to, durationMs]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
