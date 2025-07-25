import withBundleAnalyzer from '@next/bundle-analyzer';
import { SentryBuildOptions, withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const baseConfig: NextConfig = {
  // Temporarily fix dependencies issues with turbopack when using pnpm
  serverExternalPackages: ['import-in-the-middle', 'require-in-the-middle', '@sentry/nextjs'],
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
    // Styled-components support
    styledComponents: true,
    // Remove React dev tools in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Build configuration
  output: 'standalone', // For Docker deployment
  distDir: '.next',
  generateEtags: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
  crossOrigin: 'use-credentials',

  // Performance optimizations
  modularizeImports: {
    // 'lucide-react': {
    //   transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    // },
    // '@heroicons/react/24/outline': {
    //   transform: '@heroicons/react/24/outline/{{member}}',
    // },
    // '@heroicons/react/24/solid': {
    //   transform: '@heroicons/react/24/solid/{{member}}',
    // },
    // lodash: {
    //   transform: 'lodash/{{member}}',
    // },
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [], // Add your image domains here
    remotePatterns: [
      // Example remote pattern
      // {
      //   protocol: 'https',
      //   hostname: 'example.com',
      //   pathname: '/images/**',
      // }
    ],
    unoptimized: false,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // Example redirect
      // {
      //   source: '/old-page',
      //   destination: '/new-page',
      //   permanent: true
      // }
    ];
  },

  // Rewrites for API routes or external services
  async rewrites() {
    return [
      // Example rewrite
      // {
      //   source: '/api/external/:path*',
      //   destination: 'https://external-api.com/:path*'
      // }
    ];
  },

  // Environment variables to expose to the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'default-value',
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false, // Set to true only if you handle type checking separately
    tsconfigPath: './tsconfig.json',
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false, // Set to true only if you handle linting separately
    dirs: ['pages', 'components', 'lib', 'src', 'app'],
  },

  // Internationalization (if needed)
  // i18n: {
  //   locales: ['en', 'es', 'fr'],
  //   defaultLocale: 'en',
  //   domains: [
  //     {
  //       domain: 'example.com',
  //       defaultLocale: 'en'
  //     }
  //   ]
  // },

  // Static export configuration (if needed)
  // trailingSlash: true,
  // skipTrailingSlashRedirect: true,

  // Development configuration
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: true,
    devIndicators: {
      position: 'bottom-right',
    },
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    reactStrictMode: true,
    productionBrowserSourceMaps: false, // Set to true if you need source maps in production
  }),
};

// Sentry configuration (optional)
const sentryOptions: SentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  tunnelRoute: false,
  telemetry: false,
  reactComponentAnnotation: {
    enabled: true,
  },
};

let withNextIntl = createNextIntlPlugin('./src/libs/i18n/request.ts')(baseConfig);

if (process.env.BUNDLE_ANALYZE_ENABLED === 'true') {
  withNextIntl = withBundleAnalyzer()(withNextIntl);
}

const nextConfig =
  process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true'
    ? withSentryConfig(withNextIntl, sentryOptions)
    : withNextIntl;

// Export configuration
export default nextConfig;
