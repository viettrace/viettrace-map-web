'use client';

import { useTranslations } from 'next-intl';

const DATA_SOURCES_URL = 'https://github.com/viettrace/viettrace-plans/blob/main/04-data/data-sources.md';
const REPORT_DATA_ISSUE_URL = 'https://github.com/viettrace/viettrace-map-web/issues/new?template=data_issue.md';

export default function MapDataNotice() {
  const t = useTranslations('Map');

  return (
    <aside className="absolute bottom-10 left-3 z-10 w-[min(24rem,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur-sm">
      <div className="font-semibold text-slate-950">{t('dataNoticeTitle')}</div>
      <p className="mt-1 leading-relaxed">{t('dataNoticeBody')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={DATA_SOURCES_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          {t('dataSourcesLink')}
        </a>
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
