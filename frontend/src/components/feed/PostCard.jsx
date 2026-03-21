import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Pencil, Trash2, X, Flag, UserMinus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { timeAgo } from '../../utils/time';
import { useHaptics } from '../../hooks/useHaptics';
import { useDwellTime } from '../../hooks/useDwellTime';
import { abbreviateCount } from '../../utils/helpers';
import MilestoneToast, { checkMilestone } from './MilestoneToast';


// ---------------------------------------------------------------------------
// Like-particle burst (double-tap)
// ---------------------------------------------------------------------------
const PARTICLE_COUNT_MIN = 8;
const PARTICLE_COUNT_MAX = 12;

function generateParticles() {
  const count = PARTICLE_COUNT_MIN + Math.floor(Math.random() * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN + 1));
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 60,
    y: -(80 + Math.random() * 70),
    delay: Math.random() * 0.05 + 0.05 * i,
  }));
}

function LikeParticles({ show }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) setParticles(generateParticles());
  }, [show]);

  return (
    <AnimatePresence>
      {show && particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute pointer-events-none z-[3]"
          style={{ left: '50%', top: '50%', marginLeft: -6, marginTop: -6 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
        >
          <Heart size={12} className="fill-white text-white drop-shadow-[0_2px_6px_rgba(255,255,255,0.6)]" />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const priceFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const formatPrice = (price) => priceFormatter.format(price);

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
          onClick={(e) => { e.stopPropagation(); navigate?.(`/hashtag/${encodeURIComponent(part.slice(1))}`); }}
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
// Reaction picker
// ---------------------------------------------------------------------------

const REACTIONS = ['❤️', '🔥', '👏', '😍', '😮', '😢'];

function ReactionPicker({ show, onSelect, onClose, position = 'above' }) {
  const pickerRef = useRef(null);
  const [bouncingIdx, setBouncingIdx] = useState(null);

  useEffect(() => {
    if (!show) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={pickerRef}
          className={`absolute z-50 bg-white rounded-full shadow-lg border border-stone-100 px-2 py-1.5 flex gap-1 ${
            position === 'left'
              ? 'right-full top-1/2 -translate-y-1/2 mr-2'
              : 'bottom-full left-0 mb-2'
          }`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {REACTIONS.map((emoji, i) => (
            <motion.button
              key={emoji}
              className="w-10 h-10 rounded-full bg-transparent border-none cursor-pointer flex items-center justify-center text-xl"
              whileHover={{ scale: 1.3 }}
              animate={bouncingIdx === i ? { scale: [1, 1.5, 1], transition: { duration: 0.35 } } : {}}
              onClick={(e) => {
                e.stopPropagation();
                setBouncingIdx(i);
                setTimeout(() => onSelect(emoji), 300);
              }}
              aria-label={`Reaccionar con ${emoji}`}
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

function PostCardInner({ post, onLike, onComment, onShare, onSave, onDelete, priority = false }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { trigger } = useHaptics();
  const dwellRef = useDwellTime(post.id, 'post');

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

  // Milestone toast
  const [activeMilestone, setActiveMilestone] = useState(null);

  // Reaction system
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const longPressRef = useRef(null);

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
      clearTimeout(longPressRef.current);
    };
  }, []);

  // ---- handlers -----------------------------------------------------------

  // Like — delegate entirely to parent (React Query optimistic update)
  const handleLike = useCallback(() => {
    trigger('light');
    onLike?.(post.id);
    // Check milestone after like (optimistic: assume count increments)
    if (!liked) {
      const newCount = likesCount + 1;
      const m = checkMilestone('first_10_likes', newCount) || checkMilestone('first_50_likes', newCount);
      if (m) setActiveMilestone(m);
    }
  }, [onLike, post.id, trigger, liked, likesCount]);

  // Long press handlers for reaction picker
  const handleLongPressStart = useCallback(() => {
    longPressRef.current = setTimeout(() => {
      setShowReactions(true);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    clearTimeout(longPressRef.current);
  }, []);

  const handleReaction = useCallback(async (emoji) => {
    setSelectedReaction(emoji);
    setShowReactions(false);
    trigger('medium');
    try {
      await apiClient.post(`/posts/${post.id}/react`, { reaction: emoji });
    } catch {
      toast.error('Error al reaccionar');
    }
  }, [post.id, trigger]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        onLike?.(post.id);
      }
      setShowHeartAnim(true);
      clearTimeout(heartTimerRef.current);
      heartTimerRef.current = setTimeout(() => setShowHeartAnim(false), 1000);
    }
    lastTapRef.current = now;
  }, [liked, onLike, post.id]);

  // Save — calls API directly with local optimistic override
  const handleSave = useCallback(async () => {
    trigger('medium');
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
  }, [effectiveSaved, onSave, post.id, trigger]);

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
  const normalizedProducts = useMemo(() => {
    if (Array.isArray(post.tagged_products) && post.tagged_products.length > 0) return post.tagged_products;
    if (Array.isArray(post.products) && post.products.length > 0) return post.products;
    if (post.productTag) return [post.productTag];
    return [];
  }, [post.tagged_products, post.products, post.productTag]);

  const shouldClamp = !expanded && captionText && captionText.length > 120;

  // ---- render -------------------------------------------------------------

  if (deleted) return null;

  return (
    <motion.article
      ref={dwellRef}
      className="bg-white rounded-2xl shadow-sm mx-3 mb-3 overflow-hidden font-sans relative"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* ---- Options menu ---- */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-3 top-10 z-50 bg-white rounded-2xl shadow-lg border border-stone-200 py-1 min-w-[180px]">
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
              className="w-full border border-stone-200 rounded-2xl px-3 py-2.5 text-sm font-sans resize-none outline-none focus:border-stone-400 min-h-[80px] box-border"
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
          {post.author_followers > 1000 && (
            <>
              <span className="text-[11px] text-stone-400">&middot;</span>
              <span className="text-xs text-stone-400 whitespace-nowrap">{abbreviateCount(post.author_followers)}</span>
            </>
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

          {/* Trending badge */}
          {(post.is_trending || (post.trending_score != null && post.trending_score > 5)) && (
            <div className={`absolute ${hasMultiple ? 'top-10' : 'top-3'} right-3 z-[1] bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1`}>
              <span className="text-[11px] font-semibold text-stone-950">🔥 Tendencia</span>
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

          {/* Heart animation overlay + particles */}
          <AnimatePresence>
            {showHeartAnim && (
              <motion.div
                key="double-tap-heart"
                className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.2, 0.9, 1], opacity: [1, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: 'easeOut' }}
              >
                <Heart
                  size={96}
                  className="fill-white text-white drop-shadow-[0_4px_20px_rgba(255,255,255,0.5)]"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <LikeParticles show={showHeartAnim} />

          {/* Dots — overlaid on image bottom */}
          {hasMultiple && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1] flex items-center gap-1">
              {images.map((_, i) => {
                const dist = Math.abs(i - carouselIndex);
                if (images.length > 5 && dist > 2 && i !== 0 && i !== images.length - 1) return null;
                const isActive = i === carouselIndex;
                return (
                  <button
                    key={i}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-transparent border-none p-0 cursor-pointer relative"
                    aria-label={`Imagen ${i + 1} de ${images.length}`}
                    onClick={() => {
                      scrollRef.current?.scrollTo({
                        left: i * scrollRef.current.clientWidth,
                        behavior: 'smooth',
                      });
                    }}
                  >
                    <motion.span
                      className="block rounded-full"
                      animate={{
                        width: isActive ? 8 : 6,
                        height: isActive ? 8 : 6,
                        background: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                        opacity: dist > 2 ? 0.5 : 1,
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                    {isActive && (
                      <motion.span
                        layoutId={`postcard-dot-${post.id}`}
                        className="absolute inset-0 m-auto rounded-full"
                        style={{ width: 8, height: 8, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.7)' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- Actions ---- */}
      <div className="flex items-center gap-4 px-3 py-2">
        <div className="relative">
          <ReactionPicker
            show={showReactions}
            onSelect={handleReaction}
            onClose={() => setShowReactions(false)}
            position="above"
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
            className={`flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer ${
              liked || selectedReaction ? 'text-[#FF3040]' : 'text-stone-950'
            }`}
            onClick={handleLike}
            onPointerDown={handleLongPressStart}
            onPointerUp={handleLongPressEnd}
            onPointerLeave={handleLongPressEnd}
            aria-label={liked ? `Quitar me gusta · ${likesCount}` : `Me gusta · ${likesCount}`}
          >
            {selectedReaction && selectedReaction !== '❤️' ? (
              <span className="text-[22px] leading-none">{selectedReaction}</span>
            ) : (
              <Heart
                size={24}
                fill={liked || selectedReaction === '❤️' ? 'currentColor' : 'none'}
                color="currentColor"
              />
            )}
            {likesCount > 0 && (
              <motion.span
                key={likesCount}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, duration: 0.3 }}
                className="text-[13px] font-semibold text-stone-950"
              >
                {likesCount}
              </motion.span>
            )}
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          className="flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer text-stone-950"
          onClick={() => onComment?.(post.id)}
          aria-label={`Comentar · ${commentsCount}`}
        >
          <MessageCircle size={24} />
          {commentsCount > 0 && (
            <span className="text-[13px] font-semibold text-stone-950">{commentsCount}</span>
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          className="flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer text-stone-950"
          onClick={handleShare}
          aria-label="Compartir"
        >
          <Share2 size={24} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          animate={effectiveSaved ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, duration: 0.4 }}
          className="ml-auto flex min-h-[44px] items-center bg-transparent border-none py-2.5 cursor-pointer text-stone-950"
          onClick={handleSave}
          aria-label={effectiveSaved ? 'Quitar guardado' : 'Guardar'}
        >
          <Bookmark
            size={24}
            fill={effectiveSaved ? 'currentColor' : 'none'}
            color="currentColor"
          />
        </motion.button>
      </div>

      {/* ---- Liked by context ---- */}
      {likesCount > 0 && (() => {
        const likedByArr = post.liked_by_sample || post.liked_by;
        const firstUser = likedByArr?.[0];
        if (firstUser) {
          return (
            <div className="px-3 pb-1 text-xs text-stone-500 leading-tight">
              <span>Le gusta a </span>
              <span
                className="font-semibold text-stone-950 cursor-pointer"
                role="link"
                onClick={() => navigate(`/${firstUser.username || firstUser.id || firstUser.user_id}`)}
              >
                @{firstUser.username || firstUser.name}
              </span>
              {likesCount > 1 && <span> y <span className="font-semibold text-stone-950">{likesCount - 1} más</span></span>}
            </div>
          );
        }
        return (
          <div className="px-3 pb-1 text-xs text-stone-500 leading-tight">
            <span className="font-semibold text-stone-950">{likesCount}</span> me gusta
          </div>
        );
      })()}

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

      {/* ---- Tagged product pills ---- */}
      {normalizedProducts.length > 0 && (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-3 py-1 pb-3">
          {normalizedProducts.slice(0, 3).map((product) => {
            const img = product.image || product.thumbnail || product.images?.[0];
            return (
              <button
                key={product.id || product.product_id}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-stone-100 py-1 pl-1 pr-2.5 border-none cursor-pointer font-[inherit]"
                onClick={() => navigate(`/products/${product.id || product.product_id}`)}
              >
                {img && (
                  <img
                    src={img}
                    alt={product.name || product.title}
                    loading="lazy"
                    className="h-6 w-6 rounded-lg object-cover"
                  />
                )}
                <span className="max-w-[80px] truncate text-[11px] font-medium text-stone-950">
                  {product.name || product.title}
                </span>
                {product.price != null && (
                  <span className="whitespace-nowrap text-[11px] font-bold text-stone-950">
                    {formatPrice(product.price)}
                  </span>
                )}
              </button>
            );
          })}
          {normalizedProducts.length > 3 && (
            <span className="flex shrink-0 items-center text-[11px] font-medium text-stone-500">
              +{normalizedProducts.length - 3} más
            </span>
          )}
        </div>
      )}
      {/* ---- Milestone toast ---- */}
      <AnimatePresence>
        {activeMilestone && (
          <MilestoneToast
            milestone={activeMilestone}
            onClose={() => setActiveMilestone(null)}
          />
        )}
      </AnimatePresence>
    </motion.article>
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
