'use client';

import { useTranslations } from 'next-intl';

interface MapAttributionProps {
  isDataNoticeOpen: boolean;
  onToggleDataNotice: () => void;
}

export default function MapAttribution({ isDataNoticeOpen, onToggleDataNotice }: MapAttributionProps) {
  const t = useTranslations('Map');

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-white/85 px-2 py-1 text-center text-xs text-gray-600 backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggleDataNotice}
        aria-expanded={isDataNoticeOpen}
        className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        {isDataNoticeOpen ? t('dataNoticeHide') : t('dataNoticeOpen')}
      </button>
      <span>
        {t('attributionOSM')} | {t('attributionGeoBoundaries')} | {t('attributionViettrace')}
      </span>
    </div>
  );
}
