import { useUploadUserAvatarMutation } from '../queries';

export function useUserAvatar(userId) {
  const uploadMutation = useUploadUserAvatarMutation();

  return {
    uploadingAvatar: uploadMutation.isPending,
    uploadAvatar: (file) => uploadMutation.mutateAsync({ userId, file }),
  };
}

export default useUserAvatar;
