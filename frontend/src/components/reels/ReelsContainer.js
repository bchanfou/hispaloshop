import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReelPlayer from './ReelPlayer';

// Mock reels data
const MOCK_REELS = [
  {
    id: 'r1',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=700&fit=crop',
    user: {
      id: 'u1',
      username: 'queserialaantigua',
      avatar: 'https://i.pravatar.cc/150?u=1',
      verified: true,
      isFollowing: false,
    },
    description: 'Así se hace el queso manchego curado tradicional 🧀✨ 12 meses de curación en cueva natural #quesomanchego #artesano #hispaloshop',
    hashtags: ['quesomanchego', 'artesano', 'hispaloshop', 'quesocurado'],
    audio: { name: 'Sonido original', author: 'queserialaantigua', original: true },
    productTag: {
      id: 'p1',
      name: 'Queso Manchego Curado DOP',
      price: 18.50,
      image: 'https://images.unsplash.com/photo-1568627175730-73d05c79fa0f?w=200&h=200&fit=crop',
      seller: 'Quesería La Antigua',
      rating: 4.8,
      reviews: 124,
    },
    stats: { likes: 1245, comments: 67, shares: 134, isLiked: false, isSaved: false },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r2',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=700&fit=crop',
    user: {
      id: 'u2',
      username: 'mieldelsur',
      avatar: 'https://i.pravatar.cc/150?u=2',
      verified: false,
      isFollowing: true,
    },
    description: 'Proceso de extracción de miel pura de romero 🍯 Directo de la colmena a tu mesa #mielnatural #apicultura #productolocal',
    hashtags: ['mielnatural', 'apicultura', 'productolocal'],
    audio: { name: 'Nature Sounds', author: 'mieldelsur', original: false },
    productTag: {
      id: 'p2',
      name: 'Miel de Romero Ecológica 500g',
      price: 12.90,
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop',
      seller: 'Miel del Sur',
      rating: 4.9,
      reviews: 89,
    },
    stats: { likes: 890, comments: 34, shares: 56, isLiked: true, isSaved: true },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r3',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=400&h=700&fit=crop',
    user: {
      id: 'u3',
      username: 'embutidosreyes',
      avatar: 'https://i.pravatar.cc/150?u=3',
      verified: true,
      isFollowing: false,
    },
    description: 'El arte del corte de jamón ibérico 🔪🐷 Solo los maestros cortadores logran esta perfección #jamoniberico #bellota #gourmet',
    hashtags: ['jamoniberico', 'bellota', 'gourmet'],
    audio: { name: 'Sonido original', author: 'embutidosreyes', original: true },
    productTag: {
      id: 'p3',
      name: 'Jamón Ibérico de Bellota DOP',
      price: 89.00,
      originalPrice: 110.00,
      image: 'https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?w=200&h=200&fit=crop',
      seller: 'Embutidos Reyes',
      rating: 4.9,
      reviews: 256,
    },
    stats: { likes: 3420, comments: 128, shares: 445, isLiked: false, isSaved: false },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r4',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=700&fit=crop',
    user: {
      id: 'u4',
      username: 'bodegaspremium',
      avatar: 'https://i.pravatar.cc/150?u=4',
      verified: false,
      isFollowing: false,
    },
    description: 'Cosecha 2024 🍷 El nuevo Rioja Reserva ya está disponible. Notas de frutos rojos y vainilla. #vino #rioja #reserva',
    hashtags: ['vino', 'rioja', 'reserva'],
    audio: { name: 'Elegant Jazz', author: 'bodegaspremium', original: false },
    productTag: {
      id: 'p4',
      name: 'Rioja Reserva 2020',
      price: 24.90,
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&h=200&fit=crop',
      seller: 'Bodegas Premium',
      rating: 4.7,
      reviews: 178,
    },
    stats: { likes: 2100, comments: 89, shares: 234, isLiked: false, isSaved: false },
    createdAt: new Date().toISOString(),
  },
];

function ReelsContainer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialId = searchParams.get('id');
  
  const [reels, setReels] = useState(MOCK_REELS);
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialId) {
      const index = MOCK_REELS.findIndex(r => r.id === initialId);
      return index >= 0 ? index : 0;
    }
    return 0;
  });
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const touchStartY = useRef(0);

  // Find current reel index when ID changes
  useEffect(() => {
    if (initialId) {
      const index = reels.findIndex(r => r.id === initialId);
      if (index >= 0 && index !== currentIndex) {
        setCurrentIndex(index);
        scrollToReel(index);
      }
    }
  }, [initialId, reels, currentIndex]);

  // Scroll to specific reel
  const scrollToReel = (index) => {
    if (containerRef.current) {
      const reelHeight = window.innerHeight;
      containerRef.current.scrollTo({
        top: index * reelHeight,
        behavior: 'smooth'
      });
    }
  };

  // Handle scroll snap
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const reelHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / reelHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setCurrentIndex(newIndex);
      // Update URL without navigation
      const newReelId = reels[newIndex].id;
      window.history.replaceState(null, '', `/reels?id=${newReelId}`);
    }
  }, [currentIndex, reels.length]);

  // Navigate to next/prev reel
  const goToNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollToReel(nextIndex);
    } else {
      // Load more reels
      loadMoreReels();
    }
  }, [currentIndex, reels.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollToReel(prevIndex);
    }
  }, [currentIndex]);

  // Load more reels
  const loadMoreReels = async () => {
    if (loading) return;
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add more reels (cycling through mock data)
    const newReels = MOCK_REELS.map((reel, i) => ({
      ...reel,
      id: `${reel.id}-batch-${Date.now()}-${i}`,
    }));
    
    setReels(prev => [...prev, ...newReels]);
    setLoading(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        goToNext();
      } else if (e.key === 'ArrowUp') {
        goToPrev();
      } else if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, navigate]);

  // Prevent body scroll when reels are open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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
      
      {/* Loading indicator */}
      {loading && (
        <div className="h-screen flex items-center justify-center bg-black">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      {/* End of reels message */}
      {!loading && currentIndex >= reels.length - 1 && (
        <div className="h-screen flex flex-col items-center justify-center bg-black text-white p-8 text-center">
          <p className="text-lg font-semibold mb-2">¡Has visto todo!</p>
          <p className="text-sm text-white/70 mb-4">Vuelve más tarde para ver más contenido</p>
          <button
            onClick={() => {
              setCurrentIndex(0);
              scrollToReel(0);
            }}
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
