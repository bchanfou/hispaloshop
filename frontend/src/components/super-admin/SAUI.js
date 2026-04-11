import React from 'react';

/**
 * Shared dark-theme primitives for super-admin pages.
 * Pattern matches MarketCoverage.tsx (bg-[#1A1D27], border-white/[0.08]).
 */

export function SACard({ children, className = '' }) {
  return (
    <div className={`bg-[#1A1D27] rounded-[14px] border border-white/[0.08] ${className}`}>
      {children}
    </div>
  );
}

export function SAPageHeader({ title, subtitle, right }) {
  return (
    <header className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-white/60 mt-1">{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}

export function SASelect({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-[#0c0a09] border border-white/[0.12] text-white text-sm rounded-xl px-3 py-2 ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#0c0a09]">{opt.label}</option>
      ))}
    </select>
  );
}

export function SAButton({ children, onClick, disabled, variant = 'primary', className = '' }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40';
  const variants = {
    primary: 'bg-white text-stone-950 hover:bg-white/90',
    secondary: 'bg-white/[0.08] text-white hover:bg-white/[0.14] border border-white/[0.12]',
    danger: 'bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/40',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant] || variants.primary} ${className}`}>
      {children}
    </button>
  );
}

export function SAInput({ value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-[#0c0a09] border border-white/[0.12] text-white text-sm rounded-xl px-3 py-2 placeholder:text-white/30 ${className}`}
    />
  );
}

export function SAKpiCard({ icon: Icon, label, value, sub }) {
  return (
    <SACard className="p-5">
      <div className="flex items-center gap-3 mb-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <Icon className="w-5 h-5 text-white/70" strokeWidth={1.5} />
          </div>
        )}
        <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </SACard>
  );
}

export function SeverityBadge({ severity }) {
  const map = {
    info: 'bg-white/[0.08] text-white/70 border-white/[0.12]',
    warning: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
    critical: 'bg-red-500/15 text-red-200 border-red-500/40',
  };
  const cls = map[severity] || map.info;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${cls}`}>
      {severity || 'info'}
    </span>
  );
}
