import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

function normalizeGroups(options, groups) {
  if (Array.isArray(groups) && groups.length > 0) {
    return groups;
  }

  return [{ label: null, options: Array.isArray(options) ? options : [] }];
}

export default function PremiumSelect({
  value,
  onChange,
  placeholder,
  options = [],
  groups = [],
  disabled = false,
  className = '',
  menuClassName = '',
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const normalizedGroups = useMemo(() => normalizeGroups(options, groups), [groups, options]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectedOption = normalizedGroups
    .flatMap((group) => group.options || [])
    .find((option) => option.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-full border border-stone-200 bg-white px-4 text-left text-sm text-stone-700 transition-all duration-150 ease-out hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 ${
          open ? 'border-stone-950' : ''
        }`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedOption ? 'text-stone-700' : 'text-stone-400'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-stone-100 bg-white p-2 shadow-lg ${menuClassName}`}
          role="listbox"
        >
          {normalizedGroups.map((group) => (
            <div key={group.label || 'default'} className="py-1">
              {group.label ? (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-400">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-1">
                {group.options.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value || 'all'}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 ease-out ${
                        active ? 'bg-stone-950 text-white' : 'text-stone-700 hover:bg-stone-50'
                      }`}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      role="option"
                      aria-selected={active}
                    >
                      <span>{option.label}</span>
                      {active ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
