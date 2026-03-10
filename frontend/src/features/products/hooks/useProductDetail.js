import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  useProduct as useProductQuery,
  useProductCertificate,
  useStoreBySellerId,
  useToggleWishlist,
  useWishlistStatus,
} from '../queries';

export function useProductDetail(productId) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'es';

  const productQuery = useProductQuery(productId, { lang: currentLang });
  const product = productQuery.data ?? null;
  const sellerId = product?.store_id || product?.seller_id || product?.producer_id || null;

  const certificateQuery = useProductCertificate(productId, currentLang);
  const storeQuery = useStoreBySellerId(sellerId);
  const wishlistQuery = useWishlistStatus(productId, Boolean(user));
  const toggleWishlistMutation = useToggleWishlist();

  return {
    product,
    certificate: certificateQuery.data ?? null,
    storeInfo: storeQuery.data ?? null,
    inWishlist: Boolean(wishlistQuery.data?.in_wishlist),
    isLoading: productQuery.isLoading,
    isFetching: productQuery.isFetching,
    isError: productQuery.isError,
    error: productQuery.error,
    wishlistLoading: wishlistQuery.isFetching || toggleWishlistMutation.isPending,
    toggleWishlist: () =>
      toggleWishlistMutation.mutateAsync({
        productId,
        inWishlist: Boolean(wishlistQuery.data?.in_wishlist),
      }),
  };
}

export default useProductDetail;
