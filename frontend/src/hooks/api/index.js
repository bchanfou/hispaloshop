// Auth
export { 
  useCurrentUser, 
  useLogin, 
  useRegister, 
  useLogout, 
  useUpdateProfile,
  useForgotPassword,
  useResetPassword,
  useOAuthLogin,
  useVerifyDocument,
  useVerificationStatus 
} from './useAuth';

// Feed
export { 
  useFollowingFeed, 
  useForYouFeed, 
  useCategoryFeed,
  useLikePost, 
  useSavePost,
  useFollowUser 
} from './useFeed';

// Posts, Reels, Stories
export { 
  usePost, 
  useCreatePost, 
  useUpdatePost, 
  useDeletePost,
  usePostComments, 
  useAddComment,
  useReels, 
  useReel, 
  useUploadReel, 
  useViewReel,
  useStories, 
  useUserStories, 
  useCreateStory, 
  useDeleteStory,
  useStoryViews, 
  useReactToStory, 
  useStoriesArchive, 
  useCreateHighlight 
} from './usePosts';

// Products
export { 
  useCategories, 
  useCategory, 
  useCatalog, 
  useProduct,
  useRelatedProducts, 
  useSearchProducts, 
  useSearchSuggestions,
  useProductReviews, 
  useAddReview,
  useB2BCatalog,
  useB2BProductInfo 
} from './useProducts';

// Cart & Orders (mutations like addToCart/removeFromCart go through CartContext)
export {
  useApplyCoupon,
  useCreateStripeCheckout,
  useOrders,
  useOrder,
  useOrderTracking,
  useCancelOrder,
  useReorder
} from './useCart';

// HI AI Chat — removed (consolidated into David/Rebeca/Pedro)

// Notifications
export { 
  useUnreadNotifications, 
  useNotifications, 
  useMarkAsRead,
  useMarkAllAsRead, 
  useDeleteNotification,
  useNotificationPreferences, 
  useUpdateNotificationPreferences,
  useRegisterPushToken, 
  useUnregisterPushToken, 
  useTestPushNotification 
} from './useNotifications';

// Influencer — active hooks are in features/influencer/

// Producer
export { 
  useProducerDashboard, 
  useProducerProducts, 
  useCreateProduct,
  useUpdateProduct, 
  useDeleteProduct, 
  useProducerOrders,
  useUpdateOrderStatus, 
  useProducerAnalytics, 
  useProducerHIInsights 
} from './useProducer';

// Importer
export {
  useB2BCatalog as useB2BCatalogImporter,
  useCreateInquiry,
  useInquiries,
} from './useImporter';

// Plan Config — single source of truth for commissions & pricing
export {
  usePlanConfig,
  useSellerPlanInfo,
  useInfluencerTierInfo,
} from './usePlanConfig';
