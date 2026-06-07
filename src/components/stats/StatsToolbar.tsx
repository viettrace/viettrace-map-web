'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MergerCase } from '@src/libs/data/stats';
import { loadRegionalClassification } from '@src/types/regional-classification';

type Props = {
  mergers?: MergerCase[];
};

export function StatsToolbar({ mergers = [] }: Props) {
  const t = useTranslations('Stats');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (insecure context); ignore silently.
    }
  };

  function triggerDownload(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function buildExportRows() {
    const data = await loadRegionalClassification();
    return mergers.map((m) => {
      const regionKey = data.provinceToRegion[m.resultSlug];
      const regionMeta = regionKey ? data.regions[regionKey] : undefined;
      return {
        resultName: m.resultName,
        resultSlug: m.resultSlug,
        components: m.components,
        componentCount: m.componentCount,
        mergeDate: m.mergeDate ?? '2025-07-01',
        region: regionMeta?.name_en ?? '',
        regionVi: regionMeta?.name_vi ?? '',
      };
    });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const rows = await buildExportRows();
      const BOM = '﻿';
      const header = 'Result Province,Component Provinces,Component Count,Merge Date,Economic Region';
      const lines = rows.map(
        (r) =>
          `"${r.resultName}","${r.components.join(' + ')}",${r.componentCount},${r.mergeDate},"${r.region}"`
      );
      triggerDownload(
        BOM + [header, ...lines].join('\n'),
        'viettrace-province-mergers.csv',
        'text/csv;charset=utf-8;'
      );
    } finally {
      setExporting(false);
    }
  }

  async function exportJson() {
    setExporting(true);
    try {
      const rows = await buildExportRows();
      triggerDownload(
        JSON.stringify(rows, null, 2),
        'viettrace-province-mergers.json',
        'application/json'
      );
    } finally {
      setExporting(false);
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={copyLink} className={btn}>
        🔗 {copied ? t('copied') : t('copyLink')}
      </button>
      <button type="button" onClick={() => window.print()} className={btn}>
        🖨 {t('print')}
      </button>
      {mergers.length > 0 && (
        <>
          <button type="button" onClick={exportCsv} disabled={exporting} className={btn}>
            ⬇ {t('exportCsv')}
          </button>
          <button type="button" onClick={exportJson} disabled={exporting} className={btn}>
            {'{ }'} {t('exportJson')}
          </button>
        </>
      )}
    </div>
  );
}
