'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { MapMode } from '@src/features/map-state/mapViewTypes';
import { loadProvinceStatistics } from '@src/features/province-detail/provinceStatistics';
import {
  CHOROPLETH_PALETTE,
  computeChoropleth,
  type ChoroplethData,
  type ChoroplethMode,
} from './choropleth';

const LABEL_KEY: Record<ChoroplethMode, string> = {
  population: 'colorModePopulation',
  density: 'colorModeDensity',
  area: 'colorModeArea',
  grdp: 'colorModeGrdp',
  grdp_per_capita: 'colorModeGrdpPerCapita',
};

interface ChoroplethLegendProps {
  colorMode: ChoroplethMode;
  mode: MapMode;
}

// Docked center-right by default (clear of the left settings drawer, the top search, and the
// bottom-right zoom controls), collapsible to a compact gradient chip, and draggable anywhere
// on the map. Position is kept in px within the map container once dragged.
export default function ChoroplethLegend({ colorMode, mode }: ChoroplethLegendProps) {
  const t = useTranslations('Map');
  const locale = useLocale();
  const [data, setData] = useState<ChoroplethData | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProvinceStatistics()
      .then(stats => {
        if (cancelled || !stats) return;
        setData(computeChoropleth(stats, mode, colorMode));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mode, colorMode]);

  function startDrag(event: React.PointerEvent<HTMLElement>) {
    // Let clicks on the collapse button through instead of starting a drag.
    if ((event.target as HTMLElement).closest('button')) return;
    const el = ref.current;
    if (!el) return;
    const parentRect = (el.offsetParent as HTMLElement | null)?.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const baseX = rect.left - (parentRect?.left ?? 0);
    const baseY = rect.top - (parentRect?.top ?? 0);
    dragRef.current = { dx: event.clientX - baseX, dy: event.clientY - baseY };
    setPos({ x: baseX, y: baseY });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onDrag(event: React.PointerEvent<HTMLElement>) {
    const d = dragRef.current;
    if (!d) return;
    const el = ref.current;
    const parent = el?.offsetParent as HTMLElement | null;
    const pw = parent?.clientWidth ?? 0;
    const ph = parent?.clientHeight ?? 0;
    const ew = el?.offsetWidth ?? 0;
    const eh = el?.offsetHeight ?? 0;
    const x = Math.min(Math.max(event.clientX - d.dx, 4), Math.max(4, pw - ew - 4));
    const y = Math.min(Math.max(event.clientY - d.dy, 4), Math.max(4, ph - eh - 4));
    setPos({ x, y });
  }

  function endDrag(event: React.PointerEvent<HTMLElement>) {
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // pointer already released
    }
  }

  if (!data) return null;

  const posStyle = pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : undefined;
  const dockClass = pos ? '' : 'top-1/2 right-3 -translate-y-1/2 lg:right-4';

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={t('legendExpand')}
        title={t('legendExpand')}
        style={posStyle}
        className={`pointer-events-auto absolute z-30 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm transition-colors hover:bg-white ${dockClass}`}
      >
        {CHOROPLETH_PALETTE.map(color => (
          <span key={color} aria-hidden className="block h-2.5 w-6" style={{ backgroundColor: color }} />
        ))}
      </button>
    );
  }

  const unit =
    colorMode === 'density'
      ? t('detailStatDensityUnit')
      : colorMode === 'area'
        ? 'km²'
        : colorMode === 'grdp'
          ? t('detailStatGrdpUnit')
          : colorMode === 'grdp_per_capita'
            ? t('detailStatGrdpPerCapitaUnit')
            : '';

  const nf = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const fmt = (value: number | undefined) => (value == null ? '—' : nf.format(value));
  const b = data.breaks;

  return (
    <div
      ref={ref}
      style={posStyle}
      onPointerDown={startDrag}
      onPointerMove={onDrag}
      onPointerUp={endDrag}
      className={`pointer-events-auto absolute z-30 cursor-move touch-none select-none rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur-sm ${dockClass}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-semibold text-slate-900">
          {t(LABEL_KEY[colorMode])}
          {unit ? <span className="font-normal text-slate-500"> ({unit})</span> : null}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={t('legendCollapse')}
          title={t('legendCollapse')}
          className="-mr-1 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-base leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          −
        </button>
      </div>
      <ul className="space-y-1">
        {CHOROPLETH_PALETTE.map((color, i) => (
          <li key={color} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 shrink-0 rounded-sm border border-black/10"
              style={{ backgroundColor: color }}
            />
            <span className="tabular-nums text-slate-600">
              {i === 0
                ? `< ${fmt(b[0])}`
                : i === CHOROPLETH_PALETTE.length - 1
                  ? `≥ ${fmt(b[i - 1])}`
                  : `${fmt(b[i - 1])} – ${fmt(b[i])}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
