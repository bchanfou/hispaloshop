import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid3X3,
  PlaySquare,
  Bookmark,
  Package,
  BookOpen,
  Camera,
  Plus,
  Film,
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

/* ── skeleton pulse keyframes (injected once) ── */
const PULSE_KEYFRAMES = `
@keyframes profileTabsPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
`;

let styleInjected = false;
function injectPulseStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const s = document.createElement('style');
  s.textContent = PULSE_KEYFRAMES;
  document.head.appendChild(s);
}

/* ── Skeleton grid ── */
function SkeletonGrid({ count = 9, columns = 3, aspectRatio = '1/1' }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: columns === 3 ? '2px' : '8px',
        padding: columns === 2 ? '8px' : undefined,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            aspectRatio,
            background: 'var(--color-surface)',
            borderRadius: 4,
            animation: 'profileTabsPulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ icon: Icon, title, buttonLabel, onButtonClick }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <Icon
        size={40}
        style={{ color: 'var(--color-stone)', margin: '0 auto' }}
      />
      <p
        style={{
          fontSize: buttonLabel ? 15 : 14,
          fontWeight: buttonLabel ? 500 : 400,
          color: buttonLabel ? 'var(--color-black)' : 'var(--color-stone)',
          marginTop: 12,
        }}
      >
        {title}
      </p>
      {buttonLabel && (
        <button
          onClick={onButtonClick}
          style={{
            background: 'var(--color-black)',
            color: 'var(--color-white)',
            fontSize: 13,
            fontWeight: 600,
            padding: '10px 24px',
            borderRadius: 'var(--radius-full)',
            marginTop: 16,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}

/* ── Multi-image badge (two overlapping squares) ── */
function MultiImageBadge() {
  const box = {
    position: 'absolute',
    width: 14,
    height: 14,
    border: '1.5px solid white',
    borderRadius: 2,
    background: 'transparent',
  };
  return (
    <div
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        width: 18,
        height: 18,
      }}
    >
      <div style={{ ...box, top: 0, left: 0 }} />
      <div style={{ ...box, top: 3, left: 3 }} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   ProfileTabs
   ══════════════════════════════════════════════ */
export default function ProfileTabs({
  userId,
  role = 'consumer',
  isOwn = false,
  onPostClick,
  onProductClick,
}) {
  const navigate = useNavigate();

  useEffect(injectPulseStyle, []);

  const tabs = getTabsForRole(role, isOwn);
  const [activeTab, setActiveTab] = useState('posts');

  /* data stores — null means not yet fetched */
  const [postsData, setPostsData] = useState(null);
  const [reelsData, setReelsData] = useState(null);
  const [productsData, setProductsData] = useState(null);
  const [recipesData, setRecipesData] = useState(null);
  const [savedData, setSavedData] = useState(null);

  const [loading, setLoading] = useState({});

  /* reset cached data when userId changes */
  useEffect(() => {
    setPostsData(null);
    setReelsData(null);
    setProductsData(null);
    setRecipesData(null);
    setSavedData(null);
    setLoading({});
  }, [userId]);

  const dataMap = {
    posts: postsData,
    reels: reelsData,
    products: productsData,
    recipes: recipesData,
    saved: savedData,
  };

  const setterMap = {
    posts: setPostsData,
    reels: setReelsData,
    products: setProductsData,
    recipes: setRecipesData,
    saved: setSavedData,
  };

  const endpointMap = {
    posts: `/users/${userId}/posts`,
    reels: `/users/${userId}/reels`,
    products: `/users/${userId}/products`,
    recipes: `/users/${userId}/recipes`,
    saved: `/users/me/saved-posts`,
  };

  const fetchTab = useCallback(
    async (tabId) => {
      if (dataMap[tabId] !== null) return;
      setLoading((prev) => ({ ...prev, [tabId]: true }));
      try {
        const res = await apiClient.get(endpointMap[tabId]);
        const items = Array.isArray(res) ? res : res?.results ?? res?.items ?? res?.data ?? [];
        setterMap[tabId](items);
      } catch {
        setterMap[tabId]([]);
      } finally {
        setLoading((prev) => ({ ...prev, [tabId]: false }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, postsData, reelsData, productsData, recipesData, savedData],
  );

  /* fetch on mount (posts) and on tab change */
  useEffect(() => {
    fetchTab(activeTab);
  }, [activeTab, fetchTab]);

  /* ── Tab bar ── */
  const tabBar = (
    <div
      style={{
        position: 'sticky',
        top: 52,
        zIndex: 30,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'stretch',
      }}
    >
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
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 0',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              position: 'relative',
              color: isActive ? 'var(--color-black)' : 'var(--color-stone)',
              transition: 'color 150ms',
            }}
          >
            <TabIcon size={22} />
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '20%',
                  right: '20%',
                  height: 2,
                  background: 'var(--color-black)',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );

  /* ── Content renderers ── */

  function renderPosts() {
    const data = postsData;
    if (loading.posts || data === null) return <SkeletonGrid />;
    if (data.length === 0) {
      return isOwn ? (
        <EmptyState
          icon={Camera}
          title="Comparte tu primera foto"
          buttonLabel="Crear publicaci\u00f3n"
          onButtonClick={() => navigate('/create/post')}
        />
      ) : (
        <EmptyState icon={Camera} title="Sin publicaciones todav\u00eda" />
      );
    }
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2,
        }}
      >
        {data.map((post, i) => {
          const src =
            (post.images && post.images.length > 0 && post.images[0]) ||
            post.image_url;
          const hasMultiple = post.images && post.images.length > 1;
          return (
            <div
              key={post.id || post.post_id || i}
              onClick={() => onPostClick?.(post)}
              onKeyDown={(e) => { if (e.key === 'Enter') onPostClick?.(post); }}
              role="button"
              tabIndex={0}
              style={{
                position: 'relative',
                aspectRatio: '1/1',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <img
                src={src}
                alt={post.caption ? post.caption.slice(0, 80) : 'Publicación'}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              {hasMultiple && <MultiImageBadge />}
            </div>
          );
        })}
      </div>
    );
  }

  function renderReels() {
    const data = reelsData;
    if (loading.reels || data === null) return <SkeletonGrid />;
    if (data.length === 0) {
      return isOwn ? (
        <EmptyState
          icon={Film}
          title="Sube tu primer reel"
          buttonLabel="Crear reel"
          onButtonClick={() => navigate('/create/reel')}
        />
      ) : (
        <EmptyState icon={Film} title="Sin reels todav\u00eda" />
      );
    }
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2,
        }}
      >
        {data.map((reel, i) => {
          const src =
            reel.thumbnail_url || reel.cover_url || reel.image_url || '';
          return (
            <div
              key={reel.id || reel.reel_id || i}
              onClick={() => navigate(`/reels?user=${userId}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/reels?user=${userId}`); }}
              role="button"
              tabIndex={0}
              style={{
                position: 'relative',
                aspectRatio: '1/1',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <img
                src={src}
                alt={reel.caption ? reel.caption.slice(0, 80) : 'Reel'}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              {/* Play icon overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PlaySquare
                  size={24}
                  style={{
                    color: 'white',
                    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
                  }}
                />
              </div>
              {/* View count */}
              {reel.views != null && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  }}
                >
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
    const data = productsData;
    if (loading.products || data === null)
      return <SkeletonGrid count={6} columns={2} />;
    if (data.length === 0) {
      return isOwn ? (
        <EmptyState
          icon={Package}
          title="Publica tu primer producto"
          buttonLabel="Publicar producto"
          onButtonClick={() => navigate('/producer/products')}
        />
      ) : (
        <EmptyState icon={Package} title="Sin productos" />
      );
    }
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          padding: 8,
        }}
      >
        {data.map((product, i) => {
          const src =
            product.image_url ||
            (product.images && product.images[0]) ||
            '';
          const handleProductClick = () =>
            onProductClick
              ? onProductClick(product)
              : navigate(`/products/${product.id || product.product_id}`);
          return (
            <div
              key={product.id || product.product_id || i}
              onClick={handleProductClick}
              onKeyDown={(e) => { if (e.key === 'Enter') handleProductClick(); }}
              role="button"
              tabIndex={0}
              style={{
                background: 'var(--color-white)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <img
                src={src}
                alt={product.name || product.title || 'Producto'}
                loading="lazy"
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <div style={{ padding: 8 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-black)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}
                >
                  {product.name || product.title}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-black)',
                    margin: '4px 0 0',
                  }}
                >
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
    const data = recipesData;
    if (loading.recipes || data === null)
      return <SkeletonGrid count={6} columns={2} aspectRatio="4/3" />;
    if (data.length === 0) {
      return isOwn ? (
        <EmptyState
          icon={BookOpen}
          title="Comparte tu primera receta"
          buttonLabel="Crear receta"
          onButtonClick={() => navigate('/create/recipe')}
        />
      ) : (
        <EmptyState icon={BookOpen} title="Sin recetas todav\u00eda" />
      );
    }
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          padding: 8,
        }}
      >
        {data.map((recipe, i) => {
          const src =
            recipe.image_url ||
            (recipe.images && recipe.images[0]) ||
            '';
          const recipeUrl = `/recipes/${recipe.id || recipe.recipe_id}`;
          return (
            <div
              key={recipe.id || recipe.recipe_id || i}
              onClick={() => navigate(recipeUrl)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(recipeUrl); }}
              role="button"
              tabIndex={0}
              style={{
                background: 'var(--color-white)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              <img
                src={src}
                alt={recipe.name || recipe.title || 'Receta'}
                loading="lazy"
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  objectFit: 'cover',
                  display: 'block',
                  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                }}
              />
              <div style={{ padding: 8 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-black)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}
                >
                  {recipe.name || recipe.title}
                </p>
                {recipe.prep_time != null && (
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--color-stone)',
                      margin: '4px 0 0',
                    }}
                  >
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
    const data = savedData;
    if (loading.saved || data === null) return <SkeletonGrid />;
    if (data.length === 0) {
      return (
        <EmptyState icon={Bookmark} title="Nada guardado todav\u00eda" />
      );
    }
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2,
        }}
      >
        {data.map((item, i) => {
          const src =
            (item.images && item.images.length > 0 && item.images[0]) ||
            item.image_url;
          return (
            <div
              key={item.id || item.post_id || i}
              onClick={() => onPostClick?.(item)}
              onKeyDown={(e) => { if (e.key === 'Enter') onPostClick?.(item); }}
              role="button"
              tabIndex={0}
              style={{
                position: 'relative',
                aspectRatio: '1/1',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <img
                src={src}
                alt="Publicación guardada"
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
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

  return (
    <div>
      {tabBar}
      <div>{renderers[activeTab]?.()}</div>
    </div>
  );
}
