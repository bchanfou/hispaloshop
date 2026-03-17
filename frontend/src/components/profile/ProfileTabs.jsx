import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
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
} from 'lucide-react';
import apiClient from '../../services/api/client';

const ALL_TABS = [
  { id: 'posts', icon: Grid3X3, label: 'Posts' },
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

/* ── Skeleton grid ── */
function SkeletonGrid({ count = 9, columns = 3 }) {
  return (
    <div
      className={columns === 3
        ? 'grid grid-cols-3 gap-0.5'
        : 'grid grid-cols-2 gap-2 p-2'
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
function EmptyState({ icon: Icon, title, buttonLabel, onButtonClick }) {
  return (
    <div className="px-5 py-10 text-center">
      <Icon size={40} className="mx-auto text-stone-500" />
      <p className={`mt-3 ${buttonLabel ? 'text-[15px] font-medium text-stone-950' : 'text-sm text-stone-500'}`}>
        {title}
      </p>
      {buttonLabel && (
        <button
          onClick={onButtonClick}
          className="mt-4 rounded-full bg-stone-950 px-6 py-2.5 text-[13px] font-semibold text-white transition-all duration-150 hover:bg-stone-800 active:scale-95"
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
}, ref) {
  const navigate = useNavigate();

  const tabs = getTabsForRole(role, isOwn);
  const [activeTab, setActiveTab] = useState('posts');

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

  const endpointMap = {
    posts: `/users/${userId}/posts`,
    reels: `/users/${userId}/reels`,
    products: `/users/${userId}/products`,
    recipes: `/users/${userId}/recipes`,
    saved: `/users/me/saved-posts`,
  };

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

  /* ── Tab bar ── */
  const tabBar = (
    <div role="tablist" className="sticky top-[52px] z-30 flex border-b border-stone-200 bg-white">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const TabIcon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.label}
            aria-selected={isActive}
            role="tab"
            className={`relative flex flex-1 items-center justify-center py-3 transition-colors duration-150 ${
              isActive ? 'text-stone-950' : 'text-stone-400'
            }`}
          >
            <TabIcon size={22} />
            {isActive && (
              <div className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-stone-950" />
            )}
          </button>
        );
      })}
    </div>
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
      <div className="grid grid-cols-3 gap-0.5">
        {items.map((post, i) => {
          const src = (post.images?.length > 0 && post.images[0]) || post.image_url;
          const hasMultiple = post.images?.length > 1;
          return (
            <div
              key={post.id || post.post_id || i}
              onClick={() => onPostClick?.(post)}
              onKeyDown={(e) => { if (e.key === 'Enter') onPostClick?.(post); }}
              role="button"
              tabIndex={0}
              className="relative aspect-square cursor-pointer overflow-hidden"
            >
              <img
                src={src}
                alt={post.caption ? post.caption.slice(0, 80) : 'Publicación'}
                loading="lazy"
                className="block h-full w-full object-cover"
              />
              {hasMultiple && <MultiImageBadge />}
            </div>
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
      <div className="grid grid-cols-3 gap-0.5">
        {items.map((reel, i) => {
          const src = reel.thumbnail_url || reel.cover_url || reel.image_url || '';
          return (
            <div
              key={reel.id || reel.reel_id || i}
              onClick={() => navigate(`/reels?user=${userId}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/reels?user=${userId}`); }}
              role="button"
              tabIndex={0}
              className="relative aspect-square cursor-pointer overflow-hidden"
            >
              <img
                src={src}
                alt={reel.caption ? reel.caption.slice(0, 80) : 'Reel'}
                loading="lazy"
                className="block h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <PlaySquare size={24} className="text-white drop-shadow-md" />
              </div>
              {reel.views != null && (
                <span className="absolute bottom-1 left-1.5 text-[11px] font-semibold text-white drop-shadow-md">
                  {reel.views}
                </span>
              )}
            </div>
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
        <EmptyState icon={Package} title="Publica tu primer producto" buttonLabel="Publicar producto" onButtonClick={() => navigate('/producer/products')} />
      ) : (
        <EmptyState icon={Package} title="Sin productos" />
      );
    }
    return (
      <div className="grid grid-cols-2 gap-2 p-2">
        {items.map((product, i) => {
          const src = product.image_url || product.images?.[0] || '';
          const handleProductClick = () =>
            onProductClick ? onProductClick(product) : navigate(`/products/${product.id || product.product_id}`);
          return (
            <div
              key={product.id || product.product_id || i}
              onClick={handleProductClick}
              onKeyDown={(e) => { if (e.key === 'Enter') handleProductClick(); }}
              role="button"
              tabIndex={0}
              className="cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-white"
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
      <div className="grid grid-cols-2 gap-2 p-2">
        {items.map((recipe, i) => {
          const src = recipe.image_url || recipe.images?.[0] || '';
          const recipeUrl = `/recipes/${recipe.id || recipe.recipe_id}`;
          return (
            <div
              key={recipe.id || recipe.recipe_id || i}
              onClick={() => navigate(recipeUrl)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(recipeUrl); }}
              role="button"
              tabIndex={0}
              className="cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-white"
            >
              <img
                src={src}
                alt={recipe.name || recipe.title || 'Receta'}
                loading="lazy"
                className="block aspect-[4/3] w-full rounded-t-lg object-cover"
              />
              <div className="p-2">
                <p className="truncate text-[13px] font-medium text-stone-950">
                  {recipe.name || recipe.title}
                </p>
                {recipe.prep_time != null && (
                  <p className="mt-1 text-[11px] text-stone-500">
                    ⏱ {recipe.prep_time}min
                  </p>
                )}
              </div>
            </div>
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
      <div className="grid grid-cols-3 gap-0.5">
        {items.map((item, i) => {
          const src = (item.images?.length > 0 && item.images[0]) || item.image_url;
          return (
            <div
              key={item.id || item.post_id || i}
              onClick={() => onPostClick?.(item)}
              onKeyDown={(e) => { if (e.key === 'Enter') onPostClick?.(item); }}
              role="button"
              tabIndex={0}
              className="relative aspect-square cursor-pointer overflow-hidden"
            >
              <img
                src={src}
                alt="Publicación guardada"
                loading="lazy"
                className="block h-full w-full object-cover"
              />
            </div>
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
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-stone-300">
            <Lock size={28} className="text-stone-400" />
          </div>
          <p className="text-[15px] font-semibold text-stone-950">Esta cuenta es privada</p>
          <p className="mt-1 max-w-[260px] text-[13px] text-stone-500">
            Sigue esta cuenta para ver sus publicaciones, recetas y productos.
          </p>
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
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
          </div>
        )}
      </div>
    </div>
  );
});

export default ProfileTabs;
