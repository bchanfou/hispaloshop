import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, UserPlus } from 'lucide-react';
import ReelCard from './ReelCard';
import PostCard from './PostCard';
import FeedSkeleton from './FeedSkeleton';

// Mock data para reels (70% del feed)
const MOCK_REELS = [
  {
    id: 'r1',
    type: 'reel',
    user: { id: 'u1', name: 'cortijo_andaluz', avatar: 'https://i.pravatar.cc/150?u=1' },
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=700&fit=crop',
    caption: 'Así prensamos nuestro aceite de oliva virgen extra 🫒✨ #AOVE #Artesanal',
    likes: 3420,
    liked: false,
    comments: 128,
    shares: 45,
    productTag: { id: 'p1', name: 'Aceite EVOO Premium', price: 15.90, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=100&h=100&fit=crop' },
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'r2',
    type: 'reel',
    user: { id: 'u2', name: 'queseria_antigua', avatar: 'https://i.pravatar.cc/150?u=2' },
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1568627175730-73d05c79fa0f?w=400&h=700&fit=crop',
    caption: '12 meses de curación para el mejor sabor 🧀 #QuesoManchego #Tradición',
    likes: 5670,
    liked: true,
    comments: 234,
    shares: 89,
    productTag: { id: 'p2', name: 'Queso Curado 12m', price: 22.50, image: 'https://images.unsplash.com/photo-1568627175730-73d05c79fa0f?w=100&h=100&fit=crop' },
    timestamp: Date.now() - 7200000,
  },
  {
    id: 'r3',
    type: 'reel',
    user: { id: 'u3', name: 'miel_naturaleza', avatar: 'https://i.pravatar.cc/150?u=3' },
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=700&fit=crop',
    caption: 'Directo de la colmena a tu mesa 🍯🐝 Sin aditivos #MielPura',
    likes: 2890,
    liked: false,
    comments: 67,
    shares: 23,
    timestamp: Date.now() - 10800000,
  },
  {
    id: 'r4',
    type: 'reel',
    user: { id: 'u4', name: 'embutidos_reyes', avatar: 'https://i.pravatar.cc/150?u=4' },
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=400&h=700&fit=crop',
    caption: 'Cortando jamón ibérico de bellota 🔪🐷 Un arte que requiere años de práctica',
    likes: 8910,
    liked: false,
    comments: 456,
    shares: 234,
    productTag: { id: 'p4', name: 'Jamón Ibérico', price: 89.00, image: 'https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=100&h=100&fit=crop' },
    timestamp: Date.now() - 14400000,
  },
];

// Posts trending (20% del feed)
const MOCK_POSTS = [
  {
    id: 'p1',
    type: 'post',
    user: { id: 'u5', name: 'Vinos Premium', avatar: 'https://i.pravatar.cc/150?u=5', verified: true },
    media: [{ url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop', ratio: '1:1' }],
    caption: 'Nueva añada 2024 🍷 Rioja Reserva disponible ahora',
    likes: 890,
    comments: 45,
    productTag: { id: 'p5', name: 'Rioja Reserva 2020', price: 24.90 },
    timestamp: Date.now() - 1800000,
  },
];

// Sugerencias de perfiles (10%)
const SUGGESTED_PROFILES = [
  { id: 's1', name: 'Panadería Artesanal', avatar: 'https://i.pravatar.cc/150?u=6', followers: '12.5k' },
  { id: 's2', name: 'Conservas Doña Maria', avatar: 'https://i.pravatar.cc/150?u=7', followers: '8.2k' },
  { id: 's3', name: 'Chocolates Finos', avatar: 'https://i.pravatar.cc/150?u=8', followers: '15.1k' },
];

function SuggestedProfiles() {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white p-4 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[#E6A532]" />
        <h3 className="text-sm font-semibold text-[#1A1A1A]">
          {t('feed.suggestedForYou', 'Sugerencias para ti')}
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {SUGGESTED_PROFILES.map((profile) => (
          <div
            key={profile.id}
            className="flex-shrink-0 flex flex-col items-center p-3 bg-stone-50 rounded-xl w-28"
          >
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-14 h-14 rounded-full mb-2"
            />
            <p className="text-xs font-medium text-[#1A1A1A] text-center truncate w-full">
              {profile.name}
            </p>
            <p className="text-[10px] text-[#6B7280]">{profile.followers} seguidores</p>
            <button className="mt-2 flex items-center gap-1 px-3 py-1 bg-[#2D5A3D] text-white text-xs rounded-full">
              <UserPlus className="w-3 h-3" />
              Seguir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReelGrid({ reels, onOpenFullscreen }) {
  return (
    <div className="grid grid-cols-2 gap-1 p-1">
      {reels.map((reel) => (
        <ReelCard
          key={reel.id}
          reel={reel}
          isInFeed={true}
          onOpenFullscreen={onOpenFullscreen}
        />
      ))}
    </div>
  );
}

function ForYouFeed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [fullscreenReel, setFullscreenReel] = useState(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(false);

  // Generar feed mixto: 70% reels, 20% posts, 10% sugerencias
  const generateMixedFeed = useCallback(() => {
    const feed = [];
    const reelCount = 4;
    
    for (let i = 0; i < reelCount; i++) {
      feed.push(MOCK_REELS[i % MOCK_REELS.length]);
    }
    
    feed.push({ type: 'suggested', id: `suggested-${page}` });
    
    if (page % 2 === 0) {
      feed.push(MOCK_POSTS[0]);
    }
    
    return feed.map((item, idx) => ({
      ...item,
      uniqueId: `${item.id || item.type}-${page}-${idx}`,
    }));
  }, [page]);

  // Cargar inicial
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 600));
      setItems(generateMixedFeed());
      setLoading(false);
    };
    loadInitial();
  }, []);

  // Cargar más
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    if (page >= 5) {
      setHasMore(false);
    } else {
      const newItems = generateMixedFeed();
      setItems(prev => [...prev, ...newItems]);
      setPage(prev => prev + 1);
    }
    
    loadingRef.current = false;
  }, [page, hasMore, generateMixedFeed]);

  // Intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  const handleOpenFullscreen = (reel) => {
    navigate(`/reels?id=${reel.id}`);
  };

  if (loading) {
    return <FeedSkeleton count={4} type="mixed" />;
  }

  // Agrupar reels para mostrar en grid de 2x2
  const renderFeed = () => {
    const elements = [];
    let currentReels = [];
    
    items.forEach((item, idx) => {
      if (item.type === 'reel') {
        currentReels.push(item);
        
        if (currentReels.length === 4 || idx === items.length - 1) {
          elements.push(
            <ReelGrid
              key={`grid-${idx}`}
              reels={currentReels}
              onOpenFullscreen={handleOpenFullscreen}
            />
          );
          currentReels = [];
        }
      } else if (item.type === 'suggested') {
        elements.push(<SuggestedProfiles key={item.uniqueId} />);
      } else if (item.type === 'post') {
        elements.push(<PostCard key={item.uniqueId} post={item} />);
      }
    });
    
    return elements;
  };

  return (
    <div className="pb-20">
      {renderFeed()}
      
      {/* Observer target */}
      <div ref={observerRef} className="py-8">
        {hasMore ? (
          <div className="flex items-center justify-center gap-2 text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-stone-200 border-t-[#2D5A3D] rounded-full animate-spin" />
            <span className="text-sm">{t('feed.loading', 'Cargando más...')}</span>
          </div>
        ) : (
          <div className="text-center px-4">
            <p className="text-xs text-[#6B7280]">{t('feed.noMore', 'Has visto todo')}</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-3 px-4 py-2 bg-[#2D5A3D] text-white rounded-full text-xs font-medium"
            >
              {t('feed.backToTop', 'Volver arriba')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForYouFeed;
