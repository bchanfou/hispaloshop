/**
 * Analytics tracking utility
 * Sends page visits to backend for real-time analytics
 */

import { API } from './api';
import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    posthog?: { capture?: (event: string, props?: Record<string, any>) => void };
    __posthogInit?: () => void;
  }
}

let analyticsTrackingEnabled = true;

export const trackPageVisit = async (page: string, country: string | null = null): Promise<void> => {
  try {
    // Don't track if API is not available or the endpoint is known missing
    if (!API || !analyticsTrackingEnabled) return;

    // Get referrer
    const referrer = document.referrer || null;

    const response = await fetch(`${API}/track/visit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page,
        country,
        referrer,
      }),
      credentials: 'include',
    });

    if (response.status === 404) {
      analyticsTrackingEnabled = false;
    }
  } catch (error) {
    // Silently fail - don't break the app for analytics
  }
};

/**
 * Check if user has accepted analytics consent.
 * Reads from the same localStorage key used by ConsentBanner.
 */
const hasAnalyticsConsent = (): boolean => {
  try {
    return localStorage.getItem('hispaloshop_consent_v1') === 'accepted';
  } catch {
    return false;
  }
};

export const trackMarketingEvent = (eventName: string, params: Record<string, any> = {}): void => {
  try {
    if (typeof window === 'undefined') return;

    // GDPR guard: never fire marketing events without explicit consent
    if (!hasAnalyticsConsent()) return;

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }

    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, params);
    }
  } catch (error) {
    // Silently fail
  }
};

// Hook for tracking on component mount
export const usePageTracking = (page: string): void => {
  useEffect(() => {
    trackPageVisit(page);
  }, [page]);
};

export const initAnalyticsOnConsent = (): void => {
  if (typeof window !== 'undefined' && hasAnalyticsConsent() && typeof window.__posthogInit === 'function') {
    window.__posthogInit();
  }
};

/**
 * Generic structured event tracker — consent-gated.
 *
 * Use this for product events (signup flow, onboarding steps, feature usage).
 * Gated behind GDPR analytics consent from ConsentBanner.
 *
 * Future providers (PostHog / Mixpanel / GA4) can be wired by adding their
 * script to index.html — calls below will start flowing automatically.
 */
export const trackEvent = (
  eventName: string,
  properties: Record<string, any> = {},
): void => {
  try {
    if (typeof window === 'undefined') return;
    if (!hasAnalyticsConsent()) return;

    // In development, log the event to the console for visibility while
    // providers are not yet wired. Noop in production builds.
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[ANALYTICS]', eventName, properties);
    }

    // Fire to any provider that happens to be loaded.
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, properties);
    }
    if (typeof window.posthog?.capture === 'function') {
      window.posthog.capture(eventName, properties);
    }
  } catch {
    // Never throw from analytics.
  }
};

export { hasAnalyticsConsent };

export default { trackPageVisit, trackMarketingEvent, trackEvent, usePageTracking, initAnalyticsOnConsent };
