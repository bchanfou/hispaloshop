// @ts-nocheck
import React, { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorDrag } from '../../hooks/useEditorDrag';

interface Overlay {
  id: string;
  type: 'text' | 'sticker';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  content: string;
  // text-specific
  font?: string;
  color?: string;
  size?: number;
  style?: 'clean' | 'box' | 'outline';
  // sticker-specific
  stickerType?: string;
  data?: any;
}

interface OverlayRendererProps {
  overlays: Overlay[];
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onTap?: (id: string) => void;
  showTrashZone?: boolean;
  containerRef: React.RefObject<HTMLElement>;
}

export default function OverlayRenderer({ overlays, onMove, onRemove, onTap, showTrashZone = true, containerRef }: OverlayRendererProps) {
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [nearTrash, setNearTrash] = React.useState(false);

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useEditorDrag({
    containerRef,
    trashZoneY: 85, // bottom 15% is trash zone
    onDragStart: (id) => setDraggingId(id),
    onDragMove: (id, x, y) => {
      onMove(id, x, y);
      setNearTrash(y > 80);
    },
    onDragEnd: (id, x, y) => {
      setDraggingId(null);
      setNearTrash(false);
      onMove(id, x, y);
    },
    onTrashZone: (id) => {
      setDraggingId(null);
      setNearTrash(false);
      onRemove(id);
      if (navigator.vibrate) navigator.vibrate(50);
    },
  });

  return (
    <>
      {/* Overlays */}
      <AnimatePresence>
        {overlays.map((overlay) => (
          <motion.div
            key={overlay.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: draggingId === overlay.id ? 1.05 : 1,
              opacity: draggingId === overlay.id && nearTrash ? 0.5 : 1
            }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute touch-none cursor-grab active:cursor-grabbing select-none z-10"
            style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, transform: 'translate(-50%, -50%)' }}
            onPointerDown={(e) => handlePointerDown(e, overlay.id, overlay.x, overlay.y)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => !draggingId && onTap?.(overlay.id)}
          >
            {overlay.type === 'text' ? (
              <TextOverlayItem overlay={overlay} />
            ) : (
              <StickerOverlayItem overlay={overlay} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Trash zone */}
      {showTrashZone && draggingId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors ${
            nearTrash ? 'bg-stone-950 text-white scale-110 ring-2 ring-white/40' : 'bg-black/60 text-white/80'
          }`}
        >
          <span className="text-sm font-medium">{nearTrash ? 'Soltar para eliminar' : 'Arrastra aqui para eliminar'}</span>
        </motion.div>
      )}
    </>
  );
}

function TextOverlayItem({ overlay }: { overlay: Overlay }) {
  const baseStyle = { fontFamily: overlay.font, fontSize: `${overlay.size || 24}px`, color: overlay.color || '#fff' };

  if (overlay.style === 'box') {
    return (
      <div className="px-3 py-1.5 rounded-xl bg-black/60" style={baseStyle}>
        {overlay.content || 'Texto'}
      </div>
    );
  }
  if (overlay.style === 'outline') {
    return (
      <div className="font-bold" style={{ ...baseStyle, WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}>
        {overlay.content || 'Texto'}
      </div>
    );
  }
  // clean
  return (
    <div className="font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" style={baseStyle}>
      {overlay.content || 'Texto'}
    </div>
  );
}

function StickerOverlayItem({ overlay }: { overlay: Overlay }) {
  return (
    <div className="text-4xl select-none">
      {overlay.content}
    </div>
  );
}
