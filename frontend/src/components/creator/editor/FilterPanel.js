import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { PREDEFINED_FILTERS } from '../types/editor.types';

// Build CSS filter string for thumbnail previews
function buildFilterCSS(settings) {
  const { brightness = 0, contrast = 0, saturate = 100, warmth = 0, exposure = 0, fade = 0, tint = 0 } = settings;
  const fadeBrightness = fade * 0.2;
  const fadeContrast = fade * 0.4;
  return [
    `brightness(${100 + brightness + exposure + fadeBrightness}%)`,
    `contrast(${100 + contrast - fadeContrast}%)`,
    `saturate(${Math.max(0, saturate - fade * 0.2)}%)`,
    `sepia(${Math.max(0, warmth / 2)}%)`,
    `hue-rotate(${(warmth > 0 ? -10 : 0) + tint}deg)`,
  ].join(' ');
}

const ADJUST_SLIDERS = [
  { key: 'brightness',  label: 'Brillo',          min: -100, max: 100,  defaultVal: 0   },
  { key: 'contrast',    label: 'Contraste',        min: -100, max: 100,  defaultVal: 0   },
  { key: 'saturate',    label: 'Saturación',       min: 0,    max: 200,  defaultVal: 100 },
  { key: 'warmth',      label: 'Temperatura',      min: -100, max: 100,  defaultVal: 0   },
  { key: 'sharpness',   label: 'Nitidez',          min: 0,    max: 100,  defaultVal: 0   },
  { key: 'fade',        label: 'Desvanecimiento',  min: 0,    max: 100,  defaultVal: 0   },
  { key: 'highlights',  label: 'Resaltar',         min: -100, max: 100,  defaultVal: 0   },
  { key: 'shadows',     label: 'Sombras',          min: -100, max: 100,  defaultVal: 0   },
  { key: 'vignette',    label: 'Viñeta',           min: 0,    max: 100,  defaultVal: 0   },
  { key: 'tint',        label: 'Tinte',            min: -100, max: 100,  defaultVal: 0   },
];

function AdjustSlider({ label, value, min, max, defaultVal, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="w-28 shrink-0 text-left text-[13px] font-medium text-stone-700 active:opacity-50"
        onDoubleClick={() => onChange(defaultVal)}
        title="Doble clic para restablecer"
      >
        {label}
      </button>
      <div className="relative flex-1">
        {/* Center tick for bipolar sliders */}
        {min < 0 && (
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-stone-400/50 rounded-full"
            style={{ left: `${((0 - min) / (max - min)) * 100}%` }}
          />
        )}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[12px] tabular-nums text-stone-400">{value}</span>
    </div>
  );
}

function FilterPanel({
  firstImageSrc,
  settings,
  appliedFilter,
  filterIntensity,
  onSettingChange,
  onFilterSelect,
  onFilterIntensityChange,
  onReset,
  defaultTab = 'filtros',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div>
      {/* ── Tab header ─────────────────────────────────────────────────────── */}
      <div className="flex items-stretch border-b border-stone-100">
        <button
          type="button"
          onClick={() => setActiveTab('filtros')}
          className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${
            activeTab === 'filtros'
              ? 'border-b-2 border-stone-950 text-stone-950'
              : 'text-stone-400 active:text-stone-600'
          }`}
        >
          Filtros
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ajuste')}
          className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${
            activeTab === 'ajuste'
              ? 'border-b-2 border-stone-950 text-stone-950'
              : 'text-stone-400 active:text-stone-600'
          }`}
        >
          Ajuste
        </button>
        <button
          type="button"
          onClick={onReset}
          aria-label="Restablecer"
          className="flex items-center justify-center px-4 text-stone-400 active:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Filtros tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'filtros' && (
        <div className="px-3 pt-3 pb-4">
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {PREDEFINED_FILTERS.map((filter) => {
              const isActive = appliedFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => onFilterSelect(filter.id)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <div className={`overflow-hidden rounded-[10px] transition-all ${
                    isActive ? 'ring-2 ring-stone-950 ring-offset-1' : ''
                  }`}>
                    {firstImageSrc ? (
                      <img
                        src={firstImageSrc}
                        alt={filter.name}
                        className="h-[72px] w-[56px] object-cover"
                        style={{ filter: buildFilterCSS(filter.settings) }}
                        draggable={false}
                      />
                    ) : (
                      <div
                        className="h-[72px] w-[56px] bg-gradient-to-br from-stone-200 to-stone-300 rounded-[10px]"
                        style={{ filter: buildFilterCSS(filter.settings) }}
                      />
                    )}
                  </div>
                  <span className={`text-[11px] font-medium leading-none ${
                    isActive ? 'text-stone-950' : 'text-stone-500'
                  }`}>
                    {filter.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Intensity slider (only when a filter is active) */}
          {appliedFilter && (
            <div className="mt-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-stone-500 uppercase tracking-[0.15em]">Intensidad</span>
                <span className="text-[12px] tabular-nums text-stone-600">{filterIntensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={filterIntensity}
                onChange={(e) => onFilterIntensityChange(parseInt(e.target.value, 10))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Ajuste tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'ajuste' && (
        <div className="space-y-3.5 px-4 py-4">
          {ADJUST_SLIDERS.map(({ key, label, min, max, defaultVal }) => (
            <AdjustSlider
              key={key}
              label={label}
              value={settings[key] ?? defaultVal}
              min={min}
              max={max}
              defaultVal={defaultVal}
              onChange={(val) => onSettingChange(key, val)}
            />
          ))}
          <p className="pt-1 text-[11px] text-stone-400">Doble clic en el nombre para restablecer cada ajuste.</p>
        </div>
      )}
    </div>
  );
}

export default FilterPanel;
