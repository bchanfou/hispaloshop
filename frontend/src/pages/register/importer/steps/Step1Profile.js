import React from 'react';
import { ArrowRight, Building2, Users, Store, UtensilsCrossed } from 'lucide-react';
import RadioGroup from '../../../../components/forms/RadioGroup';
import InputField from '../../../../components/forms/InputField';

const COMPANY_TYPES = [
  { value: 'independent', label: 'Importador independiente', icon: Building2 },
  { value: 'distributor', label: 'Distribuidor mayorista', icon: Users },
  { value: 'retailer', label: 'Retailer / Cadena', icon: Store },
  { value: 'horeca', label: 'Food service / HORECA', icon: UtensilsCrossed },
  { value: 'broker', label: 'Broker / Agente', icon: Building2 }
];

const EXPERIENCE_OPTIONS = [
  { value: '0-2', label: '< 2 años' },
  { value: '2-5', label: '2-5 años' },
  { value: '5-10', label: '5-10 años' },
  { value: '10+', label: '> 10 años' }
];

const Step1Profile = ({ onNext, data, onDataChange }) => {
  const [companyType, setCompanyType] = React.useState(data.companyType || '');
  const [experience, setExperience] = React.useState(data.experience || '');
  const [volume, setVolume] = React.useState(data.volume || '');

  const handleSubmit = () => {
    onDataChange({ companyType, experience, volume });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">Perfil de empresa</h3>
        <p className="text-sm text-[#6B7280]">Cuéntanos sobre tu negocio</p>
      </div>

      <RadioGroup
        options={COMPANY_TYPES}
        value={companyType}
        onChange={setCompanyType}
      />

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          Años en el sector
        </label>
        <RadioGroup
          options={EXPERIENCE_OPTIONS}
          value={experience}
          onChange={setExperience}
          columns={2}
        />
      </div>

      <InputField
        label="Volumen anual de importación"
        type="number"
        value={volume}
        onChange={(e) => setVolume(e.target.value)}
        placeholder="500,000"
        rightElement={<span className="text-sm text-[#6B7280]">€/año</span>}
      />

      <button
        onClick={handleSubmit}
        disabled={!companyType || !experience}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step1Profile;
