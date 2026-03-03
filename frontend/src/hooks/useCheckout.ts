import { api, ShippingAddress } from '@/lib/api';

export function useCheckout() {
  return {
    createCheckout: (shippingAddress: ShippingAddress) => api.createCheckout(shippingAddress),
  };
}
