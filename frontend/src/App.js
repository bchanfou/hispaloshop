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
import AIAssistantManager from './components/ai/AIAssistantManager';
import ScrollToTop from './components/ScrollToTop';
import AppErrorBoundary from './components/AppErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import FeedLayout from './components/layout/FeedLayout';
// InfoLayout removed — replaced by InfoLandingLayout for all landing pages
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
import UploadProgressBanner from './components/upload/UploadProgressBanner';
import GlobalSearch from './components/GlobalSearch';
import { ProducerPlanProvider } from './context/ProducerPlanContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useNavigationDirection } from './hooks/useNavigationDirection';

// Nuevos providers P12
import { QueryProvider } from './providers/QueryProvider';
// Cart components
// MiniCart removed — permanently hidden (isCartOpen never set true), /cart page is the active flow
// import MiniCart from './components/cart/MiniCart';
import ConsentBanner from './components/ui/ConsentBanner';
import { initAnalyticsOnConsent } from './utils/analytics';

// Old landing pages removed — replaced by Aesop-style pages in Fase 2-4
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const CreateRecipePage = lazy(() => import('./pages/CreateRecipePage'));
const CreatePostPage = lazy(() => import('./pages/create/CreatePostPage'));
const DraftsPage = lazy(() => import('./pages/DraftsPage'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
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
const EditorialCollectionsPage = lazy(() => import('./pages/EditorialCollectionsPage'));
const PeoplePage = lazy(() => import('./pages/PeoplePage'));
const ReelsPage = lazy(() => import('./pages/ReelsPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
// ImporterLandingPage removed — replaced by LandingDistribuidor
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
// TermsPage & PrivacyPage removed — /terms and /privacy redirect to /legal/*
const ContactoPage = lazy(() => import('./pages/informativas/ContactoPage'));
const LegalPageNew = lazy(() => import('./pages/informativas/LegalPageNew'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'));
const EditProfilePage = lazy(() => import('./pages/settings/EditProfilePage'));
const ChangePasswordPage = lazy(() => import('./pages/settings/ChangePasswordPage'));
const FollowRequestsPage = lazy(() => import('./pages/settings/FollowRequestsPage'));
const NotificationsSettingsPage = lazy(() => import('./pages/settings/NotificationsSettingsPage'));
const PlanPage = lazy(() => import('./pages/settings/PlanPage'));
const AddressesPage = lazy(() => import('./pages/settings/AddressesPage'));
const GamificationPage = lazy(() => import('./pages/settings/GamificationPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PayoutSettingsPage = lazy(() => import('./pages/settings/PayoutSettingsPage'));
const AIAssistantsPage = lazy(() => import('./pages/settings/AIAssistantsPage'));
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
const AdminPayouts = lazy(() => import('./pages/admin/AdminPayouts'));
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
const CommunitySettingsPage = lazy(() => import('./pages/CommunitySettingsPage'));
const HashtagPage = lazy(() => import('./pages/HashtagPage'));

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
const PromotionPage = lazy(() => import('./pages/producer/PromotionPage'));
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
const WishlistsPage = lazy(() => import('./pages/WishlistsPage'));
const AmbassadorsPage = lazy(() => import('./pages/AmbassadorsPage'));
const BlogIndexPage = lazy(() => import('./pages/blog/BlogIndexPage'));
const BlogArticlePage = lazy(() => import('./pages/blog/BlogArticlePage'));
const WishlistDetailPage = lazy(() => import('./pages/WishlistDetailPage'));
const WishlistSharedPage = lazy(() => import('./pages/WishlistSharedPage'));

const InfluencerDashboard = lazy(() => import('./pages/influencer/InfluencerDashboard'));
const InfluencerInsights = lazy(() => import('./pages/influencer/InfluencerInsights'));
const AffiliateLinksPage = lazy(() => import('./pages/influencer/AffiliateLinksPage'));
const FiscalSetupPage = lazy(() => import('./pages/influencer/FiscalSetupPage'));
const WithdrawalPage = lazy(() => import('./pages/influencer/WithdrawalPage'));
const PayoutsPage = lazy(() => import('./pages/influencer/PayoutsPage'));
const AdminFiscalPage = lazy(() => import('./pages/admin/AdminFiscalPage'));
const AdminVerificationPage = lazy(() => import('./pages/admin/AdminVerificationPage'));
const AdminModerationPage = lazy(() => import('./pages/admin/AdminModerationPage'));
// ChatContainer removed — HI Multi-role AI consolidated into David/Rebeca/Pedro
const ChatsPage = lazy(() => import('./pages/chat/ChatsPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const ChatRequestsPage = lazy(() => import('./pages/chat/ChatRequestsPage'));
const InfluencerLayoutResponsive = lazy(() => import('./components/dashboard/InfluencerLayoutResponsive'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ChatToastContainer = lazy(() => import('./components/notifications/ChatToastContainer'));

// Checkout

// Role-based onboarding (REMOVED — dead code, no flow navigates here)

// Old landing pages removed — replaced by LandingGeneral
// New Aesop-style landing pages (Fase 2)
const InfoLandingLayout = lazy(() => import('./components/informativas/InfoLandingLayout'));
const LandingGeneral = lazy(() => import('./pages/informativas/LandingGeneral'));
const LandingProductor = lazy(() => import('./pages/informativas/LandingProductor'));
const LandingInfluencer = lazy(() => import('./pages/informativas/LandingInfluencer'));
const LandingDistribuidor = lazy(() => import('./pages/informativas/LandingDistribuidor'));
const LangRoute = lazy(() => import('./components/informativas/LangRoute'));
const LangDetectRedirect = lazy(() => import('./components/informativas/LangDetectRedirect'));
const LandingConsumidor = lazy(() => import('./pages/informativas/LandingConsumidor'));
const MapPage = lazy(() => import('./pages/MapPage'));
const DashboardPage = lazy(() => import('./pages/dashboard'));
const ImporterDashboardPage = lazy(() => import('./pages/importer/ImporterDashboardPage'));
const ImporterOpportunitiesPage = lazy(() => import('./pages/importer/ImporterOpportunitiesPage'));
const ImporterCertificatesPage = lazy(() => import('./pages/importer/ImporterCertificatesPage'));
const ImporterCatalogPage = lazy(() => import('./pages/importer/ImporterCatalogPage'));
const ImporterOrdersPage = lazy(() => import('./pages/importer/ImporterOrdersPage'));

// Registration flows
// Consumer multi-step register (5 pre-verify steps) archived in section 1.1
// of the launch roadmap. Flow consolidated into RegisterPage. Route kept as
// redirect to preserve any shared URL or SEO value.

/** Route guard: redirects non-ELITE producers/importers to the plan/pricing page.
 * Reads from localStorage cache (set by ProducerPlanContext when mounted).
 * If no cache exists, waits for the inner component's own plan check (CommercialAIPage has its own UpgradeBanner). */
function EliteRoute({ children }) {
  const planCache = localStorage.getItem('hsp_plan_cache');
  // If no cache at all, let the child component handle the check (avoids redirect loop on first visit)
  if (!planCache) return children;
  let plan = 'FREE';
  try { plan = JSON.parse(planCache).plan || 'FREE'; } catch { return children; }
  if (plan !== 'ELITE') return <Navigate to="/settings/plan" replace />;
  return children;
}

function RouteLoader() {
  return (
    <div className="min-h-[40vh] px-4 pt-4 space-y-3" aria-busy="true">
      <div className="skeleton-shimmer rounded-2xl h-8 w-48" />
      <div className="skeleton-shimmer rounded-2xl h-4 w-32" />
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <div className="skeleton-shimmer w-full h-40" />
            <div className="p-2 space-y-2">
              <div className="skeleton-shimmer h-3 w-3/4 rounded" />
              <div className="skeleton-shimmer h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageTransitionLoader() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show the progress bar if the transition takes more than 300ms
    const showTimer = window.setTimeout(() => setVisible(true), 300);
    return () => {
      window.clearTimeout(showTimer);
      setVisible(false);
    };
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

function LegacyChatConversationRedirect() {
  const { conversationId } = useParams();
  return <Navigate to={`/messages/${conversationId}`} replace />;
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
  // MiniCart state removed — was permanently hidden (isCartOpen never set true)
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
          <LayoutGroup>
            <Routes location={location}>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/about" element={<Navigate to="/landing/general" replace />} />
              <Route path="/pricing" element={<Navigate to="/productor" replace />} />
              {/* New Aesop-style landing pages */}
              <Route path="/consumidor" element={<LangDetectRedirect><InfoLandingLayout><LandingConsumidor /></InfoLandingLayout></LangDetectRedirect>} />
              <Route path="/informativas/consumidor" element={<Navigate to="/consumidor" replace />} />
              <Route path="/distribuidor" element={<LangDetectRedirect><InfoLandingLayout><LandingDistribuidor /></InfoLandingLayout></LangDetectRedirect>} />
              <Route path="/informativas/distribuidor" element={<Navigate to="/distribuidor" replace />} />
              <Route path="/landing/general" element={<LangDetectRedirect><InfoLandingLayout><LandingGeneral /></InfoLandingLayout></LangDetectRedirect>} />
              {/* /{lang}/ prefixed landing routes — explicit lang codes to avoid capturing /login etc. */}
              {['es','en','fr','de','it','pt','ja','ko'].map(lang => (
                <React.Fragment key={lang}>
                  <Route path={`/${lang}/consumidor`} element={<LangRoute><InfoLandingLayout><LandingConsumidor /></InfoLandingLayout></LangRoute>} />
                  <Route path={`/${lang}/productor`} element={<LangRoute><InfoLandingLayout><LandingProductor /></InfoLandingLayout></LangRoute>} />
                  <Route path={`/${lang}/influencer`} element={<LangRoute><InfoLandingLayout><LandingInfluencer /></InfoLandingLayout></LangRoute>} />
                  <Route path={`/${lang}/distribuidor`} element={<LangRoute><InfoLandingLayout><LandingDistribuidor /></InfoLandingLayout></LangRoute>} />
                  <Route path={`/${lang}/contacto`} element={<LangRoute><InfoLandingLayout><ContactoPage /></InfoLandingLayout></LangRoute>} />
                  <Route path={`/${lang}/legal/*`} element={<LangRoute><InfoLandingLayout><LegalPageNew /></InfoLandingLayout></LangRoute>} />
                  <Route path={`/${lang}`} element={<LangRoute><InfoLandingLayout><LandingGeneral /></InfoLandingLayout></LangRoute>} />
                </React.Fragment>
              ))}
              <Route path="/vender" element={<Navigate to="/productor" replace />} />
              <Route path="/productor" element={<LangDetectRedirect><InfoLandingLayout><LandingProductor /></InfoLandingLayout></LangDetectRedirect>} />
              <Route path="/informativas/ForProducers" element={<Navigate to="/productor" replace />} />
              <Route path="/informativas/productor" element={<Navigate to="/productor" replace />} />
              <Route path="/informativas/soy-productor" element={<Navigate to="/productor" replace />} />
              <Route path="/productor/registro" element={<Navigate to="/productor" replace />} />
              <Route path="/info/productor" element={<Navigate to="/productor" replace />} />
              <Route path="/registro/productor" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/vender/registro" element={<Navigate to="/productor/registro" replace />} />
              <Route path="/vender/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/vender/planes" element={<Navigate to="/productor" replace />} />
              <Route path="/influencers" element={<Navigate to="/influencer" replace />} />
              <Route path="/influencer" element={<LangDetectRedirect><InfoLandingLayout><LandingInfluencer /></InfoLandingLayout></LangDetectRedirect>} />
              <Route path="/influencer/aplicar" element={<Navigate to="/influencer" replace />} />
              <Route path="/influencers/aplicar" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/influencers/registro" element={<Navigate to="/influencer/aplicar" replace />} />
              <Route path="/influencers/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/signup" element={<AuthRedirect><AuthLayout><RegisterPage /></AuthLayout></AuthRedirect>} />
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/recipes/create" element={<CreateRecipePage />} />
              <Route path="/create/post" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
              <Route path="/create/reel" element={<ProtectedRoute><CreateReelPage /></ProtectedRoute>} />
              <Route path="/create/story" element={<ProtectedRoute><CreateStoryPage /></ProtectedRoute>} />
              <Route path="/create/text" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
              <Route path="/create/recipe" element={<ProtectedRoute><CreateRecipePage /></ProtectedRoute>} />
              <Route path="/drafts" element={<ProtectedRoute><DraftsPage /></ProtectedRoute>} />
              <Route path="/saved" element={<ProtectedRoute><SavedPage /></ProtectedRoute>} />
              <Route path="/guardados" element={<Navigate to="/saved" replace />} />
              <Route path="/wishlists" element={<ProtectedRoute><WishlistsPage /></ProtectedRoute>} />
              <Route path="/wishlists/:wishlistId" element={<ProtectedRoute><WishlistDetailPage /></ProtectedRoute>} />
              <Route path="/w/:slug" element={<WishlistSharedPage />} />
              <Route path="/ambassadors" element={<AmbassadorsPage />} />
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
              {/* Certificate routes moved to public section below */}
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
              <Route path="/settings/addresses" element={<AddressesPage />} />
              <Route path="/settings/gamification" element={<GamificationPage />} />
              <Route path="/settings/ai-assistants" element={<AIAssistantsPage />} />
              <Route path="/loyalty" element={<ProtectedRoute><LoyaltyPage /></ProtectedRoute>} />
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
              <Route path="/map" element={<MapPage />} />
              <Route path="/collections" element={<FeedLayout><EditorialCollectionsPage /></FeedLayout>} />
              <Route path="/explore/category/:slug" element={<ExploreCategoryPage />} />
              <Route path="/hashtag/:tag" element={<HashtagPage />} />
              <Route path="/certifications" element={<CertificationsPage />} />
              <Route path="/communities" element={<FeedLayout><CommunitiesExplorePage /></FeedLayout>} />
              <Route path="/communities/new" element={<CreateCommunityPage />} />
              <Route path="/communities/:slug/settings" element={<CommunitySettingsPage />} />
              <Route path="/communities/:slug" element={<CommunityPage />} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
              <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/category/:categoryId" element={<CategoryPage />} />
              {/* Public certificate pages — no auth required */}
              <Route path="/certificate/:productId" element={<CertificatePage />} />
              {/* Short URL for QR codes on physical products (1.4b Digital Certificate) */}
              <Route path="/c/:productId" element={<CertificatePage />} />
              <Route path="/certificado/:productId" element={<CertificatePage />} />

              <Route path="/que-es" element={<Navigate to="/landing/general" replace />} />
              <Route path="/que-es-hispaloshop" element={<Navigate to="/landing/general" replace />} />
              <Route path="/landing" element={<Navigate to="/landing/general" replace />} />
              <Route path="/ser-influencer" element={<Navigate to="/influencer" replace />} />
              <Route path="/creator" element={<Navigate to="/influencer" replace />} />
              <Route path="/creator/*" element={<Navigate to="/influencer" replace />} />
              <Route path="/affiliate-old" element={<Navigate to="/influencer" replace />} />
              <Route path="/affiliate-program" element={<Navigate to="/influencer" replace />} />
              <Route path="/ser-productor" element={<Navigate to="/productor" replace />} />
              <Route path="/importador" element={<Navigate to="/distribuidor" replace />} />
              <Route path="/informativas/ForImporters" element={<Navigate to="/distribuidor" replace />} />
              <Route path="/informativas/importador" element={<Navigate to="/distribuidor" replace />} />
              <Route path="/informativas/soy-importador" element={<Navigate to="/distribuidor" replace />} />
              <Route path="/importer" element={<Navigate to="/distribuidor" replace />} />
              <Route path="/importador/onboarding" element={<Navigate to="/importador?onboarding=1&plan=free" replace />} />
              <Route path="/importer/onboarding" element={<Navigate to="/importer?onboarding=1&plan=free" replace />} />
              <Route path="/ser-importador" element={<Navigate to="/importador" replace />} />
              <Route path="/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/seller/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/influencer/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/auth/login" element={<AuthRedirect><AuthLayout><LoginPage /></AuthLayout></AuthRedirect>} />
              <Route path="/register" element={<AuthRedirect><AuthLayout><RegisterPage /></AuthLayout></AuthRedirect>} />
              <Route path="/register/new" element={<Navigate to="/register" replace />} />
              <Route path="/register/consumer" element={<Navigate to="/register" replace />} />
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
              {/* /onboarding/:role removed — dead code */}
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
              <Route path="/importer/commercial-ai" element={<ProtectedRoute allowedRoles={['importer']} requireOnboarding={false}><ProducerPlanProvider><EliteRoute><CommercialAIPage /></EliteRoute></ProducerPlanProvider></ProtectedRoute>} />
              <Route path="/importer/opportunities" element={<ProtectedRoute allowedRoles={['importer']} requireOnboarding={false}><ImporterOpportunitiesPage /></ProtectedRoute>} />
              <Route path="/importer/brands" element={<Navigate to="/producer/store" replace />} />
              <Route path="/importer/quotes" element={<Navigate to="/producer/orders" replace />} />
              <Route path="/b2b/catalog" element={<B2BCatalogPage />} />
              <Route path="/b2b/marketplace" element={<B2BMarketplacePage />} />
              <Route path="/b2b/producers" element={<Navigate to="/b2b/marketplace" replace />} />
              <Route path="/b2b/quotes" element={<B2BQuotesHistoryPage />} />
              <Route path="/b2b/chat" element={<B2BChatPage />} />
              <Route path="/b2b/chat/:conversationId" element={<B2BChatPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<LegacyProfileRedirect />} />
              <Route path="/perfil" element={<LegacyProfileRedirect />} />
              <Route path="/profile/edit" element={<Navigate to="/dashboard/profile" replace />} />
              <Route path="/terms" element={<Navigate to="/legal/terminos" replace />} />
              <Route path="/privacy" element={<Navigate to="/legal/privacidad" replace />} />
              <Route path="/help" element={<Navigate to="/contacto" replace />} />
              <Route path="/blog" element={<BlogIndexPage />} />
              <Route path="/blog/:slug" element={<BlogArticlePage />} />
              <Route path="/press" element={<Navigate to="/" replace />} />
              <Route path="/careers" element={<Navigate to="/" replace />} />
              <Route path="/contact" element={<Navigate to="/contacto" replace />} />
              <Route path="/contacto" element={<LangDetectRedirect><InfoLandingLayout><ContactoPage /></InfoLandingLayout></LangDetectRedirect>} />
              <Route path="/precios" element={<Navigate to="/productor" replace />} />
              <Route path="/legal/*" element={<LangDetectRedirect><InfoLandingLayout><LegalPageNew /></InfoLandingLayout></LangDetectRedirect>} />
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
                <Route path="payouts" element={<AdminPayouts />} />
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
                <Route path="commercial-ai" element={<EliteRoute><CommercialAIPage /></EliteRoute>} />
                <Route path="connect" element={<ProducerConnectPage />} />
                <Route path="connect/success" element={<ProducerConnectSuccess />} />
                <Route path="connect/refresh" element={<ProducerConnectRefresh />} />
                <Route path="analytics" element={<ProducerAnalytics />} />
                <Route path="plan" element={<ProducerPlanPage />} />
                <Route path="b2b-requests" element={<ProducerB2BRequestsPage />} />
                <Route path="verification" element={<ProducerVerificationPage />} />
                <Route path="promotions" element={<Navigate to="/producer/promotion" replace />} />
                <Route path="promotion" element={<PromotionPage />} />
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
              <Route path="/chat" element={<Navigate to="/messages" replace />} />
              <Route path="/chat/:conversationId" element={<LegacyChatConversationRedirect />} />
              {/* /ai/chat removed — HI Multi-role consolidated into David/Rebeca/Pedro */}
              <Route path="/messages" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
              <Route path="/messages/new" element={<ProtectedRoute><NewConversationPage /></ProtectedRoute>} />
              <Route path="/messages/requests" element={<ProtectedRoute><ChatRequestsPage /></ProtectedRoute>} />
              <Route path="/messages/:conversationId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              <Route path="/collab/new" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><CollabProposalPage /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><SignedDocumentsPage /></ProtectedRoute>} />
              <Route path="/b2b/offer/new" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><B2BOfferPage /></ProtectedRoute>} />
              <Route path="/b2b/contract/:operationId" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><B2BContractPage /></ProtectedRoute>} />
              <Route path="/b2b/payment/:operationId" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><B2BPaymentPage /></ProtectedRoute>} />
              <Route path="/b2b/tracking/:operationId" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><B2BTrackingPage /></ProtectedRoute>} />
              <Route path="/b2b/operations" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><B2BOperationsDashboard /></ProtectedRoute>} />
              <Route path="/b2b/dispute/:operationId" element={<ProtectedRoute allowedRoles={['producer', 'importer']} requireOnboarding={false}><B2BDisputePage /></ProtectedRoute>} />
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
      {/* MiniCart removed — /cart page is the active flow */}
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
                      <UploadProgressBanner />
                      <GlobalSearch />
                      <a href="#main-content" className="skip-to-content">Ir al contenido principal</a>
                      <AppRouter />
                      <BottomNavBar />
                      <Suspense fallback={null}><ChatToastContainer /></Suspense>
                      <AIAssistantManager />
                      <ConsentBanner onConsent={(accepted) => { if (accepted) initAnalyticsOnConsent(); }} />
                      <Toaster position="top-center" toastOptions={{ duration: 3000, className: 'font-sans' }} />
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
