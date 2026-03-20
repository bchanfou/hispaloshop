import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Film } from 'lucide-react';
import ReelCard from '../components/feed/ReelCard';
import apiClient from '../services/api/client';
import { toast } from 'sonner';

const REEL_TABS = [
  { key: 'foryou', label: 'Para ti' },
  { key: 'following', label: 'Siguiendo' },
  { key: 'recipes', label: 'Recetas' },
  { key: 'producers', label: 'Productores' },
  { key: 'markets', label: 'Mercados' },
  { key: 'events', label: 'Eventos' },
];
const VALID_TABS = new Set(REEL_TABS.map((t) => t.key));

export default function ReelsPage() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(() => {
    const stored = localStorage.getItem('reels_tab');
    return stored && VALID_TABS.has(stored) ? stored : 'foryou';
  });
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
      toast.error('Error al cargar reels');
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
      await apiClient.post(`/reels/${reelId}/like`);
    } catch {
      // Optimistic UI already updated in ReelCard
    }
  }, []);

  if (loading && reels.length === 0) {
    return (
      <div className="h-dvh bg-black flex items-center justify-center" role="status" aria-label="Cargando reels">
        <Loader2 className="w-7 h-7 text-white/40 animate-spin" />
      </div>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <div className="h-dvh bg-black flex flex-col items-center justify-center gap-4 px-8">
        <button
          onClick={() => navigate(-1)}
          className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 z-[100] w-10 h-10 rounded-full bg-transparent flex items-center justify-center"
          aria-label="Volver"
        >
          <ArrowLeft className="w-[22px] h-[22px] text-white" />
        </button>
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-2">
          <Film className="w-9 h-9 text-white/50" />
        </div>
        <p className="text-white text-lg font-semibold font-sans text-center">Aún no hay reels</p>
        <p className="text-white/50 text-sm font-sans text-center -mt-2">Sé el primero en publicar</p>
        <button
          onClick={() => navigate('/create/reel')}
          className="mt-2 text-black text-sm font-semibold font-sans bg-white rounded-full px-6 py-3 border-none cursor-pointer hover:bg-stone-100 transition-colors"
        >
          Crear Reel
        </button>
        <button
          onClick={() => { setLoading(true); setPage(1); setHasMore(true); fetchReels(1); }}
          className="text-white/50 text-xs font-sans bg-transparent border-none cursor-pointer hover:text-white/80 transition-colors"
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
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* Header — horizontal tab scroll */}
      <div className="fixed top-0 left-0 right-0 z-[100] pt-[max(8px,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 px-4 pb-1">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />
          </button>
          <div className="flex gap-0 overflow-x-auto scrollbar-hide flex-1">
            {REEL_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3 py-2 text-[13px] font-semibold transition-colors whitespace-nowrap border-none cursor-pointer bg-transparent ${
                  activeTab === tab.key
                    ? 'text-white border-b-2 border-white'
                    : 'text-white/55'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {reels.map((reel, idx) => (
        <div
          key={reel.id || reel.post_id || `reel-${idx}`}
          data-reel-item
          data-index={idx}
          className="h-dvh snap-start snap-always"
        >
          <ReelCard
            reel={reel}
            isActive={idx === activeIndex}
            onLike={() => handleLike(reel.id || reel.reel_id || reel.post_id)}
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
