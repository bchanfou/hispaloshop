import {
  useCreateProducerProductMutation,
  useUpdateProducerProductMutation,
  useUpdateProducerStockMutation,
} from '../queries';

export function useProducerProductMutations() {
  const createMutation = useCreateProducerProductMutation();
  const updateMutation = useUpdateProducerProductMutation();
  const stockMutation = useUpdateProducerStockMutation();

  return {
    saveProduct: ({ productId, payload }) =>
      productId
        ? updateMutation.mutateAsync({ productId, payload })
        : createMutation.mutateAsync(payload),
    saveProductLoading: createMutation.isPending || updateMutation.isPending,
    updateStock: ({ productId, stock }) => stockMutation.mutateAsync({ productId, stock }),
    updateStockLoading: stockMutation.isPending,
  };
}

export default useProducerProductMutations;
