import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useCart } from './context/CartContext';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import '@/App.css';
import './locales/i18n';
import { trackPageVisit } from './utils/analytics';

import HomePage from './pages/HomePage';
import CartPage from './pages/CartPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import AuthCallback from './pages/AuthCallback';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import BottomNavBar from './components/BottomNavBar';
import ScrollToTop from './components/ScrollToTop';
import AppErrorBoundary from './components/AppErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LocaleProvider } from './context/LocaleContext';
import { HelmetProvider } from 'react-helmet-async';
import { ChatProvider } from './context/chat/ChatProvider';
import { usePushNotifications } from './hooks/usePushNotifications';

// Nuevos providers P12
import { QueryProvider } from './providers/QueryProvider';
import { RealtimeProvider } from './providers/RealtimeProvider';

// Cart components
import MiniCart from './components/cart/MiniCart';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ProductorLandingPage = lazy(() => import('./pages/producer/Landing'));
const InfluencerLandingPage = lazy(() => import('./pages/influencer/Landing'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const CreateRecipePage = lazy(() => import('./pages/CreateRecipePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const CertificatePage = lazy(() => import('./pages/CertificatePage.jsx'));
const CertificatesListPage = lazy(() => import('./pages/CertificatesListPage'));
const LocaleSettingsPage = lazy(() => import('./pages/LocaleSettingsPage'));
const StoresListPage = lazy(() => import('./pages/StoresListPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ImporterLandingPage = lazy(() => import('./pages/importer/Landing'));
const B2BMarketplacePage = lazy(() => import('./pages/b2b/B2BMarketplacePage'));
const B2BQuotesHistoryPage = lazy(() => import('./pages/b2b/B2BQuotesHistoryPage'));
const B2BChatPage = lazy(() => import('./pages/b2b/B2BChatPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const PressPage = lazy(() => import('./pages/PressPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));

const AdminLayout = lazy(() => import('./components/dashboard/AdminLayoutResponsive'));
const SuperAdminLayout = lazy(() => import('./components/dashboard/SuperAdminLayoutResponsive'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminProducers = lazy(() => import('./pages/admin/AdminProducers'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCertificates = lazy(() => import('./pages/admin/AdminCertificates'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminDiscountCodes = lazy(() => import('./pages/admin/AdminDiscountCodes'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminInfluencers = lazy(() => import('./pages/admin/AdminInfluencers'));
const AdminManagement = lazy(() => import('./pages/admin/AdminManagement'));
const AdminCategories = lazy(() => import('./pages/admin/CategoriesPage'));
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport'));
const AdminSupportCase = lazy(() => import('./pages/admin/AdminSupportCase'));
const AdminTrustSafety = lazy(() => import('./pages/admin/AdminTrustSafety'));
const AdminGrowthAnalytics = lazy(() => import('./pages/admin/AdminGrowthAnalytics'));
const EscalationChat = lazy(() => import('./pages/admin/EscalationChat'));
const InsightsDashboard = lazy(() => import('./pages/super-admin/InsightsDashboard'));
const UserManagement = lazy(() => import('./pages/super-admin/UserManagement'));
const ContentManagement = lazy(() => import('./pages/super-admin/ContentManagement'));
const FinancialDashboard = lazy(() => import('./pages/super-admin/FinancialDashboard'));
const MarketCoverage = lazy(() => import('./pages/super-admin/MarketCoverage'));
const SuperAdminOverviewPage = lazy(() => import('./pages/super-admin/SuperAdminOverview'));

const ProducerLayout = lazy(() => import('./components/dashboard/ProducerLayoutResponsive'));
const ProducerOverview = lazy(() => import('./pages/producer/ProducerOverview'));
const ProducerProducts = lazy(() => import('./pages/producer/ProducerProducts'));
const ProducerCertificates = lazy(() => import('./pages/producer/ProducerCertificates'));
const ProducerOrders = lazy(() => import('./pages/producer/ProducerOrders'));
const ProducerPayments = lazy(() => import('./pages/producer/ProducerPayments'));
const ProducerProfile = lazy(() => import('./pages/producer/ProducerProfile'));
const ProducerStoreProfile = lazy(() => import('./pages/producer/ProducerStoreProfile'));
const ProductCountryManagement = lazy(() => import('./pages/producer/ProductCountryManagement'));
const ProducerInsights = lazy(() => import('./pages/producer/ProducerInsights'));
const ProducerConnectPage = lazy(() => import('./pages/producer/ProducerConnectPage'));
const ProducerConnectSuccess = lazy(() => import('./pages/producer/ProducerConnectSuccess'));
const ProducerConnectRefresh = lazy(() => import('./pages/producer/ProducerConnectRefresh'));
const ProducerShippingPolicy = lazy(() => import('./pages/producer/ProducerShippingPolicy'));

const CustomerLayout = lazy(() => import('./components/dashboard/CustomerLayoutResponsive'));
const CustomerOverview = lazy(() => import('./pages/customer/Dashboard'));
const CustomerOrders = lazy(() => import('./pages/customer/CustomerOrders'));
const CustomerSupport = lazy(() => import('./pages/customer/CustomerSupport'));
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile'));
const CustomerAIPreferences = lazy(() => import('./pages/customer/CustomerAIPreferences'));
const CustomerFollowedStores = lazy(() => import('./pages/customer/CustomerFollowedStores'));
const HispaloPredictions = lazy(() => import('./pages/customer/HispaloPredictions'));
const WishlistPage = lazy(() => import('./pages/customer/WishlistPage'));

const InfluencerDashboard = lazy(() => import('./pages/influencer/InfluencerDashboard'));
const InfluencerInsights = lazy(() => import('./pages/influencer/InfluencerInsights'));
const ChatContainer = lazy(() => import('./components/chat/ChatContainer'));
const InfluencerLayoutResponsive = lazy(() => import('./components/dashboard/InfluencerLayoutResponsive'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));

// Checkout

// Landing pages
const QueEsPage = lazy(() => import('./pages/landings/QueEsPage'));
const DashboardPage = lazy(() => import('./pages/dashboard'));
const ConsumerDashboard = lazy(() => import('./pages/dashboard/consumer'));
const InfluencerDashboardNew = lazy(() => import('./pages/dashboard/influencer'));
const ProducerDashboardNew = lazy(() => import('./pages/dashboard/producer'));
const ImporterDashboardNew = lazy(() => import('./pages/dashboard/importer'));
const ImporterDashboardPage = lazy(() => import('./pages/importer/ImporterDashboardPage'));
const ImporterCertificatesPage = lazy(() => import('./pages/importer/ImporterCertificatesPage'));

// Registration flows
const RoleSelector = lazy(() => import('./pages/register/RoleSelector'));
const ConsumerRegister = lazy(() => import('./pages/register/consumer'));

function RouteLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-stone-700 animate-spin" />
    </div>
  );
}

function PageTransitionLoader() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 350);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search, location.hash]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] pointer-events-none">
      <div className="h-1 w-full overflow-hidden bg-stone-200/60">
        <div className="h-full w-1/3 bg-stone-900 animate-[pulse_0.9s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

function LegacyOrdersRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <RouteLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/orders" replace />;
  if (user.role === 'producer' || user.role === 'importer') return <Navigate to="/producer/orders" replace />;
  if (user.role === 'influencer') return <Navigate to="/influencer/dashboard" replace />;
  return <Navigate to="/dashboard/orders" replace />;
}

function LegacyProfileRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <RouteLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'producer' || user.role === 'importer') return <Navigate to="/producer/profile" replace />;
  if (user.role === 'influencer') return <Navigate to="/influencer/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'super_admin') return <Navigate to="/super-admin" replace />;
  return <Navigate to="/dashboard/profile" replace />;
}

function AppRouter() {
  const location = useLocation();
  const { user } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);

  usePushNotifications(user);

  useEffect(() => {
    trackPageVisit(location.pathname);
  }, [location.pathname]);

  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <>
      <PageTransitionLoader />
      <ScrollToTop />
      <Suspense fallback={<RouteLoader />}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: [0, 0, 0.2, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/vender" element={<Navigate to="/productor" replace />} />
              <Route path="/productor" element={<ProductorLandingPage />} />
              <Route path="/productor/registro" element={<ProductorLandingPage />} />
              <Route path="/info/productor" element={<Navigate to="/productor" replace />} />
              <Route path="/registro/productor" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/vender/registro" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/vender/login" element={<LoginPage />} />
              <Route path="/vender/planes" element={<Navigate to="/productor" replace />} />
              <Route path="/influencers" element={<InfluencerLandingPage />} />
              <Route path="/influencer" element={<InfluencerLandingPage />} />
              <Route path="/influencer/aplicar" element={<InfluencerLandingPage />} />
              <Route path="/influencers/aplicar" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/influencers/registro" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/influencers/login" element={<LoginPage />} />
              <Route path="/signup" element={<RegisterPage />} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/recipes/create" element={<CreateRecipePage />} />
              <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/productos" element={<Navigate to="/products" replace />} />
              <Route path="/producto/:productId" element={<ProductDetailPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route path="/posts/:postId" element={<PostDetailPage />} />
              <Route path="/post/:postId" element={<PostDetailPage />} />
              <Route path="/store/:storeSlug" element={<StorePage />} />
              <Route path="/tienda/:storeSlug" element={<StorePage />} />
              <Route path="/tiendas/:storeSlug" element={<StorePage />} />
              <Route path="/certificate/:productId" element={<CertificatePage />} />
              <Route path="/certificado/:productId" element={<CertificatePage />} />
              <Route path="/certificates" element={<CertificatesListPage />} />
              <Route path="/certificados" element={<Navigate to="/certificates" replace />} />
              <Route path="/settings/locale" element={<LocaleSettingsPage />} />
              <Route path="/configuracion/idioma" element={<Navigate to="/settings/locale" replace />} />
              <Route path="/configuracion/pais" element={<Navigate to="/settings/locale" replace />} />
              <Route path="/configuracion/moneda" element={<Navigate to="/settings/locale" replace />} />
              <Route path="/become-influencer" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/become-seller" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/stores" element={<StoresListPage />} />
              <Route path="/tiendas" element={<Navigate to="/stores" replace />} />
              <Route path="/user/:userId" element={<UserProfilePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/category/:categoryId" element={<CategoryPage />} />
              <Route path="/que-es" element={<QueEsPage />} />
              <Route path="/ser-influencer" element={<Navigate to="/influencer" replace />} />
              <Route path="/creator" element={<Navigate to="/influencer" replace />} />
              <Route path="/creator/*" element={<Navigate to="/influencer" replace />} />
              <Route path="/affiliate-old" element={<Navigate to="/influencer" replace />} />
              <Route path="/affiliate-program" element={<Navigate to="/influencer" replace />} />
              <Route path="/ser-productor" element={<Navigate to="/productor" replace />} />
              <Route path="/importador" element={<ImporterLandingPage />} />
              <Route path="/importer" element={<ImporterLandingPage />} />
              <Route path="/importador/onboarding" element={<Navigate to="/importador?onboarding=1&plan=free" replace />} />
              <Route path="/importer/onboarding" element={<Navigate to="/importer?onboarding=1&plan=free" replace />} />
              <Route path="/ser-importador" element={<Navigate to="/importador" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/seller/login" element={<LoginPage />} />
              <Route path="/influencer/login" element={<LoginPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/new" element={<RoleSelector />} />
              <Route path="/register/consumer" element={<ConsumerRegister />} />
              <Route path="/register/influencer" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/register/producer" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/register/importer" element={<Navigate to="/importer/onboarding" replace />} />
              <Route path="/seller/register" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/influencer/register" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route
                path="/onboarding"
                element={(
                  <ProtectedRoute allowedRoles={['customer']} requireOnboarding={false}>
                    <OnboardingPage />
                  </ProtectedRoute>
                )}
              />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/importer/register" element={<Navigate to="/importer/onboarding" replace />} />
              <Route
                path="/importer/dashboard"
                element={(
                  <ProtectedRoute allowedRoles={['importer']} requireOnboarding={false}>
                    <ImporterDashboardPage />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/importer/certificates"
                element={(
                  <ProtectedRoute allowedRoles={['importer']} requireOnboarding={false}>
                    <ImporterCertificatesPage />
                  </ProtectedRoute>
                )}
              />
              <Route path="/importer/catalog" element={<Navigate to="/producer/products" replace />} />
              <Route path="/importer/brands" element={<Navigate to="/producer/store" replace />} />
              <Route path="/importer/quotes" element={<Navigate to="/producer/orders" replace />} />
              <Route path="/b2b/marketplace" element={<B2BMarketplacePage />} />
              <Route path="/b2b/producers" element={<Navigate to="/b2b/marketplace" replace />} />
              <Route path="/b2b/quotes" element={<B2BQuotesHistoryPage />} />
              <Route path="/b2b/chat" element={<B2BChatPage />} />
              <Route path="/orders" element={<LegacyOrdersRedirect />} />
              <Route path="/profile" element={<LegacyProfileRedirect />} />
              <Route path="/perfil" element={<LegacyProfileRedirect />} />
              <Route path="/profile/edit" element={<Navigate to="/dashboard/profile" replace />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/legal" element={<Navigate to="/terms" replace />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/press" element={<PressPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route
                path="/pending-approval"
                element={(
                  <ProtectedRoute allowedRoles={['producer', 'importer', 'influencer']} requireOnboarding={false}>
                    <PendingApprovalPage />
                  </ProtectedRoute>
                )}
              />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

              <Route
                path="/admin"
                element={(
                  <ProtectedRoute allowedRoles={['admin', 'super_admin']} requireOnboarding={false}>
                    <AdminLayout />
                  </ProtectedRoute>
                )}
              >
                <Route index element={<AdminOverview />} />
                <Route path="producers" element={<AdminProducers />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="certificates" element={<AdminCertificates />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="discount-codes" element={<AdminDiscountCodes />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="influencers" element={<AdminInfluencers />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="support/:caseId" element={<AdminSupportCase />} />
                <Route path="trust-safety" element={<AdminTrustSafety />} />
                <Route path="growth" element={<AdminGrowthAnalytics />} />
                <Route path="escalation" element={<EscalationChat />} />
              </Route>
              <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />

              <Route
                path="/super-admin"
                element={(
                  <ProtectedRoute allowedRoles={['super_admin']} requireOnboarding={false}>
                    <SuperAdminLayout />
                  </ProtectedRoute>
                )}
              >
                <Route index element={<SuperAdminOverviewPage />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="content" element={<ContentManagement />} />
                <Route path="insights" element={<InsightsDashboard />} />
                <Route path="finance" element={<FinancialDashboard />} />
                <Route path="markets" element={<MarketCoverage />} />
                <Route path="analytics" element={<InsightsDashboard />} />
                <Route path="admins" element={<AdminManagement />} />
                <Route path="escalation" element={<EscalationChat />} />
              </Route>

              {/* Legacy super-admin routes kept for old menu links */}
              <Route path="/admin/users" element={<Navigate to="/super-admin/users" replace />} />
              <Route path="/admin/admins" element={<Navigate to="/super-admin/admins" replace />} />
              <Route path="/admin/finance" element={<Navigate to="/super-admin/finance" replace />} />
              <Route path="/admin/markets" element={<Navigate to="/super-admin/markets" replace />} />
              <Route path="/admin/content" element={<Navigate to="/super-admin/content" replace />} />
              <Route path="/admin/insights" element={<Navigate to="/super-admin/insights" replace />} />
              <Route path="/admin/analytics" element={<Navigate to="/super-admin/analytics" replace />} />
              <Route path="/admin/escalations" element={<Navigate to="/super-admin/escalation" replace />} />
              <Route path="/admin/usuarios" element={<Navigate to="/super-admin/users" replace />} />
              <Route path="/admin/administradores" element={<Navigate to="/super-admin/admins" replace />} />
              <Route path="/admin/finanzas" element={<Navigate to="/super-admin/finance" replace />} />
              <Route path="/admin/mercados" element={<Navigate to="/super-admin/markets" replace />} />
              <Route path="/admin/contenido" element={<Navigate to="/super-admin/content" replace />} />
              <Route path="/admin/estadisticas" element={<Navigate to="/super-admin/insights" replace />} />
              <Route path="/admin/analitica" element={<Navigate to="/super-admin/analytics" replace />} />
              <Route path="/admin/escalaciones" element={<Navigate to="/super-admin/escalation" replace />} />

              <Route
                path="/producer"
                element={(
                  <ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}>
                    <ProducerLayout />
                  </ProtectedRoute>
                )}
              >
                <Route index element={<ProducerOverview />} />
                <Route path="products" element={<ProducerProducts />} />
                <Route path="products/new" element={<Navigate to="/producer/products" replace />} />
                <Route path="products/:productId" element={<Navigate to="/producer/products" replace />} />
                <Route path="products/:productId/countries" element={<ProductCountryManagement />} />
                <Route path="certificates" element={<ProducerCertificates />} />
                <Route path="orders" element={<ProducerOrders />} />
                <Route path="orders/:orderId" element={<Navigate to="/producer/orders" replace />} />
                <Route path="payments" element={<ProducerPayments />} />
                <Route path="profile" element={<ProducerProfile />} />
                <Route path="store" element={<ProducerStoreProfile />} />
                <Route path="shipping" element={<ProducerShippingPolicy />} />
                <Route path="insights" element={<ProducerInsights />} />
                <Route path="connect" element={<ProducerConnectPage />} />
                <Route path="connect/success" element={<ProducerConnectSuccess />} />
                <Route path="connect/refresh" element={<ProducerConnectRefresh />} />
                <Route path="analytics" element={<Navigate to="/producer" replace />} />
                <Route path="promotions" element={<Navigate to="/producer" replace />} />
                <Route path="influencers" element={<Navigate to="/discover?scope=profiles" replace />} />
              </Route>

              <Route
                path="/dashboard"
                element={(
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerLayout />
                  </ProtectedRoute>
                )}
              >
                <Route index element={<CustomerOverview />} />
                <Route path="orders" element={<CustomerOrders />} />
                <Route path="orders/:orderId" element={<Navigate to="/dashboard/orders" replace />} />
                <Route path="followed-stores" element={<CustomerFollowedStores />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="profile" element={<CustomerProfile />} />
                <Route path="ai-preferences" element={<CustomerAIPreferences />} />
                <Route path="predictions" element={<HispaloPredictions />} />
                <Route path="support" element={<CustomerSupport />} />
              </Route>

              <Route
                path="/customer"
                element={(
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerLayout />
                  </ProtectedRoute>
                )}
              >
                <Route index element={<CustomerOverview />} />
                <Route path="orders" element={<CustomerOrders />} />
                <Route path="saved" element={<CustomerFollowedStores />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="profile" element={<CustomerProfile />} />
                <Route path="support" element={<CustomerSupport />} />
              </Route>

              <Route
                path="/influencer/dashboard"
                element={(
                  <ProtectedRoute allowedRoles={['influencer']} requireOnboarding={false}>
                    <InfluencerLayoutResponsive>
                      <InfluencerDashboard />
                    </InfluencerLayoutResponsive>
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/influencer/insights"
                element={(
                  <ProtectedRoute allowedRoles={['influencer']} requireOnboarding={false}>
                    <InfluencerLayoutResponsive>
                      <InfluencerInsights />
                    </InfluencerLayoutResponsive>
                  </ProtectedRoute>
                )}
              />
              <Route path="/influencer/opportunities" element={<Navigate to="/influencer/dashboard" replace />} />
              <Route path="/influencer/links" element={<Navigate to="/influencer/dashboard" replace />} />
              <Route path="/influencer/earnings" element={<Navigate to="/influencer/dashboard" replace />} />
              <Route path="/influencer/perks" element={<Navigate to="/influencer/dashboard" replace />} />
              <Route
                path="/influencer/stripe-connect"
                element={(
                  <ProtectedRoute allowedRoles={['influencer']} requireOnboarding={false}>
                    <InfluencerLayoutResponsive>
                      <InfluencerDashboard />
                    </InfluencerLayoutResponsive>
                  </ProtectedRoute>
                )}
              />

              <Route path="/reels" element={<Navigate to="/discover?tab=feeds" replace />} />
              <Route path="/feed" element={<Navigate to="/discover?tab=feeds" replace />} />
              <Route path="/chat" element={<ChatContainer />} />
              <Route path="/profile/:userId" element={<UserProfilePage />} />
              <Route path="/dashboard/new" element={<DashboardPage />} />
              <Route path="/dashboard/consumer" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard/influencer/new" element={<Navigate to="/influencer/dashboard" replace />} />
              <Route path="/dashboard/producer/new" element={<Navigate to="/producer" replace />} />
              <Route path="/dashboard/importer/new" element={<Navigate to="/importer/dashboard" replace />} />
              <Route path="/importer/orders" element={<Navigate to="/producer/orders" replace />} />
              <Route path="/importer/orders/:orderId" element={<Navigate to="/producer/orders" replace />} />
              <Route path="/importer/products/new" element={<Navigate to="/producer/products" replace />} />
              <Route path="/importer/analytics" element={<Navigate to="/producer" replace />} />
              <Route path="/checkout" element={<Navigate to="/cart" replace />} />
              <Route path="/stories/*" element={<Navigate to="/" replace />} />
              <Route path="/auth/*" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Suspense>
      
      {/* Mini Cart Drawer */}
      <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryProvider>
        <BrowserRouter>
          <AppErrorBoundary>
            <AuthProvider>
              <LocaleProvider>
                <CartProvider>
                  <ChatProvider>
                    <RealtimeProvider>
                      <AppRouter />
                      <BottomNavBar />
                      <Toaster position="top-center" />
                    </RealtimeProvider>
                  </ChatProvider>
                </CartProvider>
              </LocaleProvider>
            </AuthProvider>
          </AppErrorBoundary>
        </BrowserRouter>
      </QueryProvider>
    </HelmetProvider>
  );
}

export default App;
