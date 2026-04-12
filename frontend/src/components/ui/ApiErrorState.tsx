// @ts-nocheck
// B5 (4.5d): reusable error-state component that distinguishes between
// network, auth, permissions, server, timeout and not-found errors.
// Replaces the generic "Sin conexión" fallback that misled users when the
// real problem was 401/403/5xx/404/timeout.

import React from 'react';
import { motion } from 'framer-motion';
import {
  WifiOff, RefreshCw, AlertCircle, Lock, Ban, Clock, Search,
} from 'lucide-react';

type ApiError = {
  code?: string;
  status?: number;
  message?: string;
  response?: { status?: number; data?: any };
};

interface ApiErrorStateProps {
  error?: ApiError | Error | null;
  onRetry?: () => void;
  /** Optional override for the main title */
  title?: string;
  /** Optional override for the description */
  description?: string;
  /** Optional compact layout (for small cards) */
  compact?: boolean;
}

function classifyError(error: any) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const code = error?.code;
  const status = error?.status ?? error?.response?.status;
  const message = String(error?.message || '').toLowerCase();

  if (offline || code === 'ERR_NETWORK' || (!status && message.includes('network'))) {
    return {
      key: 'offline',
      icon: WifiOff,
      title: 'Sin conexión',
      description: 'Comprueba tu conexión WiFi o datos móviles e inténtalo de nuevo.',
      canRetry: true,
    };
  }

  if (code === 'ECONNABORTED' || message.includes('timeout')) {
    return {
      key: 'timeout',
      icon: Clock,
      title: 'El servidor tarda en responder',
      description: 'La petición ha tardado demasiado. Vuelve a intentarlo en unos segundos.',
      canRetry: true,
    };
  }

  if (status === 401) {
    return {
      key: 'unauthorized',
      icon: Lock,
      title: 'Inicia sesión',
      description: 'Esta acción requiere que hayas iniciado sesión.',
      canRetry: false,
    };
  }

  if (status === 403) {
    return {
      key: 'forbidden',
      icon: Ban,
      title: 'Sin permisos',
      description: 'No tienes permisos para ver este contenido.',
      canRetry: false,
    };
  }

  if (status === 404) {
    return {
      key: 'not_found',
      icon: Search,
      title: 'No encontrado',
      description: 'El contenido que buscas no existe o ha sido eliminado.',
      canRetry: false,
    };
  }

  if (status && status >= 500) {
    return {
      key: 'server',
      icon: AlertCircle,
      title: 'Error del servidor',
      description: 'Nuestros servidores están teniendo problemas. Vuelve a intentarlo en unos minutos.',
      canRetry: true,
    };
  }

  return {
    key: 'generic',
    icon: AlertCircle,
    title: 'Error al cargar',
    description: error?.message || 'Ha ocurrido un error inesperado.',
    canRetry: true,
  };
}

export function ApiErrorState({
  error,
  onRetry,
  title,
  description,
  compact = false,
}: ApiErrorStateProps) {
  const classified = classifyError(error);
  const Icon = classified.icon;
  const effectiveTitle = title || classified.title;
  const effectiveDescription = description || classified.description;
  const showRetry = Boolean(onRetry) && classified.canRetry;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center text-center ${compact ? 'px-4 py-6' : 'px-6 py-12'}`}
    >
      <div className={`bg-stone-100 rounded-full ${compact ? 'p-3 mb-3' : 'p-4 mb-4'}`}>
        <Icon className={`text-stone-600 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
      </div>

      <h3 className={`font-semibold text-stone-950 mb-1 ${compact ? 'text-sm' : 'text-lg mb-2'}`}>
        {effectiveTitle}
      </h3>

      <p className={`text-stone-500 max-w-xs ${compact ? 'text-xs mb-4' : 'text-sm mb-6'}`}>
        {effectiveDescription}
      </p>

      {showRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-stone-950 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      )}
    </motion.div>
  );
}

export default ApiErrorState;
