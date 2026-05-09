import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '../../libs/i18n/routing';
import '../../styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://viettrace.org'),
  title: 'Viettrace — Bản đồ lịch sử Việt Nam',
  description: 'So sánh bản đồ hành chính Việt Nam trước và sau sáp nhập 7/2025 (63 tỉnh vs 34 tỉnh).',
  openGraph: {
    title: 'Viettrace — Bản đồ lịch sử Việt Nam',
    description: 'So sánh bản đồ hành chính Việt Nam trước và sau sáp nhập 7/2025',
    images: ['/opengraph-image'],
    locale: 'vi_VN',
    siteName: 'Viettrace',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Viettrace — Bản đồ lịch sử Việt Nam',
    description: 'So sánh bản đồ hành chính Việt Nam trước và sau sáp nhập 7/2025',
    images: ['/opengraph-image'],
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className="antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
