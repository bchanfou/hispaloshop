import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardingApi } from '../lib/onboardingApi';
import OnboardingLayout from '../components/onboarding/OnboardingLayout';
import InterestsStep from '../components/onboarding/InterestsStep';
import LocationStep from '../components/onboarding/LocationStep';
import FollowStep from '../components/onboarding/FollowStep';

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, checkAuth } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const status = await onboardingApi.getStatus();
      if (status.completed) {
        navigate('/dashboard', { replace: true });
        return;
      }

      if (status.current_step && status.current_step > 1 && status.current_step <= TOTAL_STEPS) {
        setCurrentStep(status.current_step);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'No hemos podido recuperar tu progreso de onboarding.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== 'customer') {
      navigate('/', { replace: true });
      return;
    }
    if (user.onboarding_completed) {
      navigate('/dashboard', { replace: true });
      return;
    }

    checkOnboardingStatus();
  }, [user, authLoading, navigate, checkOnboardingStatus]);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    setError(null);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  }, []);

  const handleComplete = useCallback(async () => {
    await onboardingApi.complete();
    await checkAuth();
    navigate('/dashboard', { replace: true });
  }, [checkAuth, navigate]);

  const handleError = useCallback((message) => {
    setError(message);
  }, []);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="rounded-full border-2 border-stone-300 border-t-stone-900 p-4 animate-spin" />
      </div>
    );
  }

  const commonProps = { onNext: handleNext, onError: handleError };

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={TOTAL_STEPS} showSkip={false}>
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {currentStep === 1 ? <InterestsStep {...commonProps} /> : null}
      {currentStep === 2 ? <LocationStep {...commonProps} onBack={handleBack} /> : null}
      {currentStep === 3 ? <FollowStep onBack={handleBack} onComplete={handleComplete} onError={handleError} /> : null}
    </OnboardingLayout>
  );
}
