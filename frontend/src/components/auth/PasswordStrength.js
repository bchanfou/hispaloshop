import React from 'react';
import { AlertTriangle, Check, Shield } from 'lucide-react';

const PasswordStrength = ({ password }) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const strength = Object.values(checks).filter(Boolean).length;

  if (!password) return null;

  const strengthLabel = strength <= 2 ? 'Débil' : strength === 3 ? 'Media' : 'Fuerte';
  const strengthTone = strength <= 2 ? 'text-stone-600' : strength === 3 ? 'text-stone-700' : 'text-stone-950';
  const Indicator = strength <= 2 ? AlertTriangle : Shield;

  const requirements = [
    ['8+ caracteres', checks.length],
    ['1 mayúscula', checks.uppercase],
    ['1 número', checks.number],
    ['1 símbolo', checks.special],
  ];

  return (
    <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Indicator className={`h-4 w-4 ${strengthTone}`} />
        <span className="text-xs text-stone-500">Seguridad</span>
        <span className={`text-xs font-medium ${strengthTone}`}>{strengthLabel}</span>
      </div>

      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-1.5 flex-1 rounded-full ${segment <= strength ? 'bg-stone-950' : 'bg-stone-200'}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {requirements.map(([label, met]) => (
          <div key={label} className="flex items-center gap-1.5">
            {met ? <Check className="h-3.5 w-3.5 text-stone-950" /> : <div className="h-3.5 w-3.5 rounded-full border border-stone-200" />}
            <span className={`text-xs ${met ? 'text-stone-950' : 'text-stone-500'}`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
