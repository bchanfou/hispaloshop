import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardingApi } from '../lib/onboardingApi';
import OnboardingLayout from '../components/onboarding/OnboardingLayout';
import InterestsStep from '../components/onboarding/InterestsStep';
import LocationStep from '../components/onboarding/LocationStep';
import FollowStep from '../components/onboarding/FollowStep';
import {
  detectCountry,
  getCountryConfig,
  getActiveCountries,
  getAllCountries,
  saveCountryPreference,
} from '../services/localization';
import { MapPin, X } from 'lucide-react';

const TOTAL_STEPS = 3;

function CountryPicker({ current, onSelect, onClose }) {
  const active = getActiveCountries();
  const all = getAllCountries();
  const inactive = all.filter(c => !c.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--color-black)' }}>Elige tu pais</h3>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--color-stone)' }} /></button>
        </div>

        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {active.map(c => (
            <button
              key={c.code}
              onClick={() => onSelect(c.code)}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-left transition-colors"
              style={{
                background: current === c.code ? 'var(--color-surface)' : 'transparent',
                border: current === c.code ? '1px solid var(--color-border)' : '1px solid transparent',
              }}
            >
              <span className="text-xl">{c.flag}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-black)' }}>{c.name_local}</span>
              {current === c.code && (
                <span className="ml-auto text-xs font-bold" style={{ color: 'var(--color-stone)' }}>Actual</span>
              )}
            </button>
          ))}

          {inactive.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider pt-3 pb-1 px-1" style={{ color: 'var(--color-stone)' }}>
                Proximamente
              </p>
              {inactive.map(c => (
                <button
                  key={c.code}
                  onClick={() => onSelect(c.code)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl text-left opacity-60"
                >
                  <span className="text-xl">{c.flag}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-stone)' }}>{c.name_local}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, checkAuth } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  // Country detection
  const [detectedCountry, setDetectedCountry] = useState(() => detectCountry());
  const countryConfig = useMemo(
    () => getCountryConfig(detectedCountry.country_code),
    [detectedCountry.country_code]
  );

  const handleCountryChange = (code) => {
    saveCountryPreference(code);
    setDetectedCountry(detectCountry());
    setShowPicker(false);
  };

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

    // Re-detect with user object for better accuracy
    setDetectedCountry(detectCountry(user));
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
      {/* Welcome tagline — visible on step 1 */}
      {currentStep === 1 && (
        <div className="text-center mb-6">
          <p className="text-lg font-bold" style={{ color: 'var(--color-black)' }}>
            {detectedCountry.platform_tagline}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>
            {detectedCountry.flag_emoji} {detectedCountry.country_name_local}
          </p>
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium transition-colors"
            style={{ color: 'var(--color-stone)' }}
          >
            <MapPin className="w-3 h-3" />
            No estas en {detectedCountry.country_name_local}? Cambiar
          </button>

          {/* Inactive country notice */}
          {!detectedCountry.is_active && (
            <div
              className="mt-3 mx-auto max-w-sm p-3 rounded-xl text-xs leading-relaxed"
              style={{ background: 'var(--color-surface)', color: 'var(--color-stone)', border: '1px solid var(--color-border)' }}
            >
              Hispaloshop aun no esta disponible en {detectedCountry.country_name_local}.
              Mientras tanto, puedes descubrir los mejores productores de España.
            </div>
          )}
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          {error}
        </div>
      ) : null}

      {currentStep === 1 ? <InterestsStep {...commonProps} /> : null}
      {currentStep === 2 ? <LocationStep {...commonProps} onBack={handleBack} /> : null}
      {currentStep === 3 ? <FollowStep onBack={handleBack} onComplete={handleComplete} onError={handleError} /> : null}

      {showPicker && (
        <CountryPicker
          current={detectedCountry.country_code}
          onSelect={handleCountryChange}
          onClose={() => setShowPicker(false)}
        />
      )}
    </OnboardingLayout>
  );
}
