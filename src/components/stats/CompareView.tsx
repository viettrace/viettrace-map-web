'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type CompareViewProps = {
  beforeList: string[];
  afterList: string[];
};

export function CompareView({ beforeList, afterList }: CompareViewProps) {
  const t = useTranslations('Stats');
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 print:hidden"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
        {open ? t('compareHide') : t('compareShow')}
      </button>

      {open && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <CompareColumn
            title={t('compareBefore', { n: beforeList.length })}
            provinces={beforeList}
            tone="muted"
          />
          <CompareColumn
            title={t('compareAfter', { n: afterList.length })}
            provinces={afterList}
            tone="accent"
          />
        </div>
      )}
    </div>
  );
}

function CompareColumn({
  title,
  provinces,
  tone,
}: {
  title: string;
  provinces: string[];
  tone: 'muted' | 'accent';
}) {
  const titleClass =
    tone === 'accent'
      ? 'text-blue-700 dark:text-blue-300'
      : 'text-slate-500 dark:text-slate-400';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${titleClass}`}>{title}</h3>
      <ol className="grid grid-cols-1 gap-1 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-300">
        {provinces.map((name, i) => (
          <li key={name} className="flex gap-2">
            <span className="w-6 flex-shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">
              {i + 1}.
            </span>
            <span>{name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
