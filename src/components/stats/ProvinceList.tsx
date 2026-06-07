'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type ProvinceListProps = {
  provinces: string[];
  label: string;
  maxInitialShow?: number;
};

export function ProvinceList({ provinces, label, maxInitialShow = 5 }: ProvinceListProps) {
  const t = useTranslations('Stats');
  const [isExpanded, setIsExpanded] = useState(false);

  if (provinces.length === 0) {
    return null;
  }

  const shouldTruncate = provinces.length > maxInitialShow;
  const displayProvinces =
    isExpanded || !shouldTruncate ? provinces : provinces.slice(0, maxInitialShow);

  return (
    <div className="mt-3 text-sm">
      <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">{label}:</p>
      <div className="flex flex-wrap gap-1.5">
        {displayProvinces.map((province) => (
          <span
            key={province}
            className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
          >
            {province}
          </span>
        ))}
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            {isExpanded
              ? `− ${t('showLess')}`
              : `+ ${t('showMore', { count: provinces.length - maxInitialShow })}`}
          </button>
        )}
      </div>
    </div>
  );
}
