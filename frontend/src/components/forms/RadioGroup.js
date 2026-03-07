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
                ? 'border-[#2D5A3D] bg-[#2D5A3D]/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected 
                ? 'border-[#2D5A3D]' 
                : 'border-gray-300'
            }`}>
              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#2D5A3D]" />}
            </div>
            
            <div className="flex-1">
              <span className={`text-sm font-medium ${isSelected ? 'text-[#2D5A3D]' : 'text-[#1A1A1A]'}`}>
                {option.label}
              </span>
              {option.description && (
                <p className="text-xs text-[#6B7280] mt-0.5">{option.description}</p>
              )}
            </div>

            {option.icon && (
              <option.icon className={`w-5 h-5 ${isSelected ? 'text-[#2D5A3D]' : 'text-[#6B7280]'}`} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default RadioGroup;
