import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api/client';
import { useAuth } from './AuthContext';

const ProducerPlanContext = createContext();

const PLAN_HIERARCHY = { FREE: 0, PRO: 1, ELITE: 2 };

export function ProducerPlanProvider({ children }) {
  const { user } = useAuth();
  const [planData, setPlanData] = useState(null);
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

  const currentPlan = planData?.plan || 'FREE';

  const hasAccess = (requiredPlan) => {
    return (PLAN_HIERARCHY[currentPlan] || 0) >= (PLAN_HIERARCHY[requiredPlan] || 0);
  };

  return (
    <ProducerPlanContext.Provider value={{ planData, currentPlan, loading, hasAccess, refetch: fetchPlan }}>
      {children}
    </ProducerPlanContext.Provider>
  );
}

export function useProducerPlan() {
  const ctx = useContext(ProducerPlanContext);
  if (!ctx) throw new Error('useProducerPlan must be used within ProducerPlanProvider');
  return ctx;
}
