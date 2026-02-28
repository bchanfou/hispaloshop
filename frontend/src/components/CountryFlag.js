import React from 'react';
import 'flag-icons/css/flag-icons.min.css';

/**
 * CountryFlag - Renders a country flag using flag-icons CSS library
 * Uses ISO 3166-1 alpha-2 country codes (lowercase for flag-icons)
 * 
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code (e.g., 'ES', 'US', 'GB')
 * @param {string} size - Size class: 'sm' (16px), 'md' (24px), 'lg' (32px), 'xl' (48px)
 * @param {string} className - Additional CSS classes
 */
export default function CountryFlag({ countryCode, size = 'md', className = '' }) {
  if (!countryCode) return null;
  
  // Convert to lowercase for flag-icons
  const code = countryCode.toLowerCase();
  
  // Size mapping
  const sizeStyles = {
    sm: { width: '16px', height: '12px' },
    md: { width: '24px', height: '18px' },
    lg: { width: '32px', height: '24px' },
    xl: { width: '48px', height: '36px' }
  };
  
  const style = sizeStyles[size] || sizeStyles.md;
  
  return (
    <span 
      className={`fi fi-${code} fis ${className}`}
      style={{
        ...style,
        display: 'inline-block',
        backgroundSize: 'cover',
        borderRadius: '2px'
      }}
      role="img"
      aria-label={`Flag of ${countryCode}`}
    />
  );
}
