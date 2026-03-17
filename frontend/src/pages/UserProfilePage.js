import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useUserProfile, useUserFollow } from '../features/user/hooks';
import { resolveUserImage } from '../features/user/queries';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import EditProfileSheet from '../components/profile/EditProfileSheet';
import PostViewer from '../components/PostViewer';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import OverlayErrorBoundary from '../components/OverlayErrorBoundary';
import apiClient from '../services/api/client';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId || params.username;
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const isOwn = currentUser && (
    String(currentUser.user_id) === String(userId) ||
    String(currentUser.id) === String(userId) ||
    currentUser.username === userId
  );

  const { profile, isLoading, refetch } = useUserProfile(userId);

  const user = profile ? {
    user_id: profile.user_id || profile.id || userId,
    username: profile.username,
    name: profile.name || profile.full_name,
    bio: profile.bio,
    profile_image: resolveUserImage(profile.profile_image),
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
    sales_count: profile.sales_count,
    producers_count: profile.producers_count,
    discount_code: profile.discount_code,
  } : null;

  const { toggleFollow, followLoading } = useUserFollow(user?.user_id, profile);

  const handleFollowToggle = useCallback(async () => {
    if (!user || followLoading) return;
    try {
      await toggleFollow();
      refetch();
    } catch {
      toast.error('Error al actualizar');
    }
  }, [user, followLoading, toggleFollow, refetch]);

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
    try { await navigator.clipboard.writeText(url); toast.success('Enlace copiado'); } catch { /* fallback silently */ }
  }, [user]);

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Cargando perfil" className="min-h-screen bg-stone-50">
        <div className="h-[52px] bg-white border-b border-stone-200" />
        <div className="p-4">
          <div className="flex items-center gap-5">
            <div className="w-[84px] h-[84px] rounded-full bg-stone-100 animate-pulse" />
            <div className="flex flex-1 justify-around">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center">
                  <div className="w-[30px] h-[18px] bg-stone-100 rounded mx-auto mb-1 animate-pulse" />
                  <div className="w-[50px] h-[10px] bg-stone-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 h-3.5 w-2/5 bg-stone-100 rounded animate-pulse" />
          <div className="mt-2 h-3 w-[70%] bg-stone-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  /* ── 404 state ── */
  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-semibold text-stone-950">Usuario no encontrado</p>
        <p className="text-sm text-stone-500">Este perfil no existe o ha sido eliminado.</p>
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
          className="mt-2 px-6 py-2.5 rounded-full bg-stone-950 text-white text-sm font-semibold transition-all duration-150 hover:bg-stone-800 active:scale-95"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
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

      {showEditProfile && (
        <EditProfileSheet
          isOpen={showEditProfile}
          onClose={() => { setShowEditProfile(false); refetch(); }}
          profile={profile}
          userId={user.user_id}
        />
      )}

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

      {selectedProduct && (
        <ProductDetailOverlay
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
