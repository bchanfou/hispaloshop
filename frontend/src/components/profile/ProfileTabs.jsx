import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Grid3X3,
  PlaySquare,
  Bookmark,
  Package,
  BookOpen,
  Camera,
  Film,
  Lock,
  Play,
  Star,
  X,
  Heart,
  MessageCircle,
  Send,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Pencil,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import SlideTabIndicator from '../motion/SlideTabIndicator';
import apiClient from '../../services/api/client';

const ALL_TABS = [
  { id: 'posts', icon: Grid3X3, label: 'Publicaciones' },
  { id: 'reels', icon: PlaySquare, label: 'Reels' },
  { id: 'products', icon: Package, label: 'Productos' },
  { id: 'recipes', icon: BookOpen, label: 'Recetas' },
  { id: 'saved', icon: Bookmark, label: 'Guardados' },
];

function getTabsForRole(role, isOwn) {
  let ids;
  switch (role) {
    case 'producer':
    case 'importer':
      ids = ['posts', 'reels', 'products', 'recipes'];
      break;
    case 'influencer':
      ids = ['posts', 'reels', 'recipes'];
      break;
    case 'consumer':
    case 'customer':
    default:
      ids = ['posts', 'reels'];
      break;
  }
  if (isOwn) ids.push('saved');
  return ALL_TABS.filter((t) => ids.includes(t.id));
}

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

function formatViews(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + ' mil';
  return String(n);
}

/* ── Skeleton grid ── */
function SkeletonGrid({ count = 9, columns = 3 }) {
  return (
    <div
      className={columns === 3
        ? 'grid grid-cols-3 gap-1'
        : 'grid grid-cols-2 gap-4 p-2 lg:grid-cols-3'
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-square animate-pulse rounded bg-stone-100"
        />
      ))}
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ icon: Icon, title, subtitle, buttonLabel, onButtonClick }) {
  return (
    <div className="flex flex-col items-center px-5 py-16 text-center">
      <Icon size={48} className="text-stone-300" />
      <p className="mt-4 text-lg font-semibold text-stone-950">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      {buttonLabel && (
        <button
          onClick={onButtonClick}
          className="mt-4 rounded-full bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-150 active:scale-95 hover:bg-stone-800"
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}

/* ── Multi-image badge ── */
function MultiImageBadge() {
  return (
    <div className="absolute right-1.5 top-1.5 h-[18px] w-[18px]">
      <div className="absolute left-0 top-0 h-3.5 w-3.5 rounded-sm border-[1.5px] border-white" />
      <div className="absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-sm border-[1.5px] border-white" />
    </div>
  );
}

/* ══════════════════════════════════════════════
   ProfileTabs
   ══════════════════════════════════════════════ */
const ProfileTabs = forwardRef(function ProfileTabs({
  userId,
  role = 'consumer',
  isOwn = false,
  isPrivate = false,
  isFollowing = false,
  onPostClick,
  onProductClick,
  onFollow,
}, ref) {
  const navigate = useNavigate();
  const [followLoading, setFollowLoading] = useState(false);

  const handleFollowAndRefetch = useCallback(async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (typeof onFollow === 'function') {
        await onFollow();
      } else {
        await apiClient.post(`/users/${userId}/follow`);
      }
    } catch {
      toast.error('Error al seguir');
    } finally {
      setFollowLoading(false);
    }
  }, [userId, onFollow, followLoading]);

  const tabs = useMemo(() => getTabsForRole(role, isOwn), [role, isOwn]);
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedReel, setSelectedReel] = useState(null);
  const [reelIndex, setReelIndex] = useState(0);

  // Expose switchTab to parent via ref (Q9)
  useImperativeHandle(ref, () => ({
    switchTab: (tabId) => {
      if (tabs.some((t) => t.id === tabId)) setActiveTab(tabId);
    },
  }), [tabs]);

  const PAGE_SIZE = 20;
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [hasMore, setHasMore] = useState({});
  const skipRef = useRef({});
  const sentinelRef = useRef(null);

  useEffect(() => {
    setData({});
    setLoading({});
    setHasMore({});
    skipRef.current = {};
  }, [userId]);

  const endpointMap = useMemo(() => ({
    posts: `/users/${userId}/posts`,
    reels: `/users/${userId}/reels`,
    products: `/users/${userId}/products`,
    recipes: `/users/${userId}/recipes`,
    saved: `/users/me/saved-posts`,
  }), [userId]);

  const fetchTab = useCallback(
    async (tabId, append = false) => {
      if (loading[tabId]) return;
      const skip = append ? (skipRef.current[tabId] || 0) : 0;
      setLoading((prev) => ({ ...prev, [tabId]: true }));
      try {
        const sep = endpointMap[tabId].includes('?') ? '&' : '?';
        const res = await apiClient.get(`${endpointMap[tabId]}${sep}skip=${skip}&limit=${PAGE_SIZE}`);
        const items = Array.isArray(res) ? res : res?.results ?? res?.items ?? res?.data ?? [];
        setData((prev) => ({
          ...prev,
          [tabId]: append ? [...(prev[tabId] || []), ...items] : items,
        }));
        skipRef.current[tabId] = skip + items.length;
        setHasMore((prev) => ({ ...prev, [tabId]: items.length >= PAGE_SIZE }));
      } catch {
        if (!append) setData((prev) => ({ ...prev, [tabId]: [] }));
        setHasMore((prev) => ({ ...prev, [tabId]: false }));
      } finally {
        setLoading((prev) => ({ ...prev, [tabId]: false }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId],
  );

  useEffect(() => {
    if (!data[activeTab] && !loading[activeTab]) fetchTab(activeTab);
  }, [activeTab, fetchTab, data, loading]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore[activeTab] && !loading[activeTab]) {
          fetchTab(activeTab, true);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, hasMore, loading, fetchTab]);

  /* ── Tab bar (Instagram: indicator at top) ── */
  const tabBar = (
    <SlideTabIndicator
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      layoutId="profile-tab"
      className="sticky top-[52px] z-30 border-t border-stone-200 bg-white lg:justify-center"
      showLabels
    />
  );

  /* ── Content renderers ── */

  function renderPosts() {
    const items = data.posts;
    if (loading.posts && !items) return <SkeletonGrid />;
    if (!items || items.length === 0) {
      return isOwn ? (
        <EmptyState icon={Camera} title="Comparte tu primera foto" buttonLabel="Crear publicación" onButtonClick={() => navigate('/create/post')} />
      ) : (
        <EmptyState icon={Camera} title="Sin publicaciones todavía" />
      );
    }
    return (
      <div className="grid grid-cols-3 gap-1">
        {items.map((post, i) => {
          const src = (post.images?.length > 0 && post.images[0]) || post.image_url;
          const hasMultiple = post.images?.length > 1;
          const Wrapper = i < 12 ? motion.div : 'div';
          const motionProps = i < 12 ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: Math.min(i * 0.03, 0.3) } } : {};
          return (
            <Wrapper
              key={post.id || post.post_id || i}
              {...motionProps}
            >
              <div
                onClick={() => onPostClick?.(post, items)}
                onKeyDown={(e) => { if (e.key === 'Enter') onPostClick?.(post, items); }}
                role="button"
                tabIndex={0}
                className="relative aspect-square cursor-pointer overflow-hidden bg-white active:scale-[0.97] active:opacity-80 transition-transform"
              >
                <img
                  src={src}
                  alt={post.caption ? post.caption.slice(0, 80) : 'Publicación'}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {hasMultiple && <MultiImageBadge />}
              </div>
            </Wrapper>
          );
        })}
      </div>
    );
  }

  function renderReels() {
    const items = data.reels;
    if (loading.reels && !items) return <SkeletonGrid />;
    if (!items || items.length === 0) {
      return isOwn ? (
        <EmptyState icon={Film} title="Sube tu primer reel" buttonLabel="Crear reel" onButtonClick={() => navigate('/create/reel')} />
      ) : (
        <EmptyState icon={Film} title="Sin reels todavía" />
      );
    }
    return (
      <div className="grid grid-cols-3 gap-1">
        {items.map((reel, i) => {
          const src = reel.thumbnail_url || reel.cover_url || reel.image_url || '';
          const Wrapper = i < 12 ? motion.div : 'div';
          const motionProps = i < 12 ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: Math.min(i * 0.03, 0.3) } } : {};
          return (
            <Wrapper
              key={reel.id || reel.reel_id || i}
              {...motionProps}
            >
              <div
                onClick={() => { setSelectedReel(reel); setReelIndex(i); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedReel(reel); setReelIndex(i); } }}
                role="button"
                tabIndex={0}
                className="relative aspect-square cursor-pointer overflow-hidden bg-black active:scale-[0.97] active:opacity-80 transition-transform"
              >
                <img
                  src={src}
                  alt={reel.caption ? reel.caption.slice(0, 80) : 'Reel'}
                  loading="lazy"
                  className="block h-full w-full object-cover"
                />
                {(reel.views_count ?? reel.views) != null && (
                  <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[12px] font-semibold text-white drop-shadow-md">
                    <Play size={12} fill="white" />
                    {formatViews(reel.views_count ?? reel.views)}
                  </span>
                )}
              </div>
            </Wrapper>
          );
        })}
      </div>
    );
  }

  function renderProducts() {
    const items = data.products;
    if (loading.products && !items) return <SkeletonGrid count={6} columns={2} />;
    if (!items || items.length === 0) {
      return isOwn ? (
        <EmptyState icon={Package} title="Publica tu primer producto" buttonLabel="Añadir producto" onButtonClick={() => navigate('/producer/products/new')} />
      ) : (
        <EmptyState icon={Package} title="Sin productos" />
      );
    }
    return (
      <div className="grid grid-cols-2 gap-4 p-2 lg:grid-cols-3">
        {items.map((product, i) => {
          const src = product.image_url || product.images?.[0] || '';
          const handleProductClick = () =>
            onProductClick ? onProductClick(product) : navigate(`/products/${product.id || product.product_id}`);
          const Wrapper = i < 12 ? motion.div : 'div';
          const motionProps = i < 12 ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: Math.min(i * 0.03, 0.3) } } : {};
          return (
            <Wrapper
              key={product.id || product.product_id || i}
              {...motionProps}
            >
            <div
              onClick={handleProductClick}
              onKeyDown={(e) => { if (e.key === 'Enter') handleProductClick(); }}
              role="button"
              tabIndex={0}
              className="cursor-pointer overflow-hidden rounded-2xl border border-stone-200 bg-white"
            >
              <img
                src={src}
                alt={product.name || product.title || 'Producto'}
                loading="lazy"
                className="block aspect-square w-full object-cover"
              />
              <div className="p-2">
                <p className="truncate text-[13px] font-medium text-stone-950">
                  {product.name || product.title}
                </p>
                <p className="mt-1 text-sm font-semibold text-stone-950">
                  {priceFormatter.format(product.price)}
                </p>
              </div>
            </div>
            </Wrapper>
          );
        })}
      </div>
    );
  }

  function renderRecipes() {
    const items = data.recipes;
    if (loading.recipes && !items) return <SkeletonGrid count={6} columns={2} />;
    if (!items || items.length === 0) {
      return isOwn ? (
        <EmptyState icon={BookOpen} title="Comparte tu primera receta" buttonLabel="Crear receta" onButtonClick={() => navigate('/create/recipe')} />
      ) : (
        <EmptyState icon={BookOpen} title="Sin recetas todavía" />
      );
    }
    return (
      <div className="grid grid-cols-2 gap-4 p-2 lg:grid-cols-3">
        {items.map((recipe, i) => {
          const src = recipe.image_url || recipe.images?.[0] || '';
          const recipeUrl = `/recipes/${recipe.id || recipe.recipe_id}`;
          const Wrapper = i < 12 ? motion.div : 'div';
          const motionProps = i < 12 ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: Math.min(i * 0.03, 0.3) } } : {};
          return (
            <Wrapper
              key={recipe.id || recipe.recipe_id || i}
              {...motionProps}
            >
              <div
                onClick={() => navigate(recipeUrl)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(recipeUrl); }}
                role="button"
                tabIndex={0}
                className="cursor-pointer overflow-hidden rounded-2xl border border-stone-200 bg-white"
              >
                <img
                  src={src}
                  alt={recipe.name || recipe.title || 'Receta'}
                  loading="lazy"
                  className="block aspect-[4/3] w-full rounded-t-2xl object-cover"
                />
                <div className="p-2">
                  <p className="truncate text-[13px] font-medium text-stone-950">
                    {recipe.name || recipe.title}
                  </p>
                  {recipe.prep_time != null && (
                    <p className="mt-1 text-[11px] text-stone-500">
                      {recipe.prep_time}min
                    </p>
                  )}
                  {recipe.avg_rating > 0 && (
                    <p className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Star size={10} className="fill-stone-950 text-stone-950" />
                      {recipe.avg_rating.toFixed(1)} · {recipe.review_count || 0}
                    </p>
                  )}
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>
    );
  }

  function renderSaved() {
    const items = data.saved;
    if (loading.saved && !items) return <SkeletonGrid />;
    if (!items || items.length === 0) {
      return <EmptyState icon={Bookmark} title="Nada guardado todavía" />;
    }
    return (
      <div className="grid grid-cols-3 gap-1">
        {items.map((item, i) => {
          const src = (item.images?.length > 0 && item.images[0]) || item.image_url;
          const Wrapper = i < 12 ? motion.div : 'div';
          const motionProps = i < 12 ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: Math.min(i * 0.03, 0.3) } } : {};
          return (
            <Wrapper
              key={item.id || item.post_id || i}
              {...motionProps}
            >
              <div
                onClick={() => onPostClick?.(item, items)}
                onKeyDown={(e) => { if (e.key === 'Enter') onPostClick?.(item, items); }}
                role="button"
                tabIndex={0}
                className="relative aspect-square cursor-pointer overflow-hidden"
              >
                <img
                  src={src}
                  alt="Publicación guardada"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            </Wrapper>
          );
        })}
      </div>
    );
  }

  const renderers = {
    posts: renderPosts,
    reels: renderReels,
    products: renderProducts,
    recipes: renderRecipes,
    saved: renderSaved,
  };

  // Private profile gate — show lock instead of content
  if (isPrivate && !isFollowing && !isOwn) {
    return (
      <div>
        {tabBar}
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-stone-200">
            <Lock size={28} className="text-stone-400" />
          </div>
          <p className="text-[15px] font-semibold text-stone-950">Esta cuenta es privada</p>
          <p className="mt-1 max-w-[260px] text-[13px] text-stone-500">
            Sigue esta cuenta para ver sus publicaciones, recetas y productos.
          </p>
          {!isOwn && (
            <button
              onClick={handleFollowAndRefetch}
              disabled={followLoading}
              className="mt-5 rounded-full bg-stone-950 px-8 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-stone-800 active:scale-95 disabled:opacity-50"
            >
              {followLoading ? 'Siguiendo...' : 'Seguir'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {tabBar}
      <div role="tabpanel" aria-label={ALL_TABS.find(t => t.id === activeTab)?.label}>
        {renderers[activeTab]?.()}
        {/* infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />
        {loading[activeTab] && data[activeTab]?.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
          </div>
        )}
      </div>

      {/* Fullscreen reel overlay */}
      {selectedReel && (() => {
        const reels = data.reels || [];
        const currentReel = reels[reelIndex] || selectedReel;
        const reelId = currentReel.id || currentReel.reel_id;
        return (
          <ReelViewer
            reel={currentReel}
            reelIndex={reelIndex}
            totalReels={reels.length}
            isOwn={isOwn}
            onClose={() => setSelectedReel(null)}
            onPrev={() => setReelIndex((i) => Math.max(0, i - 1))}
            onNext={() => setReelIndex((i) => Math.min(reels.length - 1, i + 1))}
            onDelete={(id) => {
              setData((prev) => ({ ...prev, reels: (prev.reels || []).filter(r => (r.id || r.reel_id) !== id) }));
              setSelectedReel(null);
            }}
          />
        );
      })()}
    </div>
  );
});

/* ── Fullscreen reel viewer with interactions ─────────────────── */

function ReelViewer({ reel, reelIndex, totalReels, isOwn, onClose, onPrev, onNext, onDelete }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(reel.is_liked ?? reel.liked ?? false);
  const [likesCount, setLikesCount] = useState(reel.likes_count ?? reel.likes ?? 0);
  const [saved, setSaved] = useState(reel.is_saved ?? false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(reel.comments_count ?? 0);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const reelId = reel.id || reel.reel_id;
  const likingRef = useRef(false);

  // Reset state when reel changes
  useEffect(() => {
    setLiked(reel.is_liked ?? false);
    setLikesCount(reel.likes_count ?? reel.likes ?? 0);
    setSaved(reel.is_saved ?? false);
    setShowMenu(false);
    setShowComments(false);
    setComments([]);
    setCommentsCount(reel.comments_count ?? 0);
    setNewComment('');
  }, [reel]);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleLike = useCallback(async () => {
    if (likingRef.current) return;
    likingRef.current = true;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    try {
      await apiClient.post(`/reels/${reelId}/like`); // backend toggles
    } catch {
      setLiked(wasLiked);
      setLikesCount((c) => wasLiked ? c + 1 : Math.max(0, c - 1));
    } finally {
      likingRef.current = false;
    }
  }, [liked, reelId]);

  const handleSave = useCallback(async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      await apiClient.post(`/reels/${reelId}/save`);
    } catch { setSaved(wasSaved); }
  }, [saved, reelId]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/posts/${reelId}`;
    if (navigator.share) {
      try { await navigator.share({ title: reel.caption?.slice(0, 60) || 'Reel', url }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); toast.success('Enlace copiado'); } catch { /* */ }
    }
  }, [reelId, reel.caption]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/reels/${reelId}`);
      toast.success('Reel eliminado');
      onDelete?.(reelId);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  }, [reelId, onDelete, queryClient]);

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950 flex flex-col">
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-4 left-4 z-10 w-11 h-11 rounded-full bg-stone-950/50 flex items-center justify-center"
      >
        <X size={20} className="text-white" />
      </button>

      {/* Own reel menu */}
      {isOwn && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setShowMenu((s) => !s)}
            aria-label="Opciones"
            className="w-11 h-11 rounded-full bg-stone-950/50 flex items-center justify-center"
          >
            <MoreHorizontal size={20} className="text-white" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-2xl bg-white shadow-lg border border-stone-100 overflow-hidden">
                <button
                  onClick={() => { onClose(); navigate(`/posts/${reelId}`); }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-stone-950 hover:bg-stone-50"
                >
                  <Pencil size={16} /> Editar
                </button>
                <button
                  onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-stone-950 hover:bg-stone-100 disabled:opacity-50"
                >
                  <Trash2 size={16} /> {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        key={reel.video_url || reel.media_url}
        src={reel.video_url || reel.media_url}
        autoPlay
        loop
        muted={muted}
        playsInline
        className="w-full h-full object-contain"
      />

      {/* Right sidebar — like/comment/share/save */}
      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
        <button onClick={handleLike} className="flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer min-w-[44px] min-h-[44px] justify-center" aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}>
          <Heart size={26} fill={liked ? 'white' : 'none'} className="text-white" />
          <span className="text-[11px] text-white font-medium">{likesCount}</span>
        </button>
        <button
          onClick={async () => {
            setShowComments(true);
            if (videoRef.current) videoRef.current.pause();
            if (!commentsLoading) {
              setCommentsLoading(true);
              try {
                const data = await apiClient.get(`/reels/${reelId}/comments`);
                setComments(Array.isArray(data) ? data : data?.comments || []);
              } catch { /* silent */ }
              finally { setCommentsLoading(false); }
            }
          }}
          className="flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer min-w-[44px] min-h-[44px] justify-center"
          aria-label="Comentar"
        >
          <MessageCircle size={26} className="text-white" />
          <span className="text-[11px] text-white font-medium">{commentsCount}</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center bg-transparent border-none cursor-pointer min-w-[44px] min-h-[44px] justify-center" aria-label="Compartir">
          <Send size={24} className="text-white" />
        </button>
        <button onClick={handleSave} className="flex flex-col items-center bg-transparent border-none cursor-pointer min-w-[44px] min-h-[44px] justify-center" aria-label={saved ? 'Quitar guardado' : 'Guardar'}>
          <Bookmark size={24} fill={saved ? 'white' : 'none'} className="text-white" />
        </button>
        <button
          onClick={() => { setMuted((m) => { const next = !m; if (videoRef.current) videoRef.current.muted = next; return next; }); }}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          className="flex flex-col items-center bg-transparent border-none cursor-pointer min-w-[44px] min-h-[44px] justify-center"
        >
          {muted ? <VolumeX size={24} className="text-white" /> : <Volume2 size={24} className="text-white" />}
        </button>
      </div>

      {/* Prev/Next navigation */}
      {reelIndex > 0 && (
        <button
          onClick={onPrev}
          aria-label="Reel anterior"
          className="absolute left-1/2 top-16 -translate-x-1/2 z-10 w-11 h-11 rounded-full bg-stone-950/50 flex items-center justify-center"
        >
          <ChevronUp size={22} className="text-white" />
        </button>
      )}
      {reelIndex < totalReels - 1 && (
        <button
          onClick={onNext}
          aria-label="Siguiente reel"
          className="absolute left-1/2 bottom-6 -translate-x-1/2 z-10 w-11 h-11 rounded-full bg-stone-950/50 flex items-center justify-center"
        >
          <ChevronDown size={22} className="text-white" />
        </button>
      )}

      {/* Bottom caption + views */}
      <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-stone-950/80 to-transparent z-[5]">
        {reel.caption && <p className="text-white text-sm line-clamp-2 mb-1">{reel.caption}</p>}
        {(reel.views_count ?? reel.views) != null && (
          <p className="flex items-center gap-1 text-[12px] text-stone-300">
            <Play size={12} fill="currentColor" />
            {formatViews(reel.views_count ?? reel.views)} visualizaciones
          </p>
        )}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              key="reel-del-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] bg-black/60"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              key="reel-del-modal"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute left-4 right-4 top-1/2 -translate-y-1/2 z-[111] bg-white rounded-2xl p-5 shadow-xl"
            >
              <p className="text-stone-950 font-semibold text-base mb-1">¿Eliminar este reel?</p>
              <p className="text-stone-500 text-sm mb-4">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 active:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setShowDeleteConfirm(false);
                    await handleDelete();
                  }}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-stone-950 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comment sheet */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 z-30 bg-stone-950/95 backdrop-blur-xl rounded-t-2xl max-h-[60vh] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-white text-sm font-semibold">Comentarios</span>
            <button onClick={() => { setShowComments(false); if (videoRef.current) videoRef.current.play().catch(() => {}); }} className="w-11 h-11 flex items-center justify-center" aria-label="Cerrar comentarios">
              <X size={20} className="text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {commentsLoading ? (
              <p className="text-white/50 text-sm text-center py-4">Cargando...</p>
            ) : comments.length === 0 ? (
              <p className="text-white/50 text-sm text-center py-4">Sin comentarios aún</p>
            ) : comments.map((c, i) => (
              <div key={c.comment_id || i} className="flex gap-2">
                {c.user_profile_image ? (
                  <img src={c.user_profile_image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center text-white/50 text-xs font-semibold">
                    {(c.user_name || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-white text-xs font-semibold">{c.user_name || 'Usuario'}</span>
                  <p className="text-white/80 text-sm">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 border-t border-white/10">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Añade un comentario..."
              className="flex-1 bg-white/10 text-white text-sm rounded-full px-4 py-2.5 min-h-[44px] outline-none placeholder:text-white/30"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newComment.trim() && !commentsLoading) {
                  e.preventDefault();
                  setCommentsLoading(true);
                  const text = newComment.trim();
                  setNewComment('');
                  try {
                    await apiClient.post(`/reels/${reelId}/comments`, { text });
                    const data = await apiClient.get(`/reels/${reelId}/comments`);
                    setComments(Array.isArray(data) ? data : data?.comments || []);
                    setCommentsCount((c) => c + 1);
                  } catch { toast.error('Error al comentar'); }
                  finally { setCommentsLoading(false); }
                }
              }}
            />
            <button
              onClick={async () => {
                if (!newComment.trim() || commentsLoading) return;
                setCommentsLoading(true);
                const text = newComment.trim();
                setNewComment('');
                try {
                  await apiClient.post(`/reels/${reelId}/comments`, { text });
                  const data = await apiClient.get(`/reels/${reelId}/comments`);
                  setComments(Array.isArray(data) ? data : data?.comments || []);
                  setCommentsCount((c) => c + 1);
                } catch { toast.error('Error al comentar'); }
                finally { setCommentsLoading(false); }
              }}
              disabled={!newComment.trim() || commentsLoading}
              className="w-11 h-11 rounded-full bg-stone-950 flex items-center justify-center disabled:opacity-30"
              aria-label="Enviar comentario"
            >
              <Send size={18} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileTabs;
