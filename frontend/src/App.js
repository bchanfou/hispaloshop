import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import '@/App.css';
import './locales/i18n';
import { trackPageVisit } from './utils/analytics';

// Public Pages (eager — needed for SEO + fast first paint)
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import PricingPage from './pages/PricingPage';
import SellerLandingPage from './pages/SellerLandingPage';
import InfluencerLandingPage from './pages/InfluencerLandingPage';
import RecipesPage from './pages/RecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import CreateRecipePage from './pages/CreateRecipePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import StorePage from './pages/StorePage';
import CartPage from './pages/CartPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CertificatePage from './pages/CertificatePage.jsx';
import CertificatesListPage from './pages/CertificatesListPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallback from './pages/AuthCallback';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import StoresListPage from './pages/StoresListPage';
import UserProfilePage from './pages/UserProfilePage';
import DiscoverPage from './pages/DiscoverPage';
import ImporterRegisterPage from './pages/importer/ImporterRegisterPage';
import ImporterDashboardPage from './pages/importer/ImporterDashboardPage';
import ImporterCatalogPage from './pages/importer/ImporterCatalogPage';
import ImporterBrandsPage from './pages/importer/ImporterBrandsPage';
import ImporterQuotesPage from './pages/importer/ImporterQuotesPage';
import B2BMarketplacePage from './pages/b2b/B2BMarketplacePage';
import B2BQuotesHistoryPage from './pages/b2b/B2BQuotesHistoryPage';

// Admin Dashboard
import AdminLayout from './components/dashboard/AdminLayoutResponsive';
import SuperAdminLayout from './components/dashboard/SuperAdminLayoutResponsive';
import AdminOverview from './pages/admin/AdminOverviewResponsive';
import AdminProducers from './pages/admin/AdminProducers';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCertificates from './pages/admin/AdminCertificates';
import AdminOrders from './pages/admin/AdminOrders';
import AdminDiscountCodes from './pages/admin/AdminDiscountCodes';
import AdminReviews from './pages/admin/AdminReviews';
import AdminInfluencers from './pages/admin/AdminInfluencers';
import AdminManagement from './pages/admin/AdminManagement';
import InsightsDashboard from './pages/super-admin/InsightsDashboard';
import UserManagement from './pages/super-admin/UserManagement';
import ContentManagement from './pages/super-admin/ContentManagement';
import FinancialDashboard from './pages/super-admin/FinancialDashboard';
import MarketCoverage from './pages/super-admin/MarketCoverage';
import SuperAdminOverviewPage from './pages/super-admin/SuperAdminOverview';

// Producer Dashboard
import ProducerLayout from './components/dashboard/ProducerLayoutResponsive';
import ProducerOverview from './pages/producer/ProducerOverviewResponsive';
import ProducerProducts from './pages/producer/ProducerProducts';
import ProducerCertificates from './pages/producer/ProducerCertificates';
import ProducerOrders from './pages/producer/ProducerOrders';
import ProducerPayments from './pages/producer/ProducerPayments';
import ProducerProfile from './pages/producer/ProducerProfile';
import ProducerStoreProfile from './pages/producer/ProducerStoreProfile';
import ProductCountryManagement from './pages/producer/ProductCountryManagement';

// Customer Dashboard
import CustomerLayout from './components/dashboard/CustomerLayoutResponsive';
import CustomerOverview from './pages/customer/CustomerOverview';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerProfile from './pages/customer/CustomerProfile';
import CustomerAIPreferences from './pages/customer/CustomerAIPreferences';
import CustomerFollowedStores from './pages/customer/CustomerFollowedStores';
import HispaloPredictions from './pages/customer/HispaloPredictions';
import WishlistPage from './pages/customer/WishlistPage';

// Influencer Dashboard
import InfluencerDashboard from './pages/influencer/InfluencerDashboard';
import InfluencerLayoutResponsive from './components/dashboard/InfluencerLayoutResponsive';

// Components
import BottomNavBar from './components/BottomNavBar';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from './components/ui/sonner';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LocaleProvider } from './context/LocaleContext';
import { HelmetProvider } from 'react-helmet-async';
import { ChatProvider } from './context/chat/ChatProvider';
import { usePushNotifications } from './hooks/usePushNotifications';

function AppRouter() {
  const location = useLocation();
  const { user } = useAuth();
  
  // Register push notifications when user is logged in
  usePushNotifications(user);
  
  // Track page visits for analytics
  useEffect(() => {
    trackPageVisit(location.pathname);
  }, [location.pathname]);
  
  // Check URL fragment for session_id during render (NOT in useEffect)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/vender" element={<SellerLandingPage />} />
      <Route path="/vender/registro" element={<RegisterPage />} />
      <Route path="/vender/login" element={<LoginPage />} />
      <Route path="/vender/planes" element={<PricingPage />} />
      <Route path="/influencers" element={<InfluencerLandingPage />} />
      <Route path="/influencers/registro" element={<RegisterPage />} />
      <Route path="/influencers/login" element={<LoginPage />} />
      <Route path="/signup" element={<RegisterPage />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/recipes/create" element={<CreateRecipePage />} />
      <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:productId" element={<ProductDetailPage />} />
      <Route path="/store/:storeSlug" element={<StorePage />} />
      <Route path="/certificate/:productId" element={<CertificatePage />} />
      <Route path="/certificates" element={<CertificatesListPage />} />
      <Route path="/become-influencer" element={<Navigate to="/influencers" replace />} />
      <Route path="/become-seller" element={<Navigate to="/vender" replace />} />
      <Route path="/stores" element={<StoresListPage />} />
      <Route path="/user/:userId" element={<UserProfilePage />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/seller/login" element={<LoginPage />} />
      <Route path="/influencer/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/seller/register" element={<RegisterPage />} />
      <Route path="/influencer/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/importer/register" element={<ImporterRegisterPage />} />
      <Route path="/importer/dashboard" element={<ImporterDashboardPage />} />
      <Route path="/importer/catalog" element={<ImporterCatalogPage />} />
      <Route path="/importer/brands" element={<ImporterBrandsPage />} />
      <Route path="/importer/quotes" element={<ImporterQuotesPage />} />
      <Route path="/b2b/marketplace" element={<B2BMarketplacePage />} />
      <Route path="/b2b/quotes" element={<B2BQuotesHistoryPage />} />

      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
      
      {/* Admin routes with shared layout */}
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

      {/* Super Admin routes - separate from regular admin */}
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

      {/* Producer routes with shared layout */}
      <Route path="/producer" element={<ProducerLayout />}>
        <Route index element={<ProducerOverview />} />
        <Route path="products" element={<ProducerProducts />} />
        <Route path="products/:productId/countries" element={<ProductCountryManagement />} />
        <Route path="certificates" element={<ProducerCertificates />} />
        <Route path="orders" element={<ProducerOrders />} />
        <Route path="payments" element={<ProducerPayments />} />
        <Route path="profile" element={<ProducerProfile />} />
        <Route path="store" element={<ProducerStoreProfile />} />
      </Route>

      {/* Customer routes with shared layout */}
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

      {/* Influencer Dashboard */}
      <Route path="/influencer/dashboard" element={
        <InfluencerLayoutResponsive>
          <InfluencerDashboard />
        </InfluencerLayoutResponsive>
      } />
      <Route path="/influencer/stripe-connect" element={
        <InfluencerLayoutResponsive>
          <InfluencerDashboard />
        </InfluencerLayoutResponsive>
      } />
    </Routes>
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
