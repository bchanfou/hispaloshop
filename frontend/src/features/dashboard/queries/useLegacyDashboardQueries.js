import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const legacyDashboardKeys = {
  consumer: ['legacy-dashboard', 'consumer'],
  producer: ['legacy-dashboard', 'producer'],
  importer: ['legacy-dashboard', 'importer'],
};

export function useLegacyConsumerDashboard(enabled = true) {
  return useQuery({
    queryKey: legacyDashboardKeys.consumer,
    enabled,
    queryFn: async () => {
      const [ordersData, wishlistData] = await Promise.all([
        apiClient.get('/orders', { params: { limit: 5 } }),
        apiClient.get('/wishlist').catch(() => ({ items: [] })),
      ]);

      return {
        orders: ordersData,
        wishlist: wishlistData,
      };
    },
  });
}

export function useLegacyProducerDashboard(enabled = true) {
  return useQuery({
    queryKey: legacyDashboardKeys.producer,
    enabled,
    queryFn: async () => {
      const [statsData, ordersData, productsData] = await Promise.all([
        apiClient.get('/producer/stats').catch(() => null),
        apiClient.get('/producer/orders', { params: { status: 'pending' } }),
        apiClient.get('/producer/products').catch(() => ({ products: [] })),
      ]);

      return {
        stats: statsData,
        orders: ordersData,
        products: productsData,
      };
    },
  });
}

export function useLegacyImporterDashboard(enabled = true) {
  return useQuery({
    queryKey: legacyDashboardKeys.importer,
    enabled,
    queryFn: async () => {
      const [statsData, ordersData, productsData] = await Promise.all([
        apiClient.get('/importer/stats').catch(() => null),
        apiClient.get('/importer/orders').catch(() => ({ orders: [] })),
        apiClient.get('/importer/products').catch(() => ({ products: [] })),
      ]);

      return {
        stats: statsData,
        orders: ordersData,
        products: productsData,
      };
    },
  });
}
