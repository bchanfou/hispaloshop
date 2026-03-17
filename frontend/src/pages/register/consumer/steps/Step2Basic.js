import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import PasswordStrength from '../../../../components/auth/PasswordStrength';
import useFormValidation from '../../../../hooks/useFormValidation';

const Step2Basic = ({ onNext, data, onDataChange }) => {
  const [acceptTerms, setAcceptTerms] = useState(data.acceptTerms || false);
  const [acceptMarketing, setAcceptMarketing] = useState(data.acceptMarketing || false);

  const validationRules = {
    email: ['required', 'email'],
    firstName: ['required', 'minLength:2', 'maxLength:50'],
    lastName: ['required', 'minLength:2', 'maxLength:50'],
    password: ['required', 'password'],
  };

  const { values, errors, touched, handleChange, handleBlur, validateAll } = useFormValidation(
    {
      email: data.email || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      password: data.password || '',
    },
    validationRules
  );

  const fieldClass = (error, wasTouched) =>
    `mt-2 h-12 w-full rounded-2xl border bg-white px-3 text-base md:h-11 md:text-sm ${
      error && wasTouched ? 'border-stone-950' : 'border-stone-200'
    }`;

  const handleSubmit = () => {
    if (validateAll() && acceptTerms) {
      onDataChange({ ...values, acceptTerms, acceptMarketing });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-950">Datos básicos</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Empezamos con tu información esencial para crear la cuenta.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="consumer-email" className="text-sm font-medium text-stone-800">Email *</label>
          <input id="consumer-email" value={values.email} onChange={handleChange('email')} onBlur={handleBlur('email')} placeholder="maria@email.com" className={fieldClass(errors.email, touched.email)} />
          {errors.email && touched.email ? <p className="mt-1 text-xs text-stone-700">{errors.email}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="consumer-first-name" className="text-sm font-medium text-stone-800">Nombre *</label>
            <input id="consumer-first-name" value={values.firstName} onChange={handleChange('firstName')} onBlur={handleBlur('firstName')} placeholder="María" className={fieldClass(errors.firstName, touched.firstName)} autoCapitalize="words" />
            {errors.firstName && touched.firstName ? <p className="mt-1 text-xs text-stone-700">{errors.firstName}</p> : null}
          </div>
          <div>
            <label htmlFor="consumer-last-name" className="text-sm font-medium text-stone-800">Apellidos *</label>
            <input id="consumer-last-name" value={values.lastName} onChange={handleChange('lastName')} onBlur={handleBlur('lastName')} placeholder="García López" className={fieldClass(errors.lastName, touched.lastName)} autoCapitalize="words" />
            {errors.lastName && touched.lastName ? <p className="mt-1 text-xs text-stone-700">{errors.lastName}</p> : null}
          </div>
        </div>

        <div>
          <label htmlFor="consumer-password" className="text-sm font-medium text-stone-800">Contraseña *</label>
          <input id="consumer-password" type="password" value={values.password} onChange={handleChange('password')} onBlur={handleBlur('password')} placeholder="Crea una contraseña segura" className={fieldClass(errors.password, touched.password)} />
          {errors.password && touched.password ? <p className="mt-1 text-xs text-stone-700">{errors.password}</p> : null}
          <PasswordStrength password={values.password} />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-stone-400 accent-stone-950" />
          <span className="text-sm text-stone-600">
            Acepto los <a href="/terms" className="font-medium text-stone-950 hover:underline">términos</a> y la <a href="/privacy" className="font-medium text-stone-950 hover:underline">política de privacidad</a><span className="ml-1 text-stone-500">*</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-white p-3">
          <input type="checkbox" checked={acceptMarketing} onChange={(e) => setAcceptMarketing(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-stone-400 accent-stone-950" />
          <span className="text-sm text-stone-600">Quiero recibir novedades y recomendaciones ocasionales por email.</span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!acceptTerms}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        Continuar
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Step2Basic;
