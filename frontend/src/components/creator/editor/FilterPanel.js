import React from 'react';
import { RotateCcw } from 'lucide-react';
import { PREDEFINED_FILTERS } from '../types/editor.types';

const FILTER_NOTES = {
  natural: 'Equilibrado',
  warm: 'Más cálido',
  fresh: 'Más aire',
  artisan: 'Contraste suave',
  soft: 'Más luz',
  vivid: 'Más intensidad',
  night: 'Más profundidad',
  classic: 'Monocromo',
};

function FilterPanel({ settings, appliedFilter, onSettingChange, onFilterSelect, onReset }) {
  return (
    <div className="space-y-5 p-4">
      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-950">Filtros</h3>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Menos efectos decorativos, más control limpio sobre tono y atmósfera.
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-medium text-stone-700 ring-1 ring-stone-200 transition-colors hover:bg-stone-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </button>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {PREDEFINED_FILTERS.map((filter) => {
            const isActive = appliedFilter === filter.id;
            const brightnessShift = Math.max(18, 78 + filter.settings.brightness / 2);
            const warmthShift = filter.settings.warmth > 0 ? 'rgba(120, 96, 68, 0.18)' : 'rgba(120, 132, 146, 0.12)';

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFilterSelect(filter.id)}
                className="shrink-0 text-left"
              >
                <div className={`w-[88px] rounded-2xl border p-2 transition-colors ${
                  isActive ? 'border-stone-950 bg-white shadow-sm' : 'border-stone-100 bg-white hover:border-stone-200'
                }`}>
                  <div
                    className="h-20 rounded-xl border border-stone-100"
                    style={{
                      background: `linear-gradient(160deg, rgba(255,255,255,0.88), ${warmthShift}), linear-gradient(180deg, rgba(28,25,23,0.08), rgba(255,255,255,0.72) ${brightnessShift}%)`,
                      filter: `contrast(${100 + filter.settings.contrast}%) saturate(${filter.settings.saturate}%)`,
                    }}
                  />
                  <p className={`mt-2 text-xs font-medium ${isActive ? 'text-stone-950' : 'text-stone-700'}`}>
                    {filter.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-stone-500">
                    {FILTER_NOTES[filter.id]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <h4 className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
          Ajuste rápido
        </h4>
        <div className="mt-4 space-y-4">
          {[
            { key: 'brightness', label: 'Brillo', min: -100, max: 100, unit: '%' },
            { key: 'contrast', label: 'Contraste', min: -100, max: 100, unit: '%' },
            { key: 'saturate', label: 'Saturación', min: 0, max: 200, unit: '%' },
          ].map(({ key, label, min, max, unit }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">{label}</span>
                <span className="text-stone-500">
                  {settings[key]}
                  {unit}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={settings[key]}
                onChange={(event) => onSettingChange(key, parseInt(event.target.value, 10))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FilterPanel;
