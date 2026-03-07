import React from 'react';
import { ArrowRight } from 'lucide-react';
import CheckboxGroup from '../../../../components/forms/CheckboxGroup';
import RadioGroup from '../../../../components/forms/RadioGroup';

const CERT_OPTIONS = [
  { value: 'ifs', label: 'IFS Food' },
  { value: 'brc', label: 'BRC' },
  { value: 'ecologico', label: 'Ecológico UE' },
  { value: 'fairtrade', label: 'Fair Trade' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'halal', label: 'Halal' },
  { value: 'dop', label: 'DOP/IGP' },
  { value: 'none', label: 'Sin específicas' }
];

const PAYMENT_OPTIONS = [
  { value: 'transfer30', label: 'Transferencia 30 días' },
  { value: 'transfer60', label: 'Transferencia 60 días' },
  { value: 'confirming', label: 'Confirming' },
  { value: 'lc', label: 'Carta de crédito' }
];

const LOGISTICS_OPTIONS = [
  { value: 'fob', label: 'FOB (puerto origen)' },
  { value: 'cif', label: 'CIF (puerto destino)' },
  { value: 'ddp', label: 'DDP (entrega en almacén)' }
];

const Step4Requirements = ({ onNext, data, onDataChange }) => {
  const [certifications, setCertifications] = React.useState(data.certifications || []);
  const [paymentTerms, setPaymentTerms] = React.useState(data.paymentTerms || 'transfer30');
  const [logistics, setLogistics] = React.useState(data.logistics || 'fob');

  const handleSubmit = () => {
    onDataChange({ certifications, paymentTerms, logistics });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">Requisitos y condiciones</h3>
        <p className="text-sm text-[#6B7280]">Especifica tus necesidades</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          Certificaciones requeridas a proveedores
        </label>
        <CheckboxGroup
          options={CERT_OPTIONS}
          selected={certifications}
          onChange={setCertifications}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          Condiciones de pago preferidas
        </label>
        <RadioGroup
          options={PAYMENT_OPTIONS}
          value={paymentTerms}
          onChange={setPaymentTerms}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          Logística preferida
        </label>
        <RadioGroup
          options={LOGISTICS_OPTIONS}
          value={logistics}
          onChange={setLogistics}
        />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step4Requirements;
