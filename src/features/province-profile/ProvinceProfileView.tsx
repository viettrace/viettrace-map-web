import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { stripProvinceLabel } from '@src/libs/data/stats';
import ProvinceMiniMap from './ProvinceMiniMap';
import type { Direction } from '@src/libs/data/geography';
import type { ProvinceProfile, RelatedProvince, StatRank } from './profileData';

interface ProvinceProfileViewProps {
  profile: ProvinceProfile;
  locale: string;
}

const DIR_KEY: Record<Direction, string> = {
  N: 'dirN',
  NE: 'dirNE',
  E: 'dirE',
  SE: 'dirSE',
  S: 'dirS',
  SW: 'dirSW',
  W: 'dirW',
  NW: 'dirNW',
};
const DIR_ORDER: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const chipLink =
  'inline-block rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100';
const chipNeutral =
  'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700';
const chipCountry =
  'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700';
const cardClass = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const sectionTitle = 'text-xs font-semibold uppercase tracking-normal text-slate-500';

export default async function ProvinceProfileView({ profile, locale }: ProvinceProfileViewProps) {
  const t = await getTranslations({ locale, namespace: 'ProvinceProfile' });
  const m = await getTranslations({ locale, namespace: 'Map' });
  const { entry, region, regionPeers, stats, ranks, merger, neighbors, borders, coastline, children } =
    profile;

  const useEn = locale === 'en';
  const primaryName = useEn ? entry.name_en : entry.name;
  const otherName = useEn ? entry.name : entry.name_en;
  const secondaryName = otherName === primaryName ? null : otherName;
  const nf = new Intl.NumberFormat(useEn ? 'en-US' : 'vi-VN');
  const nf1 = new Intl.NumberFormat(useEn ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 });

  const profileHref = (r: RelatedProvince) => `/${locale}/province/${r.mode}/${r.slug}`;
  const relatedName = (r: RelatedProvince) => stripProvinceLabel(useEn ? r.name_en : r.name, locale);
  const regionName = region ? (useEn ? region.name_en : region.name_vi) : null;

  const rankNote = (r: StatRank | null) => {
    if (!r) return null;
    const base = `#${r.rank}/${r.total}`;
    return r.sharePct != null ? `${base} · ${nf1.format(r.sharePct)}% ${t('ofNational')}` : base;
  };

  const neighborsByDir = DIR_ORDER.map(dir => ({
    dir,
    items: neighbors.filter(n => n.direction === dir).map(n => n.province),
  })).filter(g => g.items.length > 0);

  const bordersByDir = DIR_ORDER.map(dir => ({
    dir,
    items: [...new Set(borders.filter(b => b.direction === dir).map(b => b.country))],
  })).filter(g => g.items.length > 0);

  return (
    <main className="min-h-dvh bg-slate-50 text-slate-950">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-slate-600">
            <Link href={`/${locale}/stats`} className="transition-colors hover:text-slate-900">
              {t('navStats')}
            </Link>
            <span aria-hidden className="text-slate-300">
              ·
            </span>
            <Link href={`/${locale}/map`} className="transition-colors hover:text-slate-900">
              {t('navMap')}
            </Link>
            <span aria-hidden className="text-slate-300">
              ·
            </span>
            <Link
              href={`/${locale}/data-sources`}
              className="transition-colors hover:text-slate-900"
            >
              {m('dataSourcesLink')}
            </Link>
          </nav>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
        <header>
          <div
            className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              entry.mode === 'pre' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}
          >
            {entry.mode === 'pre' ? m('detailModePre') : m('detailModePost')}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {primaryName}
          </h1>
          {secondaryName && <p className="mt-1 text-base text-slate-500">{secondaryName}</p>}
        </header>

        <ProvinceMiniMap entry={entry} />

        {stats && (
          <section className={cardClass}>
            <h2 className={sectionTitle}>{m('detailStatsTitle')}</h2>
            <dl className="mt-2 divide-y divide-slate-100">
              <Row
                label={m('detailStatPopulation')}
                value={nf.format(stats.population.value)}
                note={rankNote(ranks.population)}
              />
              <Row
                label={m('detailStatArea')}
                value={`${nf.format(stats.area_km2.value)} km²`}
                note={rankNote(ranks.area)}
              />
              <Row
                label={m('detailStatDensity')}
                value={`${nf.format(stats.density.value)} ${m('detailStatDensityUnit')}`}
                note={rankNote(ranks.density)}
              />
              {stats.grdp && (
                <Row
                  label={m('detailStatGrdp')}
                  value={`${nf.format(stats.grdp.value)} ${m('detailStatGrdpUnit')}`}
                  note={rankNote(ranks.grdp)}
                />
              )}
              {stats.grdp_per_capita && (
                <Row
                  label={m('detailStatGrdpPerCapita')}
                  value={`${nf1.format(stats.grdp_per_capita.value)} ${m('detailStatGrdpPerCapitaUnit')}`}
                />
              )}
            </dl>
            {stats.population.derived && (
              <p className="mt-2 text-xs text-slate-400">{m('detailStatDerived')}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">{m('detailStatSource')}</p>
          </section>
        )}

        {children.count > 0 && (
          <section className={cardClass}>
            <h2 className={sectionTitle}>{t('childrenTitle')}</h2>
            <p className="mt-1 font-medium text-slate-950">
              {children.type === 'district'
                ? t('childrenDistricts', { count: children.count })
                : t('childrenWards', { count: children.count })}
            </p>
            {children.islandCount > 0 && (
              <p className="mt-0.5 text-xs font-medium text-amber-700">
                {t('childrenIslands', { count: children.islandCount })}
              </p>
            )}
            {children.type === 'district' ? (
              <ChildChips items={children.items} useEn={useEn} islandLabel={t('islandBadge')} />
            ) : (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-blue-700 hover:text-blue-900">
                  {t('childrenShowAll', { count: children.count })}
                </summary>
                <div className="mt-2">
                  <ChildChips items={children.items} useEn={useEn} islandLabel={t('islandBadge')} />
                </div>
              </details>
            )}
          </section>
        )}

        {(neighborsByDir.length > 0 || bordersByDir.length > 0 || coastline) && (
          <section className={cardClass}>
            <h2 className={sectionTitle}>{t('geoTitle')}</h2>
            {neighborsByDir.length > 0 && (
              <div className="mt-2 space-y-2 text-sm">
                {neighborsByDir.map(group => (
                  <div key={group.dir} className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500">{t(DIR_KEY[group.dir])}:</span>
                    {group.items.map(p => (
                      <Link key={`${p.mode}:${p.slug}`} href={profileHref(p)} className={chipLink}>
                        {relatedName(p)}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {bordersByDir.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-medium text-slate-500">{t('intlBorderLabel')}</p>
                <div className="space-y-2 text-sm">
                  {bordersByDir.map(group => (
                    <div key={group.dir} className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-500">{t(DIR_KEY[group.dir])}:</span>
                      {group.items.map(code => (
                        <span key={code} className={chipCountry}>
                          {t(`country${code}`)}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {coastline && (
              <p className="mt-3 text-sm text-slate-700">
                {coastline.hasCoastline
                  ? t('coastlineHas', { km: nf.format(coastline.km) })
                  : t('coastlineNone')}
              </p>
            )}
          </section>
        )}

        {regionName && (
          <section className={cardClass}>
            <h2 className={sectionTitle}>{m('detailRegionLabel')}</h2>
            <p className="mt-2 font-medium text-slate-950">{regionName}</p>
            {regionPeers.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-slate-500">{t('regionPeersLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {regionPeers.map(p => (
                    <Link key={`${p.mode}:${p.slug}`} href={profileHref(p)} className={chipLink}>
                      {relatedName(p)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className={cardClass}>
          <h2 className={sectionTitle}>{m('detailMergerTitle')}</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            {merger.kind === 'absorbed' && (
              <div className="flex flex-wrap items-center gap-2">
                <span>{t('mergedIntoLabel')}</span>
                <Link href={profileHref(merger.target)} className={chipLink}>
                  {relatedName(merger.target)}
                </Link>
                {merger.mergeDate && (
                  <span className="text-slate-500">
                    · {m('detailMergedDate')}: {merger.mergeDate}
                  </span>
                )}
              </div>
            )}
            {merger.kind === 'continued' && (
              <div className="flex flex-wrap items-center gap-2">
                <span>{t('continuedAsLabel')}</span>
                <Link href={profileHref(merger.target)} className={chipLink}>
                  {relatedName(merger.target)}
                </Link>
              </div>
            )}
            {merger.kind === 'expanded' && (
              <div>
                <p className="mb-2">
                  {t('formedFromLabel')}
                  {merger.mergeDate && (
                    <span className="text-slate-500">
                      {' '}
                      · {m('detailMergedDate')}: {merger.mergeDate}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {merger.components.map(c => (
                    <Link key={`${c.mode}:${c.slug}`} href={profileHref(c)} className={chipLink}>
                      {relatedName(c)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {merger.kind === 'unchanged' && (
              <div className="flex flex-wrap items-center gap-2">
                <span>{t('unchangedLabel')}</span>
                {merger.origin && (
                  <Link href={profileHref(merger.origin)} className={chipLink}>
                    {relatedName(merger.origin)}
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right">
        <span className="font-medium tabular-nums text-slate-950">{value}</span>
        {note && <span className="ml-2 text-xs tabular-nums text-slate-400">{note}</span>}
      </dd>
    </div>
  );
}

function ChildChips({
  items,
  useEn,
  islandLabel,
}: {
  items: ProvinceProfile['children']['items'];
  useEn: boolean;
  islandLabel: string;
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {items.map(c => (
        <li key={c.name} className={chipNeutral}>
          {useEn ? c.name_en : c.name}
          {c.isIsland && (
            <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
              {islandLabel}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
