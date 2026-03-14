import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';
import { resolveApiAssetUrl } from '../../../utils/api';

export const producerKeys = {
  products: ['producer', 'products'],
};

export function useProducerProductsQuery() {
  return useQuery({
    queryKey: producerKeys.products,
    queryFn: () => apiClient.get('/producer/products'),
  });
}

export function useCreateProducerProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => apiClient.post('/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: producerKeys.products });
    },
  });
}

export function useUpdateProducerProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, payload }) => apiClient.put(`/products/${productId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: producerKeys.products });
    },
  });
}

export function useUpdateProducerStockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, stock }) =>
      apiClient.put(`/producer/products/${productId}/stock`, {
        stock: parseInt(stock, 10),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: producerKeys.products });
    },
  });
}

export function useUploadProducerImageMutation() {
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiClient.post('/upload/product-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const rawUrl = data.url || data.path || data.image_url;
      if (!rawUrl) throw new Error('Upload succeeded but server returned no URL');
      return resolveApiAssetUrl(rawUrl);
    },
  });
}
