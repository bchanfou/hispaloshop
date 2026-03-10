import { useUserProductsQuery } from '../queries';

export function useUserProducts(userId, enabled) {
  const productsQuery = useUserProductsQuery(userId, { enabled });

  return {
    sellerProducts: productsQuery.data ?? [],
    isLoading: productsQuery.isLoading,
    isFetching: productsQuery.isFetching,
    refetch: productsQuery.refetch,
  };
}

export default useUserProducts;
