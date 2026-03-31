// @ts-nocheck
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Grid3X3, Play, Package, BookOpen, Bookmark, AlertTriangle, Image, ChefHat, Clock, FolderOpen, Plus, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../services/api/client';
import { resolveUserImage } from '../features/user/queries';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';

/* ── Tab config ── */

const TABS = [
  { key: 'posts', label: 'Posts', icon: Grid3X3 },
  { key: 'reels', label: 'Reels', icon: Play },
  { key: 'products', label: 'Productos', icon: Package },
  { key: 'recipes', label: 'Recetas', icon: BookOpen },
  { key: 'collections', label: 'Colecciones', icon: FolderOpen },
] as const;

type TabKey = typeof TABS[number]['key'];

const PAGE_SIZE = 21;

/* ── Fetch functions ── */

async function fetchSavedPosts({ pageParam = 0 }) {
  const res = await apiClient.get(`/users/me/saved-posts?skip=${pageParam}&limit=${PAGE_SIZE}`);
  const items = Array.isArray(res) ? res : res?.posts || [];
  return { items, nextSkip: items.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined };
}

async function fetchSavedReels({ pageParam = 0 }) {
  const res = await apiClient.get(`/social/saved-reels?skip=${pageParam}&limit=${PAGE_SIZE}`);
  const items = res?.reels || res || [];
  return { items, nextSkip: items.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined };
}

async function fetchSavedProducts({ pageParam = 0 }) {
  const res = await apiClient.get(`/wishlist?skip=${pageParam}&limit=${PAGE_SIZE}`);
  const items = res?.products || res?.items || res || [];
  return { items, nextSkip: items.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined };
}

async function fetchSavedRecipes({ pageParam = 0 }) {
  const res = await apiClient.get(`/recipes?saved=true&skip=${pageParam}&limit=${PAGE_SIZE}`);
  const items = res?.recipes || res || [];
  return { items, nextSkip: items.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined };
}

async function fetchCollections({ pageParam = 0 }) {
  const res = await apiClient.get(`/users/me/collections?skip=${pageParam}&limit=${PAGE_SIZE}`);
  const items = Array.isArray(res) ? res : res?.collections || [];
  return { items, nextSkip: items.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined };
}

const FETCH_MAP: Record<TabKey, (ctx: { pageParam?: number }) => Promise<any>> = {
  posts: fetchSavedPosts,
  reels: fetchSavedReels,
  products: fetchSavedProducts,
  recipes: fetchSavedRecipes,
  collections: fetchCollections,
};

/* ── Main component ── */

export default function SavedPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('posts');

  return (
    <div className="min-h-screen bg-white">
      <SEO title="Guardados — HispaloShop" description="Tu contenido guardado" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <div className="max-w-[975px] mx-auto flex items-center gap-3 px-4 py-3">
          <BackButton />
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
              <Bookmark className="w-[18px] h-[18px] text-stone-500" />
            </div>
            <h1 className="text-lg font-bold text-stone-950 truncate">Guardados</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[975px] mx-auto px-4">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-none bg-transparent cursor-pointer transition-colors ${
                    isActive ? 'text-stone-950' : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="saved-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-950 rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[975px] mx-auto px-4 py-4">
        <TabContent key={activeTab} tab={activeTab} />
      </div>
    </div>
  );
}

/* ── Tab content with infinite query ── */

function TabContent({ tab }: { tab: TabKey }) {
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['saved', tab],
    queryFn: FETCH_MAP[tab],
    initialPageParam: 0,
    getNextPageParam: (last: any) => last.nextSkip,
  });

  const allItems = data?.pages?.flatMap((p: any) => p.items) || [];

  /* Sentinel ref for infinite scroll */
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /* Loading skeleton */
  if (isLoading) {
    const cols = tab === 'posts' || tab === 'reels' ? 3 : 2;
    return (
      <div className={`grid gap-1 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-2 gap-3'}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`bg-stone-100 animate-pulse rounded-sm ${
              cols === 3 ? 'aspect-square' : 'aspect-[4/5] rounded-xl'
            }`}
          />
        ))}
      </div>
    );
  }

  /* Error state */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-10 h-10 text-stone-300" />
        <p className="text-base font-semibold text-stone-950">Error al cargar</p>
        <p className="text-sm text-stone-500 text-center">Comprueba tu conexión e inténtalo de nuevo</p>
        <button
          onClick={() => refetch()}
          className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors border-none cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  /* Empty state */
  if (allItems.length === 0) {
    const emptyConfig: Record<TabKey, { icon: React.ReactNode; text: string }> = {
      posts: { icon: <Grid3X3 className="w-12 h-12 text-stone-300" />, text: 'No tienes posts guardados' },
      reels: { icon: <Play className="w-12 h-12 text-stone-300" />, text: 'No tienes reels guardados' },
      products: { icon: <Package className="w-12 h-12 text-stone-300" />, text: 'Tu lista de deseos está vacía' },
      recipes: { icon: <BookOpen className="w-12 h-12 text-stone-300" />, text: 'No tienes recetas guardadas' },
      collections: { icon: <FolderOpen className="w-12 h-12 text-stone-300" />, text: 'No tienes colecciones' },
    };
    const cfg = emptyConfig[tab];
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        {cfg.icon}
        <p className="text-base font-semibold text-stone-950">{cfg.text}</p>
        <p className="text-sm text-stone-500 text-center">Guarda contenido tocando el icono de marcador</p>
      </div>
    );
  }

  /* Grid rendering per tab */
  return (
    <>
      {tab === 'posts' && <PostsGrid items={allItems} />}
      {tab === 'reels' && <ReelsGrid items={allItems} />}
      {tab === 'products' && <ProductsGrid items={allItems} />}
      {tab === 'recipes' && <RecipesGrid items={allItems} />}
      {tab === 'collections' && <CollectionsGrid items={allItems} />}

      {/* Sentinel */}
      {hasNextPage && <div ref={sentinelRef} className="h-20" />}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
        </div>
      )}
    </>
  );
}

/* ── Posts Grid (3-col, IG style) ── */

function PostsGrid({ items }: { items: any[] }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((post, idx) => {
        const postId = post.post_id || post.id;
        if (!postId) return null;
        const img = post.image_url || post.media?.[0]?.url || post.images?.[0];
        return (
          <button
            key={postId}
            onClick={() => navigate(`/posts/${postId}`)}
            className="relative aspect-square bg-stone-100 overflow-hidden group cursor-pointer border-none p-0"
          >
            {img ? (
              <img src={resolveUserImage(img)} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="w-8 h-8 text-stone-300" />
              </div>
            )}
            {((post.media?.length || post.images?.length || 0) > 1 || post.type === 'carousel') && (
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h12v12H4z" opacity="0.5" /><path d="M8 2h12v12H8z" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        );
      })}
    </div>
  );
}

/* ── Reels Grid (3-col, play icon overlay) ── */

function ReelsGrid({ items }: { items: any[] }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((reel, idx) => {
        const reelId = reel.reel_id || reel.id;
        if (!reelId) return null;
        const thumb = reel.thumbnail_url || reel.thumbnail || reel.cover_url;
        return (
          <button
            key={reelId}
            onClick={() => navigate(`/posts/${reelId}`)}
            className="relative aspect-[9/16] bg-stone-100 overflow-hidden group cursor-pointer border-none p-0"
          >
            {thumb ? (
              <img src={resolveUserImage(thumb)} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-8 h-8 text-stone-300" />
              </div>
            )}
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-5 h-5 text-white" fill="white" />
              </div>
            </div>
            {reel.views_count != null && (
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                <Play className="w-3 h-3 text-white" fill="white" />
                <span className="text-[11px] font-semibold text-white drop-shadow-md">
                  {reel.views_count >= 1000 ? `${(reel.views_count / 1000).toFixed(1)}k` : reel.views_count}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        );
      })}
    </div>
  );
}

/* ── Products Grid (2-col, card style) ── */

function ProductsGrid({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((product, idx) => {
        const productId = product.product_id || product.id;
        if (!productId) return null;
        const img = product.images?.[0] || product.image_url || product.thumbnail;
        const price = product.price ?? product.unit_price;
        return (
          <Link
            key={productId}
            to={`/products/${productId}`}
            className="block no-underline"
          >
            <div className="overflow-hidden rounded-xl bg-white border border-stone-100">
              <div className="relative aspect-square overflow-hidden bg-stone-50">
                {img ? (
                  <img src={resolveUserImage(img)} alt={product.name || ''} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-stone-300" />
                  </div>
                )}
                <span className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-white/90 p-1.5 shadow-sm">
                  <Bookmark size={14} className="text-stone-950" fill="currentColor" />
                </span>
                {/* P-08: Price drop badge */}
                {product.original_price != null && price != null && Number(product.original_price) > Number(price) && (
                  <span className="absolute top-2 left-2 flex items-center gap-0.5 rounded-full bg-stone-950 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    <ArrowDown size={10} />
                    Precio reducido
                  </span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-sm font-semibold text-stone-950 line-clamp-2 leading-snug">
                  {product.name || product.title}
                </p>
                {product.store_name && (
                  <p className="text-xs text-stone-500 mt-0.5 truncate">{product.store_name}</p>
                )}
                {price != null && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <p className="text-sm font-bold text-stone-950">
                      {Number(price).toFixed(2)} &euro;
                    </p>
                    {product.original_price != null && Number(product.original_price) > Number(price) && (
                      <p className="text-xs text-stone-400 line-through">
                        {Number(product.original_price).toFixed(2)} &euro;
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ── P-12: Collections Grid ── */

function CollectionsGrid({ items }: { items: any[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await apiClient.post('/users/me/collections', { name: newName.trim() });
      setNewName('');
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ['saved', 'collections'] });
    } catch {
      toast.error('Error al crear la colección');
    }
  }, [newName, queryClient]);

  return (
    <div className="space-y-3">
      {/* Create new collection */}
      {creating ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Nombre de la colección"
            className="flex-1 h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-950 placeholder:text-stone-400 outline-none"
          />
          <button onClick={handleCreate} className="h-10 rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white border-none cursor-pointer hover:bg-stone-800 transition-colors">
            Crear
          </button>
          <button onClick={() => setCreating(false)} className="h-10 rounded-xl bg-stone-100 px-3 text-sm font-medium text-stone-600 border-none cursor-pointer hover:bg-stone-200 transition-colors">
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 w-full h-14 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-600 cursor-pointer hover:border-stone-400 hover:bg-stone-100 transition-colors"
        >
          <Plus size={18} className="text-stone-400" />
          Nueva colección
        </button>
      )}

      {/* Collection cards */}
      <div className="grid grid-cols-2 gap-3">
        {items.map(col => {
          const id = col.collection_id || col.id;
          if (!id) return null;
          const coverImg = col.cover_url || col.items?.[0]?.image_url || null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(`/saved/collections/${id}`)}
              className="overflow-hidden rounded-xl bg-white border border-stone-100 text-left cursor-pointer p-0"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                {coverImg ? (
                  <img src={resolveUserImage(coverImg)} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-stone-300" />
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="text-sm font-semibold text-stone-950 truncate">{col.name}</p>
                <p className="text-[11px] text-stone-500">{col.item_count || col.items?.length || 0} elementos</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Recipes Grid (2-col, card style) ── */

function RecipesGrid({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((recipe, idx) => {
        const recipeId = recipe.recipe_id || recipe.id;
        if (!recipeId) return null;
        const cookTime = recipe.cook_time || recipe.time_minutes || 0;
        return (
          <Link
            key={recipeId}
            to={`/recipes/${recipeId}`}
            className="block no-underline"
          >
            <div className="overflow-hidden rounded-xl bg-white">
              <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                {recipe.image_url ? (
                  <img src={resolveUserImage(recipe.image_url)} alt={recipe.title || ''} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ChefHat className="w-8 h-8 text-stone-300" />
                  </div>
                )}
                <span className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-white/90 p-1.5 shadow-sm">
                  <Bookmark size={14} className="text-stone-950" fill="currentColor" />
                </span>
              </div>
              <div className="px-1 pt-2 pb-1.5">
                <p className="text-sm font-semibold text-stone-950 line-clamp-2 leading-snug">
                  {recipe.title}
                </p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {cookTime > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] text-stone-500">
                      <Clock size={10} />
                      {cookTime} min
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      recipe.difficulty === 'hard' ? 'bg-stone-950 text-stone-50'
                        : recipe.difficulty === 'medium' ? 'bg-stone-100 text-stone-700'
                        : 'bg-stone-100 text-stone-600'
                    }`}>
                      {recipe.difficulty === 'easy' ? 'Fácil' : recipe.difficulty === 'medium' ? 'Media' : recipe.difficulty === 'hard' ? 'Difícil' : ''}
                    </span>
                  )}
                </div>
                {recipe.author_name && (
                  <p className="text-xs text-stone-500 mt-0.5 truncate">{recipe.author_name}</p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
