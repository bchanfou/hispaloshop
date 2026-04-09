/**
 * Hooks para Sistema de Notificaciones
 * Push nativas, in-app y preferencias
 */

import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api/client';

const NOTIF_KEYS = {
  unread: ['notifications', 'unread'],
  all: ['notifications', 'all'],
  preferences: ['notifications', 'preferences'],
};

// ==========================================
// NOTIFICACIONES
// ==========================================

/**
 * Hook para notificaciones no leídas (badge count)
 * Polls every 30s, pauses when tab is not visible.
 */
export function useUnreadNotifications({ enabled = true } = {}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return useQuery({
    queryKey: NOTIF_KEYS.unread,
    queryFn: () => apiClient.get('/notifications/unread-count'),
    staleTime: 30 * 1000,
    refetchInterval: visible && enabled ? 30 * 1000 : false,
    enabled,
  });
}

/**
 * Hook para todas las notificaciones
 */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: NOTIF_KEYS.all,
    queryFn: ({ pageParam = 1 }) => 
      apiClient.get('/notifications', { params: { page: pageParam, limit: 20 } }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage?.has_more ? (lastPage?.page || 1) + 1 : undefined),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook para marcar como leída
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) =>
      apiClient.post(`/notifications/${notificationId}/read`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.unread });
      queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.all });
    },
  });
}

/**
 * Hook para marcar un lote de notificaciones como leídas en una sola request
 */
export function useMarkBatchAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationIds) =>
      apiClient.post('/notifications/mark-batch-read', { notification_ids: notificationIds }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.unread });
      queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.all });
    },
  });
}

/**
 * Hook para marcar todas como leídas
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.post('/notifications/mark-all-read'),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.unread });
      queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.all });
    },
  });
}

/**
 * Hook para eliminar notificación
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId) => 
      apiClient.delete(`/notifications/${notificationId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.unread });
    },
  });
}

// ==========================================
// PREFERENCIAS
// ==========================================

/**
 * Hook para preferencias de notificación
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: NOTIF_KEYS.preferences,
    queryFn: () => apiClient.get('/notifications/preferences'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para actualizar preferencias
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (preferences) => 
      apiClient.put('/notifications/preferences', preferences),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.preferences });
    },
  });
}

// ==========================================
// PUSH NOTIFICATIONS (Firebase)
// ==========================================

/**
 * Hook para registrar token FCM
 */
export function useRegisterPushToken() {
  return useMutation({
    mutationFn: ({ subscription }) => 
      apiClient.post('/push/subscribe', { subscription }),
  });
}

/**
 * Hook para desregistrar token FCM
 */
export function useUnregisterPushToken() {
  return useMutation({
    mutationFn: ({ endpoint } = {}) => apiClient.post('/push/unsubscribe', endpoint ? { endpoint } : {}),
  });
}

/**
 * Hook para probar notificación push
 */
export function useTestPushNotification() {
  return useMutation({
    mutationFn: () => apiClient.post('/notifications/admin/send', {
      user_ids: [],
      title: 'Test notification',
      body: 'Manual push test from frontend',
    }),
  });
}
