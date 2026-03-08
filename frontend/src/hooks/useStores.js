import useSWR from 'swr';
import { api } from '../lib/api';

export function useStores(params) {
  const { data, error, isLoading } = useSWR(
    ['/stores', params],
    () => api.getStores(params),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    stores: data?.stores || [],
    pagination: data?.pagination,
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
