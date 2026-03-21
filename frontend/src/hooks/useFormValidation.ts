import { useState, useCallback } from 'react';

interface ValidationRule {
  pattern?: RegExp;
  message: string;
  minLength?: number;
  test?: (value: any) => boolean;
}

interface CustomRule {
  test: (value: any) => boolean;
  message: string;
}

type RuleEntry = string | CustomRule;

interface ValidationConfig {
  [field: string]: RuleEntry[];
}

interface FormValues {
  [field: string]: any;
}

interface FormErrors {
  [field: string]: string | null;
}

interface FormTouched {
  [field: string]: boolean;
}

interface FormValid {
  [field: string]: boolean;
}

interface UseFormValidationReturn {
  values: FormValues;
  errors: FormErrors;
  touched: FormTouched;
  valid: FormValid;
  handleChange: (name: string) => (e: any) => void;
  handleBlur: (name: string) => () => void;
  validateAll: () => boolean;
  setValue: (name: string, value: any) => void;
  setMultipleValues: (newValues: FormValues) => void;
}

const validations: Record<string, ValidationRule> = {
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
    test: (value: any) => value && value.toString().trim().length > 0,
    message: 'Campo obligatorio'
  },
};

function minLengthRule(min: number): ValidationRule {
  return {
    test: (value: any) => !value || value.length >= min,
    message: `Mínimo ${min} caracteres`
  };
}

function maxLengthRule(max: number): ValidationRule {
  return {
    test: (value: any) => !value || value.length <= max,
    message: `Máximo ${max} caracteres`
  };
}

export const useFormValidation = (
  initialValues: FormValues = {},
  validationRules: ValidationConfig = {},
): UseFormValidationReturn => {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [valid, setValid] = useState<FormValid>({});

  const validateField = useCallback((name: string, value: any): string | null => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      let isValid = true;
      let errorMessage = '';

      if (rule === 'required') {
        isValid = validations.required.test!(value);
        errorMessage = validations.required.message;
      } else if (rule === 'email') {
        isValid = validations.email.pattern!.test(value);
        errorMessage = validations.email.message;
      } else if (rule === 'password') {
        isValid = validations.password.pattern!.test(value);
        errorMessage = validations.password.message;
      } else if (rule === 'phone') {
        isValid = validations.phone.pattern!.test(value);
        errorMessage = validations.phone.message;
      } else if (rule === 'nif') {
        isValid = validations.nif.pattern!.test(value);
        errorMessage = validations.nif.message;
      } else if (rule === 'cif') {
        isValid = validations.cif.pattern!.test(value);
        errorMessage = validations.cif.message;
      } else if (typeof rule === 'string' && rule.startsWith('minLength:')) {
        const min = parseInt(rule.split(':')[1]);
        const r = minLengthRule(min);
        isValid = r.test!(value);
        errorMessage = r.message;
      } else if (typeof rule === 'string' && rule.startsWith('maxLength:')) {
        const max = parseInt(rule.split(':')[1]);
        const r = maxLengthRule(max);
        isValid = r.test!(value);
        errorMessage = r.message;
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

  const handleChange = useCallback((name: string) => (e: any) => {
    const value = e.target ? e.target.value : e;
    setValues(prev => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
      setValid(prev => ({ ...prev, [name]: !error && value }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name: string) => () => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
    setValid(prev => ({ ...prev, [name]: !error && values[name] }));
  }, [values, validateField]);

  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    const newTouched: FormTouched = {};
    const newValid: FormValid = {};

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

  const setValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setMultipleValues = useCallback((newValues: FormValues) => {
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
