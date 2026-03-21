import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

interface ProducerPlanProviderProps {
  children: ReactNode;
}

export function ProducerPlanProvider({ children }: ProducerPlanProviderProps) {
  const { user } = useAuth() as any;
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'producer' || user?.role === 'importer') {
      fetchPlan();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPlan = async () => {
    try {
      const data = await apiClient.get(`/sellers/me/plan`);
      setPlanData(data);
    } catch {
      setPlanData({ plan: 'FREE', commission_rate: 0.20, plan_status: 'active' });
    } finally {
      setLoading(false);
    }
  };

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
