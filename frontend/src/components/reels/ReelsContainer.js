import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../utils/api';
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

function ReelsContainer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialId = searchParams.get('id');

  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const skipRef = useRef(0);
  const containerRef = useRef(null);

  const fetchReels = useCallback(async (skip = 0) => {
    const res = await axios.get(`${API}/reels`, {
      params: { skip, limit: 10 },
      withCredentials: true,
    });
    const items = (res.data?.items || []).map(normalizeReel).filter(r => r.videoUrl);
    return { items, hasMore: res.data?.has_more ?? items.length === 10 };
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
      } catch (err) {
        if (!cancelled) setError('No se pudieron cargar los reels');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fetchReels, initialId]);

  const scrollToReel = (index) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: index * window.innerHeight, behavior: 'smooth' });
    }
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
    } catch (_) {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
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
      if (e.key === 'ArrowDown') goToNext();
      else if (e.key === 'ArrowUp') goToPrev();
      else if (e.key === 'Escape') navigate(-1);
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
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || reels.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white p-8 text-center">
        <p className="text-lg font-semibold mb-2">
          {error || 'Aún no hay reels disponibles'}
        </p>
        <p className="text-sm text-white/60 mb-6">
          Vuelve más tarde o sé el primero en publicar un reel.
        </p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-white/10 rounded-full text-sm">
          Volver
        </button>
      </div>
    );
  }

  return (
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

      {loadingMore && (
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {!loadingMore && !hasMore && reels.length > 0 && (
        <div className="h-screen flex flex-col items-center justify-center bg-black text-white p-8 text-center">
          <p className="text-lg font-semibold mb-2">¡Has visto todo!</p>
          <p className="text-sm text-white/70 mb-4">Vuelve más tarde para ver más contenido</p>
          <button
            onClick={() => { setCurrentIndex(0); scrollToReel(0); }}
            className="px-6 py-2 bg-[#2D5A3D] rounded-full text-sm font-medium"
          >
            Volver al inicio
          </button>
        </div>
      )}
    </div>
  );
}

export default ReelsContainer;
