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
                ? 'border-stone-950 bg-stone-50' 
                : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected 
                ? 'bg-stone-950 border-stone-950' 
                : 'border-stone-200'
            }`}>
              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            
            <div className="flex-1">
              <span className={`text-sm font-medium ${isSelected ? 'text-stone-950' : 'text-stone-950'}`}>
                {option.label}
              </span>
              {option.description && (
                <p className="text-xs text-stone-500 mt-0.5">{option.description}</p>
              )}
            </div>

            {option.icon && (
              <option.icon className={`w-5 h-5 ${isSelected ? 'text-stone-950' : 'text-stone-500'}`} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CheckboxGroup;
