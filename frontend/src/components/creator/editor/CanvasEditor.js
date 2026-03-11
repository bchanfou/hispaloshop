import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Sparkles, Tag } from 'lucide-react';
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
  if (sticker.type === 'new') return { width: 110 * (sticker.scale || 1), height: 42 * (sticker.scale || 1) };
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

function CanvasEditor({ editor, aspectRatio, activeTool, contentType = 'post', readOnly = false }) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [dragState, setDragState] = useState(null);
  const [snapGuides, setSnapGuides] = useState({
    vertical: false,
    horizontal: false,
    safeTop: false,
    safeBottom: false,
  });

  const currentImage = editor.images[editor.currentImageIndex];

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

  const handlePointerDown = useCallback((event, type, id) => {
    if (readOnly) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    setDragState({
      id,
      type,
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
  }, [readOnly]);

  useEffect(() => {
    if (!dragState || readOnly || !containerRef.current) return undefined;

    const move = (event) => {
      if (event.pointerId !== dragState.pointerId) return;

      const rect = containerRef.current.querySelector('[data-canvas-surface="true"]')?.getBoundingClientRect();
      if (!rect) return;

      const rawX = event.clientX - rect.left - dragState.offsetX;
      const rawY = event.clientY - rect.top - dragState.offsetY;

      if (dragState.type === 'text') {
        const current = editor.textElements.find((item) => item.id === dragState.id);
        if (!current) return;
        const next = getClampedPosition('text', current, rawX, rawY, containerSize);
        const snapped = getSnappedPosition('text', current, next, containerSize);
        editor.updateText(dragState.id, snapped.position);
        setSnapGuides(snapped.guides);
      } else {
        const current = editor.stickerElements.find((item) => item.id === dragState.id);
        if (!current) return;
        const next = getClampedPosition('sticker', current, rawX, rawY, containerSize);
        const snapped = getSnappedPosition('sticker', current, next, containerSize);
        editor.updateElement(dragState.id, snapped.position);
        setSnapGuides(snapped.guides);
      }
    };

    const up = (event) => {
      if (event.pointerId !== dragState.pointerId) return;
      setDragState(null);
      setSnapGuides({ vertical: false, horizontal: false, safeTop: false, safeBottom: false });
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [containerSize, dragState, editor, readOnly]);

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

  if (!currentImage) return null;

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        data-canvas-surface="true"
        className="relative overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-[0_28px_70px_rgba(0,0,0,0.35)]"
        style={surfaceStyle}
      >
        {currentImage.type === 'video' ? (
          <video
            src={currentImage.src}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              filter: editor.getFilterString(),
              transform: `rotate(${editor.rotation}deg) scaleX(${editor.flipHorizontal ? -editor.zoom : editor.zoom}) scaleY(${editor.flipVertical ? -editor.zoom : editor.zoom}) translate(${editor.pan.x}px, ${editor.pan.y}px)`,
            }}
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
            style={{
              filter: editor.getFilterString(),
              transform: `rotate(${editor.rotation}deg) scaleX(${editor.flipHorizontal ? -editor.zoom : editor.zoom}) scaleY(${editor.flipVertical ? -editor.zoom : editor.zoom}) translate(${editor.pan.x}px, ${editor.pan.y}px)`,
            }}
            draggable={false}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-black/10" />

        {safeZoneStyle ? (
          <div
            className="pointer-events-none absolute rounded-[22px] border border-dashed border-white/30"
            style={safeZoneStyle}
          />
        ) : null}

        {snapGuides.vertical ? (
          <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-white/55" />
        ) : null}
        {snapGuides.horizontal ? (
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/55" />
        ) : null}
        {snapGuides.safeTop ? (
          <div
            className="pointer-events-none absolute left-0 right-0 h-px bg-amber-300/80"
            style={{ top: `${containerSize.height * 0.12}px` }}
          />
        ) : null}
        {snapGuides.safeBottom ? (
          <div
            className="pointer-events-none absolute left-0 right-0 h-px bg-amber-300/80"
            style={{ top: `${containerSize.height * 0.82}px` }}
          />
        ) : null}

        {editor.textElements.map((text) => (
          <motion.div
            key={text.id}
            className={`absolute touch-none select-none ${readOnly ? '' : 'cursor-grab active:cursor-grabbing'}`}
            style={{
              left: text.x,
              top: text.y,
              transform: `rotate(${text.rotation || 0}deg) scale(${text.scale || 1})`,
              transformOrigin: 'top left',
            }}
            onPointerDown={(event) => handlePointerDown(event, 'text', text.id)}
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
                textShadow: text.hasOutline ? '0 1px 10px rgba(0,0,0,0.35)' : 'none',
                fontWeight: text.fontWeight || (text.fontFamily === 'minimal' ? 400 : 600),
                letterSpacing: `${text.letterSpacing || 0}px`,
                textAlign: text.textAlign || 'left',
              }}
            >
              {text.text}
            </span>
          </motion.div>
        ))}

        {editor.stickerElements.map((sticker) => (
          <StickerElement
            key={sticker.id}
            sticker={sticker}
            readOnly={readOnly}
            onPointerDown={(event) => handlePointerDown(event, 'sticker', sticker.id)}
          />
        ))}

        {!readOnly ? (
          <>
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm">
              {contentType === 'story' ? 'Safe zone activa para story' : 'Composicion libre con snap suave'}
            </div>
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm">
              {activeTool === 'text'
                ? 'Arrastra el texto. El snap te ayuda a centrar y respetar margenes.'
                : activeTool === 'sticker' || activeTool === 'product'
                  ? 'Coloca capas utiles sin invadir los bordes.'
                  : 'Mantiene el encuadre limpio y la lectura clara.'}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StickerElement({ sticker, onPointerDown, readOnly }) {
  const baseClassName = `absolute touch-none ${readOnly ? '' : 'cursor-grab active:cursor-grabbing'}`;

  return (
    <motion.div
      className={baseClassName}
      style={{
        left: sticker.x,
        top: sticker.y,
        transform: `rotate(${sticker.rotation || 0}deg) scale(${sticker.scale || 1})`,
        transformOrigin: 'top left',
      }}
      onPointerDown={onPointerDown}
    >
      {sticker.type === 'product' ? (
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
      ) : (
        <UtilitySticker sticker={sticker} />
      )}
    </motion.div>
  );
}

function UtilitySticker({ sticker }) {
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
