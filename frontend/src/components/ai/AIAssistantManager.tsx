// @ts-nocheck
/**
 * AIAssistantManager — Unified floating system for David + Rebeca + Pedro.
 *
 * Draggable button that snaps to the nearest screen edge.
 * Three visual states:
 *   1. Full button (56px circle) — first visit / expanded
 *   2. Minimized strip (20×80px edge tab) — after first panel close
 *   3. Panel open — button hidden, AI drawer rendered
 *
 * Persistence: localStorage stores Y position, side, and visual state.
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
const STRIP_W = 20;
const STRIP_H = 80;
const EDGE_MARGIN = 8;
const SAFE_TOP = 60;
const SAFE_BOTTOM_MOBILE = 80;
const SAFE_BOTTOM_DESKTOP = 20;
const STACK_GAP = 12;

const LS_Y = 'hsp_ai_button_y';
const LS_SIDE = 'hsp_ai_button_side';
const LS_STATE = 'hsp_ai_button_state';

const AI_DEFS = [
  { id: 'david', color: '#0c0a09', icon: Sparkles, type: 'drawer', label: 'David AI' },
  { id: 'rebeca', color: '#0a3d2e', icon: TrendingUp, type: 'drawer', label: 'Rebeca AI', minPlan: 'PRO', roles: ['producer', 'importer'] },
  { id: 'pedro', color: '#b45309', icon: Crown, type: 'navigate', href: '/producer/commercial-ai', label: 'Pedro AI', minPlan: 'ELITE', roles: ['producer', 'importer'] },
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
  const side = localStorage.getItem(LS_SIDE) || 'right';
  const yRatio = parseFloat(localStorage.getItem(LS_Y) || '');
  const state = localStorage.getItem(LS_STATE) || 'full';
  const defaultY = window.innerHeight - getSafeBottom() - BUTTON_SIZE - 8;
  const y = !isNaN(yRatio) ? clampY(yRatio * window.innerHeight) : defaultY;
  return { side, y, state };
}

function persistPosition(side, y, state) {
  localStorage.setItem(LS_SIDE, side);
  localStorage.setItem(LS_Y, String(y / window.innerHeight));
  if (state) localStorage.setItem(LS_STATE, state);
}

function getXForSide(side, width) {
  return side === 'right' ? window.innerWidth - width - EDGE_MARGIN : EDGE_MARGIN;
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

  /* ── Handlers ── */
  const handleDragStart = useCallback(() => {
    isDragging.current = false;
    dragStartPos.current = { x: 0, y: 0 };
  }, []);

  const handleDrag = useCallback((_, info) => {
    const dx = Math.abs(info.offset.x);
    const dy = Math.abs(info.offset.y);
    if (dx > 5 || dy > 5) isDragging.current = true;
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
  }, [buttonState, controls]);

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
    if (buttonState === 'strip') {
      // Expand to full button first
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
  }, [buttonState, side, posY, controls, hasMultipleAIs, showStack, availableAIs, openAI]);

  const handleCloseDrawer = useCallback(() => {
    setActiveAI(null);
    // After first interaction, always go to strip
    setButtonState('strip');
    localStorage.setItem(LS_STATE, 'strip');
  }, []);

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
              className={`flex items-center justify-center bg-stone-950/80 backdrop-blur-sm text-white/70 shadow-md cursor-pointer hover:opacity-100 transition-opacity ${
                side === 'right' ? 'rounded-l-xl' : 'rounded-r-xl'
              }`}
              style={{ width: STRIP_W, height: STRIP_H }}
              aria-label={t('aiAssistants.asistenteIA', 'Asistente IA')}
              role="button"
            >
              <Sparkles size={14} />
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
              className="relative flex items-center justify-center rounded-full bg-stone-950 text-white shadow-[0_4px_24px_rgba(0,0,0,0.15)] active:scale-95 transition-transform"
              style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
              aria-label={t('aiAssistants.asistenteIA', 'Asistente IA')}
            >
              <Sparkles size={24} />
              {totalBadge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-stone-600 px-1 text-[10px] font-bold text-white shadow">
                  {totalBadge > 9 ? '9+' : totalBadge}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Multi-AI stack popover ── */}
        <AnimatePresence>
          {showStack && buttonState === 'full' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute flex flex-col items-center"
              style={{
                bottom: BUTTON_SIZE + STACK_GAP,
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
                    style={{ width: BUTTON_SIZE, height: BUTTON_SIZE, backgroundColor: ai.color }}
                    aria-label={ai.label}
                  >
                    <Icon className="w-6 h-6 text-white" />
                    {(counts[ai.id] || 0) > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-stone-600 px-1 text-[10px] font-bold text-white shadow">
                        {counts[ai.id] > 9 ? '9+' : counts[ai.id]}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
