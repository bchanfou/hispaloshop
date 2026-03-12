import useSWR from 'swr';
import { api } from '../lib/api';

function normalizeStoresResponse(data) {
  if (Array.isArray(data)) {
    return {
      stores: data,
      pagination: undefined,
    };
  }

  return {
    stores: Array.isArray(data?.stores) ? data.stores : [],
    pagination: data?.pagination,
  };
}

export function useStores(params) {
  const { data, error, isLoading } = useSWR(
    ['/stores', params],
    () => api.getStores(params),
    {
      revalidateOnFocus: false,
    }
  );

  const normalized = normalizeStoresResponse(data);

  return {
    stores: normalized.stores,
    pagination: normalized.pagination,
    isLoading,
    error,
  };
}

export function useStore(slug) {
  const { data, error, isLoading } = useSWR(
    slug ? `/store/${slug}` : null,
    () => api.getStore(slug),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    store: data,
    isLoading,
    error,
  };
}

export default useStores;
