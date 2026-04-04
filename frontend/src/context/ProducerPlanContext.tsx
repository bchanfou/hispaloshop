import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiClient from '../services/api/client';
import { useAuth } from './AuthContext';

type PlanName = 'FREE' | 'PRO' | 'ELITE';

interface PlanData {
  plan: PlanName;
  commission_rate: number;
  plan_status: string;
  stripe_subscription_id?: string;
  trial_ends_at?: string;
  grace_period_ends_at?: string;
  current_period_end?: string;
  [key: string]: any;
}

interface ProducerPlanContextValue {
  planData: PlanData | null;
  currentPlan: PlanName;
  loading: boolean;
  hasAccess: (requiredPlan: PlanName) => boolean;
  refetch: () => Promise<void>;
}

const ProducerPlanContext = createContext<ProducerPlanContextValue | undefined>(undefined);

const PLAN_HIERARCHY: Record<string, number> = { FREE: 0, PRO: 1, ELITE: 2 };
const PLAN_CACHE_KEY = 'hsp_plan_cache';

function readCachedPlan(): PlanData | null {
  try {
    const raw = localStorage.getItem(PLAN_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedPlan(data: PlanData): void {
  try {
    localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

interface ProducerPlanProviderProps {
  children: ReactNode;
}

export function ProducerPlanProvider({ children }: ProducerPlanProviderProps) {
  const { user } = useAuth() as any;
  const [planData, setPlanData] = useState<PlanData | null>(readCachedPlan);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    try {
      const data = await apiClient.get(`/sellers/me/plan`);
      setPlanData(data);
      writeCachedPlan(data);
    } catch {
      // Use cache if available, only fallback to FREE if no cache at all
      const cached = readCachedPlan();
      if (cached) {
        setPlanData(cached);
      } else {
        setPlanData({ plan: 'FREE', commission_rate: 0.20, plan_status: 'active' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'producer' || user?.role === 'importer') {
      // Show cached plan immediately, then verify in background
      const cached = readCachedPlan();
      if (cached) {
        setPlanData(cached);
        setLoading(false);
      }
      fetchPlan();
    } else {
      setLoading(false);
    }
  }, [user, fetchPlan]);

  const currentPlan: PlanName = (planData?.plan as PlanName) || 'FREE';

  const hasAccess = (requiredPlan: PlanName): boolean => {
    return (PLAN_HIERARCHY[currentPlan] || 0) >= (PLAN_HIERARCHY[requiredPlan] || 0);
  };

  return (
    <ProducerPlanContext.Provider value={{ planData, currentPlan, loading, hasAccess, refetch: fetchPlan }}>
      {children}
    </ProducerPlanContext.Provider>
  );
}

export function useProducerPlan(): ProducerPlanContextValue {
  const ctx = useContext(ProducerPlanContext);
  if (!ctx) throw new Error('useProducerPlan must be used within ProducerPlanProvider');
  return ctx;
}
