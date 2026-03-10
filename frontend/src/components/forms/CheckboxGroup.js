import React from 'react';
import { Check } from 'lucide-react';

const CheckboxGroup = ({ options, selected, onChange, columns = 2 }) => {
  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              isSelected 
                ? 'border-accent bg-accent/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected 
                ? 'bg-accent border-accent' 
                : 'border-gray-300'
            }`}>
              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            
            <div className="flex-1">
              <span className={`text-sm font-medium ${isSelected ? 'text-accent' : 'text-gray-900'}`}>
                {option.label}
              </span>
              {option.description && (
                <p className="text-xs text-text-muted mt-0.5">{option.description}</p>
              )}
            </div>

            {option.icon && (
              <option.icon className={`w-5 h-5 ${isSelected ? 'text-accent' : 'text-text-muted'}`} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CheckboxGroup;
