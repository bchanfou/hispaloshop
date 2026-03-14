import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function QuickActionsMobile({ actions, title, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} data-testid="quick-actions-mobile">
      {title && (
        <h3 className="text-sm font-semibold text-stone-950 uppercase tracking-wider px-1">
          {title}
        </h3>
      )}
      <div className="space-y-2">
        {actions.map((action, index) => {
          const ActionWrapper = action.to ? Link : 'button';
          const wrapperProps = action.to 
            ? { to: action.to } 
            : { onClick: action.onClick, type: 'button' };
          
          return (
            <ActionWrapper
              key={index}
              {...wrapperProps}
              className="quick-action-item w-full text-left"
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div 
                className="quick-action-icon"
                style={{ backgroundColor: action.bgColor || 'var(--hs-surface-2)' }}
              >
                <action.icon
                  className="w-5 h-5"
                  style={{ color: action.iconColor || 'var(--hs-text-1)' }}
                  strokeWidth={1.5}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-950 text-sm">
                  {action.label}
                </div>
                {action.description && (
                  <div className="text-xs text-stone-500 truncate">
                    {action.description}
                  </div>
                )}
              </div>
              {action.badge && (
                <span className="px-2 py-0.5 bg-stone-100 text-stone-700 text-xs font-medium rounded-full">
                  {action.badge}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-stone-500 flex-shrink-0" />
            </ActionWrapper>
          );
        })}
      </div>
    </div>
  );
}
