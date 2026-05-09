'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

const REPORT_DATA_ISSUE_URL = 'https://github.com/viettrace/viettrace-map-web/issues/new?template=data_issue.md';

interface MapDataNoticeProps {
  onClose: () => void;
}

export default function MapDataNotice({ onClose }: MapDataNoticeProps) {
  const t = useTranslations('Map');
  const locale = useLocale();

  return (
    <aside className="absolute bottom-10 left-3 z-10 w-[min(24rem,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-slate-950">{t('dataNoticeTitle')}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('dataNoticeClose')}
          title={t('dataNoticeClose')}
          className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
        >
          ×
        </button>
      </div>
      <p className="mt-1 leading-relaxed">{t('dataNoticeBody')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
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
