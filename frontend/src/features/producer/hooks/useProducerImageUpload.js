import { useUploadProducerImageMutation } from '../queries';

export function useProducerImageUpload() {
  const uploadMutation = useUploadProducerImageMutation();

  return {
    uploadImage: (file) => uploadMutation.mutateAsync(file),
    uploading: uploadMutation.isPending,
  };
}

export default useProducerImageUpload;
