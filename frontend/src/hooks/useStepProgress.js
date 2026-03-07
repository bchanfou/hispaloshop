import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'registration_progress';

export const useStepProgress = (flow, totalSteps, expiresInDays = 7) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [data, setData] = useState({});

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

  // Auto-save every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep > 1 || Object.keys(data).length > 0) {
        saveProgress();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentStep, completedSteps, data]);

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

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step) => {
    if (step >= 1 && step <= totalSteps && completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    }
  }, [totalSteps, completedSteps]);

  const updateData = useCallback((stepData) => {
    setData(prev => ({ ...prev, ...stepData }));
  }, []);

  const clearProgress = useCallback(() => {
    localStorage.removeItem(`${STORAGE_KEY}_${flow}`);
    setCurrentStep(1);
    setCompletedSteps([]);
    setData({});
  }, [flow]);

  const getStepData = useCallback((step) => {
    return data[`step${step}`] || {};
  }, [data]);

  const setStepData = useCallback((step, stepData) => {
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
