/**
 * Paso 1: Seleccionar Intereses
 * Usuario debe seleccionar mínimo 3 categorías
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Droplets, Package, Leaf, UtensilsCrossed, Wheat, Baby, PawPrint } from 'lucide-react';
import { useTranslation } from 'react-i18next';
const CATEGORIES = [{
  id: 'aceites',
  label: 'Aceites',
  icon: <Droplets size={18} className="text-stone-950" />
}, {
  id: 'quesos',
  label: 'Quesos',
  emoji: '🧀'
}, {
  id: 'embutidos',
  label: 'Embutidos',
  emoji: '🥩'
}, {
  id: 'panadería',
  label: "Panadería",
  emoji: '🍞'
}, {
  id: 'miel',
  label: 'Miel',
  emoji: '🍯'
}, {
  id: 'conservas',
  label: 'Conservas',
  icon: <Package size={18} className="text-stone-950" />
}, {
  id: 'vinos',
  label: 'Vinos',
  emoji: '🍷'
}, {
  id: 'dulces',
  label: 'Dulces',
  emoji: '🍪'
}, {
  id: 'bebes',
  label: 'Bebés',
  icon: <Baby size={18} className="text-stone-950" />
}, {
  id: 'mascotas',
  label: 'Mascotas',
  icon: <PawPrint size={18} className="text-stone-950" />
}, {
  id: 'orgánico',
  label: "Orgánico",
  icon: <Leaf size={18} className="text-stone-950" />
}, {
  id: 'singluten',
  label: 'Sin gluten',
  icon: <Wheat size={18} className="text-stone-950" />
}];
export default function StepInterests({
  data,
  onUpdate,
  onNext
}) {
  const [selected, setSelected] = useState(data.interests || []);
  const toggleCategory = categoryId => {
    setSelected(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };
  const handleNext = () => {
    onUpdate({
      interests: selected
    });
    onNext();
  };
  const canProceed = selected.length >= 3;
  return <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-950">¿Qué te gusta?</h2>
        <p className="text-stone-500 mt-2">
          Selecciona al menos 3 categorías para personalizar tu feed
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full">
          <span className="text-sm font-medium text-stone-950">
            {selected.length}/3 seleccionados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CATEGORIES.map(category => {
        const isSelected = selected.includes(category.id);
        return <motion.button key={category.id} whileTap={{
          scale: 0.95
        }} onClick={() => toggleCategory(category.id)} className={`relative p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-stone-950 bg-stone-50' : 'border-stone-200 hover:border-stone-200'}`}>
              <span className="text-3xl">{category.icon || category.emoji}</span>
              <p className="mt-2 text-sm font-medium text-stone-950">
                {category.label}
              </p>
              {isSelected && <div className="absolute top-2 right-2 w-5 h-5 bg-stone-950 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>}
            </motion.button>;
      })}
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={() => onUpdate({
        interests: selected,
        skipped: true
      })} className="text-sm text-stone-500 hover:text-stone-950">
          Saltar este paso
        </button>
        <button onClick={handleNext} disabled={!canProceed} className="px-6 py-3 bg-stone-950 text-white rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors">
          Siguiente
        </button>
      </div>
    </div>;
}