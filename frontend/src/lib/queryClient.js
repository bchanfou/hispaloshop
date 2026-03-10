import { QueryClient } from '@tanstack/react-query';

const GLOBAL_STALE_TIME = 30 * 1000;
const GLOBAL_GC_TIME = 10 * 60 * 1000;
const GLOBAL_RETRY_COUNT = 1;

const retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000);

const defaultQueryConfig = {
  feed: {
    staleTime: 60 * 1000,
    gcTime: GLOBAL_GC_TIME,
    retry: GLOBAL_RETRY_COUNT,
    retryDelay,
  },
  product: {
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    retry: GLOBAL_RETRY_COUNT,
    retryDelay,
  },
  catalog: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: GLOBAL_RETRY_COUNT,
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
    retry: GLOBAL_RETRY_COUNT,
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
      retry: GLOBAL_RETRY_COUNT,
      retryDelay,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      suspense: false,
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
