import React from 'react';
import { ArrowRight } from 'lucide-react';
import RadioGroup from '../../../../components/forms/RadioGroup';
import { Sparkles, TrendingUp, MapPin, Star } from 'lucide-react';

const DISCOVERY_OPTIONS = [
  { 
    value: 'personalized', 
    label: 'Recomendaciones personalizadas HI', 
    icon: Sparkles,
    description: 'Inteligencia artificial adaptada a ti'
  },
  { 
    value: 'popular', 
    label: 'Lo más popular', 
    icon: TrendingUp,
    description: 'Los productos más vendidos'
  },
  { 
    value: 'local', 
    label: 'Solo productores de mi zona', 
    icon: MapPin,
    description: 'Apoya lo local'
  },
  { 
    value: 'rated', 
    label: 'Mejor valorados', 
    icon: Star,
    description: 'Top reseñas de clientes'
  }
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensualmente' },
  { value: 'occasional', label: 'Solo ocasiones especiales' }
];

const Step4Preferences = ({ onNext, data, onDataChange }) => {
  const [discoveryMethod, setDiscoveryMethod] = React.useState(data.discoveryMethod || 'personalized');
  const [frequency, setFrequency] = React.useState(data.frequency || 'weekly');

  const handleSubmit = () => {
    onDataChange({
      discoveryMethod,
      frequency
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Preferencias de descubrimiento
        </h3>
        <p className="text-sm text-text-muted">
          ¿Cómo prefieres descubrir productos?
        </p>
      </div>

      {/* Discovery Method */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Método de descubrimiento
        </label>
        <RadioGroup
          options={DISCOVERY_OPTIONS}
          value={discoveryMethod}
          onChange={setDiscoveryMethod}
        />
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          ¿Con qué frecuencia compras productos artesanales?
        </label>
        <RadioGroup
          options={FREQUENCY_OPTIONS}
          value={frequency}
          onChange={setFrequency}
          columns={1}
        />
      </div>

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

export default Step4Preferences;
