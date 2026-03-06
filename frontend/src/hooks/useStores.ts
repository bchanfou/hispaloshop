import useSWR from 'swr';
import { api } from '@/lib/api';

export interface Store {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logo?: string;
  hero_image?: string;
  location?: string;
  rating?: number;
  review_count?: number;
  follower_count?: number;
  product_count?: number;
  verified?: boolean;
  store_type?: 'producer' | 'importer';
}

// Hook para obtener listado de tiendas
export function useStores(params?: { type?: string; page?: number }) {
  const queryString = new URLSearchParams();
  if (params?.type) queryString.append('type', params.type);
  if (params?.page) queryString.append('page', params.page.toString());

  const { data, error, isLoading } = useSWR(
    ['stores', params],
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

// Hook para obtener una tienda específica
export function useStore(slug: string) {
  const { data, error, isLoading } = useSWR(
    slug ? ['store', slug] : null,
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

// Hook para productos de una tienda
export function useStoreProducts(slug: string) {
  const { data, error, isLoading } = useSWR(
    slug ? ['store-products', slug] : null,
    () => api.getStoreProducts(slug),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    products: data?.products || [],
    isLoading,
    error,
  };
}
