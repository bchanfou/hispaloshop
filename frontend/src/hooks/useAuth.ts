import useSWR from 'swr';
import { api } from '@/lib/api';
import { useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'customer' | 'producer' | 'influencer' | 'admin' | 'importer';
  avatar_url?: string;
  is_active?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  country?: string;
}

// Hook para login (mutación)
export function useLogin() {
  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await api.login(credentials.email, credentials.password);
    if (response?.access_token) {
      api.setToken(response.access_token);
    }
    return response;
  }, []);

  return { login };
}

// Hook para registro (mutación)
export function useRegister() {
  const register = useCallback(async (data: RegisterData) => {
    const response = await api.register(data);
    if (response?.access_token) {
      api.setToken(response.access_token);
    }
    return response;
  }, []);

  return { register };
}

// Hook para obtener usuario actual
export function useCurrentUser() {
  const { data, error, isLoading, mutate } = useSWR(
    'auth/me',
    () => api.getMe(),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const logout = useCallback(() => {
    api.clearToken();
    mutate(undefined, false);
    window.location.href = '/login';
  }, [mutate]);

  return {
    user: data,
    isLoading,
    error,
    mutate,
    logout,
  };
}

// Hook para verificar si está autenticado
export function useIsAuthenticated() {
  const { user, isLoading } = useCurrentUser();
  return { isAuthenticated: !!user, isLoading };
}
