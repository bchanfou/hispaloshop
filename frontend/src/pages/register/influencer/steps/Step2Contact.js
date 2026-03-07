import React from 'react';
import { ArrowRight } from 'lucide-react';
import InputField from '../../../../components/forms/InputField';
import useFormValidation from '../../../../hooks/useFormValidation';

const Step2Contact = ({ onNext, data, onDataChange }) => {
  const validationRules = {
    fullName: ['required', 'minLength:2'],
    email: ['required', 'email'],
    phone: ['required', 'phone'],
    birthDate: ['required'],
    idNumber: ['required', 'nif']
  };

  const { values, errors, touched, valid, handleChange, handleBlur, validateAll } = useFormValidation(
    {
      fullName: data.fullName || '',
      email: data.email || '',
      phone: data.phone || '',
      birthDate: data.birthDate || '',
      idNumber: data.idNumber || ''
    },
    validationRules
  );

  const [isResident, setIsResident] = React.useState(data.isResident !== false);

  const handleSubmit = () => {
    if (validateAll()) {
      onDataChange({ ...values, isResident });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">
          Datos de contacto
        </h3>
        <p className="text-sm text-[#6B7280]">
          Información profesional
        </p>
      </div>

      <div className="space-y-4">
        <InputField
          label="Nombre completo"
          value={values.fullName}
          onChange={handleChange('fullName')}
          onBlur={handleBlur('fullName')}
          placeholder="María García"
          error={errors.fullName}
          touched={touched.fullName}
          valid={valid.fullName}
          required
        />

        <InputField
          label="Email profesional"
          type="email"
          value={values.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          placeholder="maria@brand.com"
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
          placeholder="+34 612 345 678"
          error={errors.phone}
          touched={touched.phone}
          valid={valid.phone}
          required
        />

        <InputField
          label="Fecha de nacimiento"
          type="date"
          value={values.birthDate}
          onChange={handleChange('birthDate')}
          onBlur={handleBlur('birthDate')}
          error={errors.birthDate}
          touched={touched.birthDate}
          valid={valid.birthDate}
          required
        />

        <InputField
          label="DNI/NIE"
          value={values.idNumber}
          onChange={handleChange('idNumber')}
          onBlur={handleBlur('idNumber')}
          placeholder="12345678X"
          error={errors.idNumber}
          touched={touched.idNumber}
          valid={valid.idNumber}
          hint="Necesario para pagos e impuestos"
          required
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isResident}
          onChange={(e) => setIsResident(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]"
        />
        <span className="text-sm text-[#6B7280]">
          Soy residente fiscal en España
        </span>
      </label>

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

export default Step2Contact;
