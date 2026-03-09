/**
 * Hooks para Productos y Catálogo
 * Búsqueda, filtros, reviews
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useLocale } from '../../context/LocaleContext';

const PRODUCT_KEYS = {
  detail: (id) => ['product', id],
  related: (id) => ['product', id, 'related'],
  reviews: (id) => ['product', id, 'reviews'],
  categories: ['categories'],
  catalog: (filters) => ['products', 'catalog', filters],
  search: (query) => ['products', 'search', query],
};

/**
 * Hook para categorías
 */
export function useCategories() {
  return useQuery({
    queryKey: PRODUCT_KEYS.categories,
    queryFn: () => api.get('/categories'),
    staleTime: 30 * 60 * 1000, // 30 min - no cambian mucho
  });
}

/**
 * Hook para detalle de categoría
 */
export function useCategory(slug) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => api.get(`/categories/${slug}`),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para catálogo con filtros (geo-filtered by user's active country)
 */
export function useCatalog(filters = {}) {
  const { country, language } = useLocale();
  const merged = {
    country: filters.country || country || 'ES',
    lang: filters.lang || language || 'es',
    ...filters,
  };
  const filterKey = JSON.stringify(merged);

  return useInfiniteQuery({
    queryKey: PRODUCT_KEYS.catalog(filterKey),
    queryFn: ({ pageParam }) =>
      api.get('/products', {
        ...merged,
        cursor: pageParam,
        limit: 20
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para detalle de producto
 */
export function useProduct(productId) {
  return useQuery({
    queryKey: PRODUCT_KEYS.detail(productId),
    queryFn: () => api.get(`/products/${productId}`),
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para productos relacionados
 */
export function useRelatedProducts(productId) {
  return useQuery({
    queryKey: PRODUCT_KEYS.related(productId),
    queryFn: () => api.get(`/products/${productId}/related`),
    enabled: !!productId,
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Hook para búsqueda de productos
 */
export function useSearchProducts(query, filters = {}) {
  return useInfiniteQuery({
    queryKey: PRODUCT_KEYS.search(query + JSON.stringify(filters)),
    queryFn: ({ pageParam }) => 
      api.get('/search', { 
        q: query, 
        ...filters,
        cursor: pageParam, 
        limit: 20 
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: query.length >= 2, // Buscar desde 2 caracteres
    staleTime: 2 * 60 * 1000, // Cache corto para búsqueda
  });
}

/**
 * Hook para sugerencias de búsqueda (autocomplete)
 */
export function useSearchSuggestions(query) {
  return useQuery({
    queryKey: ['search', 'suggestions', query],
    queryFn: () => api.get('/search/suggestions', { q: query }),
    enabled: query.length >= 2,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para reviews de producto
 */
export function useProductReviews(productId) {
  return useInfiniteQuery({
    queryKey: PRODUCT_KEYS.reviews(productId),
    queryFn: ({ pageParam }) => 
      api.get(`/products/${productId}/reviews`, { 
        cursor: pageParam, 
        limit: 10 
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para añadir review
 */
export function useAddReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, rating, comment, images }) => 
      api.post(`/products/${productId}/reviews`, { 
        rating, 
        comment, 
        images 
      }),
    
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: PRODUCT_KEYS.reviews(variables.productId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: PRODUCT_KEYS.detail(variables.productId) 
      });
    },
  });
}

/**
 * Hook para catálogo B2B (importadores)
 */
export function useB2BCatalog() {
  return useInfiniteQuery({
    queryKey: ['products', 'b2b'],
    queryFn: ({ pageParam }) => 
      api.get('/products/b2b', { cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para MOQ y condiciones B2B
 */
export function useB2BProductInfo(productId) {
  return useQuery({
    queryKey: ['product', productId, 'b2b'],
    queryFn: () => api.get(`/products/b2b/${productId}/moq`),
    enabled: !!productId,
  });
}
