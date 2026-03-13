import React from 'react';
import { NavLink } from 'react-router-dom';

export default function MobileBottomNav({ items, className = '' }) {
  return (
    <nav 
      className={`mobile-bottom-nav md:hidden ${className}`}
      data-testid="mobile-bottom-nav"
    >
      {items.slice(0, 5).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `mobile-bottom-nav-item ${isActive ? 'active' : ''}`
          }
          data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <item.icon className="w-5 h-5" strokeWidth={1.5} />
          <span>{item.shortLabel || item.label}</span>
          {item.badge > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-stone-950 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
