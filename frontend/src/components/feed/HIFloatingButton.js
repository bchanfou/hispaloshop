import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const STORAGE_KEY = 'hsp_ai_btn_pos';
const BTN_SIZE = 48;
const EDGE = 12;

function HIFloatingButton({ onClick, hasNewMessages = false }) {
  const [pos, setPos] = useState(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef(null);
  const posRef = useRef(null);

  // Load saved position or default
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.x != null) { setPos(saved); posRef.current = saved; return; }
    } catch { /* ignore */ }
    const def = { x: window.innerWidth - BTN_SIZE - EDGE, y: window.innerHeight - BTN_SIZE - 84 };
    setPos(def);
    posRef.current = def;
  }, []);

  const clamp = useCallback((p) => ({
    x: Math.max(EDGE, Math.min(window.innerWidth - BTN_SIZE - EDGE, p.x)),
    y: Math.max(EDGE, Math.min(window.innerHeight - BTN_SIZE - EDGE, p.y)),
  }), []);

  const snap = useCallback((p) => {
    const snapX = p.x < window.innerWidth / 2 ? EDGE : window.innerWidth - BTN_SIZE - EDGE;
    return { x: snapX, y: p.y };
  }, []);

  const save = useCallback((p) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }, []);

  // Touch handlers
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    start.current = { tx: t.clientX, ty: t.clientY, px: posRef.current?.x || 0, py: posRef.current?.y || 0 };
    dragging.current = true;
    moved.current = false;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!start.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - start.current.tx;
    const dy = t.clientY - start.current.ty;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;
    const np = clamp({ x: start.current.px + dx, y: start.current.py + dy });
    setPos(np);
    posRef.current = np;
  }, [clamp]);

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    start.current = null;
    if (posRef.current) {
      const snapped = snap(posRef.current);
      setPos(snapped);
      posRef.current = snapped;
      save(snapped);
    }
  }, [snap, save]);

  const handleClick = useCallback(() => {
    if (!moved.current) onClick?.();
  }, [onClick]);

  if (!pos) return null;

  return (
    <div
      role="button"
      aria-label="Abrir asistente HI"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 40,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: dragging.current ? 'grabbing' : 'grab',
        transition: dragging.current ? 'none' : 'left 0.3s ease, top 0.3s ease',
        transform: dragging.current ? 'scale(1.1)' : 'scale(1)',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative">
          {hasNewMessages && (
            <span className="absolute -top-1 -right-1 z-10 h-3.5 w-3.5 rounded-full border-2 border-white bg-stone-950" />
          )}
          <div className="w-12 h-12 bg-stone-950 rounded-full shadow-[0_8px_24px_rgba(10,10,10,0.25)] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
        <span className="text-[10px] font-semibold text-stone-950 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full shadow-sm tracking-wide">
          HI
        </span>
      </div>
    </div>
  );
}

export default HIFloatingButton;
