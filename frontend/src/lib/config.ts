import { getApiUrl } from '../utils/api';

// Configuracion de la aplicacion

// Feature Flags
export const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK === 'true';

// Environment
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// API Configuration
export const API_URL = getApiUrl();
export const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10);

// Validacion de configuracion critica en produccion
if (isProduction) {
  if (USE_MOCK_DATA) {
    console.error('WARNING: USE_MOCK_DATA esta activado en produccion. Esto no deberia ocurrir.');
  }

  if (!process.env.REACT_APP_API_URL && !process.env.REACT_APP_BACKEND_URL) {
    console.warn('WARNING: No hay configuracion explicita de API. Usando fallback runtime.');
  }
}

// Configuracion de paginacion
export const DEFAULT_PAGE_SIZE = 20;

// Configuracion de cache (SWR)
export const SWR_CONFIG = {
  refreshInterval: 0,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 3000,
};

// Roles de usuario
export const USER_ROLES = {
  CUSTOMER: 'customer',
  PRODUCER: 'producer',
  INFLUENCER: 'influencer',
  IMPORTER: 'importer',
  ADMIN: 'admin',
} as const;

// Estados de orden
export const ORDER_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// Configuracion de imagenes
export const IMAGE_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  DEFAULT_AVATAR: '/default-avatar.png',
  DEFAULT_PRODUCT_IMAGE: '/default-product.png',
};

// Configuracion de validacion
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  BIO_MAX_LENGTH: 500,
};
