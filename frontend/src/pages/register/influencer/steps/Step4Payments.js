import React from 'react';
import { ArrowRight, CreditCard } from 'lucide-react';
import RadioGroup from '../../../../components/forms/RadioGroup';

const PAYOUT_OPTIONS = [
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensualmente (mínimo €50)', description: 'Acumula hasta €50' },
  { value: 'threshold', label: 'Al alcanzar €100', description: 'Recibe cuando llegues a €100' }
];

const Step4Payments = ({ onNext, data, onDataChange }) => {
  const [stripeConnected, setStripeConnected] = React.useState(data.stripeConnected || false);
  const [payoutMethod, setPayoutMethod] = React.useState(data.payoutMethod || 'weekly');
  const [acceptTerms, setAcceptTerms] = React.useState(data.acceptTerms || false);

  const handleConnectStripe = () => {
    // Mock Stripe Connect
    setStripeConnected(true);
  };

  const handleSubmit = () => {
    onDataChange({ stripeConnected, payoutMethod, acceptTerms });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">
          Configuración de pagos
        </h3>
        <p className="text-sm text-[#6B7280]">
          Para recibir tus comisiones
        </p>
      </div>

      {/* Stripe Connect */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <CreditCard className="w-6 h-6 text-[#2D5A3D]" />
          <div>
            <h4 className="font-medium text-[#1A1A1A]">Conectar Stripe</h4>
            <p className="text-xs text-[#6B7280]">Seguro y rápido</p>
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
        
        <p className="text-xs text-[#6B7280] mt-2">
          Hispaloshop no guarda tus datos bancarios.
        </p>
      </div>

      {/* Payout Method */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          ¿Prefieres recibir pagos?
        </label>
        <RadioGroup
          options={PAYOUT_OPTIONS}
          value={payoutMethod}
          onChange={setPayoutMethod}
        />
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]"
        />
        <span className="text-sm text-[#6B7280]">
          Acepto las condiciones del programa de afiliados
          <span className="text-[#DC2626]"> *</span>
        </span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={!stripeConnected || !acceptTerms}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step4Payments;
