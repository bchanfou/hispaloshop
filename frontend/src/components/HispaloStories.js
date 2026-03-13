import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api/client';
import { Camera, ChevronRight, Loader2, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { asNumber, firstToken } from '../utils/safe';

const STORY_DURATION = 5000;
const STICKERS = ['🍕', '🥑', '🍓', '🔥', '❤️', '⭐', '🎉', '🛒', '🌿', '😋'];

function buildCaption({ caption, overlays, taggedProduct }) {
  const parts = [];

  overlays.forEach((overlay) => {
    if (overlay.type === 'text') {
      parts.push(`[text:${overlay.value}:${Math.round(overlay.x)}:${Math.round(overlay.y)}]`);
    }

    if (overlay.type === 'sticker') {
      parts.push(`[sticker:${overlay.value}:${Math.round(overlay.x)}:${Math.round(overlay.y)}]`);
    }
  });

  if (taggedProduct) {
    parts.push(`[product:${taggedProduct.product_id}:${taggedProduct.name}:${taggedProduct.price}]`);
  }

  if (caption.trim()) {
    parts.push(caption.trim());
  }

  return parts.join(' ');
}

function parseCaption(rawCaption) {
  const caption = rawCaption || '';
  const textMatch = caption.match(/\[text:(.+?):(\d+):(\d+)\]/);
  const stickerMatch = caption.match(/\[sticker:(.+?):(\d+):(\d+)\]/);
  const productMatch = caption.match(/\[product:(.+?):(.+?):(.+?)\]/);
  const cleanCaption = caption
    .replace(/\[text:.+?\]/g, '')
    .replace(/\[sticker:.+?\]/g, '')
    .replace(/\[product:.+?\]/g, '')
    .trim();

  return {
    cleanCaption,
    text: textMatch ? { value: textMatch[1], x: Number(textMatch[2]), y: Number(textMatch[3]) } : null,
    sticker: stickerMatch ? { value: stickerMatch[1], x: Number(stickerMatch[2]), y: Number(stickerMatch[3]) } : null,
    product: productMatch
      ? { id: productMatch[1], name: productMatch[2], price: productMatch[3] }
      : null,
  };
}

function DraggableOverlay({ overlay, onMove, onRemove, children }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const startDrag = (clientX, clientY) => {
    if (!ref.current) return;
    dragging.current = true;
    const rect = ref.current.getBoundingClientRect();
    offset.current = { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onDrag = useCallback((clientX, clientY) => {
    if (!dragging.current || !ref.current?.parentElement) return;
    const parent = ref.current.parentElement.getBoundingClientRect();
    const x = ((clientX - parent.left - offset.current.x) / parent.width) * 100;
    const y = ((clientY - parent.top - offset.current.y) / parent.height) * 100;
    onMove(Math.max(0, Math.min(80, x)), Math.max(0, Math.min(85, y)));
  }, [onMove]);

  useEffect(() => {
    const handleMove = (event) => onDrag(event.clientX, event.clientY);
    const handleTouchMove = (event) => {
      if (event.touches[0]) onDrag(event.touches[0].clientX, event.touches[0].clientY);
    };
    const stopDrag = () => {
      dragging.current = false;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', stopDrag);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [onDrag]);

  return (
    <div
      ref={ref}
      className="group absolute z-10 cursor-grab select-none active:cursor-grabbing"
      style={{ left: `${overlay.x}%`, top: `${overlay.y}%` }}
      onMouseDown={(event) => {
        event.preventDefault();
        startDrag(event.clientX, event.clientY);
      }}
      onTouchStart={(event) => {
        if (event.touches[0]) startDrag(event.touches[0].clientX, event.touches[0].clientY);
      }}
    >
      {children}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Eliminar elemento"
      >
        <X className="h-3 w-3 text-white" />
      </button>
    </div>
  );
}

function StoryViewer({ group, onClose }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const stories = useMemo(() => group.stories || [], [group.stories]);
  const current = stories[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      return;
    }
    onClose();
  }, [currentIndex, onClose, stories.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!current) return undefined;

    setProgress(0);
    apiClient.post(`/stories/${current.story_id}/view`, {}).catch(() => {});

    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(elapsed / STORY_DURATION, 1));

      if (elapsed >= STORY_DURATION) {
        clearInterval(timerRef.current);
        goNext();
      }
    }, 50);

    return () => clearInterval(timerRef.current);
  }, [current, currentIndex, goNext]);

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/stories/${current.story_id}`);
      toast.success(t('stories.deleted', 'Historia eliminada'));
      onClose();
    } catch {
      toast.error(t('common.error', 'Ha ocurrido un error'));
    }
  };

  if (!current) return null;

  const parsedCaption = parseCaption(current.caption);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black" data-testid="story-viewer">
      <div className="absolute left-3 right-3 top-2 z-10 flex gap-1">
        {stories.map((_, index) => (
          <div key={index} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white"
              style={{
                width: index < currentIndex ? '100%' : index === currentIndex ? `${progress * 100}%` : '0%',
                transition: index === currentIndex ? 'none' : 'width 0.2s',
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute left-3 right-3 top-6 z-10 flex items-center justify-between">
        <Link to={`/user/${group.user_id}`} onClick={onClose} className="flex items-center gap-2">
          {group.profile_image ? (
            <img
              src={group.profile_image}
              alt={t('stories.storyAvatar', 'Historia de {{name}}', { name: group.user_name })}
              loading="lazy"
              className="h-8 w-8 rounded-full border-2 border-white/50 object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
              {(group.user_name || '?')[0]}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold leading-tight text-white">{group.user_name}</p>
            <p className="text-[10px] text-white/60">
              {new Date(current.created_at || current.expires_at).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
              })}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user && group.is_own ? (
            <button type="button" onClick={handleDelete} className="p-2 text-white/70 hover:text-white" data-testid="story-delete" aria-label={t('stories.delete', 'Eliminar historia')}>
              <Trash2 className="h-5 w-5" />
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="p-2 text-white/70 hover:text-white" data-testid="story-close" aria-label={t('common.close', 'Cerrar')}>
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <img
        src={current.image_url}
        alt={parsedCaption.cleanCaption || t('stories.storyImage', 'Historia de {{name}}', { name: group.user_name })}
        loading="eager"
        className="max-h-full max-w-full object-contain"
      />

      {parsedCaption.text ? (
        <div className="pointer-events-none absolute z-[3]" style={{ left: `${parsedCaption.text.x}%`, top: `${parsedCaption.text.y}%` }}>
          <p className="inline-block rounded-lg bg-black/20 px-3 py-1.5 text-lg font-bold text-white backdrop-blur-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {parsedCaption.text.value}
          </p>
        </div>
      ) : null}

      {parsedCaption.sticker ? (
        <div className="pointer-events-none absolute z-[3] text-5xl drop-shadow-lg" style={{ left: `${parsedCaption.sticker.x}%`, top: `${parsedCaption.sticker.y}%` }}>
          {parsedCaption.sticker.value}
        </div>
      ) : null}

      {parsedCaption.product ? (
        <Link to={`/products/${parsedCaption.product.id}`} onClick={onClose} className="absolute bottom-20 left-4 right-4 z-[6]">
          <div className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm">
            <ShoppingBag className="h-4 w-4 shrink-0 text-stone-950" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-stone-900">{parsedCaption.product.name}</p>
              <p className="text-xs font-bold text-stone-600">{parsedCaption.product.price} €</p>
            </div>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </div>
        </Link>
      ) : null}

      {parsedCaption.cleanCaption ? (
        <div className="absolute bottom-16 left-4 right-4 z-[3] text-center">
          <p className="inline-block max-w-md rounded-xl bg-black/40 px-4 py-2 text-sm text-white backdrop-blur-sm">
            {parsedCaption.cleanCaption}
          </p>
        </div>
      ) : null}

      <button type="button" className="absolute left-0 top-0 z-[5] h-full w-1/3" onClick={goPrev} aria-label={t('stories.previous', 'Historia anterior')} />
      <button type="button" className="absolute right-0 top-0 z-[5] h-full w-2/3" onClick={goNext} aria-label={t('stories.next', 'Siguiente historia')} />
    </div>
  );
}

function StoryUploadModal({ onClose, onPublished }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [overlays, setOverlays] = useState([]);
  const [newText, setNewText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [taggedProduct, setTaggedProduct] = useState(null);
  const fileRef = useRef(null);
  const searchTimerRef = useRef(null);

  const handleFile = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      toast.error(t('stories.selectImage', 'Selecciona una imagen'));
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error(t('stories.maxSize', 'El tamaño máximo es 10 MB'));
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selected);
  };

  const updateOverlay = (id, x, y) => {
    setOverlays((current) => current.map((overlay) => (overlay.id === id ? { ...overlay, x, y } : overlay)));
  };

  const removeOverlay = (id) => {
    setOverlays((current) => current.filter((overlay) => overlay.id !== id));
  };

  const addTextOverlay = () => {
    if (!newText.trim()) return;
    setOverlays((current) => [
      ...current,
      { id: Date.now(), type: 'text', value: newText.trim(), x: 12, y: 28 },
    ]);
    setNewText('');
    setShowTextInput(false);
  };

  const addSticker = (emoji) => {
    setOverlays((current) => [
      ...current,
      { id: Date.now(), type: 'sticker', value: emoji, x: 54, y: 54 },
    ]);
  };

  const searchProducts = (value) => {
    setProductSearch(value);
    clearTimeout(searchTimerRef.current);

    if (!value || value.length < 2) {
      setProductResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      apiClient
        .get(`/products?search=${encodeURIComponent(value)}&limit=5`)
        .then((data) => {
          setProductResults(Array.isArray(data) ? data.slice(0, 5) : (data?.products || []).slice(0, 5));
        })
        .catch(() => setProductResults([]));
    }, 300);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error(t('stories.selectImage', 'Selecciona una imagen'));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', buildCaption({ caption, overlays, taggedProduct }));
      await apiClient.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('stories.published', 'Historia publicada'));
      onPublished();
    } catch (error) {
      toast.error(error.message || t('common.error', 'Ha ocurrido un error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" data-testid="story-upload-modal">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 p-4">
          <h3 className="font-semibold text-stone-900">{t('stories.uploadStory', 'Subir historia')}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-stone-100" aria-label={t('common.close', 'Cerrar')}>
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {preview ? (
            <div className="relative mx-auto mb-3 aspect-[9/16] max-h-[40vh] overflow-hidden rounded-xl bg-black" data-testid="story-preview">
              <img src={preview} alt={t('stories.preview', 'Vista previa de la historia')} className="h-full w-full object-contain" />

              {overlays.map((overlay) => (
                <DraggableOverlay
                  key={overlay.id}
                  overlay={overlay}
                  onMove={(x, y) => updateOverlay(overlay.id, x, y)}
                  onRemove={() => removeOverlay(overlay.id)}
                >
                  {overlay.type === 'text' ? (
                    <p className="whitespace-nowrap rounded-lg bg-black/30 px-3 py-1 text-base font-bold text-white backdrop-blur-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {overlay.value}
                    </p>
                  ) : (
                    <span className="text-4xl drop-shadow-lg">{overlay.value}</span>
                  )}
                </DraggableOverlay>
              ))}

              {taggedProduct ? (
                <div className="pointer-events-none absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm">
                    <ShoppingBag className="h-4 w-4 shrink-0 text-stone-950" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-stone-900">{taggedProduct.name}</p>
                      <p className="text-xs font-bold text-stone-600">{asNumber(taggedProduct.price).toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setOverlays([]);
                  setTaggedProduct(null);
                }}
                className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label={t('common.remove', 'Eliminar')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mb-3 flex aspect-[9/16] max-h-[40vh] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 transition-colors hover:bg-stone-100"
              data-testid="story-upload-area"
            >
              <Camera className="h-10 w-10 text-stone-400" />
              <span className="text-sm font-medium text-stone-500">{t('stories.selectImage', 'Selecciona una imagen')}</span>
            </button>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          {preview ? (
            <>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTextInput((current) => !current)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    showTextInput ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                  data-testid="story-text-btn"
                >
                  Aa {t('stories.addText', 'Texto')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductSearch((current) => !current)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    showProductSearch ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                  data-testid="story-product-btn"
                >
                  <span className="inline-flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" />
                    {t('stories.tagProduct', 'Producto')}
                  </span>
                </button>
              </div>

              {showTextInput ? (
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newText}
                    onChange={(event) => setNewText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') addTextOverlay();
                    }}
                    placeholder={t('stories.textOverlay', 'Escribe y arrastra...')}
                    className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                    maxLength={60}
                    autoFocus
                    data-testid="story-overlay-input"
                  />
                  <button type="button" onClick={addTextOverlay} disabled={!newText.trim()} className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">
                    +
                  </button>
                </div>
              ) : null}

              <div className="mb-3 flex flex-wrap gap-1.5">
                {STICKERS.map((sticker) => (
                  <button
                    key={sticker}
                    type="button"
                    onClick={() => addSticker(sticker)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-50 text-lg transition-all hover:scale-110 hover:bg-stone-100 active:scale-95"
                    aria-label={t('stories.addSticker', 'Añadir sticker')}
                  >
                    {sticker}
                  </button>
                ))}
              </div>

              {showProductSearch ? (
                <div className="mb-3">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(event) => searchProducts(event.target.value)}
                    placeholder={t('stories.searchProduct', 'Buscar producto...')}
                    className="mb-2 w-full rounded-xl border border-stone-200 px-4 py-2 text-sm outline-none focus:border-stone-400"
                    data-testid="story-product-search"
                  />
                  {productResults.map((product) => (
                    <button
                      key={product.product_id}
                      type="button"
                      onClick={() => {
                        setTaggedProduct(product);
                        setShowProductSearch(false);
                        setProductSearch('');
                        setProductResults([]);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-stone-50"
                    >
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} loading="lazy" className="h-8 w-8 rounded object-cover" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{product.name}</p>
                        <p className="text-xs text-stone-600">{asNumber(product.price).toFixed(2)} €</p>
                      </div>
                    </button>
                  ))}
                  {taggedProduct ? (
                    <div className="mt-1 flex items-center gap-2 rounded-lg bg-stone-100 p-2">
                      <ShoppingBag className="h-4 w-4 text-stone-950" />
                      <span className="flex-1 truncate text-xs font-medium">{taggedProduct.name}</span>
                      <button type="button" onClick={() => setTaggedProduct(null)} className="p-0.5" aria-label={t('common.remove', 'Eliminar')}>
                        <X className="h-3 w-3 text-stone-400" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          <input
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder={t('stories.storyCaption', 'Añade un texto para tu historia')}
            className="mb-3 w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-stone-400"
            maxLength={200}
            data-testid="story-caption-input"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
            data-testid="story-publish-btn"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('stories.uploading', 'Subiendo...')}
              </>
            ) : (
              t('stories.uploadStory', 'Subir historia')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StoriesRow({ onCreateStory, onViewStory }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [storyGroups, setStoryGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const fetchStories = useCallback(() => {
    apiClient
      .get('/stories')
      .then((data) => setStoryGroups(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" data-testid="stories-row">
        {user ? (
          <button
            type="button"
            onClick={() => {
              onCreateStory?.();
              setShowUpload(true);
            }}
            className="flex shrink-0 flex-col items-center gap-1"
            data-testid="add-story-btn"
            aria-label={t('stories.addStory', 'Añadir historia')}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-stone-300 bg-stone-50 transition-colors hover:bg-stone-100">
              <Plus className="h-6 w-6 text-stone-400" />
            </div>
            <span className="text-[10px] font-medium text-stone-500">{t('stories.addStory', 'Añadir')}</span>
          </button>
        ) : null}

        {storyGroups.map((group) => (
          <button
            key={group.user_id}
            type="button"
            onClick={() => {
              onViewStory?.(group);
              setActiveGroup(group);
            }}
            className="flex shrink-0 flex-col items-center gap-1"
            data-testid={`story-circle-${group.user_id}`}
            aria-label={group.is_own ? t('stories.yourStory', 'Tu historia') : t('stories.openStory', 'Abrir historia de {{name}}', { name: group.user_name })}
          >
            <div className={`h-16 w-16 rounded-full p-[2px] ${group.is_own ? 'bg-gradient-to-br from-stone-950 to-stone-500' : 'bg-gradient-to-br from-orange-400 to-pink-500'}`}>
              <div className="h-full w-full overflow-hidden rounded-full bg-white p-[2px]">
                {group.profile_image ? (
                  <img
                    src={group.profile_image}
                    alt={group.is_own ? t('stories.yourStory', 'Tu historia') : t('stories.storyAvatar', 'Historia de {{name}}', { name: group.user_name })}
                    loading="lazy"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-500">
                    {(group.user_name || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="max-w-16 truncate text-[10px] font-medium text-stone-600">
              {group.is_own ? t('stories.yourStory', 'Tu historia') : firstToken(group.user_name, '')}
            </span>
          </button>
        ))}
      </div>

      {activeGroup ? (
        <StoryViewer
          group={activeGroup}
          onClose={() => {
            setActiveGroup(null);
            fetchStories();
          }}
        />
      ) : null}

      {showUpload ? (
        <StoryUploadModal
          onClose={() => setShowUpload(false)}
          onPublished={() => {
            setShowUpload(false);
            fetchStories();
          }}
        />
      ) : null}
    </>
  );
}

export default StoriesRow;
