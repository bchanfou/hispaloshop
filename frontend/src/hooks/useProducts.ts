import useSWR from 'swr';
import { api } from '@/lib/api';

export function useProducts(filters?: Record<string, string>) {
  const { data, error, isLoading } = useSWR(['/products', filters], ([, params]) => api.getProducts(params), {
    revalidateOnFocus: false,
  });

  return {
    products: data?.items || [],
    pagination: {
      nextCursor: data?.next_cursor,
      hasMore: data?.has_more,
      total: data?.total_count,
    },
    isLoading,
    error,
  };
}

export function useProduct(slug: string) {
  const { data, error, isLoading } = useSWR(slug ? `/products/${slug}` : null, () => api.getProduct(slug), {
    revalidateOnFocus: false,
  });

  return {
    product: data,
    isLoading,
    error,
  };
}
