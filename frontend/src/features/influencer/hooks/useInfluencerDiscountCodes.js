import { useCreateInfluencerCodeMutation } from '../queries';

export function useInfluencerDiscountCodes() {
  const createCodeMutation = useCreateInfluencerCodeMutation();

  return {
    creatingCode: createCodeMutation.isPending,
    createDiscountCode: (code) => createCodeMutation.mutateAsync(code),
  };
}

export default useInfluencerDiscountCodes;
