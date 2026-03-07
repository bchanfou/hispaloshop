/**
 * Hooks para Importador / B2B
 * Catálogo B2B, RFQ, negociaciones, pedidos B2B
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const IMPORTER_KEYS = {
  catalog: ['importer', 'catalog'],
  inquiries: ['importer', 'inquiries'],
  negotiations: ['importer', 'negotiations'],
  orders: ['importer', 'orders'],
  documents: ['importer', 'documents'],
};

/**
 * Hook para catálogo B2B
 */
export function useB2BCatalog() {
  return useQuery({
    queryKey: IMPORTER_KEYS.catalog,
    queryFn: () => api.get('/importer/catalog'),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para solicitar información (RFQ)
 */
export function useCreateInquiry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, quantity, requirements }) => 
      api.post('/importer/inquiries', {
        product_id: productId,
        quantity,
        requirements,
      }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTER_KEYS.inquiries });
    },
  });
}

/**
 * Hook para inquiries del importador
 */
export function useInquiries() {
  return useQuery({
    queryKey: IMPORTER_KEYS.inquiries,
    queryFn: () => api.get('/importer/inquiries'),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para negociaciones activas
 */
export function useNegotiations() {
  return useQuery({
    queryKey: IMPORTER_KEYS.negotiations,
    queryFn: () => api.get('/importer/negotiations'),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 60000, // Refetch cada minuto
  });
}

/**
 * Hook para iniciar negociación
 */
export function useStartNegotiation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ producerId, productId, initialOffer }) => 
      api.post('/importer/negotiations', {
        producer_id: producerId,
        product_id: productId,
        initial_offer: initialOffer,
      }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTER_KEYS.negotiations });
    },
  });
}

/**
 * Hook para responder a contraoferta
 */
export function useRespondNegotiation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ negotiationId, response, counterOffer }) => 
      api.post(`/importer/negotiations/${negotiationId}/respond`, {
        response,
        counter_offer: counterOffer,
      }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORTER_KEYS.negotiations });
    },
  });
}

/**
 * Hook para pedidos B2B
 */
export function useB2BOrders() {
  return useQuery({
    queryKey: IMPORTER_KEYS.orders,
    queryFn: () => api.get('/importer/orders'),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para documentación de exportación
 */
export function useExporterDocuments() {
  return useQuery({
    queryKey: IMPORTER_KEYS.documents,
    queryFn: () => api.get('/importer/documents'),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para descargar documento
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: (documentId) => 
      api.get(`/importer/documents/${documentId}/download`),
  });
}
