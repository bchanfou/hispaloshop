import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '../../../context/LocaleContext';
import apiClient from '../../../services/api/client';

export const productKeys = {
  detail: (id, localeKey = 'default') => ['product', id, localeKey],
  related: (id) => ['product', id, 'related'],
  reviews: (id) => ['product', id, 'reviews'],
  certificate: (id, lang = 'default') => ['product', id, 'certificate', lang],
  variants: (id) => ['product', id, 'variants'],
  canReview: (id) => ['product', id, 'can-review'],
  category: (slug) => ['category', slug],
  categories: ['categories'],
  catalog: (filters) => ['products', 'catalog', filters],
  search: (query, filters) => ['products', 'search', query, filters],
  suggestions: (query) => ['search', 'suggestions', query],
  b2b: ['products', 'b2b'],
  b2bProduct: (id) => ['product', id, 'b2b'],
  storeBySeller: (sellerId) => ['store', 'seller', sellerId],
  storeFollow: (slug) => ['store', 'follow', slug],
  wishlist: (id) => ['wishlist', 'product', id],
};

const DEFAULT_PAGE_SIZE = 20;

function getNextCursor(page) {
  return page?.nextCursor ?? page?.next_cursor ?? null;
}

function getPageItems(page) {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.products)) return page.products;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

function getNextPageParam(page, allPages, pageSize = DEFAULT_PAGE_SIZE) {
  const cursor = getNextCursor(page);
  if (cursor) return cursor;
  const hasMoreFlag = page?.has_more ?? page?.hasMore;
  if (typeof hasMoreFlag === 'boolean') {
    return hasMoreFlag ? allPages.length + 1 : undefined;
  }
  const items = getPageItems(page);
  return items.length >= pageSize ? allPages.length + 1 : undefined;
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: () => apiClient.get('/categories'),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCategory(slug) {
  return useQuery({
    queryKey: productKeys.category(slug),
    queryFn: async () => {
      const categories = await apiClient.get('/categories');
      const list = Array.isArray(categories) ? categories : (categories?.categories || []);
      return list.find((category) => category.slug === slug || category.id === slug) || null;
    },
    enabled: Boolean(slug),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCatalog(filters = {}) {
  const { country, language } = useLocale();
  const mergedFilters = {
    country: filters.country || country || 'ES',
    lang: filters.lang || language || 'es',
    ...filters,
  };
  const filterKey = JSON.stringify(mergedFilters);

  return useInfiniteQuery({
    queryKey: productKeys.catalog(filterKey),
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get('/products', {
        params: {
          ...mergedFilters,
          page: typeof pageParam === 'number' ? pageParam : 1,
          cursor: typeof pageParam === 'string' ? pageParam : undefined,
          limit: DEFAULT_PAGE_SIZE,
        },
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => getNextPageParam(lastPage, allPages, DEFAULT_PAGE_SIZE),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(productId, filters = {}) {
  const { country, language } = useLocale();
  const mergedFilters = {
    country: filters.country || country || 'ES',
    lang: filters.lang || language || 'es',
    ...filters,
  };
  const localeKey = JSON.stringify({
    country: mergedFilters.country,
    lang: mergedFilters.lang,
  });

  return useQuery({
    queryKey: productKeys.detail(productId, localeKey),
    queryFn: () =>
      apiClient.get(`/products/${productId}`, {
        params: mergedFilters,
      }),
    enabled: Boolean(productId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useRelatedProducts(productId) {
  return useQuery({
    queryKey: productKeys.related(productId),
    queryFn: async () => {
      try {
        return await apiClient.get(`/discovery/related-products/${productId}`);
      } catch {
        return [];
      }
    },
    enabled: Boolean(productId),
    staleTime: 15 * 60 * 1000,
  });
}

export function useSearchProducts(query, filters = {}) {
  return useInfiniteQuery({
    queryKey: productKeys.search(query, JSON.stringify(filters)),
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get('/discovery/search', {
        params: {
          q: query,
          ...filters,
          page: typeof pageParam === 'number' ? pageParam : 1,
          cursor: typeof pageParam === 'string' ? pageParam : undefined,
          limit: DEFAULT_PAGE_SIZE,
        },
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => getNextPageParam(lastPage, allPages, DEFAULT_PAGE_SIZE),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSearchSuggestions(query) {
  return useQuery({
    queryKey: productKeys.suggestions(query),
    queryFn: async () => {
      try {
        return await apiClient.get('/search/suggestions', {
          params: { q: query },
        });
      } catch {
        const searchData = await apiClient.get('/discovery/search', {
          params: { q: query, limit: 8 },
        });
        const products = Array.isArray(searchData?.products) ? searchData.products : [];
        return products.map((product) => ({
          id: product.product_id || product.id,
          label: product.name,
          type: 'product',
        }));
      }
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
}

export function useProductReviews(productId, sort = 'recent') {
  return useQuery({
    queryKey: [...productKeys.reviews(productId), sort],
    queryFn: () =>
      apiClient.get(`/products/${productId}/reviews`, {
        params: { sort, page: 1, limit: 10 },
      }),
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, rating, title, comment, images }) =>
      apiClient.post(`/products/${productId}/reviews`, {
        product_id: productId,
        rating,
        title: title || undefined,
        comment,
        images: images || [],
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: productKeys.reviews(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: productKeys.canReview(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: ['product', variables.productId],
      });
    },
  });
}

export function useHelpfulVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, reviewId }) =>
      apiClient.post(`/products/${productId}/reviews/${reviewId}/helpful`, {}),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: productKeys.reviews(variables.productId),
      });
    },
  });
}

export function useProducerResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, reviewId, response }) =>
      apiClient.post(`/products/${productId}/reviews/${reviewId}/respond`, { response }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: productKeys.reviews(variables.productId),
      });
    },
  });
}

export function useB2BCatalog() {
  return useInfiniteQuery({
    queryKey: productKeys.b2b,
    queryFn: async ({ pageParam = 1 }) => {
      try {
        return await apiClient.get('/products/my-b2b-catalog', {
          params: {
            page: typeof pageParam === 'number' ? pageParam : 1,
            cursor: typeof pageParam === 'string' ? pageParam : undefined,
            limit: DEFAULT_PAGE_SIZE,
          },
        });
      } catch {
        return { items: [], has_more: false, next_cursor: null };
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => getNextPageParam(lastPage, allPages, DEFAULT_PAGE_SIZE),
    staleTime: 10 * 60 * 1000,
  });
}

export function useB2BProductInfo(productId) {
  return useQuery({
    queryKey: productKeys.b2bProduct(productId),
    queryFn: async () => {
      try {
        return await apiClient.get(`/products/${productId}/signals`);
      } catch {
        return null;
      }
    },
    enabled: Boolean(productId),
  });
}

export function useProductCertificate(productId, lang = 'es') {
  return useQuery({
    queryKey: productKeys.certificate(productId, lang),
    queryFn: () =>
      apiClient.get(`/certificates/product/${productId}`, {
        params: { lang },
      }),
    enabled: Boolean(productId),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

export function useProductVariants(productId) {
  return useQuery({
    queryKey: productKeys.variants(productId),
    queryFn: () => apiClient.get(`/products/${productId}/variants`),
    enabled: Boolean(productId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCanReviewProduct(productId, enabled = true) {
  return useQuery({
    queryKey: productKeys.canReview(productId),
    queryFn: () => apiClient.get(`/reviews/can-review/${productId}`),
    enabled: Boolean(productId) && enabled,
    retry: false,
    staleTime: 30 * 1000,
  });
}

export function useSubmitProductReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, orderId, rating, title, comment, images }) =>
      apiClient.post(`/products/${productId}/reviews`, {
        product_id: productId,
        order_id: orderId,
        rating,
        title: title || undefined,
        comment,
        images: images || [],
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: productKeys.reviews(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: productKeys.canReview(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: ['product', variables.productId],
      });
    },
  });
}

export function useStoreBySellerId(sellerId) {
  return useQuery({
    queryKey: productKeys.storeBySeller(sellerId),
    queryFn: async () => {
      const stores = await apiClient.get('/stores', {
        params: { seller_id: sellerId },
      });
      return Array.isArray(stores) && stores.length > 0 ? stores[0] : null;
    },
    enabled: Boolean(sellerId),
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
}

export function useStoreFollowStatus(storeSlug, enabled = true) {
  return useQuery({
    queryKey: productKeys.storeFollow(storeSlug),
    queryFn: () => apiClient.get(`/store/${storeSlug}/following`),
    enabled: Boolean(storeSlug) && enabled,
    retry: false,
    staleTime: 30 * 1000,
  });
}

export function useToggleStoreFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeSlug, following }) =>
      following
        ? apiClient.delete(`/store/${storeSlug}/follow`)
        : apiClient.post(`/store/${storeSlug}/follow`, {}),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: productKeys.storeFollow(variables.storeSlug),
      });
      queryClient.invalidateQueries({ queryKey: ['store'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useWishlistStatus(productId, enabled = true) {
  return useQuery({
    queryKey: productKeys.wishlist(productId),
    queryFn: () => apiClient.get(`/wishlist/check/${productId}`),
    enabled: Boolean(productId) && enabled,
    retry: false,
    staleTime: 30 * 1000,
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, inWishlist }) =>
      inWishlist
        ? apiClient.delete(`/wishlist/${productId}`)
        : apiClient.post(`/wishlist/${productId}`, {}),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: productKeys.wishlist(variables.productId),
      });
    },
  });
}
