'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

const REPORT_DATA_ISSUE_URL =
  'https://github.com/viettrace/viettrace-map-web/issues/new?template=data_issue.md';

interface MapDataNoticeProps {
  onClose: () => void;
}

export default function MapDataNotice({ onClose }: MapDataNoticeProps) {
  const t = useTranslations('Map');
  const locale = useLocale();

  return (
    <aside className="absolute right-3 bottom-[var(--map-panel-bottom)] left-3 z-20 max-h-[30dvh] overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[11px] leading-5 text-slate-700 shadow-lg backdrop-blur-sm sm:right-auto sm:max-h-none sm:w-[min(24rem,calc(100vw-1.5rem))] sm:text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-slate-950">{t('dataNoticeTitle')}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('dataNoticeClose')}
          title={t('dataNoticeClose')}
          className="-mt-1 -mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:outline-none"
        >
          ×
        </button>
      </div>
      <p className="mt-1 max-h-16 overflow-y-auto pr-4 break-words sm:max-h-none sm:overflow-visible sm:pr-1 sm:leading-relaxed">
        {t('dataNoticeBody')}
      </p>
      <div className="mt-2 space-y-0.5 border-t border-slate-200 pt-2 text-[10px] leading-4 text-slate-500 sm:hidden">
        <div>{t('attributionOSM')}</div>
        <div>{t('attributionOpenMapTiles')}</div>
        <div>{t('attributionViettrace')}</div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
        <Link
          href={`/${locale}/stats`}
          className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
        >
          {t('dataNoticeStatsLink')}
        </Link>
        <Link
          href={`/${locale}/data-sources`}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          {t('dataSourcesLink')}
        </Link>
        <a
          href={REPORT_DATA_ISSUE_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-slate-900 px-2 py-1 font-medium text-white transition-colors hover:bg-slate-700"
        >
          {t('reportDataIssue')}
        </a>
      </div>
    </aside>
  );
}
