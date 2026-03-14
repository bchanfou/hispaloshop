import useSWR from 'swr';
import apiClient from '../services/api/client';

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
    () => apiClient.get('/stores', { params }),
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
    () => apiClient.get(`/store/${slug}`),
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
