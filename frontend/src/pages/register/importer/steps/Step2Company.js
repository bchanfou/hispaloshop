import React from 'react';
import { ArrowRight, Globe } from 'lucide-react';
import InputField from '../../../../components/forms/InputField';
import useFormValidation from '../../../../hooks/useFormValidation';

const Step2Company = ({ onNext, data, onDataChange }) => {
  const validationRules = {
    companyName: ['required'],
    country: ['required'],
    registrationNumber: ['required'],
    address: ['required'],
    legalRep: ['required'],
    position: ['required'],
    email: ['required', 'email'],
    phone: ['required', 'phone']
  };

  const { values, errors, touched, valid, handleChange, handleBlur, validateAll } = useFormValidation(
    {
      companyName: data.companyName || '',
      country: data.country || '',
      registrationNumber: data.registrationNumber || '',
      address: data.address || '',
      legalRep: data.legalRep || '',
      position: data.position || '',
      email: data.email || '',
      phone: data.phone || ''
    },
    validationRules
  );

  const [isEU, setIsEU] = React.useState(data.isEU !== false);
  const [needsCustoms, setNeedsCustoms] = React.useState(data.needsCustoms || false);

  const handleSubmit = () => {
    if (validateAll()) {
      onDataChange({ ...values, isEU, needsCustoms });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">Datos empresariales</h3>
        <p className="text-sm text-[#6B7280]">Información legal completa</p>
      </div>

      <div className="space-y-4">
        <InputField
          label="Razón social"
          value={values.companyName}
          onChange={handleChange('companyName')}
          onBlur={handleBlur('companyName')}
          placeholder="Gourmet Imports GmbH"
          error={errors.companyName}
          touched={touched.companyName}
          valid={valid.companyName}
          required
        />

        <InputField
          label="País de registro"
          value={values.country}
          onChange={handleChange('country')}
          onBlur={handleBlur('country')}
          placeholder="Alemania"
          error={errors.country}
          touched={touched.country}
          valid={valid.country}
          icon={Globe}
          required
        />

        <InputField
          label="Número registro comercial"
          value={values.registrationNumber}
          onChange={handleChange('registrationNumber')}
          onBlur={handleBlur('registrationNumber')}
          placeholder="HRB 123456"
          error={errors.registrationNumber}
          touched={touched.registrationNumber}
          valid={valid.registrationNumber}
          required
        />

        <InputField
          label="Dirección completa"
          value={values.address}
          onChange={handleChange('address')}
          onBlur={handleBlur('address')}
          placeholder="Friedrichstraße 123, 10117 Berlin"
          error={errors.address}
          touched={touched.address}
          valid={valid.address}
          required
        />

        <InputField
          label="Representante legal"
          value={values.legalRep}
          onChange={handleChange('legalRep')}
          onBlur={handleBlur('legalRep')}
          placeholder="Hans Mueller"
          error={errors.legalRep}
          touched={touched.legalRep}
          valid={valid.legalRep}
          required
        />

        <InputField
          label="Cargo"
          value={values.position}
          onChange={handleChange('position')}
          onBlur={handleBlur('position')}
          placeholder="Director de Compras"
          error={errors.position}
          touched={touched.position}
          valid={valid.position}
          required
        />

        <InputField
          label="Email"
          type="email"
          value={values.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          placeholder="hans@gourmet-imports.de"
          error={errors.email}
          touched={touched.email}
          valid={valid.email}
          required
        />

        <InputField
          label="Teléfono"
          type="tel"
          value={values.phone}
          onChange={handleChange('phone')}
          onBlur={handleBlur('phone')}
          placeholder="+49 30 12345678"
          error={errors.phone}
          touched={touched.phone}
          valid={valid.phone}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isEU}
            onChange={(e) => setIsEU(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]"
          />
          <span className="text-sm text-[#6B7280]">Empresa registrada en UE</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={needsCustoms}
            onChange={(e) => setNeedsCustoms(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]"
          />
          <span className="text-sm text-[#6B7280]">Necesito asesoría aduanera</span>
        </label>
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

export default Step2Company;
