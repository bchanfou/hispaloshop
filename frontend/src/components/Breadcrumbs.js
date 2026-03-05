import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Breadcrumbs component for navigation
 * Automatically generates breadcrumb trail based on current URL path
 */
export default function Breadcrumbs({ customItems, className = '' }) {
  const location = useLocation();
  const { t } = useTranslation();
  
  // Route name mappings
  const routeNames = {
    '': t('breadcrumbs.home', 'Home'),
    'products': t('breadcrumbs.products', 'Products'),
    'certificate': t('breadcrumbs.certificate', 'Certificate'),
    'certificates': t('breadcrumbs.certificates', 'Certificates'),
    'cart': t('breadcrumbs.cart', 'Cart'),
    'checkout': t('breadcrumbs.checkout', 'Checkout'),
    'success': t('breadcrumbs.success', 'Success'),
    'login': t('breadcrumbs.login', 'Login'),
    'register': t('breadcrumbs.register', 'Register'),
    'dashboard': t('breadcrumbs.dashboard', 'Dashboard'),
    'orders': t('breadcrumbs.orders', 'Orders'),
    'profile': t('breadcrumbs.profile', 'Profile'),
    'addresses': t('breadcrumbs.addresses', 'Addresses'),
    'admin': t('breadcrumbs.admin', 'Admin'),
    'super-admin': t('breadcrumbs.superAdmin', 'Super Admin'),
    'producer': t('breadcrumbs.producer', 'Producer'),
    'producers': t('breadcrumbs.producers', 'Producers'),
    'payments': t('breadcrumbs.payments', 'Payments'),
    'discount-codes': t('breadcrumbs.discountCodes', 'Discount Codes'),
    'reviews': t('breadcrumbs.reviews', 'Reviews'),
    'influencers': t('breadcrumbs.influencers', 'Influencers'),
    'insights': t('breadcrumbs.insights', 'Insights'),
    'countries': t('breadcrumbs.countries', 'Countries'),
  };

  // Pages where breadcrumbs should NOT appear
  const hiddenPaths = ['/', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/auth/callback'];
  
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  // If custom items provided, use them
  if (customItems && customItems.length > 0) {
    return (
      <nav className={`flex items-center text-sm text-text-muted ${className}`} aria-label="Breadcrumb" data-testid="breadcrumbs">
        <ol className="flex items-center flex-wrap gap-1">
          <li className="flex items-center">
            <Link 
              to="/" 
              className="hover:text-primary transition-colors flex items-center gap-1"
              data-testid="breadcrumb-home"
            >
              <Home className="w-4 h-4" />
              <span className="sr-only">{t('breadcrumbs.home', 'Home')}</span>
            </Link>
          </li>
          {customItems.map((item, index) => (
            <li key={index} className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-1 text-text-muted/50" />
              {item.href && index < customItems.length - 1 ? (
                <Link 
                  to={item.href} 
                  className="hover:text-primary transition-colors"
                  data-testid={`breadcrumb-${index}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-text-primary font-medium" data-testid={`breadcrumb-current`}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  // Auto-generate breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) {
    return null;
  }

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    
    // Check if segment is a dynamic ID (UUID-like or numeric)
    const isDynamicSegment = /^[a-f0-9-]{8,}$|^\d+$|^prod_|^order_|^user_/.test(segment);
    
    let label = routeNames[segment] || segment;
    
    // For dynamic segments, show a generic label based on context
    if (isDynamicSegment) {
      const prevSegment = pathSegments[index - 1];
      if (prevSegment === 'products') {
        label = t('breadcrumbs.productDetail', 'Product Details');
      } else if (prevSegment === 'certificate') {
        label = t('breadcrumbs.certificateDetail', 'Certificate');
      } else if (prevSegment === 'orders') {
        label = t('breadcrumbs.orderDetail', 'Order Details');
      } else {
        label = t('breadcrumbs.details', 'Details');
      }
    }

    return {
      label,
      path,
      isLast
    };
  });

  return (
    <nav className={`flex items-center text-sm text-text-muted ${className}`} aria-label="Breadcrumb" data-testid="breadcrumbs">
      <ol className="flex items-center flex-wrap gap-1">
        <li className="flex items-center">
          <Link 
            to="/" 
            className="hover:text-primary transition-colors flex items-center gap-1"
            data-testid="breadcrumb-home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-1 text-text-muted/50" />
            {!item.isLast ? (
              <Link 
                to={item.path} 
                className="hover:text-primary transition-colors"
                data-testid={`breadcrumb-${index}`}
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-text-primary font-medium" data-testid="breadcrumb-current">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
