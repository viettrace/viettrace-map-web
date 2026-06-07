'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import type { MergerCase } from '@src/libs/data/stats';
import {
  loadRegionalClassification,
  type Region,
  type RegionMetadata,
} from '@src/types/regional-classification';

type MergerExplorerProps = {
  mergers: MergerCase[];
};

type SortKey = 'size' | 'name';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

// Strip "Tỉnh" / "Thành phố" prefix so A→Z sort compares the place name only.
function sortName(s: string): string {
  return s.replace(/^(Thành phố|Tỉnh)\s+/u, '');
}

export function MergerExplorer({ mergers }: MergerExplorerProps) {
  const t = useTranslations('Stats');
  const tRegions = useTranslations('Regions');
  const locale = useLocale();

  const sizes = useMemo(
    () => Array.from(new Set(mergers.map((m) => m.componentCount))).sort((a, b) => a - b),
    [mergers]
  );

  const [query, setQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState<number | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('size');
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [allRegions, setAllRegions] = useState<RegionMetadata[]>([]);
  // Maps merger resultSlug → region key (derived via first absorbed pre-2025 province slug)
  const [slugToRegion, setSlugToRegion] = useState<Record<string, Region>>({});

  useEffect(() => {
    loadRegionalClassification()
      .then(data => {
        const metadata: RegionMetadata[] = Object.entries(data.regions).map(([key, def]) => ({
          key: key as Region,
          name_vi: def.name_vi,
          name_en: def.name_en,
          provinceCount: data.stats.regions[key as Region],
        }));
        setAllRegions(metadata);
        setSlugToRegion(data.provinceToRegion as Record<string, Region>);
      })
      .catch(() => {});
  }, []);

  // Restore filter state from the URL once on mount.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('q');
    const size = sp.get('size');
    const s = sp.get('sort');
    const r = sp.get('region');
    if (q) setQuery(q);
    if (size && size !== 'all' && Number.isFinite(Number(size))) setSizeFilter(Number(size));
    if (s === 'name' || s === 'size') setSort(s);
    if (r && r !== 'all') setRegionFilter(r as Region);
  }, []);

  // Persist filter state to the URL (replace, no scroll/navigation).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (query) sp.set('q', query);
    else sp.delete('q');
    if (sizeFilter !== 'all') sp.set('size', String(sizeFilter));
    else sp.delete('size');
    if (sort !== 'size') sp.set('sort', sort);
    else sp.delete('sort');
    if (regionFilter !== 'all') sp.set('region', regionFilter);
    else sp.delete('region');
    const qs = sp.toString();
    window.history.replaceState(window.history.state, '', qs ? `?${qs}` : window.location.pathname);
  }, [query, sizeFilter, sort, regionFilter]);

  const filtered = useMemo(() => {
    const nq = normalize(query.trim());
    let list = mergers.filter((m) => {
      if (regionFilter !== 'all') {
        const region = slugToRegion[m.resultSlug];
        if (region !== regionFilter) return false;
      }
      if (sizeFilter !== 'all' && m.componentCount !== sizeFilter) return false;
      if (!nq) return true;
      return (
        normalize(m.resultName).includes(nq) ||
        m.components.some((c) => normalize(c).includes(nq))
      );
    });
    list = [...list].sort((a, b) => {
      if (sort === 'name') return sortName(a.resultName).localeCompare(sortName(b.resultName), 'vi');
      if (b.componentCount !== a.componentCount) return b.componentCount - a.componentCount;
      return a.resultName.localeCompare(b.resultName, 'vi');
    });
    return list;
  }, [mergers, query, sizeFilter, sort, regionFilter, slugToRegion]);

  const chipBase =
    'rounded-full px-3 py-1 text-sm font-medium transition-colors border';
  const chipActive =
    'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500';
  const chipIdle =
    'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800';

  return (
    <div>
      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 print:hidden">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        {allRegions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('regionFilterLabel')}:</span>
            <button
              type="button"
              onClick={() => setRegionFilter('all')}
              className={`${chipBase} ${regionFilter === 'all' ? chipActive : chipIdle}`}
            >
              {tRegions('all')}
            </button>
            {allRegions.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRegionFilter(r.key)}
                className={`${chipBase} ${regionFilter === r.key ? chipActive : chipIdle}`}
              >
                {tRegions(r.key)}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSizeFilter('all')}
            className={`${chipBase} ${sizeFilter === 'all' ? chipActive : chipIdle}`}
          >
            {t('filterAll')}
          </button>
          {sizes.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSizeFilter(n)}
              className={`${chipBase} ${sizeFilter === n ? chipActive : chipIdle}`}
            >
              {t('sizeChip', { n })}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="merger-sort" className="text-sm text-slate-500 dark:text-slate-400">
              {t('sortLabel')}
            </label>
            <select
              id="merger-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="size">{t('sortBySize')}</option>
              <option value="name">{t('sortByName')}</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('resultsCount', { n: filtered.length })}
        </p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t('noResults')}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((merger, idx) => (
            <div
              key={merger.resultSlug}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/${locale}/map?mode=post&province=${merger.resultSlug}`}
                      className="group text-lg font-semibold text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
                      title={t('viewOnMap')}
                    >
                      {merger.resultName}
                      <span className="ml-1.5 text-xs font-normal text-blue-500 opacity-0 transition-opacity group-hover:opacity-100">
                        ↗ {t('viewOnMap')}
                      </span>
                    </Link>
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {t('componentCountBadge', { n: merger.componentCount })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {t('combinedFrom')}:{' '}
                    </span>
                    {merger.components.map((c, i) => (
                      <span key={c}>
                        <span
                          className={
                            i === 0 ? 'font-semibold text-slate-900 dark:text-slate-100' : ''
                          }
                        >
                          {c}
                        </span>
                        {i < merger.components.length - 1 && (
                          <span className="text-slate-400 dark:text-slate-500"> + </span>
                        )}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
