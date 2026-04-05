import React, { useState } from 'react';
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';

const InputField = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  touched,
  valid,
  hint,
  required,
  icon: Icon,
  autoComplete,
  autoCapitalize,
  pattern,
  maxLength,
  disabled,
  loading,
  rightElement
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const getBorderColor = () => {
    if (error && touched) return '#0c0a09';
    if (valid) return '#0c0a09';
    if (isFocused) return '#0c0a09';
    return '#e7e5e4';
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-stone-950 mb-1.5">
          {label}
          {required && <span className="text-stone-700 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          pattern={pattern}
          maxLength={maxLength}
          disabled={disabled || loading}
          className={`w-full px-4 py-3 rounded-2xl border-2 transition-all outline-none ${
            Icon ? 'pl-11' : ''
          } ${type === 'password' || rightElement ? 'pr-11' : ''} ${
            disabled ? 'bg-stone-100 text-stone-500' : 'bg-white'
          }`}
          style={{ borderColor: getBorderColor() }}
        />

        {/* Password Toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-950 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}

        {/* Validation Icon */}
        {!error && valid && touched && type !== 'password' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-700">
            <Check className="w-5 h-5" />
          </div>
        )}

        {/* Error Icon */}
        {error && touched && type !== 'password' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-700">
            <X className="w-5 h-5" />
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Custom Right Element */}
        {rightElement && !loading && !error && !valid && type !== 'password' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>

      {/* Hint or Error Message */}
      {(hint || (error && touched)) && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs ${error && touched ? 'text-stone-700' : 'text-stone-500'}`}>
          {error && touched && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
          <span>{error && touched ? error : hint}</span>
        </div>
      )}
    </div>
  );
};

export default InputField;
