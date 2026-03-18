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
    queryFn: ({ pageParam }) => 
      apiClient.get('/notifications', { params: { cursor: pageParam, limit: 20 } }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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
    mutationFn: (fcmToken) => 
      apiClient.post('/notifications/push/register', { token: fcmToken }),
  });
}

/**
 * Hook para desregistrar token FCM
 */
export function useUnregisterPushToken() {
  return useMutation({
    mutationFn: () => apiClient.post('/notifications/push/unregister'),
  });
}

/**
 * Hook para probar notificación push
 */
export function useTestPushNotification() {
  return useMutation({
    mutationFn: () => apiClient.post('/notifications/push/test'),
  });
}
