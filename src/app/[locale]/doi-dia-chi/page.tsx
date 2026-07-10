import { promises as fs } from 'fs';
import path from 'path';
import { getTranslations } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import AddressConverterView from '@src/features/address-converter/AddressConverterView';
import type { AddressIndex } from '@src/features/address-converter/addressConversion';
import { routing } from '@src/libs/i18n/routing';

// Static page (like /stats): the province list is read at build time; per-province ward files are
// fetched client-side on demand.
export const dynamic = 'force-static';

async function loadAddressIndex(): Promise<AddressIndex> {
  const filePath = path.join(process.cwd(), 'public/data/address-index.json');
  return JSON.parse(await fs.readFile(filePath, 'utf-8')) as AddressIndex;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AddressConverter' });
  return { title: t('title'), description: t('metaDescription') };
}

export default async function AddressConverterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const index = await loadAddressIndex();
  return <AddressConverterView index={index} locale={locale} />;
}
