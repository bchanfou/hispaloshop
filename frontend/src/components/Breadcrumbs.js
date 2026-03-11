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
    '': t('breadcrumbs.home', 'Inicio'),
    'products': t('breadcrumbs.products', 'Productos'),
    'certificate': t('breadcrumbs.certificate', 'Certificado'),
    'certificates': t('breadcrumbs.certificates', 'Certificados'),
    'cart': t('breadcrumbs.cart', 'Cesta'),
    'checkout': t('breadcrumbs.checkout', 'Pago'),
    'success': t('breadcrumbs.success', 'Confirmación'),
    'login': t('breadcrumbs.login', 'Iniciar sesión'),
    'register': t('breadcrumbs.register', 'Registro'),
    'dashboard': t('breadcrumbs.dashboard', 'Panel'),
    'orders': t('breadcrumbs.orders', 'Pedidos'),
    'profile': t('breadcrumbs.profile', 'Perfil'),
    'addresses': t('breadcrumbs.addresses', 'Direcciones'),
    'admin': t('breadcrumbs.admin', 'Administración'),
    'super-admin': t('breadcrumbs.superAdmin', 'Superadmin'),
    'producer': t('breadcrumbs.producer', 'Productor'),
    'producers': t('breadcrumbs.producers', 'Productores'),
    'payments': t('breadcrumbs.payments', 'Pagos'),
    'discount-codes': t('breadcrumbs.discountCodes', 'Códigos de descuento'),
    'reviews': t('breadcrumbs.reviews', 'Reseñas'),
    'influencers': t('breadcrumbs.influencers', 'Influencers'),
    'insights': t('breadcrumbs.insights', 'Estadísticas'),
    'countries': t('breadcrumbs.countries', 'Países'),
  };

  // Pages where breadcrumbs should NOT appear
  const hiddenPaths = ['/', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/auth/callback'];
  
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  // If custom items provided, use them
  if (customItems && customItems.length > 0) {
    return (
      <nav className={`flex items-center text-sm text-stone-500 ${className}`} aria-label="Breadcrumb" data-testid="breadcrumbs">
        <ol className="flex items-center flex-wrap gap-1">
          <li className="flex items-center">
            <Link 
              to="/" 
              className="hover:text-stone-950 transition-colors flex items-center gap-1"
              data-testid="breadcrumb-home"
            >
              <Home className="w-4 h-4" />
              <span className="sr-only">{t('breadcrumbs.home', 'Inicio')}</span>
            </Link>
          </li>
          {customItems.map((item, index) => (
            <li key={index} className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-1 text-stone-500/50" />
              {item.href && index < customItems.length - 1 ? (
                <Link 
                  to={item.href} 
                  className="hover:text-stone-950 transition-colors"
                  data-testid={`breadcrumb-${index}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-stone-950 font-medium" data-testid={`breadcrumb-current`}>
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
        label = t('breadcrumbs.productDetail', 'Detalle de producto');
      } else if (prevSegment === 'certificate') {
        label = t('breadcrumbs.certificateDetail', 'Certificado');
      } else if (prevSegment === 'orders') {
        label = t('breadcrumbs.orderDetail', 'Detalle de pedido');
      } else {
        label = t('breadcrumbs.details', 'Detalles');
      }
    }

    return {
      label,
      path,
      isLast
    };
  });

  return (
    <nav className={`flex items-center text-sm text-stone-500 ${className}`} aria-label="Breadcrumb" data-testid="breadcrumbs">
      <ol className="flex items-center flex-wrap gap-1">
        <li className="flex items-center">
          <Link 
            to="/" 
            className="hover:text-stone-950 transition-colors flex items-center gap-1"
            data-testid="breadcrumb-home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-1 text-stone-500/50" />
            {!item.isLast ? (
              <Link 
                to={item.path} 
                className="hover:text-stone-950 transition-colors"
                data-testid={`breadcrumb-${index}`}
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-stone-950 font-medium" data-testid="breadcrumb-current">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
