import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import apiClient from '../services/api/client';

type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

interface PublishData {
  contentType?: string;
  caption?: string;
  files?: File[];
  products?: any[];
  location?: string;
  [key: string]: any;
}

interface QueueEntry {
  id: string;
  contentType: string | undefined;
  caption: string;
  status: UploadStatus;
  progress: number;
  error: string | null;
  publishData: PublishData;
}

interface UploadQueueContextValue {
  queue: QueueEntry[];
  enqueueAndProcess: (publishData: PublishData) => string;
  retry: (entryId: string) => void;
  dismiss: (entryId: string) => void;
  hasActiveUploads: boolean;
}

async function publishSocialContent({ publishData, onProgress }: { publishData: PublishData; onProgress?: (progress: number) => void }) {
  const fd = new FormData();
  if (publishData.caption) fd.append('caption', publishData.caption);
  if (publishData.files) {
    publishData.files.forEach((f) => fd.append('files', f));
  }
  if (publishData.products) {
    fd.append('tagged_products_json', JSON.stringify(publishData.products.map((p: any) => ({ product_id: p.id || p }))));
  }
  if (publishData.location) fd.append('location', publishData.location);
  onProgress?.(50);

  // Route to correct endpoint based on content type
  const type = publishData.contentType || 'post';
  let endpoint = '/posts';
  if (type === 'reel') {
    endpoint = '/reels';
    // Reels expect 'file' not 'files'
    const firstFile = publishData.files?.[0];
    if (firstFile) { fd.delete('files'); fd.append('file', firstFile); }
  } else if (type === 'story') {
    endpoint = '/stories';
    const firstFile = publishData.files?.[0];
    if (firstFile) { fd.delete('files'); fd.append('file', firstFile); }
  }

  const res = await apiClient.post(endpoint, fd);
  onProgress?.(100);
  return res;
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

interface UploadQueueProviderProps {
  children: ReactNode;
}

export function UploadQueueProvider({ children }: UploadQueueProviderProps) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const processingRef = useRef(false);

  const enqueue = useCallback((publishData: PublishData): string => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: QueueEntry = {
      id,
      contentType: publishData.contentType,
      caption: publishData.caption || '',
      status: 'pending',
      progress: 0,
      error: null,
      publishData,
    };
    setQueue((prev) => [...prev, entry]);
    return id;
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (true) {
      let nextEntry: QueueEntry | null = null;
      setQueue((prev) => {
        const idx = prev.findIndex((e) => e.status === 'pending');
        if (idx === -1) return prev;
        nextEntry = prev[idx];
        const next = [...prev];
        next[idx] = { ...next[idx], status: 'uploading', progress: 0 };
        return next;
      });

      if (!nextEntry) break;
      const entryId = (nextEntry as QueueEntry).id;

      try {
        await publishSocialContent({
          publishData: (nextEntry as QueueEntry).publishData,
          onProgress: (progress: number) => {
            setQueue((prev) =>
              prev.map((e) => (e.id === entryId ? { ...e, progress } : e))
            );
          },
        });
        setQueue((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, status: 'done' as UploadStatus, progress: 100 } : e))
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, status: 'error' as UploadStatus, error: err?.message || 'Error de subida' }
              : e
          )
        );
      }
    }

    processingRef.current = false;
  }, []);

  const enqueueAndProcess = useCallback(
    (publishData: PublishData): string => {
      const id = enqueue(publishData);
      // Start processing on next tick
      setTimeout(() => processQueue(), 0);
      return id;
    },
    [enqueue, processQueue]
  );

  const retry = useCallback(
    (entryId: string) => {
      setQueue((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status: 'pending' as UploadStatus, error: null, progress: 0 } : e))
      );
      setTimeout(() => processQueue(), 0);
    },
    [processQueue]
  );

  const dismiss = useCallback((entryId: string) => {
    setQueue((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  const activeUploads = queue.filter((e) => e.status === 'uploading' || e.status === 'pending');
  const hasActiveUploads = activeUploads.length > 0;

  return (
    <UploadQueueContext.Provider
      value={{ queue, enqueueAndProcess, retry, dismiss, hasActiveUploads }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue(): UploadQueueContextValue {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) throw new Error('useUploadQueue must be used within UploadQueueProvider');
  return ctx;
}

export default UploadQueueContext;
