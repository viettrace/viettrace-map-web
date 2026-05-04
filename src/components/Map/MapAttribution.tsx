'use client';

import { useTranslations } from 'next-intl';

export default function MapAttribution() {
  const t = useTranslations('Map');

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/80 px-2 py-1 text-center text-xs text-gray-600 backdrop-blur-sm">
      {t('attributionOSM')} | {t('attributionViettrace')}
    </div>
  );
}