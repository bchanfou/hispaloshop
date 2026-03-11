import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import AdvancedEditor from '../creator/editor/AdvancedEditor';
import { API } from '../../utils/api';

function StoryCreator() {
  const navigate = useNavigate();

  const handlePublish = async (publishData) => {
    try {
      const imageResponse = await fetch(publishData.imageData);
      const blob = await imageResponse.blob();
      const file = new File([blob], 'story.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', publishData.caption?.trim() || '');

      await axios.post(`${API}/stories`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
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
