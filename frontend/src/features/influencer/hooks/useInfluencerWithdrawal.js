import { useAuth } from '../../../context/AuthContext';
import {
  useInfluencerWithdrawalsQuery,
  useRequestWithdrawalMutation,
} from '../queries';

export function useInfluencerWithdrawal() {
  const { user } = useAuth();
  const withdrawalsQuery = useInfluencerWithdrawalsQuery(Boolean(user));
  const requestWithdrawalMutation = useRequestWithdrawalMutation();

  return {
    withdrawals: withdrawalsQuery.data ?? [],
    withdrawalsLoading: withdrawalsQuery.isLoading,
    withdrawing: requestWithdrawalMutation.isPending,
    requestWithdrawal: () => requestWithdrawalMutation.mutateAsync(),
    refetchWithdrawals: withdrawalsQuery.refetch,
  };
}

export default useInfluencerWithdrawal;
