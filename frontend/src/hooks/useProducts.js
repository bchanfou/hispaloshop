/**
 * @deprecated Legacy SWR product hooks.
 * Prefer `features/products/queries` for React Query-based fetching.
 */

import useSWR from 'swr';
import apiClient from '../services/api/client';
import { useLocale } from '../context/LocaleContext';

function buildProductParams(filters) {
  const params = {};
  if (filters.country)       params.country        = filters.country;
  if (filters.category)      params.category       = filters.category;
  if (filters.search)        params.search         = filters.search;
  if (filters.sort)          params.sort           = filters.sort;
  if (filters.min_price != null) params.min_price  = filters.min_price;
  if (filters.max_price != null) params.max_price  = filters.max_price;
  if (filters.certifications) params.certifications = filters.certifications;
  if (filters.seller_id)     params.seller_id      = filters.seller_id;
  if (filters.featured_only) params.featured_only  = filters.featured_only;
  if (filters.lang)          params.lang           = filters.lang;
  if (filters.limit)         params.limit          = filters.limit;
  if (filters.cursor)        params.cursor         = filters.cursor;
  return params;
}

export function useProducts(filters = {}) {
  const { country, language } = useLocale();

  // Merge caller's filters with the active locale country/lang so every
  // catalog fetch is automatically geo-filtered without the caller having
  // to remember to pass it.
  const mergedFilters = {
    country: filters.country || country || 'ES',
    lang: filters.lang || language || 'es',
    ...filters,
  };

  const cacheKey = ['/products', JSON.stringify(mergedFilters)];

  const { data, error, isLoading } = useSWR(
    cacheKey,
    () => apiClient.get('/products', { params: buildProductParams(mergedFilters) }),
    { revalidateOnFocus: false },
  );

  return {
    products: data?.items || data?.products || (Array.isArray(data) ? data : []),
    pagination: {
      nextCursor: data?.next_cursor,
      hasMore: data?.has_more,
      total: data?.total_count || data?.total,
    },
    isLoading,
    error,
  };
}

export function useProduct(productIdOrSlug) {
  const { country, language } = useLocale();

  const params = {};
  if (country) params.country = country;
  if (language) params.lang = language;

  const { data, error, isLoading } = useSWR(
    productIdOrSlug ? ['/products', productIdOrSlug, country, language] : null,
    () => apiClient.get(`/products/${productIdOrSlug}`, { params }),
    { revalidateOnFocus: false },
  );

  return {
    product: data,
    isLoading,
    error,
  };
}
