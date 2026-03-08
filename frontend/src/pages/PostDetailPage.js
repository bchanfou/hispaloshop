import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Header from '../components/Header';
import PostViewer from '../components/PostViewer';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadPost = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getPost(postId);
        if (isMounted) {
          setPost(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'No se pudo cargar la publicacion');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (postId) {
      loadPost();
    }

    return () => {
      isMounted = false;
    };
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <Header />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <Header />
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-lg font-semibold text-[#1C1C1C]">Publicacion no disponible</p>
          <p className="text-sm text-[#7A7A7A]">{error || 'No se encontro la publicacion solicitada.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-[#1C1C1C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2A2A2A]"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      <PostViewer
        post={post}
        posts={[post]}
        profile={null}
        currentUser={user}
        onClose={() => navigate(-1)}
        onNavigate={() => {}}
      />
    </div>
  );
}
