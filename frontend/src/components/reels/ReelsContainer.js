import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingBag } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useCart } from '../../context/CartContext';
import ReelPlayer from './ReelPlayer';

/**
 * Normalise API response to the shape expected by ReelPlayer.
 */
function normalizeReel(item) {
  return {
    id: item.id || item.reel_id || item.post_id,
    videoUrl: item.video_url,
    thumbnail: item.thumbnail_url || null,
    user: {
      id: item.user?.id || item.user_id || '',
      username: item.user?.full_name || item.user_name || 'Usuario',
      avatar: item.user?.avatar_url || item.user_profile_image || null,
      verified: false,
      isFollowing: item.user?.is_followed_by_me || false,
    },
    description: item.caption || '',
    audio: {
      name: 'Sonido original',
      author: item.user?.full_name || item.user_name || 'Usuario',
      original: true,
    },
    productTag: item.tagged_product
      ? {
          id: item.tagged_product.product_id,
          name: item.tagged_product.name,
          price: item.tagged_product.price,
          image: item.tagged_product.image || '',
        }
      : null,
    stats: {
      likes: item.likes_count || 0,
      comments: item.comments_count || 0,
      shares: 0,
      isLiked: item.is_liked || false,
      isSaved: item.is_saved || false,
    },
  };
}

// ── Top overlay: back button (left) + cart badge (right) ─────────────────────
function ReelsTopBar({ onBack, cartCount }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50"
      aria-hidden="false"
    >
      {/* Top gradient for legibility */}
      <div
        style={{
          height: '15vh',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
        }}
      />

      {/* Controls */}
      <div
        className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)' }}
      >
        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <ChevronLeft size={22} strokeWidth={2} color="#fff" />
        </button>

        {/* Cart */}
        <button
          type="button"
          onClick={() => { window.location.href = '/cart'; }}
          aria-label="Carrito"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', position: 'relative',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <ShoppingBag size={20} strokeWidth={1.8} color="#fff" />
          {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--color-black)', color: '#fff',
              fontSize: 9, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-sans)',
            }}>
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function ReelsContainer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialId = searchParams.get('id');
  const { getTotalItems } = useCart();
  const cartCount = getTotalItems ? getTotalItems() : 0;

  const [reels, setReels]               = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(true);
  const [error, setError]               = useState(null);
  const skipRef      = useRef(0);
  const containerRef = useRef(null);

  const fetchReels = useCallback(async (skip = 0) => {
    const data = await apiClient.get('/reels', { params: { skip, limit: 10 } });
    const items = (data?.items || []).map(normalizeReel).filter(r => r.videoUrl);
    return { items, hasMore: data?.has_more ?? items.length === 10 };
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { items, hasMore: more } = await fetchReels(0);
        if (cancelled) return;
        skipRef.current = items.length;
        setReels(items);
        setHasMore(more);
        if (initialId && items.length > 0) {
          const idx = items.findIndex(r => r.id === initialId);
          if (idx >= 0) setCurrentIndex(idx);
        }
      } catch {
        if (!cancelled) setError('No se pudieron cargar los reels');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fetchReels, initialId]);

  const scrollToReel = (index) => {
    containerRef.current?.scrollTo({ top: index * window.innerHeight, behavior: 'smooth' });
  };

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const newIndex = Math.round(containerRef.current.scrollTop / window.innerHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentIndex(newIndex);
      if (reels[newIndex]) {
        window.history.replaceState(null, '', `/reels?id=${reels[newIndex].id}`);
      }
    }
  }, [currentIndex, reels]);

  const loadMoreReels = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { items, hasMore: more } = await fetchReels(skipRef.current);
      skipRef.current += items.length;
      setReels(prev => [...prev, ...items]);
      setHasMore(more);
    } catch { /* silently fail */ }
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, fetchReels]);

  const goToNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      scrollToReel(next);
      if (next >= reels.length - 3) loadMoreReels();
    } else {
      loadMoreReels();
    }
  }, [currentIndex, reels.length, loadMoreReels]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      scrollToReel(prev);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown')  goToNext();
      else if (e.key === 'ArrowUp')   goToPrev();
      else if (e.key === 'Escape')    navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToNext, goToPrev, navigate]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  if (error || reels.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black p-8 text-center text-white">
        <p className="mb-2 text-lg font-semibold" style={{ fontFamily: 'var(--font-sans)' }}>
          {error || 'Aún no hay reels disponibles'}
        </p>
        <p className="mb-6 text-sm text-white/60" style={{ fontFamily: 'var(--font-sans)' }}>
          Vuelve más tarde o sé el primero en publicar un reel.
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            borderRadius: 'var(--radius-full)', padding: '8px 24px',
            fontSize: 14, fontFamily: 'var(--font-sans)', cursor: 'pointer',
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Top bar: back + cart */}
      <ReelsTopBar onBack={() => navigate(-1)} cartCount={cartCount} />

      {/* Scroll container */}
      <div
        ref={containerRef}
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'smooth' }}
      >
        {reels.map((reel, index) => (
          <ReelPlayer
            key={reel.id}
            reel={reel}
            isActive={index === currentIndex}
            onNext={goToNext}
            onPrev={goToPrev}
          />
        ))}

        {loadingMore ? (
          <div className="flex h-screen items-center justify-center bg-black">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        ) : null}

        {!loadingMore && !hasMore && reels.length > 0 ? (
          <div className="flex h-screen flex-col items-center justify-center bg-black p-8 text-center text-white">
            <p className="mb-2 text-lg font-semibold" style={{ fontFamily: 'var(--font-sans)' }}>
              ¡Has visto todo!
            </p>
            <p className="mb-4 text-sm text-white/70" style={{ fontFamily: 'var(--font-sans)' }}>
              Vuelve más tarde para ver más contenido
            </p>
            <button
              onClick={() => { setCurrentIndex(0); scrollToReel(0); }}
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                borderRadius: 'var(--radius-full)', padding: '8px 24px',
                fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer',
              }}
            >
              Volver al inicio
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default ReelsContainer;
