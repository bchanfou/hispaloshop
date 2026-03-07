/**
 * Configuración React Query
 * Cache, retry logic y optimizaciones de performance
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Estrategia de retry con backoff exponencial
 */
const retryWithBackoff = (failureCount, error) => {
  // No retry en errores 4xx (cliente)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }
  // Retry máximo 3 veces
  return failureCount < 3;
};

/**
 * Delay entre retries (exponencial)
 */
const retryDelay = (attemptIndex) => {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
};

/**
 * Configuración por defecto según tipo de query
 */
const defaultQueryConfig = {
  // Feed y contenido social - cache corto
  feed: {
    staleTime: 5 * 60 * 1000,      // 5 minutos
    cacheTime: 10 * 60 * 1000,     // 10 minutos
    retry: retryWithBackoff,
    retryDelay,
  },
  
  // Productos - cache medio
  product: {
    staleTime: 15 * 60 * 1000,     // 15 minutos
    cacheTime: 30 * 60 * 1000,     // 30 minutos
    retry: retryWithBackoff,
    retryDelay,
  },
  
  // Catálogo categorías - cache largo
  catalog: {
    staleTime: 30 * 60 * 1000,     // 30 minutos
    cacheTime: 60 * 60 * 1000,     // 1 hora
    retry: retryWithBackoff,
    retryDelay,
  },
  
  // Búsqueda - cache muy corto
  search: {
    staleTime: 2 * 60 * 1000,      // 2 minutos
    cacheTime: 5 * 60 * 1000,      // 5 minutos
    retry: false,
  },
  
  // Usuario y sesión - cache largo, refetch automático
  user: {
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: retryWithBackoff,
    refetchOnWindowFocus: true,
  },
  
  // Carrito - siempre fresh
  cart: {
    staleTime: 0,
    cacheTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  },
  
  // HI Chat - cache corto
  chat: {
    staleTime: 1 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: false,
  },
  
  // Notificaciones - fresh frecuente
  notifications: {
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  },
};

/**
 * Query Client configurado
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configuración global por defecto
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: retryWithBackoff,
      retryDelay,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      suspense: false,
    },
    mutations: {
      // Las mutaciones no hacen retry por defecto
      retry: false,
    },
  },
});

/**
 * Helper para obtener config según tipo
 */
export function getQueryConfig(type) {
  return defaultQueryConfig[type] || defaultQueryConfig.feed;
}

/**
 * Invalidar cache relacionada
 */
export function invalidateRelatedQueries(primaryKey) {
  const relations = {
    'cart': ['orders', 'user'],
    'orders': ['cart', 'user'],
    'product': ['feed', 'catalog'],
    'post': ['feed'],
    'user': ['feed', 'orders'],
  };
  
  const keysToInvalidate = relations[primaryKey] || [];
  keysToInvalidate.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
}

/**
 * Prefetch de datos (optimización UX)
 */
export function prefetchData(queryKey, fetcher, config = {}) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: fetcher,
    staleTime: config.staleTime || 5 * 60 * 1000,
  });
}

/**
 * Optimistic update helper
 */
export function optimisticUpdate(queryKey, updater) {
  queryClient.setQueryData(queryKey, (old) => updater(old));
}

/**
 * Rollback helper
 */
export function rollbackQuery(queryKey, previousData) {
  queryClient.setQueryData(queryKey, previousData);
}

export default queryClient;
