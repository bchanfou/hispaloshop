import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { AtSign, Hash, HelpCircle, MapPin, MessageCircle, Sparkles, Tag, Trash2 } from 'lucide-react';
import { ASPECT_RATIO_DIMENSIONS } from '../types/editor.types';

const DRAG_MARGIN = 12;
const SNAP_THRESHOLD = 16;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function estimateTextSize(text) {
  const width = Math.max(72, text.text.length * text.fontSize * 0.58 * (text.scale || 1));
  const height = Math.max(36, text.fontSize * 1.45 * (text.scale || 1));
  return { width, height };
}

function estimateStickerSize(sticker) {
  if (sticker.type === 'product') return { width: 180 * (sticker.scale || 1), height: 84 * (sticker.scale || 1) };
  if (sticker.type === 'gif')     return { width: 120 * (sticker.scale || 1), height: 120 * (sticker.scale || 1) };
  if (sticker.type === 'poll')    return { width: 220 * (sticker.scale || 1), height: 120 * (sticker.scale || 1) };
  if (sticker.type === 'question') return { width: 220 * (sticker.scale || 1), height: 80 * (sticker.scale || 1) };
  if (sticker.type === 'new')     return { width: 110 * (sticker.scale || 1), height: 42 * (sticker.scale || 1) };
  if (sticker.type === 'emoji')   return { width:  64 * (sticker.scale || 1), height: 64 * (sticker.scale || 1) };
  return { width: 140 * (sticker.scale || 1), height: 42 * (sticker.scale || 1) };
}

function getElementSize(type, element) {
  return type === 'text' ? estimateTextSize(element) : estimateStickerSize(element);
}

function getClampedPosition(type, element, nextX, nextY, containerSize) {
  const { width, height } = getElementSize(type, element);
  return {
    x: clamp(nextX, DRAG_MARGIN, Math.max(DRAG_MARGIN, containerSize.width - width - DRAG_MARGIN)),
    y: clamp(nextY, DRAG_MARGIN, Math.max(DRAG_MARGIN, containerSize.height - height - DRAG_MARGIN)),
  };
}

function getSnappedPosition(type, element, nextPosition, containerSize) {
  const size = getElementSize(type, element);
  const centerX = (containerSize.width - size.width) / 2;
  const centerY = (containerSize.height - size.height) / 2;
  const safeTop = containerSize.height * 0.12;
  const safeBottom = containerSize.height * 0.82;
  const guides = { vertical: false, horizontal: false, safeTop: false, safeBottom: false };

  let snappedX = nextPosition.x;
  let snappedY = nextPosition.y;

  if (Math.abs(nextPosition.x - centerX) <= SNAP_THRESHOLD) {
    snappedX = centerX;
    guides.vertical = true;
  }
  if (Math.abs(nextPosition.y - centerY) <= SNAP_THRESHOLD) {
    snappedY = centerY;
    guides.horizontal = true;
  }
  if (Math.abs(nextPosition.y - safeTop) <= SNAP_THRESHOLD) {
    snappedY = safeTop;
    guides.safeTop = true;
  }
  if (Math.abs(nextPosition.y + size.height - safeBottom) <= SNAP_THRESHOLD) {
    snappedY = safeBottom - size.height;
    guides.safeBottom = true;
  }

  return {
    position: getClampedPosition(type, element, snappedX, snappedY, containerSize),
    guides,
  };
}

function getFontFamily(fontFamily) {
  if (fontFamily === 'serif') return 'Georgia, Cambria, "Times New Roman", serif';
  if (fontFamily === 'handwritten') return '"Brush Script MT", "Segoe Script", cursive';
  return 'ui-sans-serif, system-ui, sans-serif';
}

// ── Draggable element wrapper with pinch/rotate/drag ──────────────────────────
function GestureElement({ id, type, x, y, rotation, scale, readOnly, containerSize, onUpdate, onRemove, children }) {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const bind = useGesture(
    {
      onDrag: ({ movement: [mx, my], first, last, event }) => {
        if (readOnly) return;
        event?.stopPropagation?.();
        if (first) setIsDragging(true);

        const newX = (x || 0) + mx;
        const newY = (y || 0) + my;
        const snapped = getSnappedPosition(type, { x: newX, y: newY, scale: scale || 1, text: '', fontSize: 32 }, { x: newX, y: newY }, containerSize);
        onUpdate(id, { x: snapped.position.x, y: snapped.position.y });

        if (last) {
          setIsDragging(false);
          // Trash detection
          const rect = ref.current?.getBoundingClientRect();
          if (rect && rect.bottom > window.innerHeight - 100) {
            onRemove(id);
          }
        }
      },
      onPinch: ({ offset: [s, r], event }) => {
        if (readOnly) return;
        event?.stopPropagation?.();
        onUpdate(id, {
          scale: clamp(s, 0.3, 4),
          rotation: r,
        });
      },
    },
    {
      drag: { from: () => [0, 0], filterTaps: true },
      pinch: { scaleBounds: { min: 0.3, max: 4 }, rubberband: true, from: () => [scale || 1, rotation || 0] },
    }
  );

  return (
    <motion.div
      ref={ref}
      {...(readOnly ? {} : bind())}
      className={`absolute touch-none select-none ${readOnly ? '' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        left: x,
        top: y,
        transform: `rotate(${rotation || 0}deg) scale(${scale || 1})`,
        transformOrigin: 'top left',
        zIndex: isDragging ? 50 : 10,
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Drawing canvas layer ──────────────────────────────────────────────────────
function DrawingLayer({ width, height, activeToolMode, drawColor, drawSize, drawTool, editor }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const currentPath = useRef([]);

  // Redraw all paths when paths change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    editor.drawingPaths.forEach((path) => {
      if (path.points.length < 2) return;
      ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = path.tool === 'highlighter' ? 0.4 : 1;
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }, [editor.drawingPaths]);

  useEffect(() => {
    if (activeToolMode !== 'draw') return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches?.[0] || e;
      return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    const onStart = (e) => {
      e.preventDefault();
      isDrawing.current = true;
      currentPath.current = [getPos(e)];
    };

    const onMove = (e) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const pos = getPos(e);
      currentPath.current.push(pos);

      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = drawTool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = drawTool === 'highlighter' ? 0.4 : 1;

      const path = currentPath.current;
      if (path.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(path[path.length - 2].x, path[path.length - 2].y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const onEnd = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (currentPath.current.length > 1) {
        editor.addDrawingPath({
          points: [...currentPath.current],
          color: drawColor,
          size: drawSize,
          tool: drawTool,
        });
      }
      currentPath.current = [];
    };

    canvas.addEventListener('pointerdown', onStart);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onEnd);
    canvas.addEventListener('pointerleave', onEnd);

    return () => {
      canvas.removeEventListener('pointerdown', onStart);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onEnd);
      canvas.removeEventListener('pointerleave', onEnd);
    };
  }, [activeToolMode, drawColor, drawSize, drawTool, editor]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(width * 2)}
      height={Math.round(height * 2)}
      className="absolute inset-0 h-full w-full"
      style={{
        pointerEvents: activeToolMode === 'draw' ? 'auto' : 'none',
        touchAction: 'none',
        zIndex: 15,
      }}
    />
  );
}

// ── Main CanvasEditor ─────────────────────────────────────────────────────────
function CanvasEditor({
  editor, aspectRatio, activeTool, contentType = 'post', readOnly = false,
  drawColor = '#FFFFFF', drawSize = 3, drawTool = 'pen',
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [snapGuides, setSnapGuides] = useState({
    vertical: false, horizontal: false, safeTop: false, safeBottom: false,
  });

  const currentImage = editor.images[editor.currentImageIndex];
  const templateId = editor.compositionSettings?.templateId || 'free';
  const previewFrame = editor.compositionSettings?.previewFrame || 'clean';

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const updateSize = () => {
      const container = containerRef.current?.getBoundingClientRect();
      if (!container) return;

      const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];
      const containerAspect = container.width / container.height;
      const mediaAspect = dims.width / dims.height;

      let width;
      let height;

      if (containerAspect > mediaAspect) {
        height = container.height * 0.92;
        width = height * mediaAspect;
      } else {
        width = container.width * 0.92;
        height = width / mediaAspect;
      }

      setContainerSize({ width, height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [aspectRatio, currentImage]);

  const handleElementUpdate = useCallback((id, updates) => {
    const isText = editor.textElements.some((t) => t.id === id);
    if (isText) {
      editor.updateText(id, updates);
    } else {
      editor.updateElement(id, updates);
    }
    setIsDraggingAny(true);
    // Check trash zone
    if (updates.y !== undefined) {
      setIsOverTrash(updates.y > containerSize.height * 0.85);
    }
  }, [containerSize.height, editor]);

  const handleElementRemove = useCallback((id) => {
    const isText = editor.textElements.some((t) => t.id === id);
    if (isText) {
      editor.removeText(id);
    } else {
      editor.removeElement(id);
    }
    setIsDraggingAny(false);
    setIsOverTrash(false);
  }, [editor]);

  const surfaceStyle = useMemo(() => ({
    width: containerSize.width,
    height: containerSize.height,
  }), [containerSize.height, containerSize.width]);

  const safeZoneStyle = useMemo(() => {
    if (contentType !== 'story' && contentType !== 'reel') return null;
    return {
      top: `${containerSize.height * 0.12}px`,
      bottom: `${containerSize.height * 0.18}px`,
      left: '20px',
      right: '20px',
    };
  }, [containerSize.height, contentType]);

  // Video sync
  useEffect(() => {
    if (!videoRef.current || currentImage?.type !== 'video') return undefined;

    const video = videoRef.current;
    const syncPlayback = () => {
      const trimStart = editor.reelSettings?.trimStart || 0;
      const trimEnd = editor.reelSettings?.trimEnd || video.duration || 0;
      const baseRate = editor.reelSettings?.playbackRate || 1;
      const useSlowMotion =
        editor.reelSettings?.slowMotionEnabled &&
        video.currentTime >= (editor.reelSettings?.slowMotionStart || trimStart) &&
        video.currentTime <= (editor.reelSettings?.slowMotionEnd || trimEnd);

      video.muted = editor.reelSettings?.isMuted ?? true;
      video.playbackRate = useSlowMotion ? 0.5 : baseRate;

      if (video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      if (trimEnd > trimStart && video.currentTime >= trimEnd - 0.05) {
        video.currentTime = trimStart;
        video.play().catch(() => {});
      }
    };

    const handleLoadedMetadata = () => {
      editor.setReelDuration(video.duration || 0);
      if (!readOnly) {
        video.currentTime = editor.reelSettings?.trimStart || 0;
        video.play().catch(() => {});
      }
      syncPlayback();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', syncPlayback);
    if (video.readyState >= 1) handleLoadedMetadata();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', syncPlayback);
    };
  }, [currentImage?.src, currentImage?.type, editor, readOnly]);

  if (!currentImage) return null;

  const mediaTransform = `rotate(${editor.rotation}deg) scaleX(${editor.flipHorizontal ? -editor.zoom : editor.zoom}) scaleY(${editor.flipVertical ? -editor.zoom : editor.zoom}) translate(${editor.pan.x}px, ${editor.pan.y}px)`;

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <motion.div
        animate={{ scale: readOnly ? 1 : templateId === 'free' ? 1 : 1.01, y: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className={`relative ${previewFrame === 'story' || previewFrame === 'reel' ? 'rounded-[34px] bg-stone-900 p-3 shadow-[0_34px_80px_rgba(0,0,0,0.38)]' : ''}`}
      >
        {(previewFrame === 'story' || previewFrame === 'reel') ? (
          <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-1.5 w-20 -translate-x-1/2 rounded-full bg-white/30" />
        ) : null}

        <div
          data-canvas-surface="true"
          className="relative overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-[0_28px_70px_rgba(0,0,0,0.35)]"
          style={surfaceStyle}
        >
          {/* Media layer */}
          {currentImage.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentImage.src}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: editor.getFilterString(), transform: mediaTransform }}
              controls={readOnly}
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={currentImage.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: editor.getFilterString(), transform: mediaTransform }}
              draggable={false}
            />
          )}

          {/* Template overlay */}
          <motion.div
            key={templateId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
            className={`pointer-events-none absolute inset-0 ${
              templateId === 'headline'
                ? 'bg-[linear-gradient(180deg,rgba(15,15,15,0.42),rgba(15,15,15,0.08)_38%,rgba(15,15,15,0.02)_100%)]'
                : templateId === 'footer'
                  ? 'bg-[linear-gradient(180deg,rgba(15,15,15,0.03),rgba(15,15,15,0.09)_45%,rgba(15,15,15,0.46)_100%)]'
                  : templateId === 'centered'
                    ? 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),rgba(15,15,15,0.34)_70%)]'
                    : templateId === 'product-focus'
                      ? 'bg-[linear-gradient(180deg,rgba(15,15,15,0.12),rgba(15,15,15,0.02)_28%,rgba(15,15,15,0.38)_100%)]'
                      : 'bg-gradient-to-t from-black/18 via-transparent to-black/10'
            }`}
          />

          {/* Drawing layer */}
          {!readOnly && containerSize.width > 0 && (
            <DrawingLayer
              width={containerSize.width}
              height={containerSize.height}
              activeToolMode={activeTool}
              drawColor={drawColor}
              drawSize={drawSize}
              drawTool={drawTool}
              editor={editor}
            />
          )}

          {/* Safe zone */}
          {safeZoneStyle ? (
            <div className="pointer-events-none absolute rounded-[22px] border border-dashed border-white/30" style={safeZoneStyle} />
          ) : null}

          {/* Snap guides */}
          {snapGuides.vertical ? <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-white/55" /> : null}
          {snapGuides.horizontal ? <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/55" /> : null}
          {snapGuides.safeTop ? <div className="pointer-events-none absolute left-0 right-0 h-px bg-stone-300/80" style={{ top: `${containerSize.height * 0.12}px` }} /> : null}
          {snapGuides.safeBottom ? <div className="pointer-events-none absolute left-0 right-0 h-px bg-stone-300/80" style={{ top: `${containerSize.height * 0.82}px` }} /> : null}

          {/* Text elements with gesture support */}
          {editor.textElements.map((text) => (
            <GestureElement
              key={text.id}
              id={text.id}
              type="text"
              x={text.x}
              y={text.y}
              rotation={text.rotation}
              scale={text.scale}
              readOnly={readOnly}
              containerSize={containerSize}
              onUpdate={handleElementUpdate}
              onRemove={handleElementRemove}
            >
              <span
                className="inline-block max-w-[240px] whitespace-pre-wrap break-words leading-[1.12]"
                style={{
                  fontSize: text.fontSize,
                  fontFamily: getFontFamily(text.fontFamily),
                  color: text.color,
                  backgroundColor: text.hasBackground ? text.backgroundColor : 'transparent',
                  padding: text.hasBackground ? '10px 14px' : '0',
                  borderRadius: text.hasBackground ? '14px' : '0',
                  textShadow: text.textStyle === 'neon'
                    ? `0 0 10px ${text.color}, 0 0 20px ${text.color}, 0 0 40px ${text.color}`
                    : text.textStyle === 'shadow'
                      ? '4px 4px 8px rgba(0,0,0,0.6)'
                      : text.hasOutline ? '0 1px 10px rgba(0,0,0,0.35)' : 'none',
                  fontWeight: text.fontWeight || (text.fontFamily === 'minimal' ? 400 : 600),
                  letterSpacing: `${text.letterSpacing || 0}px`,
                  textAlign: text.textAlign || 'left',
                  WebkitTextStroke: text.textStyle === 'outline' ? `2px ${text.color}` : 'none',
                }}
              >
                {text.text}
              </span>
            </GestureElement>
          ))}

          {/* Sticker elements with gesture support */}
          {editor.stickerElements.map((sticker) => (
            <GestureElement
              key={sticker.id}
              id={sticker.id}
              type="sticker"
              x={sticker.x}
              y={sticker.y}
              rotation={sticker.rotation}
              scale={sticker.scale}
              readOnly={readOnly}
              containerSize={containerSize}
              onUpdate={handleElementUpdate}
              onRemove={handleElementRemove}
            >
              <StickerContent sticker={sticker} />
            </GestureElement>
          ))}

          {/* Trash drop zone */}
          <AnimatePresence>
            {!readOnly && isDraggingAny && (
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="absolute bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center justify-center"
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-md transition-all duration-150"
                  style={{
                    background: isOverTrash ? '#FF3B30' : 'rgba(0,0,0,0.6)',
                    border: isOverTrash ? '2px solid #FF3B30' : '1.5px solid rgba(255,255,255,0.3)',
                    transform: isOverTrash ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  <Trash2 size={22} color="white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Helper labels */}
          {!readOnly ? (
            <>
              <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-3 py-2 text-xs font-medium text-white/85 backdrop-blur-sm">
                {contentType === 'story' || contentType === 'reel' ? 'Zona segura' : 'Snap suave'}
              </div>
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-2 text-xs font-medium text-white/85 backdrop-blur-sm">
                {activeTool === 'draw'
                  ? 'Dibuja sobre la imagen'
                  : activeTool === 'text'
                    ? 'Arrastra · Pinch para escalar · 2 dedos para rotar'
                    : activeTool === 'sticker' || activeTool === 'product'
                      ? 'Arrastra para colocar'
                      : 'Ajusta y mira el resultado'}
              </div>
            </>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

// ── Sticker content renderer ──────────────────────────────────────────────────
function StickerContent({ sticker }) {
  if (sticker.type === 'gif') {
    return (
      <img
        src={sticker.src}
        alt={sticker.alt || 'GIF'}
        className="rounded-lg"
        style={{ width: 120, height: 'auto' }}
        draggable={false}
      />
    );
  }

  if (sticker.type === 'poll') {
    return (
      <div className="w-[220px] overflow-hidden rounded-2xl border border-white/20 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
        <p className="mb-2 text-center text-sm font-semibold text-stone-950">{sticker.question || 'Encuesta'}</p>
        <div className="flex gap-2">
          {(sticker.options || ['Sí', 'No']).map((opt, i) => (
            <div key={i} className="flex-1 rounded-full bg-stone-100 py-2 text-center text-xs font-medium text-stone-700">
              {opt}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sticker.type === 'question') {
    return (
      <div className="w-[220px] overflow-hidden rounded-2xl border border-white/20 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
        <p className="mb-2 text-center text-xs font-medium text-stone-500">{sticker.text || 'Hazme una pregunta'}</p>
        <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
          <HelpCircle className="h-4 w-4 text-stone-400" />
          <span className="text-xs text-stone-400">Escribe aquí...</span>
        </div>
      </div>
    );
  }

  if (sticker.type === 'mention') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-lg">
        <AtSign className="h-3.5 w-3.5" />
        {sticker.username || 'usuario'}
      </div>
    );
  }

  if (sticker.type === 'hashtag') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-lg">
        <Hash className="h-3.5 w-3.5" />
        {sticker.tag || 'hashtag'}
      </div>
    );
  }

  if (sticker.type === 'product') {
    return (
      <div className="w-44 overflow-hidden rounded-2xl border border-white/20 bg-white shadow-lg">
        <div className="flex h-16 items-center gap-3 p-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-stone-100">
            {sticker.productImage ? (
              <img src={sticker.productImage} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-stone-950">{sticker.productName}</p>
            <p className="mt-1 text-xs text-stone-500">EUR {sticker.productPrice}</p>
          </div>
        </div>
      </div>
    );
  }

  if (sticker.type === 'emoji') {
    return (
      <div className="flex items-center justify-center" style={{ fontSize: 48, lineHeight: 1 }}>
        {sticker.content}
      </div>
    );
  }

  if (sticker.type === 'new') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-4 py-2 text-sm font-semibold text-stone-950 shadow-lg">
        <Sparkles className="h-4 w-4" />
        Novedad
      </div>
    );
  }

  if (sticker.type === 'location') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-4 py-2 text-sm font-medium text-stone-950 shadow-lg">
        <MapPin className="h-4 w-4" />
        {sticker.content || 'Ubicacion'}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-lg">
      <Tag className="h-4 w-4" />
      EUR {sticker.content || '0,00'}
    </div>
  );
}

export default CanvasEditor;
