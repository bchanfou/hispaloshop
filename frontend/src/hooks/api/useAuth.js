/**
 * Hook de autenticación
 * Login, registro, logout y gestión de sesión
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { setToken, removeToken, setUser, getUser } from '../../lib/auth';

// Keys para cache
const AUTH_KEYS = {
  user: ['auth', 'user'],
  me: ['auth', 'me'],
};

/**
 * Hook para obtener usuario actual
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: () => api.get('/auth/me'),
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false,
    // Si no hay token, no hacer la request
    enabled: !!localStorage.getItem('hispalo_access_token'),
  });
}

/**
 * Hook de login
 */
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ email, password }) => 
      api.post('/auth/login', { email, password }),
    
    onSuccess: (data) => {
      // Guardar tokens
      setToken(data.access_token, data.refresh_token);
      setUser(data.user);
      
      // Actualizar cache
      queryClient.setQueryData(AUTH_KEYS.me, data.user);
      
      // Conectar WebSocket
      api.connectWebSocket();
    },
  });
}

/**
 * Hook de registro
 */
export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData) => api.post('/auth/register', userData),
    
    onSuccess: (data) => {
      setToken(data.tokens.access, data.tokens.refresh);
      setUser(data.user);
      queryClient.setQueryData(AUTH_KEYS.me, data.user);
      api.connectWebSocket();
    },
  });
}

/**
 * Hook de logout
 */
export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    
    onSuccess: () => {
      // Limpiar todo
      removeToken();
      api.disconnect();
      queryClient.clear();
      
      // Redireccionar a login
      window.location.href = '/login';
    },
    
    onError: () => {
      // Aunque falle, limpiar local
      removeToken();
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}

/**
 * Hook para actualizar perfil
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (profileData) => api.put('/auth/me', profileData),
    
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_KEYS.me, data.user);
      setUser(data.user);
    },
  });
}

/**
 * Hook para recuperar contraseña
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email) => api.post('/auth/forgot-password', { email }),
  });
}

/**
 * Hook para resetear contraseña
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }) => 
      api.post('/auth/reset-password', { token, new_password: newPassword }),
  });
}

/**
 * Hook para OAuth (Google, Apple, Facebook)
 */
export function useOAuthLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ provider, token }) => 
      api.post(`/auth/oauth/${provider}`, { token }),
    
    onSuccess: (data) => {
      setToken(data.access_token, data.refresh_token);
      setUser(data.user);
      queryClient.setQueryData(AUTH_KEYS.me, data.user);
      api.connectWebSocket();
    },
  });
}

/**
 * Hook para verificar documentos (productores/importadores)
 */
export function useVerifyDocument() {
  return useMutation({
    mutationFn: (formData) => api.post('/auth/verify-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  });
}

/**
 * Hook para obtener estado de verificación
 */
export function useVerificationStatus() {
  return useQuery({
    queryKey: ['auth', 'verification'],
    queryFn: () => api.get('/auth/verification-status'),
    enabled: false, // Solo cuando se solicite
  });
}
