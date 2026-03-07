import React from 'react';
import { ArrowRight, CreditCard } from 'lucide-react';
import CheckboxGroup from '../../../../components/forms/CheckboxGroup';
import RadioGroup from '../../../../components/forms/RadioGroup';
import InputField from '../../../../components/forms/InputField';

const SHIPPING_OPTIONS = [
  { value: 'peninsula', label: 'Toda España peninsular' },
  { value: 'baleares', label: 'Islas Baleares (+coste)' },
  { value: 'canarias', label: 'Islas Canarias (+coste)' },
  { value: 'internacional', label: 'Internacional (UE)' }
];

const PACKAGING_OPTIONS = [
  { value: 'sostenible', label: 'Sostenible (reciclado)' },
  { value: 'estandar', label: 'Estándar' },
  { value: 'premium', label: 'Premium (regalo)' }
];

const Step4Logistics = ({ onNext, data, onDataChange }) => {
  const [shippingAreas, setShippingAreas] = React.useState(data.shippingAreas || []);
  const [capacity, setCapacity] = React.useState(data.capacity || '');
  const [packaging, setPackaging] = React.useState(data.packaging || 'sostenible');
  const [stripeConnected, setStripeConnected] = React.useState(data.stripeConnected || false);

  const handleConnectStripe = () => {
    setStripeConnected(true);
  };

  const handleSubmit = () => {
    onDataChange({ shippingAreas, capacity, packaging, stripeConnected });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">Logística y envíos</h3>
        <p className="text-sm text-[#6B7280]">Configura tu distribución</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          ¿Dónde envías actualmente?
        </label>
        <CheckboxGroup
          options={SHIPPING_OPTIONS}
          selected={shippingAreas}
          onChange={setShippingAreas}
        />
      </div>

      <InputField
        label="Capacidad de envío semanal"
        type="number"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        placeholder="50"
        hint="pedidos/semana máximo"
      />

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          Empaque preferido
        </label>
        <RadioGroup
          options={PACKAGING_OPTIONS}
          value={packaging}
          onChange={setPackaging}
        />
      </div>

      {/* Stripe Connect */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <CreditCard className="w-6 h-6 text-[#2D5A3D]" />
          <div>
            <h4 className="font-medium text-[#1A1A1A]">Conectar Stripe</h4>
            <p className="text-xs text-[#6B7280]">Para recibir cobros</p>
          </div>
        </div>
        
        {!stripeConnected ? (
          <button
            onClick={handleConnectStripe}
            className="w-full py-2.5 bg-[#635BFF] text-white rounded-lg font-medium hover:bg-[#524af0] transition-colors"
          >
            Conectar cuenta Stripe →
          </button>
        ) : (
          <div className="flex items-center gap-2 text-[#16A34A]">
            <div className="w-5 h-5 rounded-full bg-[#16A34A] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium">Cuenta conectada</span>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={shippingAreas.length === 0 || !stripeConnected}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step4Logistics;
