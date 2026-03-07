import React from 'react';
import { ArrowRight, User, Building2, Users, Award } from 'lucide-react';
import RadioGroup from '../../../../components/forms/RadioGroup';
import CheckboxGroup from '../../../../components/forms/CheckboxGroup';
import InputField from '../../../../components/forms/InputField';

const BUSINESS_TYPES = [
  { value: 'autonomo', label: 'Autónomo/a individual', icon: User },
  { value: 'cooperativa', label: 'Sociedad / Cooperativa', icon: Users },
  { value: 'familiar', label: 'Empresa familiar', icon: Building2 },
  { value: 'establecida', label: 'Marca establecida', icon: Award }
];

const EXPERIENCE_OPTIONS = [
  { value: 'new', label: 'Menos de 1 año' },
  { value: '1-5', label: '1-5 años' },
  { value: '5-10', label: '5-10 años' },
  { value: '10+', label: 'Más de 10 años' }
];

const Step1Business = ({ onNext, data, onDataChange }) => {
  const [businessType, setBusinessType] = React.useState(data.businessType || '');
  const [experience, setExperience] = React.useState(data.experience || '');
  const [hasRegistry, setHasRegistry] = React.useState(data.hasRegistry || false);
  const [registryNumber, setRegistryNumber] = React.useState(data.registryNumber || '');

  const handleSubmit = () => {
    onDataChange({ businessType, experience, hasRegistry, registryNumber });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">Tipo de negocio</h3>
        <p className="text-sm text-[#6B7280]">Cuéntanos sobre tu empresa</p>
      </div>

      <RadioGroup
        options={BUSINESS_TYPES}
        value={businessType}
        onChange={setBusinessType}
      />

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          ¿Cuántos años llevas en activo?
        </label>
        <RadioGroup
          options={EXPERIENCE_OPTIONS}
          value={experience}
          onChange={setExperience}
          columns={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
          ¿Tienes registro sanitario?
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              checked={hasRegistry}
              onChange={() => setHasRegistry(true)}
              className="w-4 h-4 text-[#2D5A3D]"
            />
            <span className="text-sm">Sí, tengo número</span>
          </label>
          {hasRegistry && (
            <InputField
              placeholder="RGSEAA: 28.01234/SE"
              value={registryNumber}
              onChange={(e) => setRegistryNumber(e.target.value)}
            />
          )}
          <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              checked={!hasRegistry}
              onChange={() => setHasRegistry(false)}
              className="w-4 h-4 text-[#2D5A3D]"
            />
            <span className="text-sm">En trámite / No tengo</span>
          </label>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!businessType || !experience}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step1Business;
