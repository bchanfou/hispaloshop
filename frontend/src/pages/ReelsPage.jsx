import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import ReelCard from '../components/feed/ReelCard';
import apiClient from '../services/api/client';

const REEL_TABS = [
  { key: 'foryou', label: 'Para ti' },
  { key: 'following', label: 'Siguiendo' },
  { key: 'recipes', label: 'Recetas' },
  { key: 'producers', label: 'Productores' },
];

export default function ReelsPage() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('reels_tab') || 'foryou');
  const containerRef = useRef(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('reels_tab', activeTab);
  }, [activeTab]);

  const fetchReels = useCallback(async (p) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await apiClient.get(`/reels?skip=${(p - 1) * 10}&limit=10&tab=${activeTab}`);
      const items = data?.reels || data?.items || data || [];
      if (items.length < 10) setHasMore(false);
      setReels((prev) => (p === 1 ? items : [...prev, ...items]));
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [activeTab]);

  // Re-fetch when tab changes
  useEffect(() => {
    setReels([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    setActiveIndex(0);
    fetchReels(1);
  }, [fetchReels]);

  // Intersection observer to detect active reel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.8 }
    );

    const children = container.querySelectorAll('[data-reel-item]');
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [reels]);

  // Load more when near end
  useEffect(() => {
    if (activeIndex >= reels.length - 2 && hasMore && !loading && !fetchingRef.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage);
    }
  }, [activeIndex, reels.length, hasMore, loading, page, fetchReels]);

  // Keyboard navigation between reels
  useEffect(() => {
    const handleKey = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const next = container.querySelector(`[data-index="${activeIndex + 1}"]`);
        next?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prev = container.querySelector(`[data-index="${Math.max(0, activeIndex - 1)}"]`);
        prev?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [activeIndex]);

  const handleLike = useCallback(async (reelId) => {
    try {
      await apiClient.post(`/posts/${reelId}/like`);
    } catch {
      // Optimistic UI already updated in ReelCard
    }
  }, []);

  if (loading && reels.length === 0) {
    return (
      <div className="h-dvh bg-black flex items-center justify-center" role="status" aria-label="Cargando reels">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <div className="h-dvh bg-black flex flex-col items-center justify-center gap-4 px-8">
        <button
          onClick={() => navigate(-1)}
          className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 z-[100] w-11 h-11 rounded-full bg-black/40 flex items-center justify-center"
          aria-label="Volver"
        >
          <ChevronLeft className="w-5.5 h-5.5 text-white" />
        </button>
        <span className="text-white/60 text-sm font-sans text-center">
          No hay reels disponibles ahora mismo
        </span>
        <button
          onClick={() => { setLoading(true); setPage(1); setHasMore(true); fetchReels(1); }}
          className="text-white text-sm font-semibold font-sans bg-white/10 rounded-full px-5 py-2.5 border-none cursor-pointer hover:bg-white/20 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-dvh overflow-y-scroll snap-y snap-mandatory bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 z-[100] w-11 h-11 rounded-full bg-black/40 flex items-center justify-center"
        aria-label="Volver"
      >
        <ChevronLeft className="w-5.5 h-5.5 text-white" />
      </button>

      {/* Category tabs */}
      <div className="fixed top-12 left-0 right-0 z-[90] flex gap-1 px-4 py-2 bg-black/60 backdrop-blur-lg">
        {REEL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold cursor-pointer transition-colors border-none ${
              activeTab === tab.key ? 'bg-white text-black' : 'bg-white/10 text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {reels.map((reel, idx) => (
        <div
          key={reel.id || reel.post_id || `reel-${idx}`}
          data-reel-item
          data-index={idx}
          className="h-dvh snap-start"
        >
          <ReelCard
            reel={reel}
            isActive={idx === activeIndex}
            onLike={() => handleLike(reel.id || reel.post_id)}
            priority={idx <= 1}
          />
        </div>
      ))}

      {!hasMore && reels.length > 0 && (
        <div className="h-20 flex items-center justify-center text-white/40 text-[13px] font-sans">
          No hay más reels
        </div>
      )}
    </div>
  );
}
