/**
 * Gestión de tokens JWT y sesión
 */

const TOKEN_KEY = 'hispalo_access_token';
const REFRESH_TOKEN_KEY = 'hispalo_refresh_token';
const USER_KEY = 'hispalo_user';

/**
 * Obtener token de acceso
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Obtener refresh token
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Guardar tokens
 */
export function setToken(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/**
 * Eliminar tokens (logout)
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Guardar datos de usuario
 */
export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Obtener datos de usuario
 */
export function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

/**
 * Verificar si hay sesión activa
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Decodificar JWT (sin verificar firma)
 */
export function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

/**
 * Verificar si token está expirado
 */
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}
