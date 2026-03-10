import { useAuth } from '../../../context/AuthContext';
import {
  useCanReviewProduct,
  useProductReviews as useProductReviewsQuery,
  useSubmitProductReview,
} from '../queries';

export function useProductReviews(productId) {
  const { user } = useAuth();
  const reviewsQuery = useProductReviewsQuery(productId);
  const canReviewQuery = useCanReviewProduct(productId, Boolean(user));
  const submitReviewMutation = useSubmitProductReview();

  const firstPage = reviewsQuery.data?.pages?.[0] ?? reviewsQuery.data ?? null;
  const reviews = firstPage?.reviews || firstPage?.items || [];

  return {
    reviews,
    averageRating: firstPage?.average_rating ?? firstPage?.averageRating ?? 0,
    totalReviews: firstPage?.total_reviews ?? firstPage?.totalReviews ?? reviews.length,
    canReview: Boolean(canReviewQuery.data?.can_review),
    reviewOrderId: canReviewQuery.data?.order_id ?? null,
    isLoading: reviewsQuery.isLoading,
    isSubmitting: submitReviewMutation.isPending,
    submitReview: ({ orderId, rating, comment }) =>
      submitReviewMutation.mutateAsync({
        productId,
        orderId,
        rating,
        comment,
      }),
  };
}

export default useProductReviews;
