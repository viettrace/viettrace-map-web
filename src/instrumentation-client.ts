// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';
import * as Spotlight from '@spotlightjs/spotlight';

const isSentryEnabled =
  process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true' && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

if (isSentryEnabled) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    integrations: [Sentry.replayIntegration()],

    sendDefaultPii: false,

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,

    replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    debug: false,
  });

  if (process.env.NODE_ENV === 'development') {
    Spotlight.init();
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
