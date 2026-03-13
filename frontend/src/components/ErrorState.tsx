import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Error al cargar',
  message,
  onRetry,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-stone-500" />
      </div>
      <h3 className="text-base font-semibold text-stone-950">{title}</h3>
      <p className="text-sm text-stone-500 mt-2 max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-stone-950 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      )}
    </div>
  );
}

// Variante compacta para usar en cards
export function CompactError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg">
      <AlertCircle className="w-4 h-4 text-stone-500 flex-shrink-0" />
      <p className="text-xs text-stone-600 flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-stone-600 font-medium hover:underline flex-shrink-0"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

// Error para secciones inline
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-stone-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm text-stone-950 font-medium hover:underline"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
