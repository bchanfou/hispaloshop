import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Pencil, Trash2, X, Flag, UserMinus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { timeAgo } from '../../utils/time';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const priceFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const formatPrice = (price) => priceFormatter.format(price);

// Inject keyframe once at module level (idempotent)
if (typeof document !== 'undefined' && !document.getElementById('postcard-heart-keyframe')) {
  const style = document.createElement('style');
  style.id = 'postcard-heart-keyframe';
  style.textContent = `
    @keyframes postcard-heart-pop {
      0%   { opacity: 0; transform: scale(0.5); }
      15%  { opacity: 1; transform: scale(1.3); }
      30%  { opacity: 1; transform: scale(1); }
      70%  { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1); }
    }
    .postcard-heart-active { animation: postcard-heart-pop 0.9s ease forwards; color: #FF3040; fill: #FF3040; }
  `;
  document.head.appendChild(style);
}

function renderCaption(text, navigate) {
  if (!text) return null;
  const parts = text.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span
          key={i}
          className="text-stone-500 font-medium cursor-pointer hover:underline"
          role="link"
          onClick={(e) => { e.stopPropagation(); navigate?.(`/explore?tag=${encodeURIComponent(part.slice(1))}`); }}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="text-stone-500 font-medium cursor-pointer hover:underline"
          role="link"
          onClick={(e) => { e.stopPropagation(); navigate?.(`/${part.slice(1)}`); }}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

function PostCardInner({ post, onLike, onComment, onShare, onSave, onDelete, priority = false }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Controlled state — single source of truth is React Query cache (via props)
  const liked = post.liked ?? post.is_liked ?? false;
  const likesCount = post.likes ?? post.likes_count ?? 0;
  const saved = post.saved ?? post.is_saved ?? false;

  // Local UI-only state
  const [expanded, setExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  // Save uses local optimistic state because it calls API directly (not via parent)
  const [savePending, setSavePending] = useState(null); // null=use prop, true/false=optimistic override
  const effectiveSaved = savePending ?? saved;

  const lastTapRef = useRef(0);
  const heartTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const undoTimerRef = useRef(null);
  const captionRef = useRef(null); // ref for fresh caption in share handler

  const isOwner = (currentUser?.user_id || currentUser?.id) && ((currentUser.user_id || currentUser.id) === (post.user?.id || post.user_id));

  // Cleanup timers on unmount to prevent memory leaks + setState on unmounted component
  React.useEffect(() => {
    return () => {
      clearTimeout(heartTimerRef.current);
      clearTimeout(undoTimerRef.current);
    };
  }, []);

  // ---- handlers -----------------------------------------------------------

  // Like — delegate entirely to parent (React Query optimistic update)
  const handleLike = useCallback(() => {
    onLike?.(post.id);
  }, [onLike, post.id]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        onLike?.(post.id);
      }
      setShowHeartAnim(true);
      clearTimeout(heartTimerRef.current);
      heartTimerRef.current = setTimeout(() => setShowHeartAnim(false), 900);
    }
    lastTapRef.current = now;
  }, [liked, onLike, post.id]);

  // Save — calls API directly with local optimistic override
  const handleSave = useCallback(async () => {
    const next = !effectiveSaved;
    setSavePending(next);
    try {
      // Backend toggles save state on POST (no separate DELETE endpoint)
      await apiClient.post(`/posts/${post.id}/save`);
      onSave?.(post.id);
      // Keep optimistic value until prop syncs (onSave may trigger cache update)
    } catch {
      setSavePending(null); // rollback to prop value
      toast.error('Error al guardar');
    }
  }, [effectiveSaved, onSave, post.id]);

  // Reset optimistic override when prop value catches up
  React.useEffect(() => {
    if (savePending !== null && savePending === saved) {
      setSavePending(null);
    }
  }, [saved, savePending]);

  // Share — uses ref for always-fresh caption
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    const title = (captionRef.current || '').slice(0, 60) || 'Post';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard?.writeText(url);
        toast.success('Enlace copiado');
      }
    } catch {}
    onShare?.(post.id);
  }, [post.id, onShare]);

  const scrollThrottleRef = useRef(null);
  const handleScroll = useCallback(() => {
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) { scrollThrottleRef.current = null; return; }
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setCarouselIndex(idx);
      scrollThrottleRef.current = null;
    });
  }, []);

  const [localCaption, setLocalCaption] = useState(null); // null = use prop
  const [isEdited, setIsEdited] = useState(false);

  const handleEditSave = useCallback(async () => {
    try {
      await apiClient.patch(`/posts/${post.id}`, { caption: editCaption });
      setLocalCaption(editCaption);
      setIsEdited(true);
      setShowEditCaption(false);
      toast.success('Publicación editada');
    } catch {
      toast.error('Error al editar');
    }
  }, [editCaption, post.id]);

  const handleDelete = useCallback(() => {
    setDeleted(true);
    setShowDeleteConfirm(false);
    toast('Post eliminado', {
      action: {
        label: 'Deshacer',
        onClick: () => {
          clearTimeout(undoTimerRef.current);
          setDeleted(false);
        },
      },
      duration: 5000,
    });
    undoTimerRef.current = setTimeout(async () => {
      try {
        await apiClient.delete(`/posts/${post.id}`);
        onDelete?.(post.id);
      } catch {
        setDeleted(false);
        toast.error('Error al eliminar');
      }
    }, 5500);
  }, [post.id, onDelete]);

  // ---- derived (accept both prop schemas) --------------------------------

  const images = useMemo(() => {
    if (Array.isArray(post.images) && post.images.length > 0) return post.images;
    if (Array.isArray(post.media) && post.media.length > 0) return post.media.map((m) => (typeof m === 'string' ? m : m?.url)).filter(Boolean);
    if (post.image_url) return [post.image_url];
    return [];
  }, [post.images, post.media, post.image_url]);
  const hasMultiple = images.length > 1;
  const user = post.user ?? {};
  const avatarUrl = user.avatar_url || user.avatar || user.profile_image;
  const captionText = localCaption ?? post.content ?? post.caption ?? '';
  captionRef.current = captionText; // keep ref fresh for handleShare closure
  const commentsCount = post.comments_count ?? post.comments ?? 0;
  const createdAt = post.created_at ?? post.timestamp;
  const hasStory = user.has_story ?? post.has_story ?? false;
  const normalizedProducts = Array.isArray(post.products) && post.products.length > 0
    ? post.products
    : post.productTag ? [post.productTag] : [];

  const shouldClamp = !expanded && captionText && captionText.length > 120;

  // ---- render -------------------------------------------------------------

  if (deleted) return null;

  return (
    <article className="border-b border-stone-100 bg-white font-sans relative">
      {/* ---- Options menu ---- */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-3 top-10 z-50 bg-white rounded-xl shadow-lg border border-stone-200 py-1 min-w-[180px]">
            {isOwner && (
              <>
                <button
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left"
                  onClick={() => { setEditCaption(captionText); setShowEditCaption(true); setShowMenu(false); }}
                >
                  <Pencil size={16} /> Editar
                </button>
                <button
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left"
                  onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              </>
            )}
            <button
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left"
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/posts/${post.id}`);
                toast.success('Enlace copiado');
                setShowMenu(false);
              }}
            >
              Copiar enlace
            </button>
            {!isOwner && (
              <>
                <button
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left"
                  onClick={async () => {
                    try {
                      await apiClient.post(`/users/${user.id || user.user_id}/unfollow`);
                      toast.success(`Has dejado de seguir a ${user.name}`);
                    } catch { /* ignore */ }
                    setShowMenu(false);
                  }}
                >
                  <UserMinus size={16} /> Dejar de seguir
                </button>
                <button
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-600 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left"
                  onClick={async () => {
                    try {
                      await apiClient.post(`/posts/${post.id}/report`, { reason: 'inappropriate' });
                      toast.success('Reporte enviado');
                    } catch { toast.error('Error al reportar'); }
                    setShowMenu(false);
                  }}
                >
                  <Flag size={16} /> Reportar
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ---- Edit caption modal ---- */}
      {showEditCaption && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setShowEditCaption(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-950">Editar publicación</span>
              <button className="bg-transparent border-none cursor-pointer p-1" onClick={() => setShowEditCaption(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value.slice(0, 2200))}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-sans resize-none outline-none focus:border-stone-400 min-h-[80px] box-border"
              aria-label="Editar descripción"
            />
            <p className="text-[11px] text-stone-400">La imagen no se puede cambiar tras publicar.</p>
            <button
              onClick={handleEditSave}
              className="w-full bg-stone-950 text-white border-none rounded-full py-3 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* ---- Delete confirmation ---- */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 flex flex-col gap-3 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold text-stone-950">¿Eliminar este post?</p>
            <p className="text-sm text-stone-500">Se eliminará permanentemente junto con sus comentarios y likes. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-stone-100 text-stone-950 border-none rounded-full py-3 text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-stone-950 text-white border-none rounded-full py-3 text-sm font-semibold cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Header ---- */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div
          onClick={() => navigate(`/${user.username || user.id || user.user_id}`)}
          className={`flex shrink-0 items-center justify-center rounded-full cursor-pointer ${
            hasStory ? 'h-9 w-9 bg-stone-950 p-[2px]' : 'h-9 w-9'
          }`}
          role="link"
          aria-label={`Ver perfil de ${user.name}`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user.name}
              loading="lazy"
              className={`rounded-full object-cover ${
                hasStory ? 'h-[30px] w-[30px] border-2 border-white' : 'h-9 w-9'
              }`}
            />
          ) : (
            <div
              className={`rounded-full bg-stone-200 ${
                hasStory ? 'h-[30px] w-[30px] border-2 border-white' : 'h-9 w-9'
              }`}
            />
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
          <span
            onClick={() => navigate(`/${user.username || user.id || user.user_id}`)}
            className="text-sm font-semibold text-stone-950 whitespace-nowrap cursor-pointer"
            role="link"
          >
            {user.name}
          </span>
          {user.username && (
            <span className="text-xs text-stone-500 whitespace-nowrap">@{user.username}</span>
          )}
          {createdAt && (
            <>
              <span className="text-[11px] text-stone-500">&middot;</span>
              <span className="text-[11px] text-stone-500 whitespace-nowrap">{timeAgo(createdAt)}</span>
            </>
          )}
          {(isEdited || post.edited || post.is_edited) && (
            <span className="text-[10px] text-stone-400 italic">· editado</span>
          )}
        </div>

        <button
          className="flex shrink-0 items-center justify-center min-w-[44px] min-h-[44px] p-3 bg-transparent border-none cursor-pointer text-stone-500"
          aria-label="Opciones"
          onClick={() => setShowMenu((v) => !v)}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* ---- Location ---- */}
      {post.location && (
        <div className="px-3 -mt-0.5 pb-1">
          <span className="text-[11px] text-stone-500">{post.location}</span>
        </div>
      )}

      {/* ---- Media ---- */}
      {images.length > 0 && (
        <div className="relative w-full overflow-hidden">
          <div
            ref={scrollRef}
            className={`scrollbar-hide flex ${
              hasMultiple ? 'snap-x snap-mandatory overflow-x-auto' : 'overflow-hidden'
            }`}
            onScroll={handleScroll}
            onClick={handleDoubleTap}
          >
            {images.map((src, i) => (
              <div key={typeof src === 'string' ? src : i} className="min-w-full snap-start">
                <img
                  src={src}
                  alt={`Post ${post.id} imagen ${i + 1}`}
                  className="block w-full aspect-[4/5] object-cover"
                  loading={(i === 0 && priority) || Math.abs(i - carouselIndex) <= 1 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
            ))}
          </div>

          {/* Carousel counter */}
          {hasMultiple && (
            <div className="absolute top-3 right-3 z-[1] bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-0.5">
              <span className="text-[11px] text-white font-semibold tabular-nums">{carouselIndex + 1}/{images.length}</span>
            </div>
          )}

          {/* Price pill overlay */}
          {normalizedProducts.length > 0 && normalizedProducts[0].price != null && (
            <button
              className="absolute top-3 left-3 z-[1] flex items-center gap-1 rounded-full bg-stone-950/70 backdrop-blur-sm px-2.5 py-1 border-none cursor-pointer"
              onClick={(e) => { e.stopPropagation(); navigate(`/products/${normalizedProducts[0].id || normalizedProducts[0].product_id}`); }}
              aria-label={`Ver producto ${formatPrice(normalizedProducts[0].price)}`}
            >
              <span className="text-[11px] font-bold text-white">{formatPrice(normalizedProducts[0].price)}</span>
            </button>
          )}

          {/* Heart animation overlay */}
          {showHeartAnim && (
            <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
              <Heart
                size={50}
                className={`fill-[#FF3040] text-[#FF3040] ${showHeartAnim ? 'postcard-heart-active' : 'opacity-0'}`}
              />
            </div>
          )}

          {/* Dots — overlaid on image bottom */}
          {hasMultiple && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1] flex items-center gap-1">
              {images.map((_, i) => {
                const dist = Math.abs(i - carouselIndex);
                if (images.length > 5 && dist > 2 && i !== 0 && i !== images.length - 1) return null;
                return (
                  <button
                    key={i}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-transparent border-none p-0 cursor-pointer"
                    aria-label={`Imagen ${i + 1} de ${images.length}`}
                    onClick={() => {
                      scrollRef.current?.scrollTo({
                        left: i * scrollRef.current.clientWidth,
                        behavior: 'smooth',
                      });
                    }}
                  >
                    <span
                      className="block rounded-full transition-all duration-200"
                      style={{
                        width: i === carouselIndex ? 6 : dist === 1 ? 4 : 3,
                        height: i === carouselIndex ? 6 : dist === 1 ? 4 : 3,
                        background: i === carouselIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                        opacity: dist > 2 ? 0.5 : 1,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- Actions ---- */}
      <div className="flex items-center gap-4 px-3 py-2">
        <button
          className={`flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer transition-transform duration-150 active:scale-110 ${
            liked ? 'text-[#FF3040]' : 'text-stone-950'
          }`}
          onClick={handleLike}
          aria-label={liked ? `Quitar me gusta · ${likesCount}` : `Me gusta · ${likesCount}`}
        >
          <Heart
            size={24}
            fill={liked ? 'currentColor' : 'none'}
            color="currentColor"
            className={liked ? 'transition-transform duration-200' : ''}
          />
          {likesCount > 0 && (
            <span className="text-[13px] font-semibold text-stone-950">{likesCount}</span>
          )}
        </button>

        <button
          className="flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer text-stone-950 transition-transform duration-150"
          onClick={() => onComment?.(post.id)}
          aria-label={`Comentar · ${commentsCount}`}
        >
          <MessageCircle size={24} />
          {commentsCount > 0 && (
            <span className="text-[13px] font-semibold text-stone-950">{commentsCount}</span>
          )}
        </button>

        <button
          className="flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer text-stone-950 transition-transform duration-150"
          onClick={handleShare}
          aria-label="Compartir"
        >
          <Share2 size={24} />
        </button>

        <button
          className={`ml-auto flex min-h-[44px] items-center bg-transparent border-none py-2.5 cursor-pointer ${
            effectiveSaved ? 'text-stone-950' : 'text-stone-950'
          }`}
          onClick={handleSave}
          aria-label={effectiveSaved ? 'Quitar guardado' : 'Guardar'}
        >
          <Bookmark
            size={24}
            fill={effectiveSaved ? 'currentColor' : 'none'}
            color="currentColor"
          />
        </button>
      </div>

      {/* ---- Liked by context ---- */}
      {likesCount > 0 && (post.liked_by_sample?.length > 0 || post.liked_by?.length > 0) && (
        <div className="px-3 pb-1 text-[12px] text-stone-950 leading-tight">
          <span>Le gusta a </span>
          <span className="font-semibold">{(post.liked_by_sample || post.liked_by)[0]?.name || 'alguien'}</span>
          {likesCount > 1 && <span> y <span className="font-semibold">{likesCount - 1} más</span></span>}
        </div>
      )}

      {/* ---- "Ver los X comentarios" link (Q6) ---- */}
      {commentsCount > 0 && (
        <button
          className="block w-full px-3 bg-transparent border-none p-0 pb-1 text-left text-[13px] text-stone-500 cursor-pointer font-[inherit]"
          onClick={() => onComment?.(post.id)}
        >
          Ver {commentsCount === 1 ? 'el comentario' : `los ${commentsCount} comentarios`}
        </button>
      )}

      {/* ---- Caption ---- */}
      {captionText && (
        <div className="px-3 pb-3 text-sm leading-[1.45] text-stone-950">
          <div className={shouldClamp ? 'line-clamp-3' : ''}>
            <span className="mr-1 font-semibold">{user.name}</span>
            {renderCaption(captionText, navigate)}
          </div>
          {shouldClamp && (
            <button
              className="min-h-[44px] bg-transparent border-none p-0 py-1 text-sm text-stone-500 cursor-pointer font-[inherit]"
              onClick={() => setExpanded(true)}
            >
              ... Ver más
            </button>
          )}
        </div>
      )}

      {/* ---- Tagged products ---- */}
      {normalizedProducts.length > 0 && (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-3 pb-3">
          {normalizedProducts.map((product) => (
            <button
              key={product.id || product.product_id}
              className="flex shrink-0 items-center gap-2 rounded-full bg-stone-100 py-1 pl-1 pr-3 border-none cursor-pointer font-[inherit]"
              onClick={() => navigate(`/products/${product.id || product.product_id}`)}
            >
              {(product.producer_avatar || product.store?.avatar) && (
                <img
                  src={product.producer_avatar || product.store?.avatar}
                  alt={product.producer_name || product.store_name || product.store?.name || ''}
                  loading="lazy"
                  className="h-4 w-4 rounded-full object-cover"
                />
              )}
              {(product.image || product.thumbnail) && (
                <img
                  src={product.image || product.thumbnail}
                  alt={product.name || product.title}
                  loading="lazy"
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <div className="flex flex-col items-start min-w-0">
                <span className="max-w-[120px] truncate text-xs font-medium text-stone-950">
                  {product.name || product.title}
                </span>
                {(product.producer_name || product.store_name || product.store?.name) && (
                  <span className="max-w-[120px] truncate text-[10px] text-stone-500 flex items-center gap-0.5">
                    {product.producer_name || product.store_name || product.store?.name}
                    {product.verified && <span className="text-[9px]">✓</span>}
                  </span>
                )}
                {/* Allergen/cert badges */}
                {(product.certifications?.length > 0 || product.is_organic || product.is_vegan || product.is_gluten_free) && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap">
                    {product.is_organic && <span className="text-[8px] bg-stone-200 text-stone-700 rounded px-1">🌿 Eco</span>}
                    {product.is_vegan && <span className="text-[8px] bg-stone-200 text-stone-700 rounded px-1">🌱 Vegano</span>}
                    {product.is_gluten_free && <span className="text-[8px] bg-stone-200 text-stone-700 rounded px-1">🌾 Sin gluten</span>}
                    {product.certifications?.slice(0, 2).map((cert, ci) => (
                      <span key={ci} className="text-[8px] bg-stone-200 text-stone-700 rounded px-1">{cert.name || cert}</span>
                    ))}
                  </div>
                )}
              </div>
              {product.price != null && (
                <span className="whitespace-nowrap text-xs font-bold text-stone-950">
                  {formatPrice(product.price)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

const arePostPropsEqual = (prev, next) => {
  const p = prev.post;
  const n = next.post;
  return (
    p?.id === n?.id &&
    p?.liked === n?.liked &&
    p?.is_liked === n?.is_liked &&
    p?.likes === n?.likes &&
    p?.likes_count === n?.likes_count &&
    p?.saved === n?.saved &&
    p?.is_saved === n?.is_saved &&
    p?.comments_count === n?.comments_count &&
    p?.comments === n?.comments &&
    p?.caption === n?.caption &&
    p?.content === n?.content &&
    prev.priority === next.priority &&
    prev.onLike === next.onLike &&
    prev.onComment === next.onComment &&
    prev.onShare === next.onShare &&
    prev.onSave === next.onSave &&
    prev.onDelete === next.onDelete
  );
};

export default React.memo(PostCardInner, arePostPropsEqual);
