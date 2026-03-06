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
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-600" />
      </div>
      <h3 className="text-base font-semibold text-[#1C1C1C]">{title}</h3>
      <p className="text-sm text-[#7A7A7A] mt-2 max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#2D5A27] text-white text-sm font-medium rounded-full hover:bg-[#1e3d1a] transition-colors"
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
    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
      <p className="text-xs text-red-700 flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-red-700 font-medium hover:underline flex-shrink-0"
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
      <p className="text-sm text-[#7A7A7A]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm text-[#2D5A27] font-medium hover:underline"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
