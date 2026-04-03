const API_PREFIX = process.env.REACT_APP_API_PREFIX || '/api';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const isPrivateIpHost = (host) => {
  if (!host || typeof host !== 'string') return false;

  if (host === '::1') return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;

  const octets = host.split('.').map((chunk) => Number(chunk));
  if (octets.length === 4 && octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  }

  return false;
};

const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/\/+$/, '');

  // In secure pages, avoid mixed-content API origins that CSP will block.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    try {
      const parsed = new URL(trimmed);
      const host = (parsed.hostname || '').toLowerCase();
      const isLocal = LOCAL_HOSTS.has(host) || isPrivateIpHost(host);
      if (parsed.protocol === 'http:' && !isLocal) {
        parsed.protocol = 'https:';
        return parsed.toString().replace(/\/+$/, '');
      }
    } catch {
      // Non-URL values are handled by existing logic.
    }
  }

  return trimmed;
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
    const runtimeOverride = normalizeUrl(window.localStorage.getItem('hispaloshop_api_origin'));

    if (runtimeOverride) {
      return runtimeOverride;
    }

    if (LOCAL_HOSTS.has(host) || isPrivateIpHost(host)) {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      return `${protocol}//${host}:8000`;
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
