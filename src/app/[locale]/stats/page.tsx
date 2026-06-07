import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getMergerStats } from '@src/libs/data/stats';
import { ProvinceList } from '@src/components/stats/ProvinceList';
import { StatsCountUp } from '@src/components/stats/StatsCountUp';
import { MergerExplorer } from '@src/components/stats/MergerExplorer';
import { CompareView } from '@src/components/stats/CompareView';
import { StatsToolbar } from '@src/components/stats/StatsToolbar';

export const dynamic = 'force-static';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Stats' });
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function StatsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Stats' });
  const stats = await getMergerStats();

  // Scale rows sorted by component count (1, 2, 3...).
  const scaleRows = Object.entries(stats.scale)
    .map(([k, v]) => ({ components: Number(k), count: v }))
    .sort((a, b) => a.components - b.components);
  const maxScale = Math.max(...scaleRows.map((r) => r.count), 1);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link
            href={`/${locale}`}
            className="group inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {t('backToMap')}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
          <div className="mt-4">
            <StatsToolbar />
          </div>
        </div>

        {/* Headline: 63 -> 34 */}
        <section className="mb-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
              <div className="text-center">
                <StatsCountUp
                  to={stats.preCount}
                  className="block text-5xl font-bold text-slate-400 dark:text-slate-500 md:text-6xl"
                />
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('beforeLabel')}
                </div>
              </div>
              <div className="text-3xl text-slate-300 dark:text-slate-600 md:text-4xl">→</div>
              <div className="text-center">
                <StatsCountUp
                  to={stats.postCount}
                  className="block text-5xl font-bold text-blue-600 dark:text-blue-400 md:text-6xl"
                />
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('afterLabel')}
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
              {t('headlineNote')}
            </p>
          </div>
        </section>

        {/* Overview Stats Grid */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {t('overviewTitle')}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <StatCard
              accent="green"
              title={t('unchangedTitle')}
              value={stats.unchanged}
              description={t('unchangedDescription')}
              provinces={stats.unchangedList}
              provincesLabel={t('provincesLabel')}
            />
            <StatCard
              accent="blue"
              title={t('expandedTitle')}
              value={stats.expanded}
              description={t('expandedDescription')}
              provinces={stats.expandedList}
              provincesLabel={t('provincesLabel')}
            />
            <StatCard
              accent="amber"
              title={t('absorbedTitle')}
              value={stats.absorbed}
              description={t('absorbedDescription')}
              provinces={stats.absorbedList}
              provincesLabel={t('provincesLabel')}
            />
          </div>
        </section>

        {/* Merge Scale */}
        <section className="mb-12">
          <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {t('scaleTitle')}
          </h2>
          <p className="mb-6 text-slate-600 dark:text-slate-400">{t('scaleDescription')}</p>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-4">
              {scaleRows.map((row) => (
                <div key={row.components} className="flex items-center gap-4">
                  <div className="w-40 flex-shrink-0 text-sm text-slate-700 dark:text-slate-300">
                    {row.components === 1
                      ? t('scaleRowUnchanged')
                      : t('scaleRowMerged', { n: row.components })}
                  </div>
                  <div className="flex h-7 flex-1 items-center">
                    <div
                      className="flex h-7 items-center justify-end rounded bg-blue-500/80 px-2 dark:bg-blue-600/80"
                      style={{ width: `${Math.max((row.count / maxScale) * 100, 8)}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{row.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {stats.biggestMergers.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('biggestMergersLabel', { n: stats.biggestMergers[0]?.componentCount ?? 0 })}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.biggestMergers.map((m) => (
                    <span
                      key={m.resultName}
                      className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {m.resultName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Detailed Merger Breakdown */}
        <section className="mb-12">
          <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {t('mergerDetailsTitle')}
          </h2>
          <p className="mb-6 text-slate-600 dark:text-slate-400">
            {t('mergerDetailsDescription', { n: stats.mergers.length })}
          </p>
          <MergerExplorer mergers={stats.mergers} />
        </section>

        {/* Before / After comparison */}
        <section className="mb-12">
          <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {t('compareTitle')}
          </h2>
          <p className="mb-4 text-slate-600 dark:text-slate-400">{t('compareDescription')}</p>
          <CompareView beforeList={stats.beforeList} afterList={stats.afterList} />
        </section>

        {/* Data Source Footer */}
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            {t('dataSourceTitle')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('dataSourceContent')}</p>
        </section>
      </div>
    </main>
  );
}

// UI Component: Stat Card
function StatCard({
  title,
  value,
  description,
  accent,
  provinces,
  provincesLabel,
}: {
  title: string;
  value: number;
  description: string;
  accent: 'green' | 'blue' | 'amber';
  provinces?: string[];
  provincesLabel?: string;
}) {
  const accentClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</dt>
      <dd className="mt-2">
        <span className={`text-4xl font-bold tracking-tight ${accentClasses[accent]}`}>{value}</span>
      </dd>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      {provinces && provinces.length > 0 && provincesLabel && (
        <ProvinceList provinces={provinces} label={provincesLabel} />
      )}
    </div>
  );
}
