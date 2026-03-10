import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { PREDEFINED_FILTERS } from '../types/editor.types';

function FilterPanel({ settings, appliedFilter, onSettingChange, onFilterSelect, onReset }) {
  return (
    <div className="p-4 space-y-4">
      {/* Filtros predefinidos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-stone-700">Filtros</h3>
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-accent"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PREDEFINED_FILTERS.map((filter) => (
            <motion.button
              key={filter.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onFilterSelect(filter.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 ${
                appliedFilter === filter.id ? 'opacity-100' : 'opacity-70'
              }`}
            >
              <div 
                className={`w-16 h-16 rounded-xl overflow-hidden ${
                  appliedFilter === filter.id ? 'ring-2 ring-accent ring-offset-2' : ''
                }`}
                style={{
                  background: `linear-gradient(135deg, 
                    hsl(${40 + filter.settings.warmth}, ${filter.settings.saturate}%, ${50 + filter.settings.brightness / 2}%),
                    hsl(${20 + filter.settings.warmth}, ${filter.settings.saturate * 0.8}%, ${40 + filter.settings.brightness / 3}%)
                  )`,
                  filter: `contrast(${100 + filter.settings.contrast}%) brightness(${100 + filter.settings.exposure}%)`,
                }}
              />
              <span className={`text-xs ${appliedFilter === filter.id ? 'font-medium text-accent' : 'text-stone-500'}`}>
                {filter.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Ajustes manuales */}
      <div className="space-y-3 pt-2 border-t border-stone-100">
        <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider">Ajustes manuales</h4>
        
        {[
          { key: 'brightness', label: 'Brillo', min: -100, max: 100, unit: '%' },
          { key: 'contrast', label: 'Contraste', min: -100, max: 100, unit: '%' },
          { key: 'saturate', label: 'Saturación', min: 0, max: 200, unit: '%' },
          { key: 'warmth', label: 'Temperatura', min: -100, max: 100, unit: '' },
          { key: 'sharpness', label: 'Nitidez', min: 0, max: 100, unit: '%' },
          { key: 'exposure', label: 'Exposición', min: -100, max: 100, unit: '%' },
        ].map(({ key, label, min, max, unit }) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-stone-600">{label}</span>
              <span className="text-stone-400">{settings[key]}{unit}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={settings[key]}
              onChange={(e) => onSettingChange(key, parseInt(e.target.value))}
              className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default FilterPanel;
