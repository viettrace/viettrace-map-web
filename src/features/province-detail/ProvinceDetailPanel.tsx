'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';

const REPORT_DATA_ISSUE_URL =
  'https://github.com/viettrace/viettrace-map-web/issues/new?template=data_issue.md';

type MapTranslationKey =
  | 'detailMergedDate'
  | 'detailMergedFrom'
  | 'detailMergedInto'
  | 'detailNoMergerPost'
  | 'detailNoMergerPre';

type MapTranslator = (key: MapTranslationKey) => string;

interface ProvinceDetailPanelProps {
  entry: ProvinceIndexEntry;
  onClose: () => void;
}

export default function ProvinceDetailPanel({ entry, onClose }: ProvinceDetailPanelProps) {
  const t = useTranslations('Map');
  const locale = useLocale();
  const primaryName = getPrimaryName(entry, locale);
  const secondaryName = getSecondaryName(entry, locale);
  const reportIssueUrl = buildReportIssueUrl(entry);

  return (
    <aside className="absolute right-3 bottom-16 left-3 z-20 max-h-[42dvh] overflow-y-auto rounded-lg border border-slate-200 bg-white/95 text-sm text-slate-700 shadow-xl backdrop-blur-sm md:top-24 md:right-4 md:bottom-auto md:left-auto md:max-h-[calc(100dvh-8rem)] md:w-96">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div
            className={`mb-1 w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
              entry.mode === 'pre' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}
          >
            {entry.mode === 'pre' ? t('detailModePre') : t('detailModePost')}
          </div>
          <h2 className="truncate text-base font-semibold text-slate-950">{primaryName}</h2>
          {secondaryName && <p className="mt-0.5 truncate text-xs text-slate-500">{secondaryName}</p>}
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
            {t('detailMergerTitle')}
          </h3>
          <div className="mt-2">{renderMergerInfo(entry, t)}</div>
        </section>

        <section className="border-t border-slate-200 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {t('detailDataTitle')}
          </h3>
          <p className="mt-2 leading-6">{t('detailDataBody')}</p>
        </section>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <Link
            href={`/${locale}/data-sources`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            {t('dataSourcesLink')}
          </Link>
          <a
            href={reportIssueUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-700"
          >
            {t('reportDataIssue')}
          </a>
        </div>
      </div>
    </aside>
  );
}

function renderMergerInfo(entry: ProvinceIndexEntry, t: MapTranslator) {
  if (entry.mode === 'pre') {
    if (!entry.merger?.newProvince) {
      return <p className="leading-6 text-slate-600">{t('detailNoMergerPre')}</p>;
    }

    return (
      <dl className="space-y-2">
        <div>
          <dt className="text-xs text-slate-500">{t('detailMergedInto')}</dt>
          <dd className="font-medium text-slate-950">{entry.merger.newProvince}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t('detailMergedDate')}</dt>
          <dd className="font-medium text-slate-950">{entry.merger.mergeDate}</dd>
        </div>
      </dl>
    );
  }

  if (!entry.merger?.oldProvinces?.length) {
    return <p className="leading-6 text-slate-600">{t('detailNoMergerPost')}</p>;
  }

  return (
    <div>
      <p className="text-xs text-slate-500">{t('detailMergedFrom')}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {entry.merger.oldProvinces.map(province => (
          <li
            key={province}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
          >
            {province}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        {t('detailMergedDate')}:{' '}
        <span className="font-medium text-slate-700">{entry.merger.mergeDate}</span>
      </p>
    </div>
  );
}

function getPrimaryName(entry: ProvinceIndexEntry, locale: string) {
  return locale === 'en' ? entry.name_en : entry.name;
}

function getSecondaryName(entry: ProvinceIndexEntry, locale: string) {
  const secondaryName = locale === 'en' ? entry.name : entry.name_en;
  return secondaryName === getPrimaryName(entry, locale) ? null : secondaryName;
}

function buildReportIssueUrl(entry: ProvinceIndexEntry) {
  const url = new URL(REPORT_DATA_ISSUE_URL);
  const modeLabel = entry.mode === 'pre' ? 'pre-2025' : 'post-2025';

  url.searchParams.set('title', `Data issue: ${entry.name}`);
  url.searchParams.set(
    'body',
    [
      `Province: ${entry.name}`,
      `Mode: ${modeLabel}`,
      `Slug: ${entry.slug}`,
      '',
      'Describe the issue and include evidence/source links if available:',
    ].join('\n'),
  );

  return url.toString();
}
