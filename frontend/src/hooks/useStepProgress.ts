import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'registration_progress';

interface StepData {
  [key: string]: any;
}

interface UseStepProgressReturn {
  currentStep: number;
  completedSteps: number[];
  data: StepData;
  progress: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  updateData: (stepData: StepData) => void;
  saveProgress: () => void;
  clearProgress: () => void;
  getStepData: (step: number) => any;
  setStepData: (step: number, stepData: any) => void;
}

export const useStepProgress = (
  flow: string,
  totalSteps: number,
  expiresInDays: number = 7,
): UseStepProgressReturn => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [data, setData] = useState<StepData>({});

  // Load saved progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${flow}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const expiresAt = new Date(parsed.expiresAt);

        if (expiresAt > new Date()) {
          setCurrentStep(parsed.currentStep || 1);
          setCompletedSteps(parsed.completedSteps || []);
          setData(parsed.data || {});
        } else {
          localStorage.removeItem(`${STORAGE_KEY}_${flow}`);
        }
      }
    } catch (e) {
      console.error('Error loading progress:', e);
    }
  }, [flow]);

  const saveProgress = useCallback(() => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const progress = {
      currentStep,
      completedSteps,
      data,
      expiresAt: expiresAt.toISOString(),
      lastSaved: new Date().toISOString()
    };

    localStorage.setItem(`${STORAGE_KEY}_${flow}`, JSON.stringify(progress));
  }, [flow, currentStep, completedSteps, data, expiresInDays]);

  // Auto-save every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep > 1 || Object.keys(data).length > 0) {
        saveProgress();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentStep, completedSteps, data, saveProgress]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCompletedSteps(prev => Array.from(new Set([...prev, currentStep])));
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps && completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    }
  }, [totalSteps, completedSteps]);

  const updateData = useCallback((stepData: StepData) => {
    setData(prev => ({ ...prev, ...stepData }));
  }, []);

  const clearProgress = useCallback(() => {
    localStorage.removeItem(`${STORAGE_KEY}_${flow}`);
    setCurrentStep(1);
    setCompletedSteps([]);
    setData({});
  }, [flow]);

  const getStepData = useCallback((step: number): any => {
    return data[`step${step}`] || {};
  }, [data]);

  const setStepData = useCallback((step: number, stepData: any) => {
    setData(prev => ({ ...prev, [`step${step}`]: stepData }));
  }, []);

  return {
    currentStep,
    completedSteps,
    data,
    progress: (currentStep / totalSteps) * 100,
    nextStep,
    prevStep,
    goToStep,
    updateData,
    saveProgress,
    clearProgress,
    getStepData,
    setStepData
  };
};

export default useStepProgress;
