// @ts-nocheck
/**
 * AIAssistantManager — Unified floating system for David + Rebeca + Pedro.
 *
 * Stack: David (always, bottom) → Rebeca (PRO+, middle) → Pedro (ELITE, top)
 * David/Rebeca: click → opens their chat drawer, hides other buttons
 * Pedro: click → navigates to /producer/commercial-ai
 * Retracted strip: colored dots after 30s inactivity
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { trackEvent } from '../../utils/analytics';

// Lazy-load the heavy chat components
const HispalAI = React.lazy(() => import('./HispalAI'));
const RebecaAI = React.lazy(() => import('./RebecaAI'));

/* ── Constants ── */
const HIDDEN_PATHS = ['/onboarding', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/signup'];
const BUTTON_SIZE = 56;
const BUTTON_GAP = 12;
const RETRACT_DELAY = 30000; // 30s

const AI_DEFS = [
  { id: 'david', color: '#0c0a09', icon: Sparkles, type: 'drawer', label: 'David AI' },
  { id: 'rebeca', color: '#0a3d2e', icon: TrendingUp, type: 'drawer', label: 'Rebeca AI', minPlan: 'PRO', roles: ['producer', 'importer'] },
  { id: 'pedro', color: '#b45309', icon: Crown, type: 'navigate', href: '/producer/commercial-ai', label: 'Pedro AI', minPlan: 'ELITE', roles: ['producer', 'importer'] },
];

const PLAN_ORDER = { FREE: 0, PRO: 1, ELITE: 2 };

/* ── Badge store (simple in-memory for unread counts) ── */
function useBadgeCounts() {
  const [counts, setCounts] = useState({ david: 0, rebeca: 0, pedro: 0 });
  const reset = useCallback((id) => setCounts((prev) => ({ ...prev, [id]: 0 })), []);
  // Listen for badge updates from child components
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

/* ── Retracted Strip ── */
function RetractedStrip({ ais, onExpand }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={onExpand}
      className="fixed bottom-[88px] right-0 z-50 flex flex-col items-center gap-1.5 px-1.5 py-2.5 bg-white rounded-l-xl shadow-lg border border-r-0 border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors"
      aria-label="Expandir asistentes IA"
    >
      {ais.map((ai) => (
        <span
          key={ai.id}
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: ai.color }}
        />
      ))}
    </motion.button>
  );
}

/* ── Stack Button ── */
function StackButton({ ai, index, badge, onClick }) {
  const Icon = ai.icon;
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: index * 0.05 }}
      onClick={onClick}
      className="relative flex items-center justify-center rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.15)] transition-transform hover:scale-105 active:scale-95"
      style={{ width: BUTTON_SIZE, height: BUTTON_SIZE, backgroundColor: ai.color }}
      aria-label={ai.label}
    >
      <Icon className="w-6 h-6 text-white" />
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </motion.button>
  );
}

/* ── Main Manager ── */
export default function AIAssistantManager() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { counts, reset } = useBadgeCounts();
  const [activeAI, setActiveAI] = useState(null); // 'david' | 'rebeca' | null
  const [retracted, setRetracted] = useState(false);
  const retractTimer = useRef(null);

  // Hide on auth/onboarding paths
  const shouldHide = !user || HIDDEN_PATHS.some((p) => location.pathname.startsWith(p));

  // Determine user's plan
  const userPlan = useMemo(() => {
    if (!user) return 'FREE';
    const sub = user.subscription || {};
    return (sub.plan || 'FREE').toUpperCase();
  }, [user]);

  // Available AIs based on role + plan
  const availableAIs = useMemo(() => {
    if (!user) return [];
    return AI_DEFS.filter((ai) => {
      if (ai.roles && !ai.roles.includes(user.role)) return false;
      if (ai.minPlan && (PLAN_ORDER[userPlan] || 0) < (PLAN_ORDER[ai.minPlan] || 0)) return false;
      return true;
    });
  }, [user, userPlan]);

  // Auto-retract after 30s of no interaction (only when no drawer is open)
  const resetRetractTimer = useCallback(() => {
    setRetracted(false);
    if (retractTimer.current) clearTimeout(retractTimer.current);
    if (!activeAI) {
      retractTimer.current = setTimeout(() => setRetracted(true), RETRACT_DELAY);
    }
  }, [activeAI]);

  useEffect(() => {
    resetRetractTimer();
    return () => { if (retractTimer.current) clearTimeout(retractTimer.current); };
  }, [activeAI, resetRetractTimer]);

  // When a drawer opens, clear retract
  useEffect(() => {
    if (activeAI) {
      setRetracted(false);
      if (retractTimer.current) clearTimeout(retractTimer.current);
    }
  }, [activeAI]);

  const handleButtonClick = useCallback((ai) => {
    resetRetractTimer();
    if (ai.type === 'navigate') {
      navigate(ai.href);
      return;
    }
    // Open drawer
    reset(ai.id);
    setActiveAI(ai.id);
  }, [navigate, reset, resetRetractTimer]);

  const handleCloseDrawer = useCallback(() => {
    setActiveAI(null);
  }, []);

  const handleExpand = useCallback(() => {
    trackEvent('ai_stack_expanded');
    setRetracted(false);
    resetRetractTimer();
  }, [resetRetractTimer]);

  if (shouldHide || availableAIs.length === 0) return null;

  // When a drawer is open, render that AI's full component
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

  // Render stack or retracted strip
  return (
    <AnimatePresence mode="wait">
      {retracted ? (
        <RetractedStrip key="strip" ais={availableAIs} onExpand={handleExpand} />
      ) : (
        <motion.div
          key="stack"
          className="fixed bottom-[88px] right-5 z-50 flex flex-col-reverse items-end"
          style={{ gap: BUTTON_GAP }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {availableAIs.map((ai, i) => (
            <StackButton
              key={ai.id}
              ai={ai}
              index={i}
              badge={counts[ai.id] || 0}
              onClick={() => handleButtonClick(ai)}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
