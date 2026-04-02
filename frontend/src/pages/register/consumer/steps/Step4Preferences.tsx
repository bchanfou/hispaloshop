// @ts-nocheck
import React, { useState } from 'react';
import { ArrowRight, MapPin, Sparkles, Star, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DISCOVERY_OPTIONS = [
  {
    value: 'personalized',
    label: 'Recomendaciones personalizadas',
    description: t('step4_preferences.sugerenciasAjustadasATusInteresesY', 'Sugerencias ajustadas a tus intereses y tu actividad.'),
    icon: Sparkles,
  },
  {
    value: 'popular',
    label: t('step4_preferences.loMasPopular', 'Lo más popular'),
    description: t('step4_preferences.losProductosQueMasEstanComprandoOt', 'Los productos que más están comprando otros usuarios.'),
    icon: TrendingUp,
  },
  {
    value: 'local',
    label: 'Productores de mi zona',
    description: 'Prioriza propuestas cercanas cuando sea posible.',
    icon: MapPin,
  },
  {
    value: 'rated',
    label: 'Mejor valorados',
    description: t('step4_preferences.ordenaPrimeroPorResenasYConfianza', 'Ordena primero por reseñas y confianza.'),
    icon: Star,
  },
];

const FREQUENCY_OPTIONS = [
  'Semanalmente',
  'Mensualmente',
  'Solo en ocasiones especiales',
];

const Step4Preferences = ({ onNext, data, onDataChange }) => {
  const [discoveryMethod, setDiscoveryMethod] = useState(data.discoveryMethod || 'personalized');
  const [frequency, setFrequency] = useState(data.frequency || 'weekly');

  const frequencyMap = {
    Semanalmente: 'weekly',
    Mensualmente: 'monthly',
    'Solo en ocasiones especiales': 'occasional',
  };

  const handleSubmit = () => {
    onDataChange({ discoveryMethod, frequency });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-950">Preferencias de descubrimiento</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Define cómo quieres empezar a ver productos y con qué frecuencia sueles comprar.
        </p>
      </div>

      <div className="space-y-3">
        {DISCOVERY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = discoveryMethod === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setDiscoveryMethod(option.value)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                selected ? 'border-stone-950 bg-stone-100' : 'border-stone-200 bg-white hover:border-stone-200'
              }`}
            >
              <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${selected ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-stone-950">{option.label}</p>
                <p className="mt-1 text-sm text-stone-600">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-stone-800">
          ¿Con qué frecuencia compras productos artesanales?
        </label>
        <div className="space-y-3">
          {FREQUENCY_OPTIONS.map((option) => {
            const value = frequencyMap[option];
            const selected = frequency === value;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFrequency(value)}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
                  selected ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-200'
                }`}
              >
                <span className="font-medium">{option}</span>
                <span className={`h-3 w-3 rounded-full ${selected ? 'bg-white' : 'bg-stone-300'}`} />
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 font-medium text-white transition-colors hover:bg-black"
      >
        Continuar
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Step4Preferences;
