import { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  useCheckWithdrawalNotificationMutation,
  useInfluencerDashboardQuery,
} from '../queries';

export function useInfluencerProfile() {
  const { user } = useAuth();
  const dashboardQuery = useInfluencerDashboardQuery(Boolean(user));
  const notificationMutation = useCheckWithdrawalNotificationMutation();

  useEffect(() => {
    if (user) {
      notificationMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    dashboard: dashboardQuery.data ?? null,
    loading: dashboardQuery.isLoading,
    isFetching: dashboardQuery.isFetching,
    refetchDashboard: dashboardQuery.refetch,
  };
}

export default useInfluencerProfile;
