import { useRelatedProducts as useRelatedProductsQuery } from '../queries';

export function useRelatedProducts(productId) {
  const query = useRelatedProductsQuery(productId);

  return {
    ...query,
    relatedProducts: query.data?.items || query.data?.products || query.data || [],
  };
}

export default useRelatedProducts;
