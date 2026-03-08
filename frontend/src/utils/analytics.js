/**
 * Analytics tracking utility
 * Sends page visits to backend for real-time analytics
 */

import { API } from './api'; // Centralized API URL

let analyticsTrackingEnabled = true;

export const trackPageVisit = async (page, country = null) => {
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
    console.debug('Analytics tracking failed:', error);
  }
};

export const trackMarketingEvent = (eventName, params = {}) => {
  try {
    if (typeof window === 'undefined') return;

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }

    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, params);
    }
  } catch (error) {
    console.debug('Marketing event tracking failed:', error);
  }
};

// Hook for tracking on component mount
export const usePageTracking = (page) => {
  const { useEffect } = require('react');
  
  useEffect(() => {
    trackPageVisit(page);
  }, [page]);
};

export default { trackPageVisit, trackMarketingEvent, usePageTracking };
