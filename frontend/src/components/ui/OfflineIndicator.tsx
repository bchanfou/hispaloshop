/**
 * Indicador visual de estado offline
 * Muestra banner en header cuando no hay conectividad
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface OfflineIndicatorProps {
  variant?: 'header' | 'banner' | 'minimal';
}

export function OfflineIndicator({ variant = 'header' }: OfflineIndicatorProps) {
  const { isOnline, isChecking, wasOffline, checkConnectivity, acknowledgeOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  // Mostrar toast de reconexión cuando vuelve online
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        acknowledgeOffline();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, acknowledgeOffline]);

  // Variant: minimal - solo icono
  if (variant === 'minimal') {
    if (isOnline) return null;
    return (
      <div className="flex items-center gap-1 text-amber-500">
        <WifiOff className="w-4 h-4" />
      </div>
    );
  }

  // Variant: banner - banner completo en top
  if (variant === 'banner') {
    return (
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white"
          >
            <div className="flex items-center justify-center gap-3 px-4 py-2.5">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">
                Sin conexión a internet
              </span>
              <button
                onClick={() => checkConnectivity()}
                disabled={isChecking}
                className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-xs font-medium hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Verificando...' : 'Reintentar'}
              </button>
            </div>
          </motion.div>
        )}
        
        {showReconnected && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white"
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2.5">
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">
                Conexión restaurada
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Variant: header (default) - integrado en header
  return (
    <>
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="text-xs font-medium hidden sm:inline">Sin conexión</span>
            </div>
            <button
              onClick={() => checkConnectivity()}
              disabled={isChecking}
              className="p-1.5 hover:bg-stone-100 rounded-full transition-colors disabled:opacity-50"
              title="Reintentar conexión"
            >
              <RefreshCw className={`w-4 h-4 text-stone-500 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast de reconexión */}
      <AnimatePresence>
        {showReconnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 px-3 py-2 bg-green-500 text-white text-xs font-medium rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Wifi className="w-3.5 h-3.5" />
            Conexión restaurada
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default OfflineIndicator;
