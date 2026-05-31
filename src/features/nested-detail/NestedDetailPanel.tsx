'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';

interface NestedDetailPanelProps {
  entry: NestedIndexEntry;
  onClose: () => void;
}

export default function NestedDetailPanel({ entry, onClose }: NestedDetailPanelProps) {
  const t = useTranslations('Map');
  const locale = useLocale();
  const primaryName = locale === 'en' && entry.name_en ? entry.name_en : entry.name;
  const secondaryName = getSecondaryName(entry, locale, primaryName);
  const typeLabel = entry.type === 'district' ? t('nestedTypeDistrict') : t('nestedTypeWard');
  const modeBadgeClass =
    entry.mode === 'pre' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700';

  return (
    <aside className="absolute right-3 bottom-[var(--map-panel-bottom)] left-3 z-20 max-h-[42dvh] overflow-y-auto rounded-lg border border-slate-200 bg-white/95 text-sm text-slate-700 shadow-xl backdrop-blur-sm md:top-24 md:right-4 md:bottom-auto md:left-auto md:max-h-[calc(100dvh-8rem)] md:w-96">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
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
        {entry.parentProvinceName && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              {t('nestedParentProvince')}
            </h3>
            <p className="mt-2 font-medium text-slate-950">{entry.parentProvinceName}</p>
          </section>
        )}

        <section className="border-t border-slate-200 pt-4">
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
