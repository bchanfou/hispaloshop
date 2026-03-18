import React from 'react';

const RadioGroup = ({ options, value, onChange, columns = 1 }) => {
  return (
    <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((option) => {
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              isSelected 
                ? 'border-stone-950 bg-stone-50' 
                : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected 
                ? 'border-stone-950' 
                : 'border-stone-200'
            }`}>
              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-stone-950" />}
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

export default RadioGroup;
