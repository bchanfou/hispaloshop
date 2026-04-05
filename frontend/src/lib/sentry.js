import * as Sentry from '@sentry/react';

export const initSentry = () => {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn || process.env.NODE_ENV !== 'production') return;

  // SENTRY_RELEASE is canonical (git SHA). Fallbacks for legacy setups.
  const release =
    process.env.REACT_APP_SENTRY_RELEASE ||
    process.env.REACT_APP_VERSION ||
    'unknown';

  const environment =
    process.env.REACT_APP_ENVIRONMENT ||
    process.env.REACT_APP_ENV ||
    'production';

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,

    ignoreErrors: [
      // Browser noise — not actionable
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection',
      // Network cancellations — user navigated away or went offline
      'AbortError',
      'Network request failed',
      'Load failed',
      'NetworkError when attempting to fetch resource',
      // Expected 4xx from our own API (axios wraps these)
      'Request failed with status code 401',
      'Request failed with status code 403',
      'Request failed with status code 404',
    ],

    beforeSend(event) {
      // Never ship local dev noise
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return null;
      }
      return event;
    },
  });
};

export const SentryErrorBoundary = Sentry.ErrorBoundary;
export const captureException     = Sentry.captureException;
export const captureMessage       = Sentry.captureMessage;
export const setUser              = Sentry.setUser;
