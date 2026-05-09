import withBundleAnalyzer from '@next/bundle-analyzer';
import type { SentryBuildOptions } from '@sentry/nextjs';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const isProduction = process.env.NODE_ENV === 'production';
const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true';

const baseConfig: NextConfig = {
  compress: true,
  compiler: {
    reactRemoveProperties: isProduction,
    removeConsole: isProduction,
  },
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: false,
  },
  generateEtags: true,
  images: {
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    dangerouslyAllowSVG: false,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    formats: ['image/webp', 'image/avif'],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['@sentry/nextjs', 'import-in-the-middle', 'require-in-the-middle'],
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
  async headers() {
    return [
      {
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
        source: '/(.*)',
      },
      {
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
        source: '/api/(.*)',
      },
    ];
  },
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      position: 'bottom-right',
    },
  }),
};

const sentryOptions: SentryBuildOptions = {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  automaticVercelMonitors: true,
  disableLogger: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  reactComponentAnnotation: {
    enabled: true,
  },
  silent: true,
  telemetry: false,
  tunnelRoute: false,
  widenClientFileUpload: true,
};

let nextConfig = createNextIntlPlugin('./src/libs/i18n/request.ts')(baseConfig);

if (process.env.BUNDLE_ANALYZE_ENABLED === 'true') {
  nextConfig = withBundleAnalyzer()(nextConfig);
}

if (isSentryEnabled) {
  nextConfig = withSentryConfig(nextConfig, sentryOptions);
}

export default nextConfig;
