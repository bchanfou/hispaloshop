/**
 * Toast Manager - Sistema centralizado para gestionar toasts sin spam
 * Previene duplicados y controla la frecuencia de mensajes
 */

import { toast } from 'sonner';

// Configuración de debounce por tipo de toast
const DEBOUNCE_CONFIG = {
  NETWORK_ERROR: 30000,    // 30s entre toasts de "sin conexión"
  SERVER_ERROR: 30000,     // 30s entre toasts de error de servidor
  SUCCESS: 5000,           // 5s entre toasts de éxito similares
  WARNING: 10000,          // 10s entre advertencias
};

// Estado de toasts activos
const activeToasts = new Map();
const lastShown = new Map();
let bannerVisible = false;

/**
 * Establece si el banner de offline está visible
 * Cuando el banner está visible, no se muestran toasts de red
 */
export function setBannerVisible(visible) {
  bannerVisible = visible;
}

/**
 * Verifica si se puede mostrar un toast según el debounce
 */
function canShowToast(type) {
  const now = Date.now();
  const lastTime = lastShown.get(type) || 0;
  const debounceMs = DEBOUNCE_CONFIG[type] || 5000;
  
  if (now - lastTime < debounceMs) {
    return false;
  }
  
  lastShown.set(type, now);
  return true;
}

/**
 * Muestra un toast con prevención de duplicados
 */
export function showToast(message, options = {}) {
  const { 
    type = 'info', 
    id = null,
    duration = 4000,
    debounceType = null,
    skipIfBanner = false 
  } = options;
  
  // Si se indica skipIfBanner y el banner está visible, no mostrar
  if (skipIfBanner && bannerVisible) {
    return null;
  }
  
  // Si hay debounce, verificar si se puede mostrar
  if (debounceType && !canShowToast(debounceType)) {
    return null;
  }
  
  // Generar ID único si no se proporciona
  const toastId = id || `${type}_${message}`;
  
  // Si ya existe un toast activo con este ID, no crear otro
  if (activeToasts.has(toastId)) {
    return toastId;
  }
  
  // Crear el toast según el tipo
  let toastInstance;
  switch (type) {
    case 'error':
      toastInstance = toast.error(message, { 
        id: toastId, 
        duration,
        onDismiss: () => activeToasts.delete(toastId)
      });
      break;
    case 'success':
      toastInstance = toast.success(message, { 
        id: toastId, 
        duration,
        onDismiss: () => activeToasts.delete(toastId)
      });
      break;
    case 'warning':
      toastInstance = toast.warning(message, { 
        id: toastId, 
        duration,
        onDismiss: () => activeToasts.delete(toastId)
      });
      break;
    default:
      toastInstance = toast(message, { 
        id: toastId, 
        duration,
        onDismiss: () => activeToasts.delete(toastId)
      });
  }
  
  activeToasts.set(toastId, toastInstance);
  return toastId;
}

/**
 * Muestra toast de error de red con debounce
 */
export function showNetworkError(message = 'Sin conexión. Comprueba tu red.') {
  return showToast(message, {
    type: 'error',
    id: 'network_error',
    debounceType: 'NETWORK_ERROR',
    skipIfBanner: true,
    duration: 5000
  });
}

/**
 * Muestra toast de error de servidor con debounce
 */
export function showServerError(message = 'Servidor no disponible. Inténtalo más tarde.') {
  return showToast(message, {
    type: 'error',
    id: 'server_error',
    debounceType: 'SERVER_ERROR',
    duration: 5000
  });
}

/**
 * Muestra toast de conexión restaurada
 * Auto-dismiss después de 3 segundos
 */
export function showReconnected() {
  // Limpiar toast de error de red si existe
  dismissToast('network_error');
  
  return showToast('Conexión restaurada', {
    type: 'success',
    id: 'reconnected',
    duration: 3000
  });
}

/**
 * Elimina un toast específico por ID
 */
export function dismissToast(id) {
  if (activeToasts.has(id)) {
    toast.dismiss(id);
    activeToasts.delete(id);
  }
}

/**
 * Elimina todos los toasts activos
 */
export function dismissAllToasts() {
  toast.dismiss();
  activeToasts.clear();
}

/**
 * Limpia el estado de debounce (útil para testing)
 */
export function clearDebounceState() {
  lastShown.clear();
}

export default {
  showToast,
  showNetworkError,
  showServerError,
  showReconnected,
  dismissToast,
  dismissAllToasts,
  setBannerVisible,
  clearDebounceState
};
