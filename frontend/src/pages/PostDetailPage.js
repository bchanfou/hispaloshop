import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import PostCard from '../components/feed/PostCard';
import apiClient from '../services/api/client';

export default function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/posts/${postId}`)
      .then((data) => setPost(data?.post || data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-cream)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid var(--color-border)',
          borderTopColor: 'var(--color-black)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: 'var(--color-cream)', fontFamily: 'var(--font-sans)',
      }}>
        <p style={{ fontSize: 15, color: 'var(--color-stone)' }}>Post no encontrado</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 24px', background: 'var(--color-black)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-full)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Volver al feed
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        height: 52, display: 'flex', alignItems: 'center', padding: '0 8px',
        fontFamily: 'var(--font-sans)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex' }}
        >
          <ChevronLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-black)' }}>Publicación</span>
      </header>

      <PostCard
        post={post}
        onLike={() => apiClient.post(`/posts/${postId}/like`).catch(() => {})}
        onComment={() => {}}
        onSave={() => {}}
      />
    </div>
  );
}
