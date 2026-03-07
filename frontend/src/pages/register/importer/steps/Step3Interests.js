import React from 'react';
import { ArrowRight, Droplets, Milk, Beef, Wine, Fish, Cookie, Leaf } from 'lucide-react';
import CheckboxGroup from '../../../../components/forms/CheckboxGroup';
import InputField from '../../../../components/forms/InputField';

const CATEGORY_OPTIONS = [
  { value: 'aceites', label: 'Aceites de oliva', icon: Droplets },
  { value: 'quesos', label: 'Quesos', icon: Milk },
  { value: 'ibericos', label: 'Ibéricos', icon: Beef },
  { value: 'vinos', label: 'Vinos', icon: Wine },
  { value: 'conservas', label: 'Conservas', icon: Fish },
  { value: 'panaderia', label: 'Panadería', icon: Cookie },
  { value: 'miel', label: 'Miel', icon: Leaf },
  { value: 'otros', label: 'Otros' }
];

const MARKET_OPTIONS = [
  { value: 'germany', label: 'Alemania' },
  { value: 'netherlands', label: 'Países Bajos' },
  { value: 'france', label: 'Francia' },
  { value: 'uk', label: 'Reino Unido' },
  { value: 'scandinavia', label: 'Escandinavia' },
  { value: 'others', label: 'Otros' }
];

const Step3Interests = ({ onNext, data, onDataChange }) => {
  const [categories, setCategories] = React.useState(data.categories || []);
  const [markets, setMarkets] = React.useState(data.markets || []);
  const [volumes, setVolumes] = React.useState(data.volumes || {});

  const handleSubmit = () => {
    onDataChange({ categories, markets, volumes });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">Intereses de importación</h3>
        <p className="text-sm text-[#6B7280]">¿Qué te interesa importar?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          Categorías de interés
        </label>
        <CheckboxGroup
          options={CATEGORY_OPTIONS}
          selected={categories}
          onChange={setCategories}
          columns={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          Mercados destino actuales
        </label>
        <CheckboxGroup
          options={MARKET_OPTIONS}
          selected={markets}
          onChange={setMarkets}
          columns={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          Volumen por categoría (anual)
        </label>
        <div className="space-y-3">
          {categories.includes('aceites') && (
            <InputField
              label="Aceites"
              type="number"
              value={volumes.aceites || ''}
              onChange={(e) => setVolumes({ ...volumes, aceites: e.target.value })}
              placeholder="10,000"
              rightElement={<span className="text-sm text-[#6B7280]">litros</span>}
            />
          )}
          {categories.includes('quesos') && (
            <InputField
              label="Quesos"
              type="number"
              value={volumes.quesos || ''}
              onChange={(e) => setVolumes({ ...volumes, quesos: e.target.value })}
              placeholder="5,000"
              rightElement={<span className="text-sm text-[#6B7280]">kg</span>}
            />
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={categories.length === 0}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step3Interests;
