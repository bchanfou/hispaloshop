import React from 'react';
import { SWRConfig } from 'swr';
import apiClient from '../services/api/client';

const fetcher = (url) => apiClient.get(url);

export default function SWRProvider({ children }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        errorRetryCount: 3,
        loadingTimeout: 3000,
        onError: (error) => {
          console.error('[SWR Error]:', error);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
