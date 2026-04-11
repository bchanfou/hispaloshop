/**
 * Navigation utilities for role-based redirects
 */

function normalizeRole(rawRole) {
  if (!rawRole) return null;
  const role = String(rawRole).toLowerCase().replace(/-/g, '_');

  const roleMap = {
    superadmin: 'super_admin',
    consumer: 'customer',
    seller: 'producer',
    countryadmin: 'country_admin',
  };

  return roleMap[role] || role;
}

/**
 * Get the default route for a user based on their role
 * @param {Object} user - User object with role property
 * @param {boolean} onboardingCompleted - Whether user completed onboarding
 * @returns {string} Route path
 */
export function getDefaultRoute(user, onboardingCompleted = true) {
  if (!user) return '/login';

  const role = normalizeRole(user.role);
  const hasCompletedOnboarding =
    onboardingCompleted ??
    user.onboarding_completed ??
    user.onboardingCompleted ??
    true;
  
  // If onboarding not completed, go to onboarding first
  if (!hasCompletedOnboarding && role === 'customer') {
    return '/onboarding';
  }

  if (user.approved === false && ['producer', 'importer', 'influencer'].includes(role)) {
    return '/pending-approval';
  }
  
  switch (role) {
    case 'customer':
      return '/';

    case 'producer':
      return '/producer';

    case 'importer':
      return '/importer/dashboard';

    case 'influencer':
      return '/influencer/dashboard';

    case 'country_admin':
      return '/country-admin/overview';

    case 'admin':
      // Admins with an assigned country are country admins — send them to
      // the dedicated dashboard. Global admins (no country) keep the
      // legacy /admin platform dashboard.
      if (user.assigned_country) {
        return '/country-admin/overview';
      }
      return '/admin';

    case 'super_admin':
      return '/super-admin';

    default:
      return '/';
  }
}

/**
 * Check if user has access to a specific route based on role
 * @param {string} route - Route path
 * @param {string} role - User role
 * @returns {boolean}
 */
export function hasRouteAccess(route, role) {
  const normalizedRole = normalizeRole(role);

  // Public routes - accessible to all
  const publicRoutes = ['/', '/products', '/stores', '/login', '/register', '/onboarding'];
  if (publicRoutes.includes(route)) return true;
  
  // Role-based route restrictions
  const roleRoutes = {
    customer: ['/dashboard', '/cart', '/user'],
    producer: ['/producer', '/dashboard', '/pending-approval'],
    importer: ['/producer', '/importer', '/dashboard', '/pending-approval'],
    influencer: ['/influencer', '/dashboard', '/pending-approval'],
    country_admin: ['/country-admin', '/dashboard'],
    admin: ['/admin', '/country-admin', '/dashboard'],
    super_admin: ['/admin', '/super-admin', '/country-admin', '/dashboard'],
  };
  
  const allowedRoutes = roleRoutes[normalizedRole] || [];
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
  const defaultRoute = getDefaultRoute(
    user,
    user.onboarding_completed ?? user.onboardingCompleted
  );
  navigate(defaultRoute);
}
