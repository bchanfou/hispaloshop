/**
 * Gesti\u00f3n de tokens JWT y sesi\u00f3n
 */

interface JWTPayload {
  exp?: number;
  sub?: string;
  role?: string;
  [key: string]: any;
}

const TOKEN_KEY = 'hispalo_access_token';
const REFRESH_TOKEN_KEY = 'hispalo_refresh_token';
const USER_KEY = 'hispalo_user';

/**
 * Obtener token de acceso
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('hsp_token');
}

/**
 * Obtener refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Guardar tokens
 */
export function setToken(accessToken?: string | null, refreshToken?: string | null): void {
  if (accessToken && typeof accessToken === 'string') {
    localStorage.setItem(TOKEN_KEY, accessToken);
  }
  if (refreshToken && typeof refreshToken === 'string') {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/**
 * Eliminar tokens (logout)
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Legacy key used by some components
  localStorage.removeItem('hsp_token');
}

/**
 * Guardar datos de usuario
 */
export function setUser(user: any): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Obtener datos de usuario
 */
export function getUser(): any | null {
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  try { return JSON.parse(user); } catch { return null; }
}

/**
 * Verificar si hay sesion activa
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Decodificar JWT (sin verificar firma)
 */
export function decodeToken(token: string | null | undefined): JWTPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload || typeof payload !== 'object') return null;
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Verificar si token esta expirado
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  // Add 30-second buffer to avoid using nearly-expired tokens
  return decoded.exp * 1000 < Date.now() + 30000;
}
