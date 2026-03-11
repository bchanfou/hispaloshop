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
      });
      toast.success('Historia publicada');
      navigate(-1);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo publicar la historia');
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
