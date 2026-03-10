/**
 * Hook de autenticacion
 * Login, registro, logout y gestion de sesion
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api as realtimeApi } from '../../lib/api';
import { getToken, removeToken, setToken, setUser } from '../../lib/auth';
import apiClient from '../../services/api/client';

const AUTH_KEYS = {
  user: ['auth', 'user'],
  me: ['auth', 'me'],
};

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: () => apiClient.get('/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: !!getToken(),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }) =>
      apiClient.post('/auth/login', { email, password }),
    onSuccess: (data) => {
      setToken(data.access_token, data.refresh_token);
      setUser(data.user);
      queryClient.setQueryData(AUTH_KEYS.me, data.user);
      realtimeApi.connectWebSocket();
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData) => apiClient.post('/auth/register', userData),
    onSuccess: (data) => {
      setToken(data.tokens.access, data.tokens.refresh);
      setUser(data.user);
      queryClient.setQueryData(AUTH_KEYS.me, data.user);
      realtimeApi.connectWebSocket();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout', {}),
    onSuccess: () => {
      removeToken();
      realtimeApi.disconnect();
      queryClient.clear();
      window.location.href = '/login';
    },
    onError: () => {
      removeToken();
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileData) => apiClient.put('/auth/me', profileData),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_KEYS.me, data.user);
      setUser(data.user);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email) => apiClient.post('/auth/forgot-password', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }) =>
      apiClient.post('/auth/reset-password', { token, new_password: newPassword }),
  });
}

export function useOAuthLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, token }) =>
      apiClient.post(`/auth/oauth/${provider}`, { token }),
    onSuccess: (data) => {
      setToken(data.access_token, data.refresh_token);
      setUser(data.user);
      queryClient.setQueryData(AUTH_KEYS.me, data.user);
      realtimeApi.connectWebSocket();
    },
  });
}

export function useVerifyDocument() {
  return useMutation({
    mutationFn: (formData) =>
      apiClient.post('/auth/verify-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  });
}

export function useVerificationStatus() {
  return useQuery({
    queryKey: ['auth', 'verification'],
    queryFn: () => apiClient.get('/auth/verification-status'),
    enabled: false,
  });
}
