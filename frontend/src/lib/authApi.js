/**
 * Auth API - Mejorado con manejo de cookies y refresh automático
 */

import apiClient from './axiosConfig';

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

export const authApi = {
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  async getGoogleAuthUrl() {
    const response = await apiClient.get('/auth/google/url');
    return response.data;
  },

  async register(payload, options = {}) {
    const params = {};
    if (options.ref) {
      params.ref = options.ref;
    }
    const response = await apiClient.post('/auth/register', payload, { params });
    return response.data;
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  async refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },
};

export default authApi;
