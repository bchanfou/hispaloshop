/**
 * QueryProvider - Configuración React Query
 * Provee cache, optimistic updates y manejo de errores global
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import queryClient from '../lib/queryClient';

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default QueryProvider;
