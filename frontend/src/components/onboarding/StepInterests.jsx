/**
 * Paso 1: Seleccionar Intereses
 * Usuario debe seleccionar mínimo 3 categorías
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const CATEGORIES = [
  { id: 'aceites', label: 'Aceites', emoji: '🫒' },
  { id: 'quesos', label: 'Quesos', emoji: '🧀' },
  { id: 'embutidos', label: 'Embutidos', emoji: '🥩' },
  { id: 'panadería', label: 'Panadería', emoji: '🍞' },
  { id: 'miel', label: 'Miel', emoji: '🍯' },
  { id: 'conservas', label: 'Conservas', emoji: '🫙' },
  { id: 'vinos', label: 'Vinos', emoji: '🍷' },
  { id: 'dulces', label: 'Dulces', emoji: '🍪' },
  { id: 'bebes', label: 'Bebés', emoji: '👶' },
  { id: 'mascotas', label: 'Mascotas', emoji: '🐕' },
  { id: 'orgánico', label: 'Orgánico', emoji: '🌿' },
  { id: 'singluten', label: 'Sin gluten', emoji: '🌾' },
];

export default function StepInterests({ data, onUpdate, onNext }) {
  const [selected, setSelected] = useState(data.interests || []);

  const toggleCategory = (categoryId) => {
    setSelected((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handleNext = () => {
    onUpdate({ interests: selected });
    onNext();
  };

  const canProceed = selected.length >= 3;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">¿Qué te gusta?</h2>
        <p className="text-text-muted mt-2">
          Selecciona al menos 3 categorías para personalizar tu feed
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full">
          <span className="text-sm font-medium text-accent">
            {selected.length}/3 seleccionados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CATEGORIES.map((category) => {
          const isSelected = selected.includes(category.id);
          return (
            <motion.button
              key={category.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleCategory(category.id)}
              className={`relative p-4 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-accent bg-accent/5'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <span className="text-3xl">{category.emoji}</span>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {category.label}
              </p>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={() => onUpdate({ interests: selected, skipped: true })}
          className="text-sm text-text-muted hover:text-gray-900"
        >
          Saltar este paso
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="px-6 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
