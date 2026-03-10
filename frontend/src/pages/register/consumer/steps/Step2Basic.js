import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import InputField from '../../../../components/forms/InputField';
import PasswordStrength from '../../../../components/auth/PasswordStrength';
import useFormValidation from '../../../../hooks/useFormValidation';

const Step2Basic = ({ onNext, data, onDataChange }) => {
  const [acceptTerms, setAcceptTerms] = useState(data.acceptTerms || false);
  const [acceptMarketing, setAcceptMarketing] = useState(data.acceptMarketing || false);

  const validationRules = {
    email: ['required', 'email'],
    firstName: ['required', 'minLength:2', 'maxLength:50'],
    lastName: ['required', 'minLength:2', 'maxLength:50'],
    password: ['required', 'password']
  };

  const { 
    values, 
    errors, 
    touched, 
    valid, 
    handleChange, 
    handleBlur, 
    validateAll,
    setMultipleValues
  } = useFormValidation(
    {
      email: data.email || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      password: data.password || ''
    },
    validationRules
  );

  const handleSubmit = () => {
    if (validateAll() && acceptTerms) {
      onDataChange({
        ...values,
        acceptTerms,
        acceptMarketing
      });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Datos básicos
        </h3>
        <p className="text-sm text-text-muted">
          Completa tu información personal
        </p>
      </div>

      <div className="space-y-4">
        <InputField
          label="Email"
          type="email"
          value={values.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          placeholder="maria@email.com"
          error={errors.email}
          touched={touched.email}
          valid={valid.email}
          required
        />

        <InputField
          label="Nombre"
          value={values.firstName}
          onChange={handleChange('firstName')}
          onBlur={handleBlur('firstName')}
          placeholder="María"
          error={errors.firstName}
          touched={touched.firstName}
          valid={valid.firstName}
          autoCapitalize="words"
          required
        />

        <InputField
          label="Apellidos"
          value={values.lastName}
          onChange={handleChange('lastName')}
          onBlur={handleBlur('lastName')}
          placeholder="García López"
          error={errors.lastName}
          touched={touched.lastName}
          valid={valid.lastName}
          autoCapitalize="words"
          required
        />

        <div>
          <InputField
            label="Contraseña"
            type="password"
            value={values.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            placeholder="••••••••••"
            error={errors.password}
            touched={touched.password}
            valid={valid.password}
            required
          />
          <PasswordStrength password={values.password} />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
          />
          <span className="text-sm text-text-muted">
            Acepto los{' '}
            <a href="/terms" className="text-accent hover:underline">términos</a>
            {' '}y la{' '}
            <a href="/privacy" className="text-accent hover:underline">privacidad</a>
            <span className="text-state-error"> *</span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptMarketing}
            onChange={(e) => setAcceptMarketing(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
          />
          <span className="text-sm text-text-muted">
            Quiero recibir ofertas y novedades (opcional)
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!acceptTerms}
        className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step2Basic;
