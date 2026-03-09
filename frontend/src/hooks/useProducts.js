import useSWR from 'swr';
import { api } from '../lib/api';
import { useLocale } from '../context/LocaleContext';

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

  const { data, error, isLoading } = useSWR(cacheKey, () => api.getProducts(mergedFilters), {
    revalidateOnFocus: false,
  });

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

  const { data, error, isLoading } = useSWR(
    productIdOrSlug ? ['/products', productIdOrSlug, country, language] : null,
    () => api.getProduct(productIdOrSlug, { country, lang: language }),
    { revalidateOnFocus: false },
  );

  return {
    product: data,
    isLoading,
    error,
  };
}
