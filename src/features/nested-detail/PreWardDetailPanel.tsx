'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { PreWardData } from '@src/features/map-state/mapViewTypes';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import { normalizeAdministrativeName } from '@src/libs/geo/normalize';

interface PreWardDetailPanelProps {
  data: PreWardData;
  nestedEntries?: NestedIndexEntry[];
  onClose: () => void;
  onSelectDistrict?: (entry: NestedIndexEntry) => void;
  onSelectProvince?: (entry: ProvinceIndexEntry) => void;
  provinceEntries?: ProvinceIndexEntry[];
}

/**
 * Detail panel for a pre-2025 ward clicked on the OSM-tier layer. Unlike the nested (district /
 * post-ward) panel, this reads the clicked tile feature's own properties INLINE — pre-2025 ward
 * names collide across districts, so a nested-index name→slug lookup would be ambiguous; the exact
 * clicked feature is unambiguous and also carries the pre→post merge mapping (`newWard`).
 *
 * The tile carries the parent province/district by NAME (not slug), so the breadcrumb crumbs are
 * resolved back to their index entries by normalized-name match — that makes each crumb a clickable
 * link that flies to + opens the parent's own panel (same UX as the district panel's province crumb).
 */
export default function PreWardDetailPanel({
  data,
  nestedEntries = [],
  onClose,
  onSelectDistrict,
  onSelectProvince,
  provinceEntries = [],
}: PreWardDetailPanelProps) {
  const t = useTranslations('Map');
  const locale = useLocale();

  const normalizedProvince = data.oldProvince ? normalizeAdministrativeName(data.oldProvince) : '';
  const normalizedDistrict = data.oldDistrict ? normalizeAdministrativeName(data.oldDistrict) : '';

  const parentProvince = normalizedProvince
    ? provinceEntries.find(
        province =>
          province.mode === 'pre' &&
          normalizeAdministrativeName(province.name) === normalizedProvince,
      )
    : undefined;
  // District names repeat across provinces (e.g. "Huyện Châu Thành"), so match parent province too.
  const parentDistrict = normalizedDistrict
    ? nestedEntries.find(
        entry =>
          entry.mode === 'pre' &&
          entry.type === 'district' &&
          normalizeAdministrativeName(entry.name) === normalizedDistrict &&
          (!normalizedProvince ||
            normalizeAdministrativeName(entry.parentProvinceName) === normalizedProvince),
      )
    : undefined;

  const provinceName = parentProvince
    ? locale === 'en' && parentProvince.name_en
      ? parentProvince.name_en
      : parentProvince.name
    : data.oldProvince;
  const districtName = parentDistrict
    ? locale === 'en' && parentDistrict.name_en
      ? parentDistrict.name_en
      : parentDistrict.name
    : data.oldDistrict;

  const crumbClass =
    'max-w-[9rem] truncate rounded font-medium text-sky-700 transition-colors hover:text-sky-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300';
  const staticCrumbClass = 'max-w-[9rem] truncate font-medium text-slate-600';

  return (
    <aside className="absolute right-3 bottom-[var(--map-panel-bottom)] left-3 z-20 max-h-[42dvh] overflow-y-auto rounded-lg border border-slate-200 bg-white/95 text-sm text-slate-700 shadow-xl backdrop-blur-sm md:top-24 md:right-4 md:bottom-auto md:left-auto md:max-h-[calc(100dvh-8rem)] md:w-96">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          {(provinceName || districtName) && (
            <nav
              aria-label={t('nestedBreadcrumbLabel')}
              className="mb-1.5 flex min-w-0 items-center gap-1 text-xs text-slate-500"
            >
              {provinceName &&
                (parentProvince && onSelectProvince ? (
                  <button
                    type="button"
                    onClick={() => onSelectProvince(parentProvince)}
                    title={provinceName}
                    className={crumbClass}
                  >
                    {provinceName}
                  </button>
                ) : (
                  <span className={staticCrumbClass} title={provinceName}>
                    {provinceName}
                  </span>
                ))}
              {provinceName && districtName && (
                <span aria-hidden className="text-slate-400">
                  ›
                </span>
              )}
              {districtName &&
                (parentDistrict && onSelectDistrict ? (
                  <button
                    type="button"
                    onClick={() => onSelectDistrict(parentDistrict)}
                    title={districtName}
                    className={crumbClass}
                  >
                    {districtName}
                  </button>
                ) : (
                  <span className={staticCrumbClass} title={districtName}>
                    {districtName}
                  </span>
                ))}
            </nav>
          )}
          <h2 className="truncate text-base font-semibold text-slate-950">{data.name}</h2>
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
            {t('preWardMergedTitle')}
          </h3>
          <p className="mt-2 leading-6">
            {data.newWard ? t('preWardMergedInto', { ward: data.newWard }) : t('preWardMergedUnknown')}
          </p>
        </section>

        <section className="border-t border-slate-200 pt-4">
          <p className="text-xs leading-5 text-slate-500">{t('preWardReconstructedNote')}</p>
          {data.areaQa === 'coastal_underfill' && (
            <p className="mt-2 text-xs leading-5 text-amber-700">{t('preWardCoastalNote')}</p>
          )}
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
