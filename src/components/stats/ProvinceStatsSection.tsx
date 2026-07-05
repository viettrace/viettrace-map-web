'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ProvinceStatRow } from '@src/libs/data/stats';
import { StatsCountUp } from './StatsCountUp';

type Mode = 'pre' | 'post';
type SortKey = 'population' | 'area' | 'density' | 'grdp' | 'grdpPerCapita';
type SortDir = 'asc' | 'desc';

type ProvinceStatsSectionProps = {
  pre: ProvinceStatRow[];
  post: ProvinceStatRow[];
  nationalPopulation: number;
  nationalArea: number;
  nationalDensity: number;
  nationalGrdp: number;
  populationYear: number;
};

export function ProvinceStatsSection({
  pre,
  post,
  nationalPopulation,
  nationalArea,
  nationalDensity,
  nationalGrdp,
  populationYear,
}: ProvinceStatsSectionProps) {
  const t = useTranslations('Stats');
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>('post');
  const [sortKey, setSortKey] = useState<SortKey>('population');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const intlLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  const nf = useMemo(() => new Intl.NumberFormat(intlLocale), [intlLocale]);
  const nf1 = useMemo(
    () => new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 }),
    [intlLocale],
  );

  const rows = mode === 'pre' ? pre : post;

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? diff : -diff;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const topPopulation = useMemo(
    () => [...rows].sort((a, b) => b.population - a.population).slice(0, 3),
    [rows],
  );
  const topDensity = useMemo(
    () => [...rows].sort((a, b) => b.density - a.density).slice(0, 3),
    [rows],
  );
  const topArea = useMemo(
    () => [...rows].sort((a, b) => b.area - a.area).slice(0, 3),
    [rows],
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="space-y-8">
      {/* National totals */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <TotalCard label={t('totalPopulation', { year: populationYear })} accent="blue">
          <StatsCountUp to={nationalPopulation} format={n => nf.format(n)} />
        </TotalCard>
        <TotalCard label={t('totalArea')} accent="emerald">
          <StatsCountUp to={Math.round(nationalArea)} format={n => nf.format(n)} />
          <span className="ml-1 text-xl font-medium text-slate-400 dark:text-slate-500">
            km²
          </span>
        </TotalCard>
        <TotalCard label={t('nationalDensity')} accent="amber">
          <StatsCountUp to={nationalDensity} format={n => nf.format(n)} />
          <span className="ml-1 text-xl font-medium text-slate-400 dark:text-slate-500">
            {t('densityUnit')}
          </span>
        </TotalCard>
        <TotalCard label={t('totalGrdp', { year: populationYear })} accent="violet">
          <StatsCountUp to={Math.round(nationalGrdp)} format={n => nf.format(n)} />
          <span className="ml-1 text-xl font-medium text-slate-400 dark:text-slate-500">
            {t('grdpUnit')}
          </span>
        </TotalCard>
      </div>

      {/* Mode toggle: shared by the highlight cards and the table */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm dark:border-slate-700 dark:bg-slate-900">
          {(['pre', 'post'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={
                mode === m
                  ? 'rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white'
                  : 'rounded-md px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }
            >
              {m === 'pre' ? t('popModePre') : t('popModePost')}
            </button>
          ))}
        </div>
      </div>

      {/* Highlight cards for the selected mode */}
      <div className="grid gap-6 md:grid-cols-3">
        <HighlightCard
          title={t('topPopulation')}
          rows={topPopulation}
          format={value => nf.format(value)}
          pick={r => r.population}
          locale={locale}
          mode={mode}
        />
        <HighlightCard
          title={t('topDensity')}
          rows={topDensity}
          format={value => `${nf1.format(value)} ${t('densityUnit')}`}
          pick={r => r.density}
          locale={locale}
          mode={mode}
        />
        <HighlightCard
          title={t('topArea')}
          rows={topArea}
          format={value => `${nf.format(Math.round(value))} km²`}
          pick={r => r.area}
          locale={locale}
          mode={mode}
        />
      </div>

      {/* Sortable table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th scope="col" className="w-10 px-3 py-2.5 text-right font-medium">
                #
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                {t('colProvince')}
              </th>
              <SortableHeader
                label={t('colPopulation')}
                active={sortKey === 'population'}
                dir={sortDir}
                onClick={() => toggleSort('population')}
              />
              <SortableHeader
                label={t('colArea')}
                active={sortKey === 'area'}
                dir={sortDir}
                onClick={() => toggleSort('area')}
              />
              <SortableHeader
                label={t('colDensity')}
                active={sortKey === 'density'}
                dir={sortDir}
                onClick={() => toggleSort('density')}
              />
              <SortableHeader
                label={t('colGrdp')}
                active={sortKey === 'grdp'}
                dir={sortDir}
                onClick={() => toggleSort('grdp')}
              />
              <SortableHeader
                label={t('colGrdpPerCapita')}
                active={sortKey === 'grdpPerCapita'}
                dir={sortDir}
                onClick={() => toggleSort('grdpPerCapita')}
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <tr
                key={row.slug}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <td className="px-3 py-2 text-right tabular-nums text-slate-400 dark:text-slate-500">
                  {index + 1}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/${locale}/map?mode=${mode}&province=${row.slug}`}
                    className="font-medium text-slate-800 hover:text-blue-700 hover:underline dark:text-slate-200 dark:hover:text-blue-400"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                  {nf.format(row.population)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                  {nf.format(Math.round(row.area))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                  {nf1.format(row.density)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                  {nf.format(Math.round(row.grdp))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                  {nf1.format(row.grdpPerCapita)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mode === 'post' && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('derivedNote')}</p>
      )}
      <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
        {t('popAreaSourceNote')}
      </p>
    </div>
  );
}

function TotalCard({
  label,
  accent,
  children,
}: {
  label: string;
  accent: 'blue' | 'emerald' | 'amber' | 'violet';
  children: React.ReactNode;
}) {
  const accentClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    violet: 'text-violet-600 dark:text-violet-400',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-bold tracking-tight md:text-4xl ${accentClasses[accent]}`}>
        {children}
      </div>
    </div>
  );
}

function HighlightCard({
  title,
  rows,
  format,
  pick,
  locale,
  mode,
}: {
  title: string;
  rows: ProvinceStatRow[];
  format: (value: number) => string;
  pick: (row: ProvinceStatRow) => number;
  locale: string;
  mode: Mode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      <ol className="mt-3 space-y-2">
        {rows.map((row, index) => (
          <li key={row.slug} className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="w-4 shrink-0 text-xs tabular-nums text-slate-400 dark:text-slate-500">
                {index + 1}
              </span>
              <Link
                href={`/${locale}/map?mode=${mode}&province=${row.slug}`}
                className="truncate text-sm font-medium text-slate-800 hover:text-blue-700 hover:underline dark:text-slate-200 dark:hover:text-blue-400"
              >
                {row.name}
              </Link>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-slate-500 dark:text-slate-400">
              {format(pick(row))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="px-3 py-2.5 text-right font-medium"
    >
      <button
        type="button"
        onClick={onClick}
        className={`ml-auto inline-flex items-center gap-1 rounded hover:text-slate-900 dark:hover:text-slate-100 ${
          active ? 'text-slate-900 dark:text-slate-100' : ''
        }`}
      >
        {label}
        <span aria-hidden className="text-[0.65rem]">
          {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}
