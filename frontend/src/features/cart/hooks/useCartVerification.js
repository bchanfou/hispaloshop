import { useEmailVerificationStatus, useResendVerification, useVerifyEmail } from '../queries';
import { useAuth } from '../../../context/AuthContext';

export function useCartVerification() {
  const { user } = useAuth();
  const verificationQuery = useEmailVerificationStatus({ enabled: Boolean(user) });
  const verifyEmailMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  return {
    emailVerified: verificationQuery.data?.email_verified ?? null,
    isLoading: verificationQuery.isLoading,
    verifying: verifyEmailMutation.isPending,
    resending: resendMutation.isPending,
    verifyEmail: (token) => verifyEmailMutation.mutateAsync(token),
    resendVerification: () => resendMutation.mutateAsync(),
    refetch: verificationQuery.refetch,
  };
}

export default useCartVerification;
