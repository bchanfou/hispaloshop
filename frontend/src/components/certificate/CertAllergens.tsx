import React from 'react';
import { Check } from 'lucide-react';
import { getAllergenIcon } from './constants';
import type { CertUITexts } from './constants';

interface CertAllergensProps {
  txt: CertUITexts;
  allergens: string[];
  certifications: string[];
}

export default function CertAllergens({ txt, allergens, certifications }: CertAllergensProps) {
  const freeFrom = certifications.filter(c =>
    /sin gluten|gluten.free|vegano|vegan|sin lactosa|lactose.free|sin ogm|non.gmo/i.test(c)
  );

  if (allergens.length === 0 && freeFrom.length === 0) return null;

  return (
    <div className="mt-5 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-stone-950">{txt.suitable}</h2>

      {/* Contains */}
      {allergens.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-2">{txt.contains}</p>
          <div className="flex flex-wrap gap-2">
            {allergens.map(a => (
              <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-800">
                <span className="text-sm">{getAllergenIcon(a)}</span> {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Free from */}
      {freeFrom.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-2">{txt.free_from}</p>
          <div className="flex flex-wrap gap-2">
            {freeFrom.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-800">
                <Check className="h-3 w-3" /> {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
