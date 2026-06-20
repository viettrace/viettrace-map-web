'use client';

import { useTranslations } from 'next-intl';
import { InfoIcon } from '@src/components/Map/MapChromeIcons';

interface MapAttributionProps {
  isDataNoticeOpen: boolean;
  onToggleDataNotice: () => void;
}

export default function MapAttribution({
  isDataNoticeOpen,
  onToggleDataNotice,
}: MapAttributionProps) {
  const t = useTranslations('Map');

  return (
    <div className="absolute bottom-[var(--map-attribution-bottom)] left-2 z-30 flex items-center justify-start text-left text-[10px] leading-3 text-gray-600 sm:right-0 sm:left-0 sm:max-w-none sm:flex-wrap sm:justify-center sm:gap-x-2 sm:gap-y-1 sm:bg-white/85 sm:px-2 sm:py-1 sm:text-center sm:text-xs sm:leading-normal sm:shadow-none sm:backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggleDataNotice}
        aria-expanded={isDataNoticeOpen}
        aria-label={isDataNoticeOpen ? t('dataNoticeHide') : t('attributionOpenDetails')}
        title={isDataNoticeOpen ? t('dataNoticeHide') : t('attributionOpenDetails')}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/95 font-medium text-slate-700 shadow-md backdrop-blur-sm transition-colors hover:border-slate-300 hover:bg-white focus:ring-2 focus:ring-slate-400 focus:outline-none sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded sm:border-slate-300 sm:bg-white sm:px-1.5 sm:py-0.5 sm:shadow-none sm:backdrop-blur-none"
      >
        <span className="hidden sm:inline">
          {isDataNoticeOpen ? t('dataNoticeHide') : t('dataNoticeOpen')}
        </span>
        <InfoIcon className="h-4 w-4 shrink-0 sm:hidden" />
      </button>
      <span className="hidden min-w-0 sm:inline sm:basis-auto">
        <span>{t('attributionOSM')}</span>
        <span> | {t('attributionOpenMapTiles')}</span>
        <span> | {t('attributionNaturalEarth')}</span>
        <span>
          {' '}
          | {t('attributionGeoBoundaries')} | {t('attributionViettrace')}
        </span>
      </span>
    </div>
  );
}
