import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useUserProfile, useUserFollow, useUserAvatar } from '../features/user/hooks';
import { resolveUserImage } from '../features/user/queries';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import EditProfileSheet from '../components/profile/EditProfileSheet';
import PostViewer from '../components/PostViewer';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import OverlayErrorBoundary from '../components/OverlayErrorBoundary';
import apiClient from '../services/api/client';

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const isOwn = currentUser && (
    currentUser.user_id === userId ||
    currentUser.id === userId ||
    currentUser.username === userId
  );

  const { profile, isLoading, refetch } = useUserProfile(userId);

  const user = profile ? {
    user_id: profile.user_id || profile.id || userId,
    username: profile.username,
    name: profile.name || profile.full_name,
    bio: profile.bio,
    profile_image: resolveUserImage(profile),
    website: profile.website,
    location: profile.location || profile.city,
    role: profile.role,
    is_verified: profile.is_verified,
    followers_count: profile.followers_count || 0,
    following_count: profile.following_count || 0,
    posts_count: profile.posts_count || 0,
    is_following: profile.is_following,
    has_active_story: profile.has_active_story,
    store_slug: profile.store_slug || profile.username,
  } : null;

  const handleFollowToggle = useCallback(async () => {
    if (!user) return;
    try {
      if (user.is_following) {
        await apiClient.delete(`/users/${user.user_id}/follow`);
      } else {
        await apiClient.post(`/users/${user.user_id}/follow`);
      }
      refetch();
    } catch {
      toast.error('Error al actualizar');
    }
  }, [user, refetch]);

  const handleAvatarChange = useCallback(async (file) => {
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await apiClient.post('/users/me/avatar', fd);
      refetch();
      toast.success('Foto actualizada');
    } catch {
      toast.error('Error al subir la foto');
    }
  }, [refetch]);

  const handleMessage = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiClient.post('/conversations/direct', { recipient_id: user.user_id });
      const convId = data?.conversation_id || data?.id;
      if (convId) navigate(`/messages/${convId}`);
    } catch {
      toast.error('Error al crear conversación');
    }
  }, [user, navigate]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Perfil de ${user?.name || 'usuario'}`, url });
      } catch {
        /* user cancelled */
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Enlace copiado');
  }, [user]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)', fontFamily: 'var(--font-sans)' }}>
        {/* Header skeleton */}
        <div style={{ height: 52, background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)' }} />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--color-surface)' }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ width: 30, height: 18, background: 'var(--color-surface)', borderRadius: 4, margin: '0 auto 4px' }} />
                  <div style={{ width: 50, height: 10, background: 'var(--color-surface)', borderRadius: 4 }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12, height: 14, width: '40%', background: 'var(--color-surface)', borderRadius: 4 }} />
          <div style={{ marginTop: 8, height: 12, width: '70%', background: 'var(--color-surface)', borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  if (!user && !isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-cream)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
      }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-black)' }}>Usuario no encontrado</p>
        <p style={{ fontSize: 14, color: 'var(--color-stone)' }}>Este perfil no existe o ha sido eliminado.</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: 8,
            padding: '10px 24px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-black)',
            color: 'var(--color-white)',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', fontFamily: 'var(--font-sans)', paddingBottom: 80 }}>
      <ProfileHeader
        user={user}
        isOwn={isOwn}
        onEditProfile={() => setShowEditProfile(true)}
        onShare={handleShare}
        onAvatarChange={handleAvatarChange}
        onFollowToggle={handleFollowToggle}
        onMessage={handleMessage}
      />

      <ProfileTabs
        userId={user.user_id}
        role={user.role}
        isOwn={isOwn}
        onPostClick={(post) => setSelectedPost(post)}
        onProductClick={(product) => setSelectedProduct(product)}
      />

      {/* Edit Profile Sheet */}
      {showEditProfile && (
        <EditProfileSheet
          isOpen={showEditProfile}
          onClose={() => { setShowEditProfile(false); refetch(); }}
          profile={profile}
        />
      )}

      {/* Post Viewer Overlay */}
      {selectedPost && (
        <OverlayErrorBoundary overlayKey={selectedPost?.post_id || selectedPost?.id} onClose={() => setSelectedPost(null)}>
          <PostViewer
            post={selectedPost}
            posts={[selectedPost]}
            profile={{ name: user.name, profile_image: user.profile_image }}
            onClose={() => setSelectedPost(null)}
          />
        </OverlayErrorBoundary>
      )}

      {/* Product Overlay */}
      {selectedProduct && (
        <ProductDetailOverlay
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
