import React from 'react';
import { SWRConfig } from 'swr';
import { api } from '../lib/api';

const fetcher = async (url) => {
  const response = await api.request(url);
  return response;
};

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
