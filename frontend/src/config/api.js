/**
 * API Configuration Helper
 * 
 * In production (hispaloshop.com), uses relative URLs (/api)
 * In development/preview, uses the full REACT_APP_BACKEND_URL
 * This ensures the frontend NEVER calls external domains like admin-insights-ui
 */

const getApiBaseUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  
  // In production (hispaloshop.com), use relative URL
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    
    // If we're on hispaloshop.com, use relative /api
    if (currentHost.includes('hispaloshop.com')) {
      console.log('[API Config] Using relative /api for hispaloshop.com');
      return '/api';
    }
    
    // If we're on the preview domain, use relative /api too
    if (currentHost.includes('preview.emergentagent.com')) {
      console.log('[API Config] Using relative /api for preview');
      return '/api';
    }
  }
  
  // For development (localhost), use the configured URL
  if (backendUrl) {
    console.log('[API Config] Using configured URL:', backendUrl);
    return `${backendUrl}/api`;
  }
  
  // Fallback to relative URL
  console.log('[API Config] Fallback to relative /api');
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();
export default API_BASE_URL;
