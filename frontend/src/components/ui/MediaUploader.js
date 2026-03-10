/**
 * MediaUploader — drag-and-drop or click-to-select file uploader.
 * Uploads to the appropriate backend Cloudinary endpoint and returns the CDN URL.
 *
 * Props:
 *   endpoint    – Required. One of: 'avatar' | 'product-image' | 'post' | 'story' | 'reel' | 'chat-image'
 *   onSuccess   – Called with { url, thumbnail, public_id, media_type, ... } on success
 *   onError     – Called with an error message string on failure
 *   accept      – MIME types string (default derived from endpoint)
 *   maxMB       – Max file size in MB (default derived from endpoint)
 *   label       – Dropzone label text
 *   preview     – Whether to show a preview (default true)
 *   className   – Extra CSS classes for the wrapper
 *   disabled    – Disable the uploader
 */

import React, { useCallback, useRef, useState } from 'react';
import { getToken } from '../../lib/auth';
import { getApiUrl } from '../../utils/api';

const ENDPOINT_CONFIG = {
  avatar:          { accept: 'image/jpeg,image/png,image/webp,image/gif', maxMB: 5,   path: '/upload/avatar' },
  'product-image': { accept: 'image/jpeg,image/png,image/webp,image/gif', maxMB: 10,  path: '/upload/product-image' },
  post:            { accept: 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm', maxMB: 50, path: '/upload/post' },
  story:           { accept: 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm', maxMB: 60, path: '/upload/story' },
  reel:            { accept: 'video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp', maxMB: 100, path: '/upload/reel' },
  'chat-image':    { accept: 'image/jpeg,image/png,image/webp,image/gif', maxMB: 5,   path: '/upload/chat-image' },
};

export default function MediaUploader({
  endpoint,
  onSuccess,
  onError,
  accept,
  maxMB,
  label,
  preview = true,
  className = '',
  disabled = false,
}) {
  const config = ENDPOINT_CONFIG[endpoint] || {};
  const resolvedAccept = accept || config.accept || 'image/*,video/*';
  const resolvedMaxMB  = maxMB  || config.maxMB  || 10;
  const apiPath        = config.path;

  const inputRef = useRef(null);
  const [dragging, setDragging]     = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewType, setPreviewType] = useState('image');
  const [error, setError]           = useState(null);

  const reset = useCallback(() => {
    setPreviewSrc(null);
    setProgress(0);
    setError(null);
  }, []);

  const validateFile = useCallback((file) => {
    const allowedTypes = resolvedAccept.split(',').map(t => t.trim());
    if (!allowedTypes.some(t => {
      if (t.endsWith('/*')) return file.type.startsWith(t.slice(0, -2));
      return file.type === t;
    })) {
      return `Tipo de archivo no permitido: ${file.type}`;
    }
    if (file.size > resolvedMaxMB * 1024 * 1024) {
      return `El archivo es demasiado grande. Máximo ${resolvedMaxMB}MB`;
    }
    return null;
  }, [resolvedAccept, resolvedMaxMB]);

  const buildPreview = useCallback((file) => {
    const isVideo = file.type.startsWith('video/');
    setPreviewType(isVideo ? 'video' : 'image');
    const reader = new FileReader();
    reader.onload = (e) => setPreviewSrc(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const uploadFile = useCallback(async (file) => {
    if (!apiPath) {
      const msg = `Endpoint desconocido: "${endpoint}"`;
      setError(msg);
      onError?.(msg);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    if (preview) buildPreview(file);

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const apiBase = getApiUrl();
    const url = `${apiBase}${apiPath}`;
    const token = getToken();

    // Use XMLHttpRequest for progress tracking
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.withCredentials = true;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            setProgress(100);
            onSuccess?.(result);
            resolve(result);
          } catch {
            const msg = 'Error al procesar la respuesta del servidor';
            setError(msg);
            onError?.(msg);
            reject(new Error(msg));
          }
        } else {
          let msg = `Error al subir el archivo (${xhr.status})`;
          try {
            const body = JSON.parse(xhr.responseText);
            if (body?.detail) msg = body.detail;
          } catch {}
          if (xhr.status === 503) msg = 'Almacenamiento de medios no configurado. Contacta al administrador.';
          setError(msg);
          onError?.(msg);
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        const msg = 'Error de red al subir el archivo';
        setError(msg);
        onError?.(msg);
        reject(new Error(msg));
      };

      xhr.send(formData);
    }).catch(() => {});
  }, [apiPath, endpoint, validateFile, buildPreview, preview, onSuccess, onError]);

  const handleFiles = useCallback((files) => {
    if (disabled || uploading) return;
    const file = files[0];
    if (file) uploadFile(file);
  }, [disabled, uploading, uploadFile]);

  const handleDragOver  = useCallback((e) => { e.preventDefault(); if (!disabled) setDragging(true); }, [disabled]);
  const handleDragLeave = useCallback(() => setDragging(false), []);
  const handleDrop      = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && !uploading) inputRef.current?.click();
  }, [disabled, uploading]);

  const isVideo = previewType === 'video';

  return (
    <div className={`media-uploader ${className}`}>
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? '#7c3aed' : error ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: dragging ? '#f5f3ff' : '#fafafa',
          transition: 'border-color 0.2s, background 0.2s',
          position: 'relative',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label={label || 'Subir archivo'}
      >
        <input
          ref={inputRef}
          type="file"
          accept={resolvedAccept}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
          disabled={disabled || uploading}
        />

        {/* Preview */}
        {preview && previewSrc && !uploading && (
          <div style={{ marginBottom: '8px', width: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: '8px' }}>
            {isVideo ? (
              <video
                src={previewSrc}
                style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }}
                controls={false}
                muted
              />
            ) : (
              <img
                src={previewSrc}
                alt="Preview"
                style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }}
              />
            )}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div style={{ width: '100%' }}>
            <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: '#7c3aed',
                  borderRadius: '3px',
                  transition: 'width 0.2s',
                }}
              />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-purple)', margin: 0 }}>Subiendo... {progress}%</p>
          </div>
        )}

        {/* Default icon + label when no preview */}
        {!(preview && previewSrc) && !uploading && (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragging ? '#7c3aed' : '#9ca3af'} strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {label || 'Arrastra un archivo o haz clic para seleccionar'}
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              Máximo {resolvedMaxMB}MB
            </p>
          </>
        )}

        {/* Success checkmark overlay when done */}
        {progress === 100 && !uploading && previewSrc && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            background: '#22c55e', borderRadius: '50%', width: '24px', height: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '6px', marginBottom: 0 }}>
          {error}
        </p>
      )}

      {/* Reset link when file was uploaded */}
      {progress === 100 && !uploading && (
        <button
          onClick={(e) => { e.stopPropagation(); reset(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '12px', color: 'var(--color-purple)', marginTop: '4px', padding: 0,
          }}
        >
          Cambiar archivo
        </button>
      )}
    </div>
  );
}
