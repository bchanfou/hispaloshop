import {
  useResendInfluencerVerificationMutation,
  useVerifyInfluencerEmailMutation,
} from '../queries';

export function useInfluencerEmailVerification() {
  const verifyMutation = useVerifyInfluencerEmailMutation();
  const resendMutation = useResendInfluencerVerificationMutation();

  return {
    verifying: verifyMutation.isPending,
    resending: resendMutation.isPending,
    verifyEmailCode: (code) => verifyMutation.mutateAsync(code),
    resendVerificationCode: () => resendMutation.mutateAsync(),
  };
}

export default useInfluencerEmailVerification;
