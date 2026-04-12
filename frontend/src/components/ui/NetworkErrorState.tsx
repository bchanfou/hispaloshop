/**
 * Componente de estado de error de red mejorado
 * Muestra mensaje apropiado según el tipo de error y opción de retry
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { offlineCache } from '../../lib/offlineCache';
import { toast } from 'sonner';

interface NetworkErrorStateProps {
  error?: Error | null;
  onRetry?: () => void;
  retryCount?: number;
  showCachedContent?: boolean;
  cachedContent?: React.ReactNode;
}

export function NetworkErrorState({
  error,
  onRetry,
  retryCount = 0,
  showCachedContent = false,
  cachedContent
}: NetworkErrorStateProps) {
  const { isOnline, isChecking, checkConnectivity } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const diagnosticId = (error as any)?.diagnosticId || (error as any)?.feedDiagnostic?.id || null;

  useEffect(() => {
    setHasCache(offlineCache.hasCachedContent());
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Primero verificar conectividad
    const isConnected = await checkConnectivity();
    
    if (isConnected && onRetry) {
      onRetry();
    }
    
    setTimeout(() => setIsRetrying(false), 500);
  };

  const handleCopyDiagnostic = async () => {
    if (!diagnosticId) return;
    try {
      await navigator.clipboard.writeText(String(diagnosticId));
      toast.success('Diagnostico copiado');
    } catch {
      toast.error('No se pudo copiar el diagnostico');
    }
  };

  // B5 (4.5d): classify by status code + navigator.onLine instead of always
  // showing "Sin conexión". This component is used across feeds/dashboards
  // where founder was seeing "Error de conexión" for 401/403/404/500 errors.
  const getErrorMessage = () => {
    const status = (error as any)?.status ?? (error as any)?.response?.status;
    const code = (error as any)?.code;

    if (!isOnline || code === 'ERR_NETWORK') {
      return {
        title: 'Sin conexión',
        description: 'Comprueba tu conexión WiFi o datos móviles e inténtalo de nuevo.',
        icon: WifiOff,
        color: 'text-stone-600',
        bgColor: 'bg-stone-100',
      };
    }

    if (code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
      return {
        title: 'El servidor tarda en responder',
        description: 'La petición ha tardado demasiado. Vuelve a intentarlo en unos segundos.',
        icon: AlertCircle,
        color: 'text-stone-600',
        bgColor: 'bg-stone-100',
      };
    }

    if (status === 401) {
      return {
        title: 'Inicia sesión',
        description: 'Esta acción requiere que hayas iniciado sesión.',
        icon: AlertCircle,
        color: 'text-stone-600',
        bgColor: 'bg-stone-100',
      };
    }

    if (status === 403) {
      return {
        title: 'Sin permisos',
        description: 'No tienes permisos para ver este contenido.',
        icon: AlertCircle,
        color: 'text-stone-600',
        bgColor: 'bg-stone-100',
      };
    }

    if (status === 404) {
      return {
        title: 'No encontrado',
        description: 'El contenido que buscas no existe o ha sido eliminado.',
        icon: AlertCircle,
        color: 'text-stone-600',
        bgColor: 'bg-stone-100',
      };
    }

    if (status && status >= 500) {
      return {
        title: 'Error del servidor',
        description: 'Nuestros servidores están teniendo problemas. Vuelve a intentarlo en unos minutos.',
        icon: AlertCircle,
        color: 'text-stone-600',
        bgColor: 'bg-stone-100',
      };
    }

    return {
      title: 'Error al cargar',
      description: error?.message || 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
      icon: AlertCircle,
      color: 'text-stone-600',
      bgColor: 'bg-stone-100',
    };
  };

  const { title, description, icon: Icon, color, bgColor } = getErrorMessage();

  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center px-6 py-12 text-center"
      >
        <div className={`${bgColor} p-4 rounded-full mb-4`}>
          <Icon className={`w-8 h-8 ${color}`} />
        </div>
        
        <h3 className="text-lg font-semibold text-stone-950 mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-stone-500 max-w-xs mb-6">
          {description}
        </p>

        {diagnosticId && (
          <div className="mb-4">
            <p className="text-[11px] text-stone-400 font-mono">
              Diagnostico: {diagnosticId}
            </p>
            <button
              onClick={handleCopyDiagnostic}
              className="mt-2 text-xs font-medium text-stone-600 underline underline-offset-2"
            >
              Copiar ID
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleRetry}
            disabled={isRetrying || isChecking}
            className="flex items-center justify-center gap-2 w-full bg-stone-950 text-white py-3 rounded-full font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${(isRetrying || isChecking) ? 'animate-spin' : ''}`} />
            {(isRetrying || isChecking) ? 'Reintentando...' : 'Reintentar'}
          </button>

          {retryCount > 0 && (
            <p className="text-xs text-stone-400">
              Intentos: {retryCount}
            </p>
          )}
        </div>

        {/* Indicador de contenido cacheado */}
        {hasCache && (
          <div className="mt-6 flex items-center gap-2 text-xs text-stone-400">
            <Database className="w-3.5 h-3.5" />
            <span>Hay contenido guardado disponible</span>
          </div>
        )}
      </motion.div>

      {/* Mostrar contenido cacheado si existe */}
      {showCachedContent && hasCache && cachedContent && (
        <div className="border-t border-stone-100">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Contenido guardado
            </p>
          </div>
          {cachedContent}
        </div>
      )}
    </div>
  );
}

export default NetworkErrorState;
