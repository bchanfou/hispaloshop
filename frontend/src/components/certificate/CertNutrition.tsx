import React from 'react';
import { NUTRIENT_UNITS, NUTRIENT_LABELS } from './constants';
import type { CertUITexts } from './constants';

interface CertNutritionProps {
  txt: CertUITexts;
  nutrition: Record<string, any> | null;
}

export default function CertNutrition({ txt, nutrition }: CertNutritionProps) {
  if (!nutrition || typeof nutrition !== 'object' || Object.keys(nutrition).length === 0) return null;

  return (
    <div className="mt-5 overflow-hidden rounded-[28px] border-2 border-stone-950 bg-white">
      <div className="border-b-[3px] border-stone-950 bg-white px-5 pt-4 pb-3">
        <h2 className="text-xl font-black uppercase tracking-tight text-stone-950">{txt.nutrition}</h2>
        <p className="text-xs text-stone-500">{txt.per100}</p>
      </div>
      <div className="flex items-center justify-between border-b border-stone-950 bg-stone-950 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-stone-300">
        <span>{txt.nutrient}</span>
        <span>{txt.per100g}</span>
      </div>
      <div className="divide-y divide-stone-100">
        {Object.entries(nutrition).map(([key, value], i) => {
          const normalKey = key.toLowerCase().replace(/\s+/g, '_');
          const unit = NUTRIENT_UNITS[normalKey] || NUTRIENT_UNITS[key] || '';
          const label = NUTRIENT_LABELS[normalKey] || NUTRIENT_LABELS[key] || key.replace(/_/g, ' ');
          const isIndented = label.startsWith('—');
          return (
            <div key={key} className={`flex items-center justify-between px-5 py-2.5 text-sm ${i === 0 ? 'font-bold text-stone-950' : 'text-stone-700'}`}>
              <span className={`capitalize ${isIndented ? 'pl-3 text-stone-500' : ''}`}>{label}</span>
              <span className={i === 0 ? 'font-black text-stone-950' : 'font-semibold text-stone-950'}>
                {String(value)} {unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
