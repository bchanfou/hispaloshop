/**
 * Axios Configuration - CRITICAL FOR PRODUCTION
 * 
 * This MUST be imported FIRST in index.js before any other code
 * It configures axios to use the correct API URL based on environment
 */

import axios from 'axios';

// Determine the correct API base URL at RUNTIME (not build time)
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    
    // PRODUCTION - hispaloshop.com - MUST use relative URL
    if (host.includes('hispaloshop.com')) {
      return '';  // Empty base, components will add /api
    }
    
    // PREVIEW - preview.emergentagent.com - MUST use relative URL  
    if (host.includes('preview.emergentagent.com')) {
      return '';  // Empty base, components will add /api
    }
    
    // LOCALHOST - use env var for backend
    if (host === 'localhost' || host === '127.0.0.1') {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
      if (backendUrl) {
        return backendUrl;  // Just the base URL, components add /api
      }
      return '';
    }
  }
  
  // Fallback
  return '';
};

// Set the base URL for ALL axios requests globally
const API_BASE_URL = getApiBaseUrl();
axios.defaults.baseURL = API_BASE_URL;

// CRITICAL: Enable credentials for cookies/sessions
axios.defaults.withCredentials = true;

// Set default headers
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Request interceptor - ensure all requests go to correct URL
axios.interceptors.request.use(
  (config) => {
    // If URL starts with http and contains external domain, block it
    if (config.url && config.url.startsWith('http')) {
      const url = new URL(config.url);
      if (url.hostname.includes('emergent.host') || url.hostname.includes('admin-insights')) {
        console.error('[API] BLOCKED external request to:', config.url);
        // Rewrite to relative URL
        config.url = url.pathname;
        config.baseURL = '';
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url || '';
      // Suppress expected errors: 401 on auth check, 520 transient
      if (!(status === 401 && url.includes('/auth/me')) && status !== 520) {
        console.error(`[API Error] ${status}: ${url}`);
      }
    } else if (error.request) {
      console.error('[API Error] No response:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

// Export for use in components that need the URL string
export const API = API_BASE_URL;
export default API_BASE_URL;
