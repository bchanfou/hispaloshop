import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import apiClient from '../../services/api/client';
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

// ── Tabs "Para ti / Amigos" — fixed overlay encima de todos los reels ──────
function ReelsTopBar({ activeTab, onTabChange, onBack }) {
  const tabs = [
    { id: 'parati',  label: 'Para ti' },
    { id: 'amigos',  label: 'Amigos' },
  ];

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50"
      aria-hidden="false"
    >
      {/* Gradient fondo para que los controles sean legibles */}
      <div className="h-24 bg-gradient-to-b from-black/55 to-transparent" />

      {/* Controles: camera | tabs | dots */}
      <div
        className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)' }}
      >
        {/* Cámara — crear reel */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center active:opacity-70"
        >
          <Camera className="h-[26px] w-[26px] text-white drop-shadow" strokeWidth={1.8} />
        </button>

        {/* Tabs centrados */}
        <div className="flex items-end gap-5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative pb-1 text-[15px] font-semibold drop-shadow transition-all active:opacity-70 ${
                  isActive ? 'text-white' : 'text-white/50'
                }`}
              >
                {tab.label}
                {/* underline activo */}
                {isActive ? (
                  <span className="absolute bottom-0 left-1/2 h-[2px] w-4/5 -translate-x-1/2 rounded-full bg-white" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* ⋯ Opciones */}
        <button
          type="button"
          aria-label="Opciones"
          className="flex h-10 w-10 items-center justify-center active:opacity-70"
        >
          <svg className="h-6 w-6 fill-white drop-shadow" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="5"  r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ReelsContainer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialId = searchParams.get('id');

  const [activeTab, setActiveTab]     = useState('parati');
  const [reels, setReels]             = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [error, setError]             = useState(null);
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
        <p className="mb-2 text-lg font-semibold">{error || 'Aún no hay reels disponibles'}</p>
        <p className="mb-6 text-sm text-white/60">Vuelve más tarde o sé el primero en publicar un reel.</p>
        <button onClick={() => navigate(-1)} className="rounded-full bg-white/10 px-6 py-2 text-sm">Volver</button>
      </div>
    );
  }

  return (
    <>
      {/* ── Top bar global (Para ti / Amigos) ── */}
      <ReelsTopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => navigate(-1)}
      />

      {/* ── Scroll container ── */}
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
            <p className="mb-2 text-lg font-semibold">¡Has visto todo!</p>
            <p className="mb-4 text-sm text-white/70">Vuelve más tarde para ver más contenido</p>
            <button
              onClick={() => { setCurrentIndex(0); scrollToReel(0); }}
              className="rounded-full bg-white/10 px-6 py-2 text-sm font-medium"
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
