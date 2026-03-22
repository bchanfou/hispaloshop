import { useCreateInfluencerCodeMutation } from '../queries';

export function useInfluencerDiscountCodes() {
  const createCodeMutation = useCreateInfluencerCodeMutation();

  return {
    creatingCode: createCodeMutation.isPending,
    createDiscountCode: (code, discount_percent) => createCodeMutation.mutateAsync({ code, discount_percent }),
  };
}

export default useInfluencerDiscountCodes;
