import React from 'react';
import { ArrowRight } from 'lucide-react';
import CheckboxGroup from '../../../../components/forms/CheckboxGroup';
import InputField from '../../../../components/forms/InputField';
import { Leaf, Wheat, Milk, Beef, Cookie, Nut, Fish, Egg } from 'lucide-react';

const DIETARY_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetariano' },
  { value: 'vegan', label: 'Vegano' },
  { value: 'gluten_free', label: 'Sin gluten' },
  { value: 'lactose_free', label: 'Sin lactosa' },
  { value: 'nut_free', label: 'Sin frutos secos' },
  { value: 'other', label: 'Otras' }
];

const CATEGORY_OPTIONS = [
  { value: 'aceites', label: 'Aceites', icon: Leaf },
  { value: 'quesos', label: 'Quesos', icon: Milk },
  { value: 'embutidos', label: 'Embutidos', icon: Beef },
  { value: 'conservas', label: 'Conservas', icon: Fish },
  { value: 'panaderia', label: 'Panadería', icon: Cookie },
  { value: 'bebidas', label: 'Bebidas', icon: Milk },
  { value: 'snacks', label: 'Snacks', icon: Nut },
  { value: 'organico', label: 'Orgánico', icon: Leaf }
];

const Step3Profile = ({ onNext, data, onDataChange }) => {
  const [dietaryRestrictions, setDietaryRestrictions] = React.useState(data.dietaryRestrictions || []);
  const [categories, setCategories] = React.useState(data.categories || []);
  const [postalCode, setPostalCode] = React.useState(data.postalCode || '');

  const handleSubmit = () => {
    onDataChange({
      dietaryRestrictions,
      categories,
      postalCode
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Perfil alimentario
        </h3>
        <p className="text-sm text-text-muted">
          Personaliza tu experiencia
        </p>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          ¿Tienes alguna restricción alimentaria?
        </label>
        <CheckboxGroup
          options={DIETARY_OPTIONS}
          selected={dietaryRestrictions}
          onChange={setDietaryRestrictions}
          columns={2}
        />
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          ¿Qué categorías te interesan más?
        </label>
        <CheckboxGroup
          options={CATEGORY_OPTIONS}
          selected={categories}
          onChange={setCategories}
          columns={2}
        />
      </div>

      {/* Postal Code */}
      <InputField
        label="Código postal"
        type="number"
        value={postalCode}
        onChange={(e) => setPostalCode(e.target.value)}
        placeholder="41001"
        hint="Para encontrar productores cercanos"
      />

      {/* Submit */}
      <button
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step3Profile;
