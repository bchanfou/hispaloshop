/**
 * Onboarding Page - 4 Pasos
 * 1. Intereses (mínimo 3 categorías)
 * 2. Ubicación (código postal)
 * 3. Seguir cuentas (mínimo 3 productores)
 * 4. Bienvenida
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import StepInterests from '../../components/onboarding/StepInterests';
import StepLocation from '../../components/onboarding/StepLocation';
import StepFollow from '../../components/onboarding/StepFollow';
import StepWelcome from '../../components/onboarding/StepWelcome';
import { api } from '../../lib/api';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, name: 'Intereses', component: StepInterests },
  { id: 2, name: 'Ubicación', component: StepLocation },
  { id: 3, name: 'Seguir', component: StepFollow },
  { id: 4, name: 'Bienvenida', component: StepWelcome },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({
    interests: [],
    zipCode: '',
    city: '',
    following: [],
  });
  const [saving, setSaving] = useState(false);

  const updateData = (newData) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = async () => {
    // Si es el paso 3 (Follow), guardar en backend antes de pasar
    if (currentStep === 2) {
      await saveOnboardingData();
    }
    
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const saveOnboardingData = async () => {
    setSaving(true);
    try {
      // Llamada al backend para guardar onboarding
      await api.post('/user/onboarding', {
        interests: data.interests,
        location: {
          zipCode: data.zipCode,
          city: data.city,
          country: 'ES',
        },
        following: data.following,
      });

      // Actualizar usuario local
      setUser((prev) => ({
        ...prev,
        onboardingCompleted: true,
        preferences: {
          ...prev.preferences,
          interests: data.interests,
          location: { zipCode: data.zipCode, city: data.city },
        },
      }));

      toast.success('¡Perfil configurado correctamente!');
    } catch (error) {
      toast.error('Error guardando preferencias');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;
  const isLastStep = currentStep === STEPS.length - 1;

  // Si ya completó onboarding, redirigir
  if (user?.onboardingCompleted && currentStep < 3) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background-subtle flex flex-col">
      {/* Header con progreso */}
      <div className="bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <img src="/logo.png" alt="Hispaloshop" className="w-8 h-8" />
            {!isLastStep && (
              <button
                onClick={() => navigate('/')}
                className="text-sm text-text-muted hover:text-gray-900"
              >
                Saltar todo
              </button>
            )}
          </div>
          
          {!isLastStep && (
            <div className="flex items-center gap-2">
              {STEPS.slice(0, -1).map((step, index) => (
                <React.Fragment key={step.id}>
                  <div
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      index <= currentStep ? 'bg-accent' : 'bg-stone-200'
                    }`}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-stone-200"
            >
              {isLastStep ? (
                <StepWelcome userName={user?.name} />
              ) : (
                <CurrentStepComponent
                  data={data}
                  onUpdate={updateData}
                  onNext={nextStep}
                  onBack={currentStep > 0 ? prevStep : undefined}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-xl">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm mt-2">Guardando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
