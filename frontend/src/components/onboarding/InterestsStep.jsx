import React, { useState } from 'react';
import { onboardingApi } from '../../lib/onboardingApi';

const CATEGORIES = [
  'Aceites',
  'Miel',
  'Conservas',
  'Panadería',
  'Quesos',
  'Embutidos',
  'Salsas',
  'Pasta',
  'Arroz',
  'Legumbres',
  'Especias',
  'Frutos secos',
  'Semillas',
  'Superfoods',
  'Kombucha',
  'Zumos naturales',
  'Infusiones',
  'Café',
];

export default function InterestsStep({ onNext, onError }) {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (value) => {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((item) => item !== value);
      if (prev.length >= 10) return prev;
      return [...prev, value];
    });
  };

  const handleContinue = async () => {
    if (selected.length < 3) {
      onError?.('Selecciona al menos 3 categorías para continuar.');
      return;
    }

    setLoading(true);
    try {
      await onboardingApi.saveInterests(selected);
      onNext();
    } catch (error) {
      onError?.(error?.response?.data?.detail || 'No hemos podido guardar tus intereses todavía.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-950">¿Qué te interesa?</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Elige al menos 3 categorías para que el catálogo y el feed empiecen con una base útil.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES.map((category) => {
          const active = selected.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={`rounded-2xl border p-4 text-left text-sm font-medium transition-colors ${
                active ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-stone-500">{selected.length} seleccionadas</span>
        <button
          type="button"
          onClick={handleContinue}
          disabled={selected.length < 3 || loading}
          className="rounded-full bg-stone-950 px-6 py-3 font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
