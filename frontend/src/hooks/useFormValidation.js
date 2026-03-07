import { useState, useCallback } from 'react';

const validations = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Introduce un email válido'
  },
  password: {
    minLength: 8,
    pattern: /^(?=.*[A-Z])(?=.*\d)/,
    message: 'Mínimo 8 caracteres, 1 mayúscula, 1 número'
  },
  phone: {
    pattern: /^\+?[1-9]\d{8,14}$/,
    message: 'Teléfono válido requerido'
  },
  nif: {
    pattern: /^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$/,
    message: 'DNI/NIE no válido'
  },
  cif: {
    pattern: /^[A-Z][0-9]{8}$|^[0-9]{8}[A-Z]$/,
    message: 'CIF no válido'
  },
  required: {
    test: (value) => value && value.toString().trim().length > 0,
    message: 'Campo obligatorio'
  },
  minLength: (min) => ({
    test: (value) => !value || value.length >= min,
    message: `Mínimo ${min} caracteres`
  }),
  maxLength: (max) => ({
    test: (value) => !value || value.length <= max,
    message: `Máximo ${max} caracteres`
  })
};

export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [valid, setValid] = useState({});

  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      let isValid = true;
      let errorMessage = '';

      if (rule === 'required') {
        isValid = validations.required.test(value);
        errorMessage = validations.required.message;
      } else if (rule === 'email') {
        isValid = validations.email.pattern.test(value);
        errorMessage = validations.email.message;
      } else if (rule === 'password') {
        isValid = validations.password.pattern.test(value);
        errorMessage = validations.password.message;
      } else if (rule === 'phone') {
        isValid = validations.phone.pattern.test(value);
        errorMessage = validations.phone.message;
      } else if (rule === 'nif') {
        isValid = validations.nif.pattern.test(value);
        errorMessage = validations.nif.message;
      } else if (rule === 'cif') {
        isValid = validations.cif.pattern.test(value);
        errorMessage = validations.cif.message;
      } else if (rule.startsWith('minLength:')) {
        const min = parseInt(rule.split(':')[1]);
        isValid = validations.minLength(min).test(value);
        errorMessage = validations.minLength(min).message;
      } else if (rule.startsWith('maxLength:')) {
        const max = parseInt(rule.split(':')[1]);
        isValid = validations.maxLength(max).test(value);
        errorMessage = validations.maxLength(max).message;
      } else if (typeof rule === 'object') {
        isValid = rule.test(value);
        errorMessage = rule.message;
      }

      if (!isValid) {
        return errorMessage;
      }
    }

    return null;
  }, [validationRules]);

  const handleChange = useCallback((name) => (e) => {
    const value = e.target ? e.target.value : e;
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
      setValid(prev => ({ ...prev, [name]: !error && value }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name) => () => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
    setValid(prev => ({ ...prev, [name]: !error && values[name] }));
  }, [values, validateField]);

  const validateAll = useCallback(() => {
    const newErrors = {};
    const newTouched = {};
    const newValid = {};

    Object.keys(validationRules).forEach(field => {
      const error = validateField(field, values[field]);
      newErrors[field] = error;
      newTouched[field] = true;
      newValid[field] = !error && values[field];
    });

    setErrors(newErrors);
    setTouched(newTouched);
    setValid(newValid);

    return !Object.values(newErrors).some(Boolean);
  }, [values, validationRules, validateField]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setMultipleValues = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  return {
    values,
    errors,
    touched,
    valid,
    handleChange,
    handleBlur,
    validateAll,
    setValue,
    setMultipleValues
  };
};

export default useFormValidation;
