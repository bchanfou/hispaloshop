import { useCreateStripeCheckout } from '../queries';

export function useCartCheckout() {
  const checkoutMutation = useCreateStripeCheckout();

  return {
    checkoutLoading: checkoutMutation.isPending,
    createCheckout: ({ shippingAddress, origin }) =>
      checkoutMutation.mutateAsync({ shippingAddress, origin }),
  };
}

export default useCartCheckout;
