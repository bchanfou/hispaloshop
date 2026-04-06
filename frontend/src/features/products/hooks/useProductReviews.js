import { useAuth } from '../../../context/AuthContext';
import {
  useCanReviewProduct,
  useProductReviews as useProductReviewsQuery,
  useSubmitProductReview,
  useHelpfulVote,
} from '../queries';

export function useProductReviews(productId, sort = 'recent') {
  const { user } = useAuth();
  const reviewsQuery = useProductReviewsQuery(productId, sort);
  const canReviewQuery = useCanReviewProduct(productId, Boolean(user));
  const submitReviewMutation = useSubmitProductReview();
  const helpfulMutation = useHelpfulVote();

  const data = reviewsQuery.data?.pages?.[0] ?? reviewsQuery.data ?? null;
  const reviews = data?.reviews || data?.items || [];

  return {
    reviews,
    averageRating: data?.average_rating ?? data?.averageRating ?? 0,
    totalReviews: data?.total_reviews ?? data?.totalReviews ?? reviews.length,
    distribution: data?.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    hasMore: data?.has_more ?? false,
    canReview: Boolean(canReviewQuery.data?.can_review),
    canReviewReason: canReviewQuery.data?.reason ?? null,
    reviewOrderId: canReviewQuery.data?.order_id ?? null,
    isLoading: reviewsQuery.isLoading,
    isSubmitting: submitReviewMutation.isPending,
    submitReview: ({ orderId, rating, title, comment, images }) =>
      submitReviewMutation.mutateAsync({
        productId,
        orderId,
        rating,
        title,
        comment,
        images,
      }),
    toggleHelpful: (reviewId) =>
      helpfulMutation.mutateAsync({ productId, reviewId }),
  };
}

export default useProductReviews;
