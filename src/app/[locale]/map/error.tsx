'use client';

import { useTranslations } from 'next-intl';

export default function MapError({ reset }: { reset: () => void }) {
  const t = useTranslations('Map');

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
      <section className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-950">{t('errorTitle')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('errorTileServer')}</p>
        <button
          className="mt-5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          onClick={reset}
          type="button"
        >
          {t('retry')}
        </button>
      </section>
    </main>
  );
}
