import React from 'react';
import { ArrowRight } from 'lucide-react';
import InputField from '../../../../components/forms/InputField';
import useFormValidation from '../../../../hooks/useFormValidation';

const Step2Legal = ({ onNext, data, onDataChange }) => {
  const validationRules = {
    companyName: ['required'],
    cif: ['required', 'cif'],
    commercialName: [],
    address: ['required'],
    contactName: ['required'],
    position: ['required'],
    phone: ['required', 'phone'],
    email: ['required', 'email']
  };

  const { values, errors, touched, valid, handleChange, handleBlur, validateAll } = useFormValidation(
    {
      companyName: data.companyName || '',
      cif: data.cif || '',
      commercialName: data.commercialName || '',
      address: data.address || '',
      contactName: data.contactName || '',
      position: data.position || '',
      phone: data.phone || '',
      email: data.email || ''
    },
    validationRules
  );

  const handleSubmit = () => {
    if (validateAll()) {
      onDataChange(values);
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">Datos fiscales</h3>
        <p className="text-sm text-[#6B7280]">Información legal de la empresa</p>
      </div>

      <div className="space-y-4">
        <InputField
          label="Nombre fiscal"
          value={values.companyName}
          onChange={handleChange('companyName')}
          onBlur={handleBlur('companyName')}
          placeholder="Cortijo Andaluz SL"
          error={errors.companyName}
          touched={touched.companyName}
          valid={valid.companyName}
          required
        />

        <InputField
          label="CIF/NIF"
          value={values.cif}
          onChange={handleChange('cif')}
          onBlur={handleBlur('cif')}
          placeholder="B-12345678"
          error={errors.cif}
          touched={touched.cif}
          valid={valid.cif}
          required
        />

        <InputField
          label="Nombre comercial"
          value={values.commercialName}
          onChange={handleChange('commercialName')}
          placeholder="Cortijo Andaluz"
          hint="Si diferente al fiscal"
        />

        <InputField
          label="Dirección fiscal completa"
          value={values.address}
          onChange={handleChange('address')}
          onBlur={handleBlur('address')}
          placeholder="Calle Olivar 123, 14000 Córdoba"
          error={errors.address}
          touched={touched.address}
          valid={valid.address}
          required
        />

        <InputField
          label="Persona de contacto"
          value={values.contactName}
          onChange={handleChange('contactName')}
          onBlur={handleBlur('contactName')}
          placeholder="José García"
          error={errors.contactName}
          touched={touched.contactName}
          valid={valid.contactName}
          required
        />

        <InputField
          label="Cargo"
          value={values.position}
          onChange={handleChange('position')}
          onBlur={handleBlur('position')}
          placeholder="Gerente"
          error={errors.position}
          touched={touched.position}
          valid={valid.position}
          required
        />

        <InputField
          label="Teléfono directo"
          type="tel"
          value={values.phone}
          onChange={handleChange('phone')}
          onBlur={handleBlur('phone')}
          placeholder="+34 627 123 456"
          error={errors.phone}
          touched={touched.phone}
          valid={valid.phone}
          required
        />

        <InputField
          label="Email"
          type="email"
          value={values.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          placeholder="jose@cortijoandaluz.com"
          error={errors.email}
          touched={touched.email}
          valid={valid.email}
          required
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

export default Step2Legal;
