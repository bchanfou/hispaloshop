// @ts-nocheck
/**
 * AIAssistantManager — Unified floating system for David + Rebeca + Pedro.
 *
 * Circular 56px buttons, draggable, snap-to-edge, auto-minimize to strip after 10s.
 * Persist position in localStorage (hsp_ai_button_pos).
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { trackEvent } from '../../utils/analytics';
import { useTranslation } from 'react-i18next';

// Lazy-load the heavy chat components
const HispalAI = React.lazy(() => import('./HispalAI'));
const RebecaAI = React.lazy(() => import('./RebecaAI'));

/* ── Constants ── */
const HIDDEN_PATHS = ['/onboarding', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/signup'];
const BUTTON_SIZE = 56;
const STRIP_W = 8;
const STRIP_TOUCH_W = 44;
const STRIP_H_SINGLE = 48;
const STRIP_H_MULTI = 64;
const EDGE_MARGIN = 8;
const SAFE_TOP = 60;
const SAFE_BOTTOM_MOBILE = 80;
const SAFE_BOTTOM_DESKTOP = 20;
const STACK_GAP = 12;
const INACTIVITY_MS = 10000;

const LS_POS = 'hsp_ai_button_pos';

const AI_DEFS = [
  { id: 'david', color: '#0c0a09', icon: Sparkles, type: 'drawer', label: 'David AI' },
  { id: 'rebeca', color: '#0a3d2e', icon: TrendingUp, type: 'drawer', label: 'Rebeca AI', minPlan: 'PRO', roles: ['producer', 'importer'] },
  { id: 'pedro', color: 'transparent', gradient: 'linear-gradient(135deg, #b45309, #78350f)', icon: Crown, type: 'navigate', href: '/producer/commercial-ai', label: 'Pedro AI', minPlan: 'ELITE', roles: ['producer', 'importer'] },
];

const PLAN_ORDER = { FREE: 0, PRO: 1, ELITE: 2 };

/* ── Badge store ── */
function useBadgeCounts() {
  const [counts, setCounts] = useState({ david: 0, rebeca: 0, pedro: 0 });
  const reset = useCallback((id) => setCounts((prev) => ({ ...prev, [id]: 0 })), []);
  useEffect(() => {
    const handler = (e) => {
      const { id, count } = e.detail || {};
      if (id && typeof count === 'number') {
        setCounts((prev) => ({ ...prev, [id]: count }));
      }
    };
    window.addEventListener('ai-badge-update', handler);
    return () => window.removeEventListener('ai-badge-update', handler);
  }, []);
  return { counts, reset };
}

/* ── Helpers ── */
function getSafeBottom() {
  return window.innerWidth < 768 ? SAFE_BOTTOM_MOBILE : SAFE_BOTTOM_DESKTOP;
}

function clampY(y) {
  const maxY = window.innerHeight - getSafeBottom() - BUTTON_SIZE;
  return Math.max(SAFE_TOP, Math.min(y, maxY));
}

function readPersistedPosition() {
  try {
    const raw = localStorage.getItem(LS_POS);
    if (raw) {
      const pos = JSON.parse(raw);
      const side = pos.side === 'left' ? 'left' : 'right';
      const yRatio = typeof pos.yRatio === 'number' ? pos.yRatio : NaN;
      const state = pos.state === 'strip' ? 'strip' : 'full';
      // Fallback robusto: si la posición es inválida, usar margen seguro
      const minY = SAFE_TOP;
      const maxY = window.innerHeight - getSafeBottom() - BUTTON_SIZE;
      let y = !isNaN(yRatio) ? yRatio * window.innerHeight : maxY;
      if (isNaN(y) || y < minY || y > maxY) y = maxY;
      return { side, y, state };
    }
  } catch {}
  // Legacy fallback
  try {
    const side = localStorage.getItem('hsp_ai_button_side') || 'right';
    const yRaw = parseFloat(localStorage.getItem('hsp_ai_button_y') || '');
    const state = localStorage.getItem('hsp_ai_button_state') || 'full';
    const minY = SAFE_TOP;
    const maxY = window.innerHeight - getSafeBottom() - BUTTON_SIZE;
    let y = !isNaN(yRaw) ? yRaw * window.innerHeight : maxY;
    if (isNaN(y) || y < minY || y > maxY) y = maxY;
    return { side, y, state: state === 'strip' ? 'strip' : 'full' };
  } catch {}
  // Fallback absoluto: parte inferior derecha, margen seguro
  const maxY = window.innerHeight - getSafeBottom() - BUTTON_SIZE;
  return { side: 'right', y: maxY, state: 'full' };
}

function persistPosition(side, y, state) {
  try {
    localStorage.setItem(LS_POS, JSON.stringify({
      side,
      yRatio: y / window.innerHeight,
      state,
      ts: Date.now(),
    }));
  } catch {}
}

function getXForSide(side, width) {
  return side === 'right' ? window.innerWidth - width - EDGE_MARGIN : EDGE_MARGIN;
}

function getAIBgStyle(ai) {
  if (ai?.gradient) return { background: ai.gradient };
  return { backgroundColor: ai?.color };
}

/* ── Main Manager ── */
export default function AIAssistantManager() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { counts, reset } = useBadgeCounts();

  const [activeAI, setActiveAI] = useState(null);
  const [buttonState, setButtonState] = useState('full'); // 'full' | 'strip'
  const [side, setSide] = useState('right');
  const [posY, setPosY] = useState(0);
  const [showStack, setShowStack] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const containerRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, moved: false, pointerId: null });
  const inactivityTimerRef = useRef(null);

  const shouldHide = !user || HIDDEN_PATHS.some((p) => location.pathname.startsWith(p));

  const userPlan = useMemo(() => {
    if (!user) return 'FREE';
    return ((user.subscription || {}).plan || 'FREE').toUpperCase();
  }, [user]);

  const availableAIs = useMemo(() => {
    if (!user) return [];
    return AI_DEFS.filter((ai) => {
      if (ai.roles && !ai.roles.includes(user.role)) return false;
      if (ai.minPlan && (PLAN_ORDER[userPlan] || 0) < (PLAN_ORDER[ai.minPlan] || 0)) return false;
      return true;
    });
  }, [user, userPlan]);

  const hasMultipleAIs = availableAIs.length > 1;
  const primaryAI = availableAIs[0];
  const PrimaryIcon = primaryAI?.icon || Sparkles;

  // Initialize position
  useEffect(() => {
    if (shouldHide) return;
    const { side: s, y } = readPersistedPosition();
    setSide(s);
    setPosY(y);
    setButtonState('full');
    setInitialized(true);
  }, [shouldHide]);

  // Listen for external 'open-hispal-ai' events
  useEffect(() => {
    const handler = (e) => {
      const targetId = e?.detail?.id || 'david';
      const ai = AI_DEFS.find((a) => a.id === targetId);
      if (ai) {
        if (ai.type === 'navigate') {
          navigate(ai.href);
        } else {
          reset(ai.id);
          setActiveAI(ai.id);
          setShowStack(false);
          trackEvent('ai_assistant_opened', { assistant: ai.id, source: 'event' });
        }
      }
    };
    window.addEventListener('open-hispal-ai', handler);
    return () => window.removeEventListener('open-hispal-ai', handler);
  }, [navigate, reset]);

  // Close stack on outside tap / scroll
  useEffect(() => {
    if (!showStack) return;
    const close = () => setShowStack(false);
    const timer = setTimeout(() => {
      window.addEventListener('click', close, { once: true });
      window.addEventListener('scroll', close, { once: true, passive: true });
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close);
    };
  }, [showStack]);

  /* ── Inactivity timer ── */
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    if (buttonState !== 'full' || activeAI || showStack) return;
    inactivityTimerRef.current = setTimeout(() => {
      setButtonState('strip');
      persistPosition(side, posY, 'strip');
    }, INACTIVITY_MS);
  }, [buttonState, activeAI, showStack, side, posY, clearInactivityTimer]);

  useEffect(() => {
    startInactivityTimer();
    return () => clearInactivityTimer();
  }, [startInactivityTimer, clearInactivityTimer]);

  /* ── Computed position for current state ── */
  const computedX = useMemo(() => {
    if (buttonState === 'strip') {
      return side === 'right' ? window.innerWidth - STRIP_TOUCH_W : 0;
    }
    return getXForSide(side, BUTTON_SIZE);
  }, [side, buttonState]);

  /* ── Pointer-based drag ── */
  const handlePointerDown = useCallback((e) => {
    if (activeAI) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    clearInactivityTimer();
  }, [activeAI, clearInactivityTimer]);

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      d.moved = true;
    }
    if (d.moved && containerRef.current) {
      containerRef.current.style.transition = 'none';
      containerRef.current.style.left = `${computedX + dx}px`;
      containerRef.current.style.top = `${posY + dy}px`;
    }
  }, [computedX, posY]);

  const handlePointerUp = useCallback((e) => {
    const d = dragRef.current;
    d.active = false;

    if (d.moved) {
      // Snap to nearest edge
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const centerX = rect.left + rect.width / 2;
      const newSide = centerX > vw / 2 ? 'right' : 'left';
      const newY = clampY(rect.top);

      // Calculate target snap position
      const newX = buttonState === 'strip'
        ? (newSide === 'right' ? vw - STRIP_TOUCH_W : 0)
        : getXForSide(newSide, BUTTON_SIZE);

      // Animate snap via DOM styles (prevents flash before React re-renders)
      el.style.transition = 'left 0.3s cubic-bezier(.4,0,.2,1), top 0.3s cubic-bezier(.4,0,.2,1)';
      el.style.left = `${newX}px`;
      el.style.top = `${newY}px`;

      // Update React state to match
      setSide(newSide);
      setPosY(newY);
      persistPosition(newSide, newY, buttonState);
    }
    startInactivityTimer();
  }, [buttonState, startInactivityTimer]);

  /* ── AI actions ── */
  const openAI = useCallback((ai) => {
    if (ai.type === 'navigate') {
      navigate(ai.href);
      return;
    }
    reset(ai.id);
    setActiveAI(ai.id);
    setShowStack(false);
    trackEvent('ai_assistant_opened', { assistant: ai.id });
  }, [navigate, reset]);

  const handleTap = useCallback(() => {
    clearInactivityTimer();
    if (buttonState === 'strip') {
      if (!hasMultipleAIs && availableAIs.length === 1) {
        openAI(availableAIs[0]);
        return;
      }
      setButtonState('full');
      persistPosition(side, posY, 'full');
      startInactivityTimer();
      return;
    }
    if (hasMultipleAIs) {
      if (showStack) {
        openAI(availableAIs[0]);
      } else {
        setShowStack(true);
      }
    } else if (availableAIs.length === 1) {
      openAI(availableAIs[0]);
    }
  }, [buttonState, side, posY, hasMultipleAIs, showStack, availableAIs, openAI, clearInactivityTimer, startInactivityTimer]);

  // Handle tap vs drag: trigger tap only if pointer didn't move
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (dragRef.current.moved) return;
    handleTap();
  }, [handleTap]);

  const handleCloseDrawer = useCallback(() => {
    setActiveAI(null);
    setButtonState('full');
    persistPosition(side, posY, 'full');
    startInactivityTimer();
  }, [side, posY, startInactivityTimer]);

  if (shouldHide || availableAIs.length === 0) return null;

  // ── AI drawer panels ──
  if (activeAI === 'david') {
    return (
      <React.Suspense fallback={null}>
        <HispalAI onRequestClose={handleCloseDrawer} />
      </React.Suspense>
    );
  }
  if (activeAI === 'rebeca') {
    return (
      <React.Suspense fallback={null}>
        <RebecaAI onRequestClose={handleCloseDrawer} />
      </React.Suspense>
    );
  }

  if (!initialized) return null;

  const totalBadge = Object.values(counts).reduce((s, c) => s + c, 0);
  const stripHeight = hasMultipleAIs ? STRIP_H_MULTI : STRIP_H_SINGLE;

  return (
    <>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        className="fixed z-40 touch-none select-none"
        style={{
          left: computedX,
          top: posY,
          transition: 'left 0.3s cubic-bezier(.4,0,.2,1), top 0.3s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <AnimatePresence mode="wait">
          {buttonState === 'strip' ? (
            <motion.div
              key="strip"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`flex flex-col items-center justify-center cursor-pointer ${
                side === 'right' ? 'rounded-l-2xl' : 'rounded-r-2xl'
              }`}
              style={{
                width: STRIP_TOUCH_W,
                height: stripHeight,
                background: 'transparent',
              }}
              role="button"
              aria-label={t('aiAssistants.asistenteIA', 'Asistente IA')}
            >
              <div
                className={`flex flex-col items-center justify-center shadow-md ring-1 ring-white/20 h-full ${
                  side === 'right' ? 'rounded-l-xl ml-auto' : 'rounded-r-xl mr-auto'
                }`}
                style={{ width: STRIP_W, ...getAIBgStyle(primaryAI) }}
              >
                {hasMultipleAIs ? (
                  <div className="flex flex-col items-center justify-center gap-1 py-2">
                    {availableAIs.map((ai) => (
                      <div key={ai.id} className="rounded-full" style={{ width: 4, height: 4, ...getAIBgStyle(ai) }} />
                    ))}
                  </div>
                ) : (
                  <PrimaryIcon size={12} className="text-white" />
                )}
              </div>
              {totalBadge > 0 && (
                <span className="absolute top-1 bg-red-500 rounded-full animate-pulse"
                  style={{ [side === 'right' ? 'left' : 'right']: 2, width: 6, height: 6 }} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative flex items-center justify-center rounded-full text-white shadow-[0_4px_24px_rgba(0,0,0,0.15)] active:scale-95 transition-transform cursor-pointer"
              style={{ width: BUTTON_SIZE, height: BUTTON_SIZE, ...getAIBgStyle(primaryAI) }}
              role="button"
              aria-label={t('aiAssistants.asistenteIA', 'Asistente IA')}
            >
              <PrimaryIcon size={24} />
              {totalBadge > 0 && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30" />
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
                    {totalBadge > 9 ? '9+' : totalBadge}
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Multi-AI stack popover ── */}
        <AnimatePresence>
          {showStack && buttonState === 'full' && (() => {
            const stackDown = posY < window.innerHeight / 2;
            return (
              <motion.div
                initial={{ opacity: 0, y: stackDown ? -10 : 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: stackDown ? -10 : 10, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`absolute flex flex-col items-center ${stackDown ? 'flex-col' : 'flex-col-reverse'}`}
                style={{
                  ...(stackDown ? { top: BUTTON_SIZE + STACK_GAP } : { bottom: BUTTON_SIZE + STACK_GAP }),
                  left: '50%',
                  transform: 'translateX(-50%)',
                  gap: STACK_GAP,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {availableAIs.slice(1).map((ai, i) => {
                  const Icon = ai.icon;
                  return (
                    <motion.button
                      key={ai.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: i * 0.05 }}
                      onClick={(e) => { e.stopPropagation(); openAI(ai); }}
                      className="relative flex items-center justify-center rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.15)] hover:scale-105 active:scale-95 transition-transform"
                      style={{ width: BUTTON_SIZE, height: BUTTON_SIZE, ...getAIBgStyle(ai) }}
                      aria-label={ai.label}
                    >
                      <Icon className="w-6 h-6 text-white" />
                      {(counts[ai.id] || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
                          {counts[ai.id] > 9 ? '9+' : counts[ai.id]}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </>
  );
}
