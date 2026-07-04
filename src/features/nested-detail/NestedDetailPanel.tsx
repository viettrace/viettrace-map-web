'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';

interface NestedDetailPanelProps {
  entry: NestedIndexEntry;
  onClose: () => void;
  onSelectProvince?: (entry: ProvinceIndexEntry) => void;
  provinceEntries?: ProvinceIndexEntry[];
}

export default function NestedDetailPanel({
  entry,
  onClose,
  onSelectProvince,
  provinceEntries = [],
}: NestedDetailPanelProps) {
  const t = useTranslations('Map');
  const locale = useLocale();
  const primaryName = locale === 'en' && entry.name_en ? entry.name_en : entry.name;
  const secondaryName = getSecondaryName(entry, locale, primaryName);
  const typeLabel = entry.type === 'district' ? t('nestedTypeDistrict') : t('nestedTypeWard');
  const modeBadgeClass =
    entry.mode === 'pre' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700';

  // The parent province lives in the SAME mode as the nested feature (pre
  // districts → pre provinces, post wards → post provinces), so match on both
  // slug and mode. When it resolves, the breadcrumb parent becomes a clickable
  // crumb that selects the province (fly-to + its detail panel with statistics)
  // — this is the primary way to reach province info once nested layers own the
  // click at higher zooms. Falls back to a static crumb when unresolved.
  const parentProvince = entry.parentProvinceSlug
    ? provinceEntries.find(p => p.slug === entry.parentProvinceSlug && p.mode === entry.mode)
    : undefined;
  const parentName =
    locale === 'en'
      ? (parentProvince?.name_en ?? entry.parentProvinceName)
      : (parentProvince?.name ?? entry.parentProvinceName);
  const canSelectParent = Boolean(parentProvince && onSelectProvince);

  return (
    <aside className="absolute right-3 bottom-[var(--map-panel-bottom)] left-3 z-20 max-h-[42dvh] overflow-y-auto rounded-lg border border-slate-200 bg-white/95 text-sm text-slate-700 shadow-xl backdrop-blur-sm md:top-24 md:right-4 md:bottom-auto md:left-auto md:max-h-[calc(100dvh-8rem)] md:w-96">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          {entry.parentProvinceName && (
            <nav
              aria-label={t('nestedBreadcrumbLabel')}
              className="mb-1.5 flex min-w-0 items-center gap-1 text-xs text-slate-500"
            >
              {canSelectParent && parentProvince ? (
                <button
                  type="button"
                  onClick={() => onSelectProvince?.(parentProvince)}
                  title={parentName}
                  className="max-w-[9rem] truncate rounded font-medium text-sky-700 transition-colors hover:text-sky-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  {parentName}
                </button>
              ) : (
                <span className="max-w-[9rem] truncate font-medium text-slate-600" title={parentName}>
                  {parentName}
                </span>
              )}
              <span aria-hidden className="text-slate-400">
                ›
              </span>
              <span
                className="max-w-[9rem] truncate text-slate-600"
                aria-current="page"
                title={primaryName}
              >
                {primaryName}
              </span>
            </nav>
          )}
          <div
            className={`mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${modeBadgeClass}`}
          >
            <span>{typeLabel}</span>
          </div>
          <h2 className="truncate text-base font-semibold text-slate-950">{primaryName}</h2>
          {secondaryName && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{secondaryName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('detailClose')}
          title={t('detailClose')}
          className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          ×
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {t('detailDataTitle')}
          </h3>
          <p className="mt-2 leading-6">{t('nestedDataBody')}</p>
        </section>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <Link
            href={`/${locale}/data-sources`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            {t('dataSourcesLink')}
          </Link>
        </div>
      </div>
    </aside>
  );
}

function getSecondaryName(entry: NestedIndexEntry, locale: string, primaryName: string) {
  if (locale === 'en') {
    return entry.name === primaryName ? null : entry.name;
  }

  return entry.name_en && entry.name_en !== primaryName ? entry.name_en : null;
}
