import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const STORY_DURATION = 5000;

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function StoryViewer({ stories, initialIndex = 0, onClose }) {
  const navigate = useNavigate();
  const [currentUserIndex, setCurrentUserIndex] = useState(initialIndex);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const touchStartY = useRef(null);
  const intervalRef = useRef(null);

  const currentStory = stories[currentUserIndex];
  const items = currentStory?.items || [];
  const currentItem = items[currentItemIndex];

  const goNext = useCallback(() => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex((i) => i + 1);
      setProgress(0);
    } else if (currentUserIndex < stories.length - 1) {
      setCurrentUserIndex((u) => u + 1);
      setCurrentItemIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentItemIndex, items.length, currentUserIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((i) => i - 1);
      setProgress(0);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex((u) => u - 1);
      setCurrentItemIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentItemIndex, currentUserIndex, onClose]);

  // Timer
  useEffect(() => {
    if (paused || !items.length) return;

    const tick = 50;
    let elapsed = 0;

    intervalRef.current = setInterval(() => {
      elapsed += tick;
      setProgress(Math.min(elapsed / STORY_DURATION, 1));
      if (elapsed >= STORY_DURATION) {
        clearInterval(intervalRef.current);
        goNext();
      }
    }, tick);

    return () => clearInterval(intervalRef.current);
  }, [currentUserIndex, currentItemIndex, paused, items.length, goNext]);

  // Reset progress on item change
  useEffect(() => {
    setProgress(0);
  }, [currentUserIndex, currentItemIndex]);

  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const threshold = rect.width * 0.4;
    if (x < threshold) {
      goPrev();
    } else {
      goNext();
    }
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    timerRef.current = setTimeout(() => setPaused(true), 200);
  };

  const handleTouchEnd = (e) => {
    clearTimeout(timerRef.current);
    setPaused(false);

    if (touchStartY.current !== null) {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (deltaY > 100) {
        onClose();
      }
    }
    touchStartY.current = null;
  };

  const handleMouseDown = () => {
    timerRef.current = setTimeout(() => setPaused(true), 200);
  };

  const handleMouseUp = () => {
    clearTimeout(timerRef.current);
    setPaused(false);
  };

  if (!currentStory || !items.length) return null;

  const user = currentStory.user;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Progress bars */}
      <div
        style={{
          display: 'flex',
          padding: '8px 8px 0',
          paddingTop: 'calc(env(safe-area-inset-top, 8px) + 8px)',
          gap: 4,
        }}
      >
        {items.map((_, i) => {
          let fillWidth;
          if (i < currentItemIndex) fillWidth = '100%';
          else if (i === currentItemIndex) fillWidth = `${progress * 100}%`;
          else fillWidth = '0%';

          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 2,
                background: 'rgba(255,255,255,0.3)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: fillWidth,
                  background: '#fff',
                  transition: i === currentItemIndex ? 'none' : 'width 0.1s',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          gap: 8,
        }}
      >
        <img
          src={user?.avatar_url || user?.profile_image}
          alt=""
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {user?.name || user?.username}
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {timeAgo(currentItem?.created_at)}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <X size={24} color="#fff" />
        </button>
      </div>

      {/* Story content + tap zones */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {currentItem?.video_url ? (
          <video
            key={currentItem.video_url}
            src={currentItem.video_url}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <img
            key={currentItem?.image_url}
            src={currentItem?.image_url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Product pill */}
        {currentItem?.products?.length > 0 && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              const product = currentItem.products[0];
              if (product?.slug || product?.id) {
                navigate(`/product/${product.slug || product.id}`);
              }
            }}
            style={{
              position: 'absolute',
              bottom: 40,
              left: 16,
              right: 16,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 'var(--radius-full)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            {currentItem.products[0]?.thumbnail && (
              <img
                src={currentItem.products[0].thumbnail}
                alt=""
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'cover',
                }}
              />
            )}
            <span
              style={{
                fontSize: 13,
                color: '#fff',
                fontFamily: 'var(--font-sans)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentItem.products[0]?.name}
            </span>
            <span
              style={{
                fontSize: 13,
                color: '#fff',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                flexShrink: 0,
              }}
            >
              {'Ver \u2192'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
