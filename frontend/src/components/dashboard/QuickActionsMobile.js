import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function QuickActionsMobile({ actions, title, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} data-testid="quick-actions-mobile">
      {title && (
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider px-1">
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
                style={{ backgroundColor: action.bgColor || '#F5F5F0' }}
              >
                <action.icon 
                  className="w-5 h-5" 
                  style={{ color: action.iconColor || '#1A1A1A' }}
                  strokeWidth={1.5}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-primary text-sm">
                  {action.label}
                </div>
                {action.description && (
                  <div className="text-xs text-text-muted truncate">
                    {action.description}
                  </div>
                )}
              </div>
              {action.badge && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  {action.badge}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
            </ActionWrapper>
          );
        })}
      </div>
    </div>
  );
}
