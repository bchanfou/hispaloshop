import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Target, ScrollText } from 'lucide-react';

export default function CountryAdminOnboardingModal({ countryCode, countryName, onClose }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: ShieldCheck,
      title: t('countryAdmin.onboarding.step1Title', 'Revisa verificaciones pendientes'),
      body: t('countryAdmin.onboarding.step1Body', 'Tu trabajo principal: aprobar o rechazar a los nuevos productores e importadores que quieren vender en tu país.'),
    },
    {
      icon: Target,
      title: t('countryAdmin.onboarding.step2Title', 'Configura el objetivo semanal'),
      body: t('countryAdmin.onboarding.step2Body', 'Define cuánto GMV quieres alcanzar cada semana. Te ayuda a medir el progreso y a Iris a darte recomendaciones contextualizadas.'),
    },
    {
      icon: ScrollText,
      title: t('countryAdmin.onboarding.step3Title', 'Familiarízate con la auditoría'),
      body: t('countryAdmin.onboarding.step3Body', 'Cada acción que hagas (aprobar, rechazar, suspender) queda registrada en el log de auditoría. Es transparente y trazable.'),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center mb-6">
            <Icon className="w-8 h-8 text-stone-700" strokeWidth={1.5} />
          </div>
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">
            {t('countryAdmin.onboarding.welcome', 'Bienvenido')}
          </p>
          <h2 className="text-xl font-semibold text-stone-950 mb-2">
            {step === 0
              ? t('countryAdmin.onboarding.welcomeTitle', 'Eres el country admin de {{country}}', { country: countryName || countryCode })
              : current.title}
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            {step === 0
              ? t('countryAdmin.onboarding.welcomeBody', 'Tu rol es aprobar sellers, moderar contenido y vigilar la salud del marketplace local.')
              : current.body}
          </p>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-stone-950' : 'bg-stone-200'}`}
              />
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-stone-200 flex gap-3 justify-end">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-100"
            >
              {t('common.back', 'Atrás')}
            </button>
          )}
          <button
            onClick={next}
            className="px-6 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800"
          >
            {step === steps.length - 1
              ? t('countryAdmin.onboarding.start', 'Empezar')
              : t('common.next', 'Siguiente')}
          </button>
        </div>
      </div>
    </div>
  );
}
