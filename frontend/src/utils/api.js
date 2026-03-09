const API_PREFIX = process.env.REACT_APP_API_PREFIX || '/api';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/\/+$/, '');
};

const buildApiUrl = (baseUrl) => {
  const normalizedBase = normalizeUrl(baseUrl);
  if (!normalizedBase) return API_PREFIX;
  if (normalizedBase.endsWith(API_PREFIX)) return normalizedBase;
  return `${normalizedBase}${API_PREFIX}`;
};

const getDefaultBackendOrigin = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;

    if (LOCAL_HOSTS.has(host)) {
      return 'http://localhost:8000';
    }

    // In deployed environments prefer same-origin `/api` so rewrites handle
    // routing and auth cookies remain tied to the frontend origin.
    return '';
  }

  return 'http://localhost:8000';
};

export const getApiUrl = () => {
  const explicitApiUrl = normalizeUrl(process.env.REACT_APP_API_URL);
  if (explicitApiUrl) return buildApiUrl(explicitApiUrl);

  const explicitBackendUrl = normalizeUrl(process.env.REACT_APP_BACKEND_URL);
  if (explicitBackendUrl) return buildApiUrl(explicitBackendUrl);

  return buildApiUrl(getDefaultBackendOrigin());
};

export const getApiOrigin = () => {
  const apiUrl = getApiUrl();

  if (apiUrl.startsWith('/') && typeof window !== 'undefined') {
    return window.location.origin;
  }

  try {
    return new URL(apiUrl).origin;
  } catch {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    return '';
  }
};

export const resolveApiAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (/^https?:\/\//i.test(url)) return url;

  const baseOrigin = getApiOrigin();
  if (!baseOrigin) return url;

  return `${baseOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const API = getApiUrl();

export default API;
