import React, { Suspense, lazy, useEffect, useState } from 'react';
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
import AuthCallback from './pages/AuthCallback';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import BottomNavBar from './components/BottomNavBar';
import ScrollToTop from './components/ScrollToTop';
import AppErrorBoundary from './components/AppErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LocaleProvider } from './context/LocaleContext';
import { HelmetProvider } from 'react-helmet-async';
import { ChatProvider } from './context/chat/ChatProvider';
import { usePushNotifications } from './hooks/usePushNotifications';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const SellerLandingPage = lazy(() => import('./pages/SellerLandingPage'));
const ProductorLandingPage = lazy(() => import('./pages/ProductorLandingPage'));
const InfluencerLandingPage = lazy(() => import('./pages/InfluencerLandingPage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const CreateRecipePage = lazy(() => import('./pages/CreateRecipePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const CertificatePage = lazy(() => import('./pages/CertificatePage.jsx'));
const CertificatesListPage = lazy(() => import('./pages/CertificatesListPage'));
const StoresListPage = lazy(() => import('./pages/StoresListPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ImporterLandingPage = lazy(() => import('./pages/ImporterLandingPage'));
const B2BMarketplacePage = lazy(() => import('./pages/b2b/B2BMarketplacePage'));
const B2BQuotesHistoryPage = lazy(() => import('./pages/b2b/B2BQuotesHistoryPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));

const AdminLayout = lazy(() => import('./components/dashboard/AdminLayoutResponsive'));
const SuperAdminLayout = lazy(() => import('./components/dashboard/SuperAdminLayoutResponsive'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverviewResponsive'));
const AdminProducers = lazy(() => import('./pages/admin/AdminProducers'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCertificates = lazy(() => import('./pages/admin/AdminCertificates'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminDiscountCodes = lazy(() => import('./pages/admin/AdminDiscountCodes'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminInfluencers = lazy(() => import('./pages/admin/AdminInfluencers'));
const AdminManagement = lazy(() => import('./pages/admin/AdminManagement'));
const InsightsDashboard = lazy(() => import('./pages/super-admin/InsightsDashboard'));
const UserManagement = lazy(() => import('./pages/super-admin/UserManagement'));
const ContentManagement = lazy(() => import('./pages/super-admin/ContentManagement'));
const FinancialDashboard = lazy(() => import('./pages/super-admin/FinancialDashboard'));
const MarketCoverage = lazy(() => import('./pages/super-admin/MarketCoverage'));
const SuperAdminOverviewPage = lazy(() => import('./pages/super-admin/SuperAdminOverview'));

const ProducerLayout = lazy(() => import('./components/dashboard/ProducerLayoutResponsive'));
const ProducerOverview = lazy(() => import('./pages/producer/ProducerOverviewResponsive'));
const ProducerProducts = lazy(() => import('./pages/producer/ProducerProducts'));
const ProducerCertificates = lazy(() => import('./pages/producer/ProducerCertificates'));
const ProducerOrders = lazy(() => import('./pages/producer/ProducerOrders'));
const ProducerPayments = lazy(() => import('./pages/producer/ProducerPayments'));
const ProducerProfile = lazy(() => import('./pages/producer/ProducerProfile'));
const ProducerStoreProfile = lazy(() => import('./pages/producer/ProducerStoreProfile'));
const ProductCountryManagement = lazy(() => import('./pages/producer/ProductCountryManagement'));
const ProducerConnectPage = lazy(() => import('./pages/producer/ProducerConnectPage'));
const ProducerConnectSuccess = lazy(() => import('./pages/producer/ProducerConnectSuccess'));
const ProducerConnectRefresh = lazy(() => import('./pages/producer/ProducerConnectRefresh'));
const ProducerShippingPolicy = lazy(() => import('./pages/producer/ProducerShippingPolicy'));

const CustomerLayout = lazy(() => import('./components/dashboard/CustomerLayoutResponsive'));
const CustomerOverview = lazy(() => import('./pages/customer/Dashboard'));
const CustomerOrders = lazy(() => import('./pages/customer/CustomerOrders'));
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile'));
const CustomerAIPreferences = lazy(() => import('./pages/customer/CustomerAIPreferences'));
const CustomerFollowedStores = lazy(() => import('./pages/customer/CustomerFollowedStores'));
const HispaloPredictions = lazy(() => import('./pages/customer/HispaloPredictions'));
const WishlistPage = lazy(() => import('./pages/customer/WishlistPage'));

const InfluencerDashboard = lazy(() => import('./pages/influencer/InfluencerDashboard'));
const ReelsContainer = lazy(() => import('./components/reels/ReelsContainer'));
const ChatContainer = lazy(() => import('./components/chat/ChatContainer'));
const InfluencerLayoutResponsive = lazy(() => import('./components/dashboard/InfluencerLayoutResponsive'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

// Landing pages
const QueEsPage = lazy(() => import('./pages/landings/QueEsPage'));
const InfluencerLanding = lazy(() => import('./pages/landings/InfluencerLanding'));
const ProductorLanding = lazy(() => import('./pages/landings/ProductorLanding'));
const ImportadorLanding = lazy(() => import('./pages/landings/ImportadorLanding'));
const DashboardPage = lazy(() => import('./pages/dashboard'));
const ConsumerDashboard = lazy(() => import('./pages/dashboard/consumer'));
const InfluencerDashboardNew = lazy(() => import('./pages/dashboard/influencer'));
const ProducerDashboardNew = lazy(() => import('./pages/dashboard/producer'));
const ImporterDashboardNew = lazy(() => import('./pages/dashboard/importer'));

// Registration flows
const RoleSelector = lazy(() => import('./pages/register/RoleSelector'));
const ConsumerRegister = lazy(() => import('./pages/register/consumer'));
const InfluencerRegister = lazy(() => import('./pages/register/influencer'));
const ProducerRegister = lazy(() => import('./pages/register/producer'));
const ImporterRegister = lazy(() => import('./pages/register/importer'));

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/vender" element={<SellerLandingPage />} />
              <Route path="/productor" element={<ProductorLandingPage />} />
              <Route path="/info/productor" element={<ProductorLandingPage />} />
              <Route path="/registro/productor" element={<Navigate to="/register?role=producer" replace />} />
              <Route path="/vender/registro" element={<RegisterPage />} />
              <Route path="/vender/login" element={<LoginPage />} />
              <Route path="/vender/planes" element={<Navigate to="/vender/registro" replace />} />
              <Route path="/influencers" element={<InfluencerLandingPage />} />
              <Route path="/influencer" element={<InfluencerLandingPage />} />
              <Route path="/influencers/registro" element={<RegisterPage />} />
              <Route path="/influencers/login" element={<LoginPage />} />
              <Route path="/signup" element={<RegisterPage />} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/recipes/create" element={<CreateRecipePage />} />
              <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/productos" element={<Navigate to="/products" replace />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route path="/store/:storeSlug" element={<StorePage />} />
              <Route path="/certificate/:productId" element={<CertificatePage />} />
              <Route path="/certificates" element={<CertificatesListPage />} />
              <Route path="/become-influencer" element={<Navigate to="/influencers/registro" replace />} />
              <Route path="/become-seller" element={<Navigate to="/vender/registro" replace />} />
              <Route path="/stores" element={<StoresListPage />} />
              <Route path="/user/:userId" element={<UserProfilePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/category/:categoryId" element={<CategoryPage />} />
              <Route path="/que-es" element={<QueEsPage />} />
              <Route path="/influencer" element={<InfluencerLanding />} />
              <Route path="/productor" element={<ProductorLanding />} />
              <Route path="/importador" element={<ImportadorLanding />} />
              <Route path="/importer" element={<ImporterLandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/seller/login" element={<LoginPage />} />
              <Route path="/influencer/login" element={<LoginPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/new" element={<RoleSelector />} />
              <Route path="/register/consumer" element={<ConsumerRegister />} />
              <Route path="/register/influencer" element={<InfluencerRegister />} />
              <Route path="/register/producer" element={<ProducerRegister />} />
              <Route path="/register/importer" element={<ImporterRegister />} />
              <Route path="/seller/register" element={<RegisterPage />} />
              <Route path="/influencer/register" element={<RegisterPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/importer/register" element={<RegisterPage />} />
              <Route path="/importer/dashboard" element={<Navigate to="/producer" replace />} />
              <Route path="/importer/catalog" element={<Navigate to="/producer/products" replace />} />
              <Route path="/importer/brands" element={<Navigate to="/producer/store" replace />} />
              <Route path="/importer/quotes" element={<Navigate to="/producer/orders" replace />} />
              <Route path="/b2b/marketplace" element={<B2BMarketplacePage />} />
              <Route path="/b2b/quotes" element={<B2BQuotesHistoryPage />} />
              <Route path="/orders" element={<LegacyOrdersRedirect />} />
              <Route path="/profile" element={<LegacyProfileRedirect />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="producers" element={<AdminProducers />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="certificates" element={<AdminCertificates />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="discount-codes" element={<AdminDiscountCodes />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="influencers" element={<AdminInfluencers />} />
              </Route>
              <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />

              <Route path="/super-admin" element={<SuperAdminLayout />}>
                <Route index element={<SuperAdminOverviewPage />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="content" element={<ContentManagement />} />
                <Route path="insights" element={<InsightsDashboard />} />
                <Route path="finance" element={<FinancialDashboard />} />
                <Route path="markets" element={<MarketCoverage />} />
                <Route path="analytics" element={<AdminOverview />} />
                <Route path="admins" element={<AdminManagement />} />
              </Route>

              <Route path="/producer" element={<ProducerLayout />}>
                <Route index element={<ProducerOverview />} />
                <Route path="products" element={<ProducerProducts />} />
                <Route path="products/:productId/countries" element={<ProductCountryManagement />} />
                <Route path="certificates" element={<ProducerCertificates />} />
                <Route path="orders" element={<ProducerOrders />} />
                <Route path="payments" element={<ProducerPayments />} />
                <Route path="profile" element={<ProducerProfile />} />
                <Route path="store" element={<ProducerStoreProfile />} />
                <Route path="shipping" element={<ProducerShippingPolicy />} />
                <Route path="connect" element={<ProducerConnectPage />} />
                <Route path="connect/success" element={<ProducerConnectSuccess />} />
                <Route path="connect/refresh" element={<ProducerConnectRefresh />} />
              </Route>

              <Route path="/dashboard" element={<CustomerLayout />}>
                <Route index element={<CustomerOverview />} />
                <Route path="orders" element={<CustomerOrders />} />
                <Route path="followed-stores" element={<CustomerFollowedStores />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="profile" element={<CustomerProfile />} />
                <Route path="ai-preferences" element={<CustomerAIPreferences />} />
                <Route path="predictions" element={<HispaloPredictions />} />
              </Route>

              <Route path="/customer" element={<CustomerLayout />}>
                <Route index element={<CustomerOverview />} />
                <Route path="orders" element={<CustomerOrders />} />
                <Route path="saved" element={<CustomerFollowedStores />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="profile" element={<CustomerProfile />} />
              </Route>

              <Route
                path="/influencer/dashboard"
                element={(
                  <InfluencerLayoutResponsive>
                    <InfluencerDashboard />
                  </InfluencerLayoutResponsive>
                )}
              />
              <Route
                path="/influencer/stripe-connect"
                element={(
                  <InfluencerLayoutResponsive>
                    <InfluencerDashboard />
                  </InfluencerLayoutResponsive>
                )}
              />

              <Route path="/reels" element={<ReelsContainer />} />
              <Route path="/chat" element={<ChatContainer />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/dashboard/new" element={<DashboardPage />} />
              <Route path="/dashboard/consumer" element={<ConsumerDashboard />} />
              <Route path="/dashboard/influencer/new" element={<InfluencerDashboardNew />} />
              <Route path="/dashboard/producer/new" element={<ProducerDashboardNew />} />
              <Route path="/dashboard/importer/new" element={<ImporterDashboardNew />} />
              <Route path="/chat" element={<Navigate to="/" replace />} />
              <Route path="/auth/*" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppErrorBoundary>
          <AuthProvider>
            <LocaleProvider>
              <CartProvider>
                <ChatProvider>
                  <AppRouter />
                  <BottomNavBar />
                  <Toaster position="top-center" />
                </ChatProvider>
              </CartProvider>
            </LocaleProvider>
          </AuthProvider>
        </AppErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
