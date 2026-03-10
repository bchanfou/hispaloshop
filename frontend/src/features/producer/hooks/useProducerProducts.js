import { useProducerProductsQuery } from '../queries';

export function useProducerProducts() {
  const productsQuery = useProducerProductsQuery();

  return {
    products: productsQuery.data ?? [],
    loading: productsQuery.isLoading,
    isFetching: productsQuery.isFetching,
    refetchProducts: productsQuery.refetch,
  };
}

export default useProducerProducts;
