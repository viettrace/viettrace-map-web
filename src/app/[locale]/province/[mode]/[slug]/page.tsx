import { getTranslations } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { getProvinceProfile } from '@src/features/province-profile/profileData';
import ProvinceProfileView from '@src/features/province-profile/ProvinceProfileView';
import { getProvinceEntries } from '@src/libs/data/provinces';
import { routing } from '@src/libs/i18n/routing';

// Statically prerender every (locale, mode, slug); 404 anything else.
export const dynamicParams = false;

type RouteParams = { locale: string; mode: string; slug: string };

function isMode(value: string): value is 'pre' | 'post' {
  return value === 'pre' || value === 'post';
}

export async function generateStaticParams() {
  const provinces = await getProvinceEntries();
  // The [locale] layout has no generateStaticParams, so the leaf must enumerate locale too.
  return routing.locales.flatMap(locale =>
    provinces.map(p => ({ locale, mode: p.mode, slug: p.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }) {
  const { locale, mode, slug } = await params;
  if (!isMode(mode)) return {};
  const profile = await getProvinceProfile(mode, slug);
  if (!profile) return {};
  const name = locale === 'en' ? profile.entry.name_en : profile.entry.name;
  const t = await getTranslations({ locale, namespace: 'ProvinceProfile' });
  return { title: name, description: t('metaDescription', { name }) };
}

export default async function ProvinceProfilePage({ params }: { params: Promise<RouteParams> }) {
  const { locale, mode, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  if (!isMode(mode)) notFound();

  const profile = await getProvinceProfile(mode, slug);
  if (!profile) notFound();

  return <ProvinceProfileView profile={profile} locale={locale} />;
}
