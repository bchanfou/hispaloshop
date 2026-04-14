import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Target, TrendingUp, Bell } from 'lucide-react';
import DOMPurify from 'dompurify';
import apiClient from '../../services/api/client';
import { trackEvent } from '../../utils/analytics';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: Array<{ tool: string; input: unknown; result: unknown }>;
  failed?: boolean;       // true if send failed — shows retry button
  originalText?: string;  // original user text, used for retry
}

interface RebecaAlert {
  severity: 'high' | 'medium' | 'low';
  type: string;
  message: string;
  action: string;
}

interface RebecaProfile {
  onboarding_completed: boolean;
  interaction_count: number;
  business_profile: {
    category_focus?: string;
    stage?: string;
    main_goal?: string;
    main_pain?: string;
  };
}

interface RebecaGoal {
  goal_id: string;
  type: string;
  target: number;
  period: string;
  current_progress?: number;
  progress_pct?: number;
}

interface RebecaBriefing {
  summary: {
    revenue: number;
    orders: number;
    items_sold: number;
    revenue_change_pct: number;
    avg_rating: number;
    new_reviews: number;
  };
  alerts: RebecaAlert[];
  opportunities: Array<{ title: string; action: string; impact: string }>;
  recommended_actions: Array<{ priority: number; title: string; action: string; why: string }>;
}

interface RebecaHealth {
  overall_score: number;
  dimensions: Record<string, { score: number; label: string; detail: string }>;
  insights: Array<{ dimension: string; severity: 'high' | 'medium' | 'low'; message: string }>;
}

type PanelView = null | 'alerts' | 'briefing' | 'goals' | 'health';

const QUICK_PROMPTS_ONBOARDED = [
  { label: 'Resumen semanal', icon: FileText, prompt: 'Hazme el resumen semanal de mi negocio y propón 3 acciones' },
  { label: 'Mis objetivos', icon: Target, prompt: '¿Cómo voy con mis objetivos este mes?' },
  { label: 'Oportunidades', icon: TrendingUp, prompt: 'Analiza mi tienda y dame las 3 mayores oportunidades ahora mismo' },
  { label: 'Competencia', icon: Bell, prompt: 'Compárame con otros productores de mi categoría' },
];

const QUICK_PROMPTS_NEW = [
  // ...add quick prompts here if needed
];

export default function RebecaAI({ onRequestClose }: { onRequestClose?: () => void } = {}) {
  // Solo mostrar el panel de chat si está gestionado por el manager
  const isManaged = typeof onRequestClose === 'function';
  if (!isManaged) return null;

  // Aquí iría el panel de chat de Rebeca, gestionado por el manager
  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rebeca-dialog-title"
      className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-[20px] bg-white shadow-lg md:inset-x-auto md:bottom-4 md:right-4 md:h-[600px] md:w-[380px] md:rounded-2xl"
    >
      {/* Header y contenido del chat de Rebeca gestionado por el manager */}
      {/* ... */}
      <button
        className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 absolute top-2 right-2"
        aria-label="Cerrar"
        onClick={onRequestClose}
      >
        <X className="h-5 w-5" />
      </button>
    </motion.div>
  );
}
