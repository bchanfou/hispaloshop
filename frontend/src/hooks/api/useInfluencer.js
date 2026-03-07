/**
 * Hooks para Influencer / Afiliados
 * Dashboard, earnings, links y performance
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const INFLUENCER_KEYS = {
  dashboard: ['influencer', 'dashboard'],
  earnings: ['influencer', 'earnings'],
  links: ['influencer', 'links'],
  payouts: ['influencer', 'payouts'],
  performance: ['influencer', 'performance'],
};

/**
 * Hook para dashboard de influencer
 */
export function useInfluencerDashboard() {
  return useQuery({
    queryKey: INFLUENCER_KEYS.dashboard,
    queryFn: () => api.get('/influencer/dashboard'),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para historial de ganancias
 */
export function useInfluencerEarnings() {
  return useQuery({
    queryKey: INFLUENCER_KEYS.earnings,
    queryFn: () => api.get('/influencer/earnings'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para links de afiliado generados
 */
export function useAffiliateLinks() {
  return useQuery({
    queryKey: INFLUENCER_KEYS.links,
    queryFn: () => api.get('/influencer/links'),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para generar nuevo link de afiliado
 */
export function useGenerateAffiliateLink() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, customSlug }) => 
      api.post('/influencer/links', { 
        product_id: productId, 
        custom_slug: customSlug 
      }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INFLUENCER_KEYS.links });
    },
  });
}

/**
 * Hook para performance de contenido
 */
export function useContentPerformance() {
  return useQuery({
    queryKey: INFLUENCER_KEYS.performance,
    queryFn: () => api.get('/influencer/content-performance'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para historial de pagos
 */
export function usePayoutHistory() {
  return useQuery({
    queryKey: INFLUENCER_KEYS.payouts,
    queryFn: () => api.get('/influencer/payouts'),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para solicitar pago
 */
export function useRequestPayout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ amount, method }) => 
      api.post('/influencer/payouts/request', { amount, method }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INFLUENCER_KEYS.payouts });
      queryClient.invalidateQueries({ queryKey: INFLUENCER_KEYS.earnings });
    },
  });
}
