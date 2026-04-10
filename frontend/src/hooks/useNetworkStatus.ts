/**
 * Hook de estado de red robusto
 * Detecta conectividad real haciendo ping al backend, no solo navigator.onLine
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiOrigin } from '../utils/api';

// Usar /health directamente (no /api/health) - el endpoint health está en la raíz
const API_PING_URL = `${getApiOrigin()}/health`;
const PING_INTERVAL = 30000; // 30 segundos
const PING_TIMEOUT = 5000; // 5 segundos timeout
const RETRY_DELAY = 2000; // 2 segundos entre reintentos
const MAX_RETRIES = 3;

interface NetworkState {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  wasOffline: boolean;
  connectionType: string;
}

/**
 * Realiza un ping real al backend para verificar conectividad
 * Con reintentos exponenciales
 */
async function pingBackend(retries = 0): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);
    
    // Intentar con HEAD primero (más ligero), luego GET si no es concluyente
    let response;
    try {
      response = await fetch(API_PING_URL, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'X-Network-Check': 'true' }
      });
      // Aun si HEAD devuelve 4xx, hay conectividad real con el backend/origen.
      // Solo tratamos 5xx como fallo de disponibilidad del servidor.
      if (response && response.status < 500) {
        clearTimeout(timeoutId);
        if (process.env.NODE_ENV === 'development') {
          console.log('[NetworkStatus] HEAD reachable:', API_PING_URL, response.status);
        }
        return true;
      }
    } catch (headError) {
      // Si HEAD falla a nivel de red/CORS/abort, intentar con GET
    }

    if (!response || response.status >= 500) {
      response = await fetch(API_PING_URL, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'X-Network-Check': 'true' }
      });
    }
    
    clearTimeout(timeoutId);
    
    // Log para debugging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('[NetworkStatus] Ping success:', API_PING_URL, response.status);
    }
    
    // 2xx-4xx => hay conectividad real. 5xx => servidor temporalmente no disponible.
    return response.status < 500;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NetworkStatus] Ping failed:', API_PING_URL, error);
    }
    
    if (retries < MAX_RETRIES) {
      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)));
      return pingBackend(retries + 1);
    }
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

    // Evento personalizado: cuando el feed u otro componente carga datos exitosamente
    const handleDataLoaded = () => {
      // Si cargamos datos, definitivamente estamos online
      setState(prev => {
        if (!prev.isOnline) {
          return {
            ...prev,
            isOnline: true,
            wasOffline: prev.wasOffline,
            lastChecked: new Date()
          };
        }
        return prev;
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app:data-loaded', handleDataLoaded);
    
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
      window.removeEventListener('app:data-loaded', handleDataLoaded);
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
