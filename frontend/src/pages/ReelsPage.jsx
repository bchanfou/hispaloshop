import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ReelCard from '../components/feed/ReelCard';
import apiClient from '../services/api/client';

export default function ReelsPage() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  const fetchReels = useCallback(async (p) => {
    try {
      const data = await apiClient.get(`/reels?page=${p}&limit=10`);
      const items = data?.reels || data?.items || data || [];
      if (items.length < 10) setHasMore(false);
      setReels((prev) => (p === 1 ? items : [...prev, ...items]));
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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

    observerRef.current = observer;
    const children = container.querySelectorAll('[data-reel-item]');
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [reels]);

  // Load more when near end
  useEffect(() => {
    if (activeIndex >= reels.length - 2 && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage);
    }
  }, [activeIndex, reels.length, hasMore, loading, page, fetchReels]);

  const handleLike = useCallback(async (reelId) => {
    try {
      await apiClient.post(`/posts/${reelId}/like`);
    } catch { /* silent */ }
  }, []);

  if (loading && reels.length === 0) {
    return (
      <div style={{
        height: '100dvh', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100dvh',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
        background: '#000',
      }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 100,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(0,0,0,0.4)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <ChevronLeft size={22} color="#fff" />
      </button>

      {reels.map((reel, idx) => (
        <div
          key={reel.id || reel.post_id || idx}
          data-reel-item
          data-index={idx}
          style={{ height: '100dvh', scrollSnapAlign: 'start' }}
        >
          <ReelCard
            reel={reel}
            isActive={idx === activeIndex}
            onLike={() => handleLike(reel.id || reel.post_id)}
          />
        </div>
      ))}

      {!hasMore && reels.length > 0 && (
        <div style={{
          height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)', fontSize: 13,
          fontFamily: 'var(--font-sans)',
        }}>
          No hay más reels
        </div>
      )}
    </div>
  );
}
