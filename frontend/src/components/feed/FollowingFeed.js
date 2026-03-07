import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PostCard from './PostCard';
import ReelCard from './ReelCard';
import FeedSkeleton from './FeedSkeleton';

// Mock data para desarrollo
const MOCK_POSTS = [
  {
    id: 'p1',
    type: 'post',
    user: { id: 'u1', name: 'Cortijo Andaluz', avatar: 'https://i.pravatar.cc/150?u=cortijo', verified: true },
    media: [{ url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&h=600&fit=crop', ratio: '1:1' }],
    caption: 'Nueva cosecha de aceite temprano 🫒 El sabor de Andalucía en cada gota #AOVE #Hispaloshop',
    likes: 234,
    liked: false,
    comments: 18,
    saved: false,
    productTag: { id: 'prod1', name: 'Aceite EVOO 500ml', price: 12.90 },
    timestamp: Date.now() - 7200000,
  },
  {
    id: 'p2',
    type: 'post',
    user: { id: 'u2', name: 'Quesería La Antigua', avatar: 'https://i.pravatar.cc/150?u=queseria' },
    media: [
      { url: 'https://images.unsplash.com/photo-1568627175730-73d05c79fa0f?w=600&h=600&fit=crop', ratio: '1:1' },
      { url: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=600&h=600&fit=crop', ratio: '1:1' },
    ],
    caption: 'Así madura nuestro queso manchego artesano 🧀 12 meses de curación',
    likes: 567,
    liked: true,
    comments: 42,
    saved: true,
    timestamp: Date.now() - 14400000,
  },
  {
    id: 'p3',
    type: 'post',
    user: { id: 'u3', name: 'Miel del Sur', avatar: 'https://i.pravatar.cc/150?u=miel' },
    media: [{ url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=750&fit=crop', ratio: '4:5' }],
    caption: 'Miel cruda de romero 🍃 100% natural y ecológica',
    likes: 189,
    liked: false,
    comments: 12,
    saved: false,
    productTag: { id: 'prod3', name: 'Miel Ecológica 500g', price: 8.90 },
    timestamp: Date.now() - 86400000,
  },
];

const MOCK_REELS = [
  {
    id: 'r1',
    type: 'reel',
    user: { id: 'u4', name: 'Embutidos Reyes', avatar: 'https://i.pravatar.cc/150?u=embutidos' },
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=400&h=700&fit=crop',
    caption: 'El secreto de nuestro jamón ibérico 🐷🔪',
    likes: 1205,
    comments: 45,
    shares: 89,
    productTag: { id: 'prod4', name: 'Jamón Ibérico', price: 45.00, image: 'https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=100&h=100&fit=crop' },
    timestamp: Date.now() - 1800000,
  },
];

function FollowingFeed() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);
  const loadingRef = useRef(false);

  // Mezclar posts y reels para el feed
  const mixedFeed = [...MOCK_POSTS, ...MOCK_REELS].sort((a, b) => b.timestamp - a.timestamp);

  // Cargar posts iniciales
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 800));
      setPosts(mixedFeed);
      setLoading(false);
    };
    loadInitial();
  }, []);

  // Cargar más (scroll infinito)
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simular más posts
    const morePosts = mixedFeed.map(p => ({
      ...p,
      id: `${p.id}-${page}`,
    }));
    
    if (page >= 3) {
      setHasMore(false);
    } else {
      setPosts(prev => [...prev, ...morePosts]);
      setPage(prev => prev + 1);
    }
    
    loadingRef.current = false;
  }, [page, hasMore]);

  // Intersection observer para scroll infinito
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

  if (loading) {
    return <FeedSkeleton count={3} />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-20 h-20 mx-auto mb-4 bg-stone-100 rounded-full flex items-center justify-center">
          <span className="text-4xl">📭</span>
        </div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
          {t('feed.emptyFollowing', 'No hay publicaciones')}
        </h3>
        <p className="text-sm text-[#6B7280] mb-4">
          {t('feed.emptyFollowingDesc', 'Sigue a más productores para ver sus publicaciones aquí')}
        </p>
        <a
          href="/discover"
          className="inline-block px-6 py-2.5 bg-[#2D5A3D] text-white rounded-full text-sm font-medium"
        >
          {t('feed.discoverProfiles', 'Descubrir perfiles')}
        </a>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {posts.map((item) => (
        item.type === 'post' ? (
          <PostCard key={item.id} post={item} />
        ) : (
          <div key={item.id} className="bg-white mb-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <img
                src={item.user.avatar}
                alt={item.user.name}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-semibold">{item.user.name}</span>
            </div>
            <ReelCard reel={item} isInFeed={true} />
          </div>
        )
      ))}
      
      {/* Observer target */}
      <div ref={observerRef} className="py-8">
        {hasMore ? (
          <div className="flex items-center justify-center gap-2 text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-stone-200 border-t-[#2D5A3D] rounded-full animate-spin" />
            <span className="text-sm">{t('feed.loading', 'Cargando más...')}</span>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-[#6B7280]">{t('feed.noMore', 'No hay más publicaciones')}</p>
            <a
              href="/discover"
              className="inline-block mt-3 px-4 py-2 bg-[#2D5A3D] text-white rounded-full text-xs font-medium"
            >
              {t('feed.discoverMore', 'Descubrir más perfiles')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default FollowingFeed;
