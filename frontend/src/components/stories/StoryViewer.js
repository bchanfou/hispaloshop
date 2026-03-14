import React, { useState, useEffect, useRef, useCallback } from 'react';
import FocusTrap from 'focus-trap-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Heart, Send, MoreHorizontal } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { getCloudinarySrcSet } from '../../utils/cloudinary';

const StoryProgress = ({ slides, currentSlide, progress, isPaused }) => (
  <div className="flex gap-1 px-2 pt-2">
    {slides.map((slide, index) => (
      <div key={slide.story_id || index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-white rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: index < currentSlide ? '100%' : index === currentSlide ? `${progress}%` : '0%',
          }}
          transition={
            index === currentSlide && !isPaused ? { duration: 0.1, ease: 'linear' } : { duration: 0 }
          }
        />
      </div>
    ))}
  </div>
);

const StoryViewer = () => {
  const navigate = useNavigate();
  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`/stories`)
      .then((data) => {
        if (!cancelled) {
          const groups = Array.isArray(data) ? data : [];
          setStoryGroups(groups.filter((g) => g.stories && g.stories.length > 0));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentGroup = storyGroups[currentGroupIndex];
  const currentSlide = currentGroup?.stories[currentSlideIndex];

  // Mark viewed
  useEffect(() => {
    if (!currentSlide?.story_id) return;
    apiClient
      .post(`/stories/${currentSlide.story_id}/view`, {})
      .catch(() => {});
  }, [currentSlide]);

  // Auto-advance
  useEffect(() => {
    if (!currentSlide || isPaused || loading) return;
    const duration = 5000;
    const step = (100 / duration) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          if (currentSlideIndex < (currentGroup?.stories.length ?? 0) - 1) {
            setCurrentSlideIndex((s) => s + 1);
            return 0;
          } else if (currentGroupIndex < storyGroups.length - 1) {
            setCurrentGroupIndex((g) => g + 1);
            setCurrentSlideIndex(0);
            return 0;
          } else {
            navigate(-1);
            return 0;
          }
        }
        return next;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [currentSlide, currentSlideIndex, currentGroup, currentGroupIndex, isPaused, loading, navigate, storyGroups.length]);

  const handleTap = (side) => {
    if (side === 'right') {
      if (currentSlideIndex < (currentGroup?.stories.length ?? 0) - 1) {
        setCurrentSlideIndex((s) => s + 1);
        setProgress(0);
      } else if (currentGroupIndex < storyGroups.length - 1) {
        setCurrentGroupIndex((g) => g + 1);
        setCurrentSlideIndex(0);
        setProgress(0);
      } else {
        navigate(-1);
      }
    } else {
      if (currentSlideIndex > 0) {
        setCurrentSlideIndex((s) => s - 1);
        setProgress(0);
      } else if (currentGroupIndex > 0) {
        const prev = storyGroups[currentGroupIndex - 1];
        setCurrentGroupIndex((g) => g - 1);
        setCurrentSlideIndex(prev.stories.length - 1);
        setProgress(0);
      }
    }
  };

  const handleLikeStory = async () => {
    if (!currentSlide?.story_id) return;
    try {
      await apiClient.post(`/stories/${currentSlide.story_id}/reaction`, { reaction: 'like' });
      toast.success('Te gusta esta historia');
    } catch {
      toast.error('No se pudo registrar tu reaccion');
    }
  };

  const handleSendReply = async () => {
    const message = replyText.trim();
    if (!currentSlide?.story_id || !message) return;

    try {
      await apiClient.post(
        `/stories/${currentSlide.story_id}/reaction`,
        { reaction: 'reply', message },
      );
      setReplyText('');
      toast.success('Respuesta enviada');
    } catch {
      toast.error('No se pudo enviar la respuesta');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white p-8 text-center">
        <p className="text-lg font-semibold mb-2">No hay historias disponibles</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-2 bg-white/10 rounded-full text-sm"
        >
          Volver
        </button>
      </div>
    );
  }

  const dragY = useMotionValue(0);
  const bgOpacity = useTransform(dragY, [0, 300], [1, 0.2]);
  const scale = useTransform(dragY, [0, 300], [1, 0.85]);

  const handleDragEnd = useCallback((_, info) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      navigate(-1);
    }
  }, [navigate]);

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
    <motion.div className="fixed inset-0 bg-black z-50" style={{ opacity: bgOpacity }}>
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={handleDragEnd}
      style={{ y: dragY, scale, height: '100%' }}
    >
      <StoryProgress
        slides={currentGroup.stories}
        currentSlide={currentSlideIndex}
        progress={progress}
        isPaused={isPaused}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          {currentGroup.profile_image ? (
            <img
              src={currentGroup.profile_image}
              srcSet={getCloudinarySrcSet(currentGroup.profile_image, [40, 80, 120])}
              sizes="40px"
              alt={currentGroup.user_name}
              className="w-10 h-10 rounded-full border-2 border-white object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-white bg-stone-700 flex items-center justify-center text-white font-bold">
              {(currentGroup.user_name || 'U')[0].toUpperCase()}
            </div>
          )}
          <p className="text-white font-semibold text-sm">{currentGroup.user_name}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          aria-label="Cerrar historia"
          className="p-2 bg-black/30 backdrop-blur-sm rounded-full text-white transition-colors hover:bg-black/50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="relative h-full">
        <div className="h-full flex items-center justify-center">
          {currentSlide?.image_url ? (
            <img
              src={currentSlide.image_url}
              srcSet={getCloudinarySrcSet(currentSlide.image_url, [640, 1080, 1920])}
              sizes="100vw"
              alt="Historia"
              loading="eager"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-800 to-stone-950 flex items-center justify-center">
              <p className="text-white text-xl font-semibold text-center px-6">{currentSlide?.caption || ''}</p>
            </div>
          )}
        </div>

        {currentSlide?.caption && (
          <div className="absolute bottom-32 left-4 right-4">
            <p className="text-white text-sm bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
              {currentSlide.caption}
            </p>
          </div>
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 flex">
          <button
            className="w-1/3 h-full"
            onClick={() => handleTap('left')}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
          <button
            className="w-2/3 h-full"
            onClick={() => handleTap('right')}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          />
        </div>
      </div>

      {/* Reply bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Enviar mensaje..."
            aria-label="Responder historia"
            className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20"
          />
          <button onClick={handleLikeStory} aria-label="Dar me gusta a la historia" className="p-2 text-white">
            <Heart className="w-5 h-5" />
          </button>
          <button
            onClick={handleSendReply}
            aria-label="Enviar respuesta"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-black"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
    </motion.div>
    </FocusTrap>
  );
};

export default StoryViewer;
