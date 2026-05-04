import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { routing } from '../../libs/i18n/routing';
import '../../styles/globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Viettrace — Bản đồ lịch sử Việt Nam',
  description: 'So sánh bản đồ hành chính Việt Nam trước và sau sáp nhập 7/2025 (63 tỉnh vs 34 tỉnh).',
  openGraph: {
    title: 'Viettrace — Bản đồ lịch sử Việt Nam',
    description: 'So sánh bản đồ hành chính Việt Nam trước và sau sáp nhập 7/2025',
    type: 'website',
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
