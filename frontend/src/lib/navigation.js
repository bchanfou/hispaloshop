/**
 * Navigation utilities for role-based redirects
 */

/**
 * Get the default route for a user based on their role
 * @param {Object} user - User object with role property
 * @param {boolean} onboardingCompleted - Whether user completed onboarding
 * @returns {string} Route path
 */
export function getDefaultRoute(user, onboardingCompleted = true) {
  if (!user) return '/login';
  
  // If onboarding not completed, go to onboarding first
  if (!onboardingCompleted && user.role === 'customer') {
    return '/onboarding';
  }
  
  switch (user.role) {
    case 'customer':
      return '/dashboard';
    
    case 'producer':
    case 'importer':
      return '/producer';
    
    case 'influencer':
      return '/influencer/dashboard';
    
    case 'admin':
    case 'super_admin':
      return '/admin';
    
    default:
      return '/dashboard';
  }
}

/**
 * Check if user has access to a specific route based on role
 * @param {string} route - Route path
 * @param {string} role - User role
 * @returns {boolean}
 */
export function hasRouteAccess(route, role) {
  // Public routes - accessible to all
  const publicRoutes = ['/', '/products', '/stores', '/login', '/register', '/onboarding'];
  if (publicRoutes.includes(route)) return true;
  
  // Role-based route restrictions
  const roleRoutes = {
    customer: ['/dashboard', '/cart', '/checkout', '/orders', '/wishlist', '/profile'],
    producer: ['/producer', '/dashboard'],
    importer: ['/producer', '/importer', '/dashboard'],
    influencer: ['/influencer', '/dashboard'],
    admin: ['/admin', '/dashboard'],
    super_admin: ['/admin', '/super-admin', '/dashboard'],
  };
  
  const allowedRoutes = roleRoutes[role] || [];
  return allowedRoutes.some(r => route.startsWith(r));
}

/**
 * Get dashboard label based on role
 * @param {string} role 
 * @returns {string}
 */
export function getDashboardLabel(role) {
  switch (role) {
    case 'customer':
      return 'Mi Cuenta';
    case 'producer':
      return 'Panel de Productor';
    case 'importer':
      return 'Panel de Importador';
    case 'influencer':
      return 'Panel de Influencer';
    case 'admin':
    case 'super_admin':
      return 'Panel de Admin';
    default:
      return 'Dashboard';
  }
}

/**
 * Redirect user after successful login/registration
 * @param {Object} user - User object
 * @param {Function} navigate - React Router navigate function
 * @param {string} intendedRoute - Optional intended route (e.g., from ?redirect=)
 */
export function redirectAfterAuth(user, navigate, intendedRoute = null) {
  if (!user) {
    navigate('/login');
    return;
  }
  
  // If there's an intended route and user has access, go there
  if (intendedRoute && hasRouteAccess(intendedRoute, user.role)) {
    navigate(intendedRoute);
    return;
  }
  
  // Otherwise go to default route for role
  const defaultRoute = getDefaultRoute(user, user.onboarding_completed);
  navigate(defaultRoute);
}
