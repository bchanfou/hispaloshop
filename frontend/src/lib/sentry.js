import * as Sentry from '@sentry/react';

export const initSentry = () => {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn || process.env.NODE_ENV !== 'production') return;

  Sentry.init({
    dsn,
    environment:    process.env.REACT_APP_ENV || 'production',
    release:        process.env.REACT_APP_VERSION || '1.0.0',
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection',
    ],

    beforeSend(event) {
      if (window.location.hostname === 'localhost') return null;
      return event;
    },
  });
};

export const SentryErrorBoundary = Sentry.ErrorBoundary;
export const captureException     = Sentry.captureException;
export const captureMessage       = Sentry.captureMessage;
export const setUser              = Sentry.setUser;
