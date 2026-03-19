import { QueryClient } from '@tanstack/react-query';

const GLOBAL_STALE_TIME = 30 * 1000;
const GLOBAL_GC_TIME = 10 * 60 * 1000;
const GLOBAL_RETRY_COUNT = 1;

const retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000);

/**
 * Only retry on 5xx / network errors, never on 4xx (client errors).
 * @param {number} failureCount
 * @param {Error} error
 * @returns {boolean}
 */
function shouldRetry(failureCount, error) {
  if (failureCount >= GLOBAL_RETRY_COUNT) return false;
  const status = error?.status ?? 0;
  // Don't retry client errors (400-499)
  if (status >= 400 && status < 500) return false;
  // Don't retry cancelled requests
  if (error?.code === 'ERR_CANCELED') return false;
  return true;
}

const defaultQueryConfig = {
  feed: {
    staleTime: 60 * 1000,
    gcTime: GLOBAL_GC_TIME,
    retry: shouldRetry,
    retryDelay,
  },
  product: {
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    retry: shouldRetry,
    retryDelay,
  },
  catalog: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: shouldRetry,
    retryDelay,
  },
  search: {
    staleTime: GLOBAL_STALE_TIME,
    gcTime: 5 * 60 * 1000,
    retry: false,
  },
  user: {
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    retry: shouldRetry,
    refetchOnWindowFocus: true,
  },
  cart: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  },
  chat: {
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  },
  notifications: {
    staleTime: GLOBAL_STALE_TIME,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: GLOBAL_STALE_TIME,
      gcTime: GLOBAL_GC_TIME,
      retry: shouldRetry,
      retryDelay,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

export function getQueryConfig(type) {
  return defaultQueryConfig[type] || defaultQueryConfig.feed;
}

export function invalidateRelatedQueries(primaryKey) {
  const relations = {
    cart: ['orders', 'user'],
    orders: ['cart', 'user'],
    product: ['feed', 'catalog'],
    post: ['feed'],
    user: ['feed', 'orders'],
  };

  const keysToInvalidate = relations[primaryKey] || [];
  keysToInvalidate.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
}

export function prefetchData(queryKey, fetcher, config = {}) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: fetcher,
    staleTime: config.staleTime || GLOBAL_STALE_TIME,
    gcTime: config.gcTime || GLOBAL_GC_TIME,
  });
}

export function optimisticUpdate(queryKey, updater) {
  queryClient.setQueryData(queryKey, (old) => updater(old));
}

export function rollbackQuery(queryKey, previousData) {
  queryClient.setQueryData(queryKey, previousData);
}

export default queryClient;
