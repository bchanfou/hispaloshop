import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Send, MoreHorizontal, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

// Mock stories data
const MOCK_STORIES_DATA = [
  {
    id: '1',
    user: { id: 'u1', username: 'cortijoandaluz', avatar: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=100' },
    slides: [
      {
        id: 's1-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600',
        duration: 5000,
        productTag: { id: 'p1', name: 'Aceite EVOO', price: 24.90, x: 50, y: 60 }
      },
      {
        id: 's1-2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=600',
        duration: 5000,
        poll: { question: '¿Te gusta fuerte o suave?', yes: 78, no: 22 }
      }
    ],
    views: 234,
    likes: 45
  },
  {
    id: '2',
    user: { id: 'u2', username: 'queserialaantigua', avatar: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=100' },
    slides: [
      {
        id: 's2-1',
        type: 'video',
        url: '/video1.mp4',
        duration: 15000,
        productTag: null
      }
    ],
    views: 189,
    likes: 34
  },
  {
    id: '3',
    user: { id: 'u3', username: 'mieldelsur', avatar: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100' },
    slides: [
      {
        id: 's3-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600',
        duration: 5000
      }
    ],
    views: 156,
    likes: 28
  }
];

const StoryProgress = ({ slides, currentSlide, progress, isPaused }) => {
  return (
    <div className="flex gap-1 px-4 pt-2">
      {slides.map((slide, index) => (
        <div key={slide.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: index < currentSlide ? '100%' : index === currentSlide ? `${progress}%` : '0%'
            }}
            transition={index === currentSlide && !isPaused ? { duration: 0.1, ease: 'linear' } : { duration: 0 }}
          />
        </div>
      ))}
    </div>
  );
};

const StoryViewer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showProduct, setShowProduct] = useState(null);
  const [replyText, setReplyText] = useState('');

  const stories = MOCK_STORIES_DATA;
  const currentStory = stories[currentStoryIndex];
  const currentSlide = currentStory?.slides[currentSlideIndex];

  // Auto-advance slides
  useEffect(() => {
    if (!currentSlide || isPaused) return;

    const duration = currentSlide.duration || 5000;
    const interval = 100; // Update every 100ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + step;
        if (next >= 100) {
          // Move to next slide or story
          if (currentSlideIndex < currentStory.slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
            return 0;
          } else if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
            setCurrentSlideIndex(0);
            return 0;
          } else {
            // End of all stories
            navigate(-1);
            return 0;
          }
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentSlide, currentSlideIndex, currentStory, currentStoryIndex, isPaused, navigate, stories.length]);

  const handleTap = (side) => {
    if (side === 'right') {
      if (currentSlideIndex < currentStory.slides.length - 1) {
        setCurrentSlideIndex(prev => prev + 1);
        setProgress(0);
      } else if (currentStoryIndex < stories.length - 1) {
        setCurrentStoryIndex(prev => prev + 1);
        setCurrentSlideIndex(0);
        setProgress(0);
      } else {
        navigate(-1);
      }
    } else {
      if (currentSlideIndex > 0) {
        setCurrentSlideIndex(prev => prev - 1);
        setProgress(0);
      } else if (currentStoryIndex > 0) {
        setCurrentStoryIndex(prev => prev - 1);
        setCurrentSlideIndex(stories[currentStoryIndex - 1].slides.length - 1);
        setProgress(0);
      }
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Progress bars */}
      <StoryProgress 
        slides={currentStory.slides} 
        currentSlide={currentSlideIndex}
        progress={progress}
        isPaused={isPaused}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          <img
            src={currentStory.user.avatar}
            alt={currentStory.user.username}
            className="w-10 h-10 rounded-full border-2 border-white"
          />
          <div>
            <p className="text-white font-semibold text-sm">{currentStory.user.username}</p>
            <p className="text-white/70 text-xs">Hace 2h</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-white">
            <MoreHorizontal className="w-6 h-6" />
          </button>
          <button onClick={handleClose} className="p-2 text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative h-full">
        {/* Slide content */}
        <div className="h-full flex items-center justify-center">
          {currentSlide?.type === 'image' ? (
            <img
              src={currentSlide.url}
              alt="Story"
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              src={currentSlide?.url}
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
            />
          )}
        </div>

        {/* Product tag */}
        {currentSlide?.productTag && (
          <button
            onClick={() => setShowProduct(currentSlide.productTag)}
            className="absolute bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg"
            style={{ left: `${currentSlide.productTag.x}%`, top: `${currentSlide.productTag.y}%` }}
          >
            <span className="text-xs font-semibold text-[#1A1A1A]">
              {currentSlide.productTag.name} · €{currentSlide.productTag.price}
            </span>
          </button>
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 flex">
          <button
            onClick={() => handleTap('left')}
            className="w-1/3 h-full"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
          <button
            onClick={() => handleTap('right')}
            className="w-2/3 h-full"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
        </div>
      </div>

      {/* Bottom interactions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        {/* Reply input */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Enviar mensaje..."
              className="w-full bg-white/20 backdrop-blur-sm text-white placeholder-white/60 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:bg-white/30"
            />
          </div>
          <button className="p-2 text-white">
          <Heart className="w-6 h-6" />
        </button>
          <button className="p-2 text-white">
            <Send className="w-6 h-6" />
          </button>
        </div>

        {/* View count */}
        <div className="flex items-center justify-center gap-4 text-white/70 text-sm">
          <span className="flex items-center gap-1">
            <Play className="w-4 h-4" />
            {currentStory.views} vistas
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {currentStory.likes}
          </span>
        </div>
      </div>

      {/* Product modal */}
      <AnimatePresence>
        {showProduct && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-20"
          >
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-[#1A1A1A]">{showProduct.name}</h3>
                <p className="text-2xl font-bold text-[#2D5A3D]">€{showProduct.price}</p>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 py-2 bg-[#2D5A3D] text-white rounded-lg text-sm font-medium">
                    Comprar
                  </button>
                  <button 
                    onClick={() => setShowProduct(null)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryViewer;
