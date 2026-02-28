/**
 * Analytics tracking utility
 * Sends page visits to backend for real-time analytics
 */

import { API } from './api'; // Centralized API URL

export const trackPageVisit = async (page, country = null) => {
  try {
    // Don't track in development or if API is not available
    if (!API) return;
    
    // Get referrer
    const referrer = document.referrer || null;
    
    await fetch(`${API}/track/visit`, {
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
  } catch (error) {
    // Silently fail - don't break the app for analytics
    console.debug('Analytics tracking failed:', error);
  }
};

// Hook for tracking on component mount
export const usePageTracking = (page) => {
  const { useEffect } = require('react');
  
  useEffect(() => {
    trackPageVisit(page);
  }, [page]);
};

export default { trackPageVisit, usePageTracking };
