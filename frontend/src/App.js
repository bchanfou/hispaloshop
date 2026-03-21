import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import './App.css';
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
import HispalAI from './components/ai/HispalAI';
import ScrollToTop from './components/ScrollToTop';
import AppErrorBoundary from './components/AppErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import FeedLayout from './components/layout/FeedLayout';
import InfoLayout from './components/layout/InfoLayout';
import AuthLayout from './components/layout/AuthLayout';
import { SentryErrorBoundary } from './lib/sentry';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LocaleProvider } from './context/LocaleContext';
import { HelmetProvider } from 'react-helmet-async';
import { ChatProvider } from './context/chat/ChatProvider';
import { FeedTabProvider } from './context/FeedTabContext';
import { UploadQueueProvider } from './context/UploadQueueContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useNavigationDirection } from './hooks/useNavigationDirection';

// Nuevos providers P12
import { QueryProvider } from './providers/QueryProvider';
// Cart components
import MiniCart from './components/cart/MiniCart';
import ConsentBanner from './components/ui/ConsentBanner';
import { initAnalyticsOnConsent } from './utils/analytics';

const ProductorLandingPage = lazy(() => import('./pages/informativas/ForProducers'));
const InfluencerLandingPage = lazy(() => import('./pages/informativas/ForInfluencers'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const CreateRecipePage = lazy(() => import('./pages/CreateRecipePage'));
const CreatePostPage = lazy(() => import('./pages/create/CreatePostPage'));
const CreateReelPage = lazy(() => import('./pages/create/CreateReelPage'));
const CreateStoryPage = lazy(() => import('./pages/create/CreateStoryPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const CertificatePage = lazy(() => import('./pages/CertificatePage'));
const CertificatesListPage = lazy(() => import('./pages/CertificatesListPage'));
const LocaleSettingsPage = lazy(() => import('./pages/LocaleSettingsPage'));
const StoresListPage = lazy(() => import('./pages/StoresListPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const PeoplePage = lazy(() => import('./pages/PeoplePage'));
const ReelsPage = lazy(() => import('./pages/ReelsPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ImporterLandingPage = lazy(() => import('./pages/informativas/ForImporters'));
const B2BMarketplacePage = lazy(() => import('./pages/b2b/B2BMarketplacePage'));
const B2BQuotesHistoryPage = lazy(() => import('./pages/b2b/B2BQuotesHistoryPage'));
const B2BChatPage = lazy(() => import('./pages/b2b/B2BChatPage'));
const B2BOfferPage = lazy(() => import('./pages/b2b/B2BOfferPage'));
const B2BContractPage = lazy(() => import('./pages/b2b/B2BContractPage'));
const B2BPaymentPage = lazy(() => import('./pages/b2b/B2BPaymentPage'));
const B2BTrackingPage = lazy(() => import('./pages/b2b/B2BTrackingPage'));
const B2BOperationsDashboard = lazy(() => import('./pages/b2b/B2BOperationsDashboard'));
const B2BDisputePage = lazy(() => import('./pages/b2b/B2BDisputePage'));
const B2BCatalogPage = lazy(() => import('./pages/b2b/B2BCatalogPage'));
const CertificationsPage = lazy(() => import('./pages/CertificationsPage'));
const ExploreCategoryPage = lazy(() => import('./pages/ExploreCategoryPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const SignatureSettingsPage = lazy(() => import('./pages/settings/SignatureSettingsPage'));
const NewConversationPage = lazy(() => import('./pages/chat/NewConversationPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ContactPage = lazy(() => import('./pages/informativas/ContactPage'));
const LegalPage = lazy(() => import('./pages/informativas/LegalPage'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const EditProfilePage = lazy(() => import('./pages/settings/EditProfilePage'));
const ChangePasswordPage = lazy(() => import('./pages/settings/ChangePasswordPage'));
const FollowRequestsPage = lazy(() => import('./pages/settings/FollowRequestsPage'));
const NotificationsSettingsPage = lazy(() => import('./pages/settings/NotificationsSettingsPage'));
const PlanPage = lazy(() => import('./pages/settings/PlanPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PayoutSettingsPage = lazy(() => import('./pages/settings/PayoutSettingsPage'));
const FollowersPage = lazy(() => import('./pages/FollowersPage'));

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
const AdminRefunds = lazy(() => import('./pages/admin/AdminRefunds'));
const AdminTrustSafety = lazy(() => import('./pages/admin/AdminTrustSafety'));
const AdminGrowthAnalytics = lazy(() => import('./pages/admin/AdminGrowthAnalytics'));
const EscalationChat = lazy(() => import('./pages/admin/EscalationChat'));
const InsightsDashboard = lazy(() => import('./pages/super-admin/InsightsDashboard'));
const UserManagement = lazy(() => import('./pages/super-admin/UserManagement'));
const ContentManagement = lazy(() => import('./pages/super-admin/ContentManagement'));
const FinancialDashboard = lazy(() => import('./pages/super-admin/FinancialDashboard'));
const MarketCoverage = lazy(() => import('./pages/super-admin/MarketCoverage'));
const PlansConfigPage = lazy(() => import('./pages/super-admin/PlansConfigPage'));
const GDPRPage = lazy(() => import('./pages/super-admin/GDPRPage'));
const InfrastructurePage = lazy(() => import('./pages/super-admin/InfrastructurePage'));
const SuperAdminOverviewPage = lazy(() => import('./pages/super-admin/SuperAdminOverview'));

const CollabProposalPage = lazy(() => import('./pages/collaborations/CollabProposalPage'));
const SignedDocumentsPage = lazy(() => import('./pages/documents/SignedDocumentsPage'));
const CommunitiesExplorePage = lazy(() => import('./pages/CommunitiesExplorePage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const CreateCommunityPage = lazy(() => import('./pages/CreateCommunityPage'));

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
const ProducerAnalytics = lazy(() => import('./pages/producer/ProducerAnalytics'));
const ProducerPlanPage = lazy(() => import('./pages/producer/ProducerPlanPage'));
const ProducerConnectPage = lazy(() => import('./pages/producer/ProducerConnectPage'));
const ProducerConnectSuccess = lazy(() => import('./pages/producer/ProducerConnectSuccess'));
const ProducerConnectRefresh = lazy(() => import('./pages/producer/ProducerConnectRefresh'));
const ProducerShippingPolicy = lazy(() => import('./pages/producer/ProducerShippingPolicy'));
const CommercialAIPage = lazy(() => import('./pages/producer/CommercialAIPage'));
const ProducerB2BRequestsPage = lazy(() => import('./pages/producer/ProducerB2BRequestsPage'));
const ProducerVerificationPage = lazy(() => import('./pages/producer/ProducerVerificationPage'));

const CustomerLayout = lazy(() => import('./components/dashboard/CustomerLayoutResponsive'));
const CustomerOverview = lazy(() => import('./pages/customer/CustomerOverview'));
const CustomerOrders = lazy(() => import('./pages/customer/CustomerOrders'));
const OrderDetailPage = lazy(() => import('./pages/customer/OrderDetailPage'));
const CustomerSupport = lazy(() => import('./pages/customer/CustomerSupport'));
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile'));
const CustomerAIPreferences = lazy(() => import('./pages/customer/CustomerAIPreferences'));
const CustomerFollowedStores = lazy(() => import('./pages/customer/CustomerFollowedStores'));
const HispaloPredictions = lazy(() => import('./pages/customer/HispaloPredictions'));
const WishlistPage = lazy(() => import('./pages/customer/WishlistPage'));

const InfluencerDashboard = lazy(() => import('./pages/influencer/InfluencerDashboard'));
const InfluencerInsights = lazy(() => import('./pages/influencer/InfluencerInsights'));
const AffiliateLinksPage = lazy(() => import('./pages/influencer/AffiliateLinksPage'));
const FiscalSetupPage = lazy(() => import('./pages/influencer/FiscalSetupPage'));
const WithdrawalPage = lazy(() => import('./pages/influencer/WithdrawalPage'));
const PayoutsPage = lazy(() => import('./pages/influencer/PayoutsPage'));
const AdminFiscalPage = lazy(() => import('./pages/admin/AdminFiscalPage'));
const AdminVerificationPage = lazy(() => import('./pages/admin/AdminVerificationPage'));
const AdminModerationPage = lazy(() => import('./pages/admin/AdminModerationPage'));
const ChatContainer = lazy(() => import('./components/chat/ChatContainer'));
const ChatsPage = lazy(() => import('./pages/chat/ChatsPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const InfluencerLayoutResponsive = lazy(() => import('./components/dashboard/InfluencerLayoutResponsive'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ChatToastContainer = lazy(() => import('./components/notifications/ChatToastContainer'));

// Checkout

// Role-based onboarding
const RoleOnboardingPage = lazy(() => import('./pages/auth/RoleOnboardingPage'));

// Landing pages
const LandingPage = lazy(() => import('./pages/landings/Landing'));
const QueEsPage = lazy(() => import('./pages/landings/QueEsPage'));
const DashboardPage = lazy(() => import('./pages/dashboard'));
const ImporterDashboardPage = lazy(() => import('./pages/importer/ImporterDashboardPage'));
const ImporterCertificatesPage = lazy(() => import('./pages/importer/ImporterCertificatesPage'));
const ImporterCatalogPage = lazy(() => import('./pages/importer/ImporterCatalogPage'));
const ImporterOrdersPage = lazy(() => import('./pages/importer/ImporterOrdersPage'));

// Registration flows
const ConsumerRegister = lazy(() => import('./pages/register/consumer'));

function RouteLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-stone-700 animate-spin" />
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

/**
 * Handles /:username routes — renders profile if username exists, otherwise NotFound.
 * Only matches single-segment paths that look like usernames.
 */
function UsernameProfileRoute() {
  const { username } = useParams();
  // Normalize to lowercase — usernames are case-insensitive
  const normalized = username?.toLowerCase();
  // Valid usernames: 3-30 chars, lowercase alpha, numbers, underscores, dots
  const isValidUsername = /^[a-z0-9_.]{3,30}$/.test(normalized);
  if (!isValidUsername) return <NotFoundPage />;
  // Redirect to canonical lowercase if URL had uppercase
  if (username !== normalized) {
    return <Navigate to={`/${normalized}`} replace />;
  }
  return <UserProfilePage />;
}

function LegacyProfileRedirect() {
  const { user, loading, checkAuth } = useAuth();
  const [retried, setRetried] = useState(false);

  const username = user?.username;
  const needsRetry = !loading && user && !username && !retried;

  useEffect(() => {
    if (needsRetry) {
      setRetried(true);
      checkAuth();
    }
  }, [needsRetry, checkAuth]);

  if (loading || needsRetry) return <RouteLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (username) return <Navigate to={`/${username}`} replace />;
  const userId = user?.user_id || user?.id;
  if (userId) return <Navigate to={`/profile/${userId}`} replace />;
  return <Navigate to="/settings/profile" replace />;
}

const HeroBanner = lazy(() => import('./components/informativas/HeroBanner'));

/** Redirect authenticated users away from login/register */
function AuthRedirect({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function HomeRoute() {
  const { user } = useAuth();
  if (user) {
    return <FeedLayout><HomePage /></FeedLayout>;
  }
  return (
    <>
      <HomePage />
      <Suspense fallback={null}><HeroBanner /></Suspense>
    </>
  );
}

function AppRouter() {
  const location = useLocation();
  const { user } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const direction = useNavigationDirection();

  usePushNotifications(user);

  useEffect(() => {
    trackPageVisit(location.pathname);
  }, [location.pathname]);

  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  const isForward = direction === 'forward';

  return (
    <>
      <PageTransitionLoader />
      <ScrollToTop />
      <AppLayout>
      <Suspense fallback={<RouteLoader />}>
        <AnimatePresence mode="wait">
          <motion.div
            id="main-content"
            key={location.pathname}
            initial={{ opacity: 0, x: isForward ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isForward ? -20 : 20 }}
            transition={{ type: 'tween', duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
          <LayoutGroup>
            <Routes location={location}>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/about" element={<Navigate to="/que-es" replace />} />
              <Route path="/pricing" element={<Navigate to="/que-es" replace />} />
              <Route path="/vender" element={<Navigate to="/productor" replace />} />
              <Route path="/productor" element={<InfoLayout><ProductorLandingPage /></InfoLayout>} />
              <Route path="/productor/registro" element={<InfoLayout><ProductorLandingPage /></InfoLayout>} />
              <Route path="/info/productor" element={<Navigate to="/productor" replace />} />
              <Route path="/registro/productor" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/vender/registro" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/vender/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/vender/planes" element={<Navigate to="/productor" replace />} />
              <Route path="/influencers" element={<InfoLayout><InfluencerLandingPage /></InfoLayout>} />
              <Route path="/influencer" element={<InfoLayout><InfluencerLandingPage /></InfoLayout>} />
              <Route path="/influencer/aplicar" element={<InfoLayout><InfluencerLandingPage /></InfoLayout>} />
              <Route path="/influencers/aplicar" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/influencers/registro" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/influencers/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/signup" element={<AuthRedirect><AuthLayout><RegisterPage /></AuthLayout></AuthRedirect>} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/recipes/create" element={<CreateRecipePage />} />
              <Route path="/create/post" element={<CreatePostPage />} />
              <Route path="/create/reel" element={<CreateReelPage />} />
              <Route path="/create/story" element={<CreateStoryPage />} />
              <Route path="/create/text" element={<CreatePostPage />} />
              <Route path="/create/recipe" element={<CreateRecipePage />} />
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
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/profile" element={<EditProfilePage />} />
              <Route path="/settings/password" element={<ChangePasswordPage />} />
              <Route path="/settings/follow-requests" element={<FollowRequestsPage />} />
              <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
              <Route path="/settings/plan" element={<PlanPage />} />
              <Route path="/settings/payout" element={<PayoutSettingsPage />} />
              <Route path="/settings/locale" element={<LocaleSettingsPage />} />
              <Route path="/configuracion/idioma" element={<Navigate to="/settings/locale" replace />} />
              <Route path="/configuracion/pais" element={<Navigate to="/settings/locale" replace />} />
              <Route path="/configuracion/moneda" element={<Navigate to="/settings/locale" replace />} />
              <Route path="/become-influencer" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/become-seller" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/stores" element={<FeedLayout><StoresListPage /></FeedLayout>} />
              <Route path="/tiendas" element={<Navigate to="/stores" replace />} />
              <Route path="/user/:userId" element={<UserProfilePage />} />
              <Route path="/user/:username/followers" element={<FollowersPage />} />
              <Route path="/user/:username/following" element={<FollowersPage />} />
              <Route path="/discover/people" element={<PeoplePage />} />
              <Route path="/discover" element={<FeedLayout><DiscoverPage /></FeedLayout>} />
              <Route path="/explore" element={<FeedLayout><DiscoverPage /></FeedLayout>} />
              <Route path="/explore/category/:slug" element={<ExploreCategoryPage />} />
              <Route path="/certifications" element={<CertificationsPage />} />
              <Route path="/communities" element={<FeedLayout><CommunitiesExplorePage /></FeedLayout>} />
              <Route path="/communities/new" element={<CreateCommunityPage />} />
              <Route path="/communities/:slug" element={<CommunityPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/category/:categoryId" element={<CategoryPage />} />
              <Route path="/que-es" element={<InfoLayout><QueEsPage /></InfoLayout>} />
              <Route path="/que-es-hispaloshop" element={<InfoLayout><QueEsPage /></InfoLayout>} />
              <Route path="/landing" element={<InfoLayout><LandingPage /></InfoLayout>} />
              <Route path="/ser-influencer" element={<Navigate to="/influencer" replace />} />
              <Route path="/creator" element={<Navigate to="/influencer" replace />} />
              <Route path="/creator/*" element={<Navigate to="/influencer" replace />} />
              <Route path="/affiliate-old" element={<Navigate to="/influencer" replace />} />
              <Route path="/affiliate-program" element={<Navigate to="/influencer" replace />} />
              <Route path="/ser-productor" element={<Navigate to="/productor" replace />} />
              <Route path="/importador" element={<InfoLayout><ImporterLandingPage /></InfoLayout>} />
              <Route path="/importer" element={<InfoLayout><ImporterLandingPage /></InfoLayout>} />
              <Route path="/importador/onboarding" element={<Navigate to="/importador?onboarding=1&plan=free" replace />} />
              <Route path="/importer/onboarding" element={<Navigate to="/importer?onboarding=1&plan=free" replace />} />
              <Route path="/ser-importador" element={<Navigate to="/importador" replace />} />
              <Route path="/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/seller/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/influencer/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/auth/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/register" element={<AuthRedirect><AuthLayout><RegisterPage /></AuthLayout></AuthRedirect>} />
              <Route path="/register/new" element={<Navigate to="/register" replace />} />
              <Route path="/register/consumer" element={<ConsumerRegister />} />
              <Route path="/register/influencer" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/register/producer" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/register/importer" element={<Navigate to="/importer/onboarding" replace />} />
              <Route path="/seller/register" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/influencer/register" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/auth/register" element={<AuthRedirect><AuthLayout><RegisterPage /></AuthLayout></AuthRedirect>} />
              <Route
                path="/onboarding"
                element={(
                  <ProtectedRoute requireOnboarding={false}>
                    <OnboardingPage />
                  </ProtectedRoute>
                )}
              />
              <Route path="/onboarding/:role" element={<RoleOnboardingPage />} />
              <Route path="/verify-email" element={<AuthLayout><VerifyEmailPage /></AuthLayout>} />
              <Route path="/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
              <Route path="/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />
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
              <Route path="/importer/catalog" element={<ProtectedRoute allowedRoles={['importer']} requireOnboarding={false}><ImporterCatalogPage /></ProtectedRoute>} />
              <Route path="/importer/commercial-ai" element={<ProtectedRoute allowedRoles={['importer']} requireOnboarding={false}><CommercialAIPage /></ProtectedRoute>} />
              <Route path="/importer/brands" element={<Navigate to="/producer/store" replace />} />
              <Route path="/importer/quotes" element={<Navigate to="/producer/orders" replace />} />
              <Route path="/b2b/catalog" element={<B2BCatalogPage />} />
              <Route path="/b2b/marketplace" element={<B2BMarketplacePage />} />
              <Route path="/b2b/producers" element={<Navigate to="/b2b/marketplace" replace />} />
              <Route path="/b2b/quotes" element={<B2BQuotesHistoryPage />} />
              <Route path="/b2b/chat" element={<B2BChatPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<LegacyProfileRedirect />} />
              <Route path="/perfil" element={<LegacyProfileRedirect />} />
              <Route path="/profile/edit" element={<Navigate to="/dashboard/profile" replace />} />
              <Route path="/terms" element={<InfoLayout><TermsPage /></InfoLayout>} />
              <Route path="/legal" element={<Navigate to="/terms" replace />} />
              <Route path="/privacy" element={<InfoLayout><PrivacyPage /></InfoLayout>} />
              <Route path="/help" element={<Navigate to="/contacto" replace />} />
              <Route path="/blog" element={<Navigate to="/" replace />} />
              <Route path="/press" element={<Navigate to="/" replace />} />
              <Route path="/careers" element={<Navigate to="/" replace />} />
              <Route path="/contact" element={<Navigate to="/contacto" replace />} />
              <Route path="/contacto" element={<InfoLayout><ContactPage /></InfoLayout>} />
              <Route path="/precios" element={<Navigate to="/que-es" replace />} />
              <Route path="/legal/*" element={<InfoLayout><LegalPage /></InfoLayout>} />
              <Route
                path="/pending-approval"
                element={(
                  <ProtectedRoute allowedRoles={['producer', 'importer', 'influencer']} requireOnboarding={false}>
                    <PendingApprovalPage />
                  </ProtectedRoute>
                )}
              />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
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
                <Route path="refunds" element={<AdminRefunds />} />
                <Route path="trust-safety" element={<AdminTrustSafety />} />
                <Route path="growth" element={<AdminGrowthAnalytics />} />
                <Route path="escalation" element={<EscalationChat />} />
                <Route path="fiscal" element={<AdminFiscalPage />} />
                <Route path="verification" element={<AdminVerificationPage />} />
                <Route path="moderation" element={<AdminModerationPage />} />
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
                <Route path="plans" element={<PlansConfigPage />} />
                <Route path="gdpr" element={<GDPRPage />} />
                <Route path="infrastructure" element={<InfrastructurePage />} />
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
                <Route path="commercial-ai" element={<CommercialAIPage />} />
                <Route path="connect" element={<ProducerConnectPage />} />
                <Route path="connect/success" element={<ProducerConnectSuccess />} />
                <Route path="connect/refresh" element={<ProducerConnectRefresh />} />
                <Route path="analytics" element={<ProducerAnalytics />} />
                <Route path="plan" element={<ProducerPlanPage />} />
                <Route path="b2b-requests" element={<ProducerB2BRequestsPage />} />
                <Route path="verification" element={<ProducerVerificationPage />} />
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
                <Route path="orders/:orderId" element={<OrderDetailPage />} />
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
              <Route
                path="/influencer/links"
                element={
                  <ProtectedRoute allowedRoles={['influencer']} requireOnboarding={false}>
                    <InfluencerLayoutResponsive>
                      <AffiliateLinksPage />
                    </InfluencerLayoutResponsive>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/influencer/payouts"
                element={
                  <ProtectedRoute allowedRoles={['influencer']} requireOnboarding={false}>
                    <InfluencerLayoutResponsive>
                      <PayoutsPage />
                    </InfluencerLayoutResponsive>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/influencer/fiscal-setup"
                element={
                  <ProtectedRoute allowedRoles={['influencer']} requireOnboarding={false}>
                    <InfluencerLayoutResponsive>
                      <FiscalSetupPage />
                    </InfluencerLayoutResponsive>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/influencer/withdraw"
                element={
                  <ProtectedRoute allowedRoles={['influencer']} requireOnboarding={false}>
                    <InfluencerLayoutResponsive>
                      <WithdrawalPage />
                    </InfluencerLayoutResponsive>
                  </ProtectedRoute>
                }
              />
              <Route path="/influencer/earnings" element={<Navigate to="/influencer/payouts" replace />} />
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

              <Route path="/reels" element={<ReelsPage />} />
              <Route path="/feed" element={<Navigate to="/" replace />} />
              <Route path="/chat" element={<ChatContainer />} />
              <Route path="/messages" element={<ChatsPage />} />
              <Route path="/messages/new" element={<NewConversationPage />} />
              <Route path="/messages/:conversationId" element={<ChatPage />} />
              <Route path="/collab/new" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><CollabProposalPage /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><SignedDocumentsPage /></ProtectedRoute>} />
              <Route path="/b2b/offer/new" element={<B2BOfferPage />} />
              <Route path="/b2b/contract/:operationId" element={<B2BContractPage />} />
              <Route path="/b2b/payment/:operationId" element={<B2BPaymentPage />} />
              <Route path="/b2b/tracking/:operationId" element={<B2BTrackingPage />} />
              <Route path="/b2b/operations" element={<B2BOperationsDashboard />} />
              <Route path="/b2b/dispute/:operationId" element={<B2BDisputePage />} />
              <Route path="/settings/signature" element={<SignatureSettingsPage />} />
              <Route path="/profile/:userId" element={<UserProfilePage />} />
              <Route path="/dashboard/new" element={<DashboardPage />} />
              <Route path="/dashboard/consumer" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard/influencer/new" element={<Navigate to="/influencer/dashboard" replace />} />
              <Route path="/dashboard/producer/new" element={<Navigate to="/producer" replace />} />
              <Route path="/dashboard/importer/new" element={<Navigate to="/importer/dashboard" replace />} />
              <Route path="/importer/orders" element={<ProtectedRoute allowedRoles={['importer']} requireOnboarding={false}><ImporterOrdersPage /></ProtectedRoute>} />
              <Route path="/importer/orders/:orderId" element={<Navigate to="/producer/orders" replace />} />
              <Route path="/importer/products/new" element={<Navigate to="/producer/products" replace />} />
              <Route path="/importer/analytics" element={<Navigate to="/producer" replace />} />
              {/* /checkout is now a real page, defined above */}
              <Route path="/stories/*" element={<Navigate to="/" replace />} />
              <Route path="/auth/*" element={<Navigate to="/login" replace />} />
              <Route path="/:username" element={<UsernameProfileRoute />} />
              <Route path="/:username/followers" element={<FollowersPage />} />
              <Route path="/:username/following" element={<FollowersPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </LayoutGroup>
          </motion.div>
        </AnimatePresence>
      </Suspense>
      </AppLayout>

      {/* Mini Cart Drawer */}
      <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

function App() {
  return (
    <SentryErrorBoundary fallback={<div />}>
    <HelmetProvider>
      <QueryProvider>
        <BrowserRouter>
          <AppErrorBoundary>
            <AuthProvider>
              <LocaleProvider>
                <CartProvider>
                  <ChatProvider>
                    <FeedTabProvider>
                    <UploadQueueProvider>
                      <a href="#main-content" className="skip-to-content">Ir al contenido principal</a>
                      <AppRouter />
                      <BottomNavBar />
                      <Suspense fallback={null}><ChatToastContainer /></Suspense>
                      <HispalAI />
                      <ConsentBanner onConsent={(accepted) => { if (accepted) initAnalyticsOnConsent(); }} />
                      <Toaster position="top-center" />
                    </UploadQueueProvider>
                    </FeedTabProvider>
                  </ChatProvider>
                </CartProvider>
              </LocaleProvider>
            </AuthProvider>
          </AppErrorBoundary>
        </BrowserRouter>
      </QueryProvider>
    </HelmetProvider>
    </SentryErrorBoundary>
  );
}

export default App;
