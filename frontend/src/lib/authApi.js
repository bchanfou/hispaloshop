import axios from 'axios';
import { API } from '../utils/api';

const AUTH_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 520]);
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [400, 900];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => {
  if (!error) return false;
  if (error.code === 'ECONNABORTED') return true;
  if (!error.response) return true;
  return AUTH_RETRYABLE_STATUS.has(error.response.status);
};

const withRetry = async (requestFactory) => {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await requestFactory();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES || !isRetryableError(error)) {
        throw error;
      }
      await wait(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
    }
  }

  throw lastError;
};

export const getAuthErrorMessage = (error, fallbackMessage = 'Ha ocurrido un error inesperado.') => {
  const detail = error?.response?.data?.detail;

  if (!detail) {
    if (error?.message === 'Network Error') {
      return 'No se pudo conectar con el servidor. Verifica tu conexion e intentalo otra vez.';
    }

    if (error?.code === 'ECONNABORTED') {
      return 'La solicitud tardo demasiado. Intentalo de nuevo.';
    }

    return fallbackMessage;
  }

  if (typeof detail === 'string') {
    const knownMessages = {
      'Invalid credentials': 'Email, usuario o contrasena incorrectos.',
      'Please use Google login for this account': 'Esta cuenta usa acceso con Google. Inicia sesion con Google.',
      'Your account is pending admin approval': 'Tu cuenta esta pendiente de aprobacion del administrador.',
      'Email already registered': 'Este email ya esta registrado.',
      'Invalid email format': 'El formato del email no es valido.',
      'Password too weak': 'La contrasena es demasiado debil.',
      'Password must be at least 6 characters': 'La contrasena debe tener al menos 6 caracteres.',
      'Country is required': 'El pais es obligatorio.',
      'Name is required': 'El nombre es obligatorio.',
      'Invalid country code': 'El pais indicado no es valido.',
      'VAT/CIF already registered': 'Este CIF/NIF ya esta registrado.',
      'Phone number is required': 'El telefono es obligatorio.',
      'Fiscal address is required': 'La direccion fiscal es obligatoria.',
      'Company name is required': 'El nombre de la empresa es obligatorio.',
      'Username already taken': 'Este nombre de usuario ya esta en uso.',
      'Username must be at least 3 characters': 'El nombre de usuario debe tener al menos 3 caracteres.',
      'Analytics consent is required': 'Debes aceptar el tratamiento de datos para continuar.',
      'Analytics consent is required for customer registration': 'Debes aceptar el tratamiento de datos para continuar.',
      'You need at least 1000 followers': 'Necesitas al menos 1.000 seguidores para registrarte como influencer.',
      'At least one social media profile is required': 'Debes indicar al menos una red social.',
    };

    return knownMessages[detail] || detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : 'campo';
        return `${field}: ${item?.msg || 'valor no valido'}`;
      })
      .join('. ');
  }

  if (typeof detail === 'object') {
    return detail.message || detail.msg || fallbackMessage;
  }

  return fallbackMessage;
};

const authRequest = (path, options = {}) =>
  withRetry(() =>
    axios({
      url: `${API}${path}`,
      withCredentials: true,
      timeout: 12000,
      ...options,
    })
  );

export const authApi = {
  async login(credentials) {
    const response = await authRequest('/auth/login', {
      method: 'post',
      data: credentials,
    });
    return response.data;
  },

  async register(payload) {
    const response = await authRequest('/auth/register', {
      method: 'post',
      data: payload,
    });
    return response.data;
  },

  async getCurrentUser() {
    const response = await authRequest('/auth/me', {
      method: 'get',
    });
    return response.data;
  },

  async logout() {
    const response = await authRequest('/auth/logout', {
      method: 'post',
      data: {},
    });
    return response.data;
  },
};

export default authApi;
