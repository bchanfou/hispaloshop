/**
 * AuthProvider - Contexto de autenticación
 * Gestiona estado de sesión, login/logout y tokens
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useCurrentUser, useLogin, useLogout, useRegister } from '../hooks/api';
import { getToken, isTokenExpired, removeToken } from '../lib/auth';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  
  // Query para obtener usuario actual
  const { 
    data: user, 
    isLoading: isLoadingUser, 
    error: userError 
  } = useCurrentUser();

  // Mutations
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  // Verificar token al iniciar
  useEffect(() => {
    const token = getToken();
    if (token && isTokenExpired(token)) {
      removeToken();
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(!!token);
    }
  }, []);

  // Conectar WebSocket cuando hay sesión
  useEffect(() => {
    if (isAuthenticated && user) {
      api.connectWebSocket();
    }
    return () => {
      if (!isAuthenticated) {
        api.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  const login = useCallback(async (credentials) => {
    const result = await loginMutation.mutateAsync(credentials);
    setIsAuthenticated(true);
    return result;
  }, [loginMutation]);

  const register = useCallback(async (userData) => {
    const result = await registerMutation.mutateAsync(userData);
    setIsAuthenticated(true);
    return result;
  }, [registerMutation]);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    setIsAuthenticated(false);
  }, [logoutMutation]);

  const value = {
    user: user?.user || null,
    isAuthenticated,
    isLoading: isLoadingUser || loginMutation.isPending || registerMutation.isPending,
    error: userError || loginMutation.error || registerMutation.error,
    login,
    register,
    logout,
    // Helper para verificar rol
    hasRole: (role) => user?.user?.role === role,
    // Helper para verificar múltiples roles
    hasAnyRole: (roles) => roles.includes(user?.user?.role),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthProvider;
