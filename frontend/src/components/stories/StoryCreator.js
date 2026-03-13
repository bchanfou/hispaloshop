import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdvancedEditor from '../creator/editor/AdvancedEditor';
import { API } from '../../utils/api';
import { publishSocialContent } from '../creator/publishContent';

function StoryCreator() {
  const navigate = useNavigate();

  const handlePublish = async (publishData) => {
    try {
      await publishSocialContent({
        apiBase: API,
        publishData: {
          ...publishData,
          contentType: 'story',
        },
        onProgress: publishData.onProgress,
        signal: publishData.signal,
      });
      toast.success('Publicado');
      navigate(-1);
    } catch (error) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
        toast('Cancelado');
        return;
      }
      toast.error(error.message || 'Error');
    }
  };

  return (
    <AdvancedEditor
      contentType="story"
      files={[]}
      onClose={() => navigate(-1)}
      onPublish={handlePublish}
    />
  );
}

export default StoryCreator;
