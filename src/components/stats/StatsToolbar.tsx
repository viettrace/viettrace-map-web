'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function StatsToolbar() {
  const t = useTranslations('Stats');
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (insecure context); ignore silently.
    }
  };

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={copyLink} className={btn}>
        🔗 {copied ? t('copied') : t('copyLink')}
      </button>
      <button type="button" onClick={() => window.print()} className={btn}>
        🖨 {t('print')}
      </button>
    </div>
  );
}
