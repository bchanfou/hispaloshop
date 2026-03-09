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
      console.error('Error checking onboarding status:', err);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  const renderStep = () => {
    const props = {
      onNext: handleNext,
      onError: handleError,
    };

    switch (currentStep) {
      case 1:
        return <InterestsStep {...props} />;
      case 2:
        return <LocationStep {...props} onBack={handleBack} />;
      case 3:
        return <FollowStep onBack={handleBack} onComplete={handleComplete} onError={handleError} />;
      default:
        return null;
    }
  };

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={TOTAL_STEPS} showSkip={false}>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {renderStep()}
    </OnboardingLayout>
  );
}
