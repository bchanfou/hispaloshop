import React, { useState, useEffect } from 'react';
import { onboardingApi } from '../../lib/onboardingApi';

const CATEGORIES = [
  { id: 'alimentacion', name: 'Alimentación', icon: '🍽️' },
  { id: 'bebidas', name: 'Bebidas', icon: '🍷' },
  { id: 'aceites', name: 'Aceites', icon: '🫒' },
  { id: 'conservas', name: 'Conservas', icon: '🥫' },
  { id: 'dulces', name: 'Dulces', icon: '🍯' },
  { id: 'embutidos', name: 'Embutidos', icon: '🥓' },
  { id: 'quesos', name: 'Quesos', icon: '🧀' },
  { id: 'panaderia', name: 'Panadería', icon: '🥖' },
  { id: 'organico', name: 'Orgánico', icon: '🌿' },
  { id: 'artesanal', name: 'Artesanal', icon: '🏺' },
  { id: 'gourmet', name: 'Gourmet', icon: '👨‍🍳' },
  { id: 'sin_gluten', name: 'Sin Gluten', icon: '🌾' },
  { id: 'vegano', name: 'Vegano', icon: '🌱' },
  { id: 'vinos', name: 'Vinos', icon: '🍇' },
  { id: 'cervezas', name: 'Cervezas', icon: '🍺' },
  { id: 'frutas', name: 'Frutas', icon: '🍎' },
  { id: 'verduras', name: 'Verduras', icon: '🥬' },
  { id: 'especias', name: 'Especias', icon: '🌶️' },
];

export default function InterestsStep({ onNext, onError }) {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(c => c !== id);
      }
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleContinue = async () => {
    if (selected.length < 3) {
      onError?.('Selecciona al menos 3 categorías');
      return;
    }

    setLoading(true);
    try {
      await onboardingApi.saveInterests(selected);
      onNext();
    } catch (err) {
      onError?.(err.response?.data?.detail || 'Error al guardar intereses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-900 mb-2">
          ¿Qué te gusta?
        </h1>
        <p className="text-stone-600">
          Selecciona al menos 3 categorías para personalizar tu experiencia
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selected.includes(cat.id)
                ? 'border-stone-900 bg-stone-50'
                : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <span className="text-2xl mb-2 block">{cat.icon}</span>
            <span className={`text-sm font-medium ${
              selected.includes(cat.id) ? 'text-stone-900' : 'text-stone-600'
            }`}>
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4">
        <span className="text-sm text-stone-500">
          {selected.length} seleccionadas
        </span>
        <button
          onClick={handleContinue}
          disabled={selected.length < 3 || loading}
          className="px-6 py-2 bg-stone-900 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors"
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
