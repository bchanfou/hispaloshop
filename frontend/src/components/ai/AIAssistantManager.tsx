// @ts-nocheck
/**
 * AIAssistantManager — Unified floating system for David + Rebeca + Pedro.
 *
 * Circular 56px buttons, draggable, snap-to-edge, auto-minimize to strip after 10s.
 * Persist position in localStorage (hsp_ai_button_pos).
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Sparkles, TrendingUp, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { trackEvent } from '../../utils/analytics';
import { useTranslation } from 'react-i18next';

// Lazy-load the heavy chat components
const HispalAI = React.lazy(() => import('./HispalAI'));
const RebecaAI = React.lazy(() => import('./RebecaAI'));

/* ── Constants ── */
const HIDDEN_PATHS = ['/onboarding', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/signup', '/country-admin', '/importer', '/influencer'];
const BUTTON_SIZE = 56;
const STRIP_W = 8;
const STRIP_H_SINGLE = 40;
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
  const [showStack, setShowStack] = useState(false); // multi-AI expanded stack
  const [initialized, setInitialized] = useState(false);

  const controls = useAnimation();
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const inactivityTimerRef = useRef(null);

  // Hide on auth/onboarding paths
  const shouldHide = !user || HIDDEN_PATHS.some((p) => location.pathname.startsWith(p));

  // User plan
  const userPlan = useMemo(() => {
    if (!user) return 'FREE';
    const sub = user.subscription || {};
    return (sub.plan || 'FREE').toUpperCase();
  }, [user]);

  // Available AIs
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

  // Initialize position from localStorage
  useEffect(() => {
    if (shouldHide) return;
    const { side: s, y, state } = readPersistedPosition();
    setSide(s);
    setPosY(y);
    setButtonState(state === 'strip' ? 'strip' : 'full');
    setInitialized(true);
  }, [shouldHide]);

  // Animate to position when initialized or state changes
  useEffect(() => {
    if (!initialized || shouldHide || activeAI) return;
    const w = buttonState === 'strip' ? STRIP_W : BUTTON_SIZE;
    const x = getXForSide(side, w);
    controls.start({
      x,
      y: posY,
      transition: { type: 'spring', stiffness: 300, damping: 28 },
    });
  }, [initialized, side, posY, buttonState, shouldHide, activeAI, controls]);

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
    if (buttonState !== 'full' || activeAI || showStack || isDragging.current) return;
    inactivityTimerRef.current = setTimeout(() => {
      setButtonState('strip');
      persistPosition(side, posY, 'strip');
    }, INACTIVITY_MS);
  }, [buttonState, activeAI, showStack, side, posY, clearInactivityTimer]);

  useEffect(() => {
    startInactivityTimer();
    return () => clearInactivityTimer();
  }, [startInactivityTimer, clearInactivityTimer]);

  /* ── Handlers ── */
  const handleDragStart = useCallback(() => {
    isDragging.current = false;
    dragStartPos.current = { x: 0, y: 0 };
    clearInactivityTimer();
  }, [clearInactivityTimer]);

  const handleDrag = useCallback((_, info) => {
    const dx = Math.abs(info.offset.x);
    const dy = Math.abs(info.offset.y);
    if (dx > 10 || dy > 10) isDragging.current = true;
  }, []);

  const handleDragEnd = useCallback((_, info) => {
    if (!isDragging.current) return;
    const vw = window.innerWidth;
    const w = buttonState === 'strip' ? STRIP_W : BUTTON_SIZE;
    const centerX = info.point.x;
    const newSide = centerX > vw / 2 ? 'right' : 'left';
    const newX = getXForSide(newSide, w);
    const newY = clampY(info.point.y - w / 2);

    setSide(newSide);
    setPosY(newY);
    persistPosition(newSide, newY, buttonState);

    controls.start({
      x: newX,
      y: newY,
      transition: { type: 'spring', stiffness: 300, damping: 28 },
    });
    startInactivityTimer();
  }, [buttonState, controls, startInactivityTimer]);

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

  const handleButtonClick = useCallback(() => {
    if (isDragging.current) return;
    clearInactivityTimer();
    if (buttonState === 'strip') {
      // Single AI: go straight to panel (skip full button state)
      if (!hasMultipleAIs && availableAIs.length === 1) {
        openAI(availableAIs[0]);
        return;
      }
      // Multiple AIs: expand to full button first (need to show stack)
      setButtonState('full');
      const newX = getXForSide(side, BUTTON_SIZE);
      controls.start({
        x: newX,
        y: posY,
        transition: { type: 'spring', stiffness: 300, damping: 28 },
      });
      return;
    }
    // Full button tap
    if (hasMultipleAIs) {
      if (showStack) {
        // Second tap on main button → open primary AI (David)
        openAI(availableAIs[0]);
      } else {
        setShowStack(true);
      }
    } else if (availableAIs.length === 1) {
      openAI(availableAIs[0]);
    }
  }, [buttonState, side, posY, controls, hasMultipleAIs, showStack, availableAIs, openAI, clearInactivityTimer]);

  const handleCloseDrawer = useCallback(() => {
    setActiveAI(null);
    // After first interaction, always go to strip
    setButtonState('strip');
    persistPosition(side, posY, 'strip');
  }, [side, posY]);

  if (shouldHide || availableAIs.length === 0) return null;

  // ── Panel open: render AI drawer, hide button ──
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

  // ── Draggable button / strip ──
  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onPointerEnter={clearInactivityTimer}
        onPointerLeave={startInactivityTimer}
        onTouchStart={clearInactivityTimer}
        animate={controls}
        initial={{
          x: getXForSide(side, buttonState === 'strip' ? STRIP_W : BUTTON_SIZE),
          y: posY,
        }}
        className="fixed top-0 left-0 z-40 touch-none"
        style={{ willChange: 'transform' }}
      >
        <AnimatePresence mode="wait">
          {buttonState === 'strip' ? (
            <motion.button
              key="strip"
              layoutId="ai-fab"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={handleButtonClick}
              className={`flex flex-col items-center justify-center text-white/90 shadow-md ring-1 ring-white/20 cursor-pointer hover:opacity-100 transition-opacity ${
                side === 'right' ? 'rounded-l-xl' : 'rounded-r-xl'
              }`}
              style={{ width: STRIP_W, height: stripHeight, ...getAIBgStyle(primaryAI) }}
              aria-label={t('aiAssistants.asistenteIA', 'Asistente IA')}
              role="button"
            >
              {hasMultipleAIs ? (
                <div className="flex flex-col items-center justify-center gap-1 py-2">
                  {availableAIs.map((ai) => (
                    <div
                      key={ai.id}
                      className="rounded-full"
                      style={{ width: 4, height: 4, ...getAIBgStyle(ai) }}
                    />
                  ))}
                </div>
              ) : (
                <PrimaryIcon size={14} />
              )}
              {totalBadge > 0 && (
                <motion.span
                  className="absolute top-1.5 bg-red-500 rounded-full"
                  style={{ [side === 'right' ? 'left' : 'right']: 1.5, width: 5, height: 5 }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.button>
          ) : (
            <motion.button
              key="full"
              layoutId="ai-fab"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={handleButtonClick}
              className="relative flex items-center justify-center rounded-full text-white shadow-[0_4px_24px_rgba(0,0,0,0.15)] active:scale-95 transition-transform"
              style={{ width: BUTTON_SIZE, height: BUTTON_SIZE, ...getAIBgStyle(primaryAI) }}
              aria-label={t('aiAssistants.asistenteIA', 'Asistente IA')}
            >
              {totalBadge > 0 && (
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-red-500"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <PrimaryIcon size={24} />
              {totalBadge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
                  {totalBadge > 9 ? '9+' : totalBadge}
                </span>
              )}
            </motion.button>
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
                ...(stackDown
                  ? { top: BUTTON_SIZE + STACK_GAP }
                  : { bottom: BUTTON_SIZE + STACK_GAP }),
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
                    onClick={() => openAI(ai)}
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
          );})()}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
