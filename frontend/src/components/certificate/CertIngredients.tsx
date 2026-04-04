import React from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import type { CertUITexts } from './constants';

interface CertIngredientsProps {
  txt: CertUITexts;
  ingredients: string[];
  allergens: string[];
  ingredientOrigins: { ingredient: string; origin: string }[];
}

export default function CertIngredients({ txt, ingredients, allergens, ingredientOrigins }: CertIngredientsProps) {
  return (
    <>
      {/* Ingredients + Allergens grid */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.ingredients}</h2>
          {ingredients.length > 0 ? (
            <p className="text-sm leading-relaxed text-stone-700">{ingredients.join(', ')}.</p>
          ) : (
            <p className="text-sm text-stone-400">{txt.not_declared}</p>
          )}
        </div>
        <div className="rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.allergens}</h2>
          {allergens.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allergens.map(a => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white">
                  <AlertTriangle className="h-3 w-3" /> {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400">{txt.no_allergens}</p>
          )}
        </div>
      </div>

      {/* Ingredient origins / traceability */}
      {ingredientOrigins.length > 0 && (
        <div className="mt-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.traceability}</h2>
          <div className="divide-y divide-stone-100">
            {ingredientOrigins.map(item => (
              <div key={`${item.ingredient}-${item.origin}`} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium text-stone-950">{item.ingredient}</span>
                <div className="flex items-center gap-1.5 text-stone-500">
                  <MapPin className="h-3 w-3" /> {item.origin}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
