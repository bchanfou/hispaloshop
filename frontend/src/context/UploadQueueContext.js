import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { publishSocialContent } from '../components/creator/publishContent';

const UploadQueueContext = createContext(null);

export function UploadQueueProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const processingRef = useRef(false);

  const enqueue = useCallback((publishData) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = {
      id,
      contentType: publishData.contentType,
      caption: publishData.caption || '',
      status: 'pending',   // pending | uploading | done | error
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
      let nextEntry = null;
      setQueue((prev) => {
        const idx = prev.findIndex((e) => e.status === 'pending');
        if (idx === -1) return prev;
        nextEntry = prev[idx];
        const next = [...prev];
        next[idx] = { ...next[idx], status: 'uploading', progress: 0 };
        return next;
      });

      if (!nextEntry) break;
      const entryId = nextEntry.id;

      try {
        await publishSocialContent({
          publishData: nextEntry.publishData,
          onProgress: (progress) => {
            setQueue((prev) =>
              prev.map((e) => (e.id === entryId ? { ...e, progress } : e))
            );
          },
        });
        setQueue((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, status: 'done', progress: 100 } : e))
        );
      } catch (err) {
        setQueue((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, status: 'error', error: err?.message || 'Error de subida' }
              : e
          )
        );
      }
    }

    processingRef.current = false;
  }, []);

  const enqueueAndProcess = useCallback(
    (publishData) => {
      const id = enqueue(publishData);
      // Start processing on next tick
      setTimeout(() => processQueue(), 0);
      return id;
    },
    [enqueue, processQueue]
  );

  const retry = useCallback(
    (entryId) => {
      setQueue((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status: 'pending', error: null, progress: 0 } : e))
      );
      setTimeout(() => processQueue(), 0);
    },
    [processQueue]
  );

  const dismiss = useCallback((entryId) => {
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

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) throw new Error('useUploadQueue must be used within UploadQueueProvider');
  return ctx;
}

export default UploadQueueContext;
