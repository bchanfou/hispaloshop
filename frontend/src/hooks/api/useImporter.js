/**
 * Hooks para Importador / B2B
 * Catálogo B2B, RFQ, descubrimiento de productores
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const IMPORTER_KEYS = {
  catalog: ['importer', 'catalog'],
  producers: ['importer', 'producers'],
  inquiries: ['importer', 'inquiries'],
};

/**
 * Hook para catálogo B2B
 */
export function useB2BCatalog(filters = {}) {
  return useQuery({
    queryKey: [...IMPORTER_KEYS.catalog, filters],
    queryFn: () => api.get('/b2b/catalog', filters),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para descubrimiento de productores B2B
 */
export function useB2BProducers(filters = {}) {
  return useQuery({
    queryKey: [...IMPORTER_KEYS.producers, filters],
    queryFn: () => api.get('/b2b/producers', filters),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para solicitar información (RFQ)
 */
export function useCreateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ producerId, productIds, message, targetCountry }) =>
      api.post('/rfq/contact', {
        producer_id: producerId,
        product_ids: productIds,
        message,
        target_country: targetCountry,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTER_KEYS.inquiries });
    },
  });
}

/**
 * Hook para inquiries del importador (GET /rfq/mine)
 */
export function useInquiries() {
  return useQuery({
    queryKey: IMPORTER_KEYS.inquiries,
    queryFn: () => api.get('/rfq/mine'),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para RFQs recibidas por un productor (GET /rfq/received)
 */
export function useReceivedRFQs() {
  return useQuery({
    queryKey: ['producer', 'rfq', 'received'],
    queryFn: () => api.get('/rfq/received'),
    staleTime: 2 * 60 * 1000,
  });
}
