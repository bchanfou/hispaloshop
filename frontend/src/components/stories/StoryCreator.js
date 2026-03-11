import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import AdvancedEditor from '../creator/editor/AdvancedEditor';
import { API } from '../../utils/api';

function StoryCreator() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handlePickFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setSelectedFiles(files);
    event.target.value = '';
  };

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

  if (selectedFiles.length > 0) {
    return (
      <AdvancedEditor
        contentType="story"
        files={selectedFiles}
        onClose={() => navigate(-1)}
        onPublish={handlePublish}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-stone-950 text-white">
      <div className="flex items-center justify-between px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
          aria-label="Cerrar creador de historias"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">Historia</p>
          <h1 className="mt-1 text-sm font-semibold text-white">Crear historia</h1>
        </div>
        <div className="h-11 w-11" />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white">
            <ImagePlus className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            Empieza con una imagen
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            El editor te permitirá escribir, mover texto libremente y mantener una historia limpia y legible.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100"
          >
            Seleccionar archivo
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePickFiles}
      />
    </div>
  );
}

export default StoryCreator;
