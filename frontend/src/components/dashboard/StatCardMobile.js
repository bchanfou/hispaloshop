import React from 'react';
import { Link } from 'react-router-dom';

export default function StatCardMobile({ 
  icon: Icon, 
  label, 
  value, 
  sublabel,
  linkTo,
  color = 'primary',
  trend,
  trendValue,
  className = ''
}) {
  const colorClasses = {
    primary: 'bg-stone-100 text-stone-700',
    success: 'bg-stone-950 text-white',
    warning: 'bg-stone-200 text-stone-700',
    danger: 'bg-stone-800 text-stone-100',
    info: 'bg-stone-100 text-stone-600',
  };

  const Content = () => (
    <div className={`stat-card-mobile ${className}`}>
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
      )}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sublabel && (
        <div className="text-xs text-stone-500 mt-1">{sublabel}</div>
      )}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
          trend === 'up' ? 'text-stone-700' : trend === 'down' ? 'text-stone-700' : 'text-stone-500'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="block" data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        <Content />
      </Link>
    );
  }

  return <Content />;
}
