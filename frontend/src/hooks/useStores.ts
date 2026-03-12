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

function normalizeStoresResponse(data: unknown): { stores: Store[]; pagination?: unknown } {
  if (Array.isArray(data)) {
    return {
      stores: data as Store[],
      pagination: undefined,
    };
  }

  const stores = data && typeof data === 'object' && Array.isArray((data as { stores?: Store[] }).stores)
    ? (data as { stores: Store[] }).stores
    : [];

  const pagination = data && typeof data === 'object'
    ? (data as { pagination?: unknown }).pagination
    : undefined;

  return { stores, pagination };
}

// Hook para obtener listado de tiendas
export function useStores(params?: { type?: string; page?: number }) {
  const { data, error, isLoading } = useSWR(
    ['stores', params],
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
    () => api.get(`/store/${slug}/products`),
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
