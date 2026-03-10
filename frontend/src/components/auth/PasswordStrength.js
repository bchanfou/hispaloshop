import React from 'react';
import { Shield, AlertTriangle, Check } from 'lucide-react';

const PasswordStrength = ({ password }) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const strength = Object.values(checks).filter(Boolean).length;
  
  const getStrengthLabel = () => {
    if (strength === 0) return '';
    if (strength <= 2) return 'Débil';
    if (strength === 3) return 'Media';
    return 'Fuerte';
  };

  const getStrengthColor = () => {
    if (strength <= 2) return 'var(--color-error)';
    if (strength === 3) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  const requirements = [
    { key: 'length', label: '8+ caracteres', met: checks.length },
    { key: 'uppercase', label: '1 mayúscula', met: checks.uppercase },
    { key: 'number', label: '1 número', met: checks.number },
    { key: 'special', label: '1 especial', met: checks.special }
  ];

  if (!password) return null;

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {strength === 4 ? (
          <Shield className="w-4 h-4 text-state-success" />
        ) : strength >= 2 ? (
          <AlertTriangle className="w-4 h-4 text-state-amber" />
        ) : (
          <Shield className="w-4 h-4 text-state-error" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Seguridad:</span>
            <span className="text-xs font-medium" style={{ color: getStrengthColor() }}>
              {getStrengthLabel()}
            </span>
          </div>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor: i <= strength ? getStrengthColor() : 'var(--border-default)'
                }}
              />
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-1">
        {requirements.map((req) => (
          <div key={req.key} className="flex items-center gap-1.5">
            {req.met ? (
              <Check className="w-3.5 h-3.5 text-state-success" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
            )}
            <span className={`text-xs ${req.met ? 'text-state-success' : 'text-text-muted'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
