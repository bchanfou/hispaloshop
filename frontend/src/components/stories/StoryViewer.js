import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, MoreHorizontal } from 'lucide-react';
import axios from 'axios';
import { API } from '../../utils/api';

const StoryProgress = ({ slides, currentSlide, progress, isPaused }) => (
  <div className="flex gap-1 px-4 pt-2">
    {slides.map((slide, index) => (
      <div key={slide.story_id || index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
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
    axios
      .get(`${API}/stories`, { withCredentials: true })
      .then((res) => {
        if (!cancelled) {
          const groups = Array.isArray(res.data) ? res.data : [];
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
    axios
      .post(`${API}/stories/${currentSlide.story_id}/view`, {}, { withCredentials: true })
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

  return (
    <div className="fixed inset-0 bg-black z-50">
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
        <button onClick={() => navigate(-1)} className="p-2 text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="relative h-full">
        <div className="h-full flex items-center justify-center">
          {currentSlide?.image_url ? (
            <img
              src={currentSlide.image_url}
              alt="Story"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-stone-800 flex items-center justify-center">
              <p className="text-white/60 text-sm">{currentSlide?.caption || ''}</p>
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
            className="flex-1 bg-white/20 backdrop-blur-sm text-white placeholder-white/60 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:bg-white/30"
          />
          <button className="p-2 text-white">
            <Heart className="w-6 h-6" />
          </button>
          <button className="p-2 text-white">
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;
