/**
 * API URL Helper
 * Centralized function to get the correct API URL based on environment
 * 
 * - Production (hispaloshop.com): Uses relative /api
 * - Preview (preview.emergentagent.com): Uses relative /api  
 * - Development (localhost): Uses REACT_APP_BACKEND_URL
 */

export const getApiUrl = () => {
  const apiPrefix = process.env.REACT_APP_API_PREFIX || '/api';

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    
    // Production or preview - always use relative URL
    if (host.includes('hispaloshop.com') || host.includes('preview.emergentagent.com')) {
      return apiPrefix;
    }
  }
  
  // Development - use environment variable
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  return backendUrl ? `${backendUrl}${apiPrefix}` : apiPrefix;
};

export const resolveApiAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (/^https?:\/\//i.test(url)) return url;

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  return backendUrl ? `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}` : url;
};

// Export the API URL constant for convenience
export const API = getApiUrl();

export default API;
