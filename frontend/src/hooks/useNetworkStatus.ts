/**
 * Hook de estado de red robusto
 * Detecta conectividad real haciendo ping al backend, no solo navigator.onLine
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl } from '../utils/api';

const API_PING_URL = `${getApiUrl()}/health`;
const PING_INTERVAL = 30000; // 30 segundos
const PING_TIMEOUT = 5000; // 5 segundos timeout

interface NetworkState {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  wasOffline: boolean;
  connectionType: string;
}

/**
 * Realiza un ping real al backend para verificar conectividad
 */
async function pingBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);
    
    const response = await fetch(API_PING_URL, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'X-Network-Check': 'true' }
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Hook para monitorear estado real de red
 */
export function useNetworkStatus() {
  const [state, setState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    isChecking: false,
    lastChecked: null,
    wasOffline: false,
    connectionType: (navigator as any).connection?.effectiveType || 'unknown'
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  /**
   * Verifica conectividad real con el backend
   */
  const checkConnectivity = useCallback(async (silent = false) => {
    if (isCheckingRef.current) return state.isOnline;
    
    isCheckingRef.current = true;
    if (!silent) {
      setState(prev => ({ ...prev, isChecking: true }));
    }

    try {
      const isReachable = await pingBackend();
      const connectionType = (navigator as any).connection?.effectiveType || 'unknown';
      
      setState(prev => {
        const wentOnline = !prev.isOnline && isReachable;
        const wentOffline = prev.isOnline && !isReachable;
        
        return {
          isOnline: isReachable,
          isChecking: false,
          lastChecked: new Date(),
          wasOffline: wentOffline || (prev.wasOffline && !wentOnline),
          connectionType
        };
      });
      
      return isReachable;
    } catch {
      setState(prev => ({
        ...prev,
        isOnline: false,
        isChecking: false,
        lastChecked: new Date()
      }));
      return false;
    } finally {
      isCheckingRef.current = false;
    }
  }, [state.isOnline]);

  /**
   * Marca que el usuario fue notificado del estado offline
   */
  const acknowledgeOffline = useCallback(() => {
    setState(prev => ({ ...prev, wasOffline: false }));
  }, []);

  useEffect(() => {
    // Verificación inicial
    checkConnectivity();

    // Event listeners del navegador
    const handleOnline = () => {
      //navigator.onLine es poco confiable, verificamos con el backend
      checkConnectivity(true);
    };
    
    const handleOffline = () => {
      setState(prev => ({ 
        ...prev, 
        isOnline: false,
        wasOffline: true 
      }));
    };

    const handleConnectionChange = () => {
      const conn = (navigator as any).connection;
      if (conn) {
        setState(prev => ({
          ...prev,
          connectionType: conn.effectiveType || 'unknown'
        }));
      }
      checkConnectivity(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', handleConnectionChange);
    }

    // Intervalo de verificación periódica
    intervalRef.current = setInterval(() => {
      checkConnectivity(true);
    }, PING_INTERVAL);

    // Verificar cuando la app vuelve a primer plano
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnectivity(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', handleConnectionChange);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkConnectivity]);

  return {
    ...state,
    checkConnectivity,
    acknowledgeOffline
  };
}

export default useNetworkStatus;
