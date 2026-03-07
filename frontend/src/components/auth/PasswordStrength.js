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
    if (strength <= 2) return '#DC2626';
    if (strength === 3) return '#E6A532';
    return '#16A34A';
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
          <Shield className="w-4 h-4 text-[#16A34A]" />
        ) : strength >= 2 ? (
          <AlertTriangle className="w-4 h-4 text-[#E6A532]" />
        ) : (
          <Shield className="w-4 h-4 text-[#DC2626]" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280]">Seguridad:</span>
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
                  backgroundColor: i <= strength ? getStrengthColor() : '#E5E7EB'
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
              <Check className="w-3.5 h-3.5 text-[#16A34A]" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
            )}
            <span className={`text-xs ${req.met ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
