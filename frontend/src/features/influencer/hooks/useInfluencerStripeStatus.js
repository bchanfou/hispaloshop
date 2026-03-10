import { useAuth } from '../../../context/AuthContext';
import {
  useInfluencerStripeConnectMutation,
  useInfluencerStripeStatusQuery,
} from '../queries';

export function useInfluencerStripeStatus() {
  const { user } = useAuth();
  const stripeStatusQuery = useInfluencerStripeStatusQuery(Boolean(user));
  const connectMutation = useInfluencerStripeConnectMutation();

  return {
    stripeStatus: stripeStatusQuery.data ?? null,
    connectingStripe: connectMutation.isPending,
    connectStripe: () => connectMutation.mutateAsync(),
    refetchStripeStatus: stripeStatusQuery.refetch,
  };
}

export default useInfluencerStripeStatus;
