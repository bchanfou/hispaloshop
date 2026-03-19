import React, { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useUserProfile, useUserFollow } from '../features/user/hooks';
import { resolveUserImage, useUserHighlightsQuery, userKeys } from '../features/user/queries';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import EditProfileSheet from '../components/profile/EditProfileSheet';
import PostViewer from '../components/PostViewer';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import OverlayErrorBoundary from '../components/OverlayErrorBoundary';
import apiClient from '../services/api/client';
import SEO from '../components/SEO';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId || params.username;
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCreateHighlight, setShowCreateHighlight] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const tabsRef = useRef(null);

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
    is_private: profile.is_private,
    follow_request_pending: profile.follow_request_pending,
    has_active_story: profile.has_active_story,
    store_slug: profile.store_slug || profile.username,
    seller_stats: profile.seller_stats,
    sales_count: profile.sales_count,
    producers_count: profile.producers_count,
    discount_code: profile.discount_code,
    instagram: profile.instagram,
    tiktok: profile.tiktok,
    youtube: profile.youtube,
    mutual_followers: profile.mutual_followers,
  } : null;

  const { toggleFollow, followLoading } = useUserFollow(user?.user_id, profile);
  const { data: highlights = [] } = useUserHighlightsQuery(userId);
  const queryClient = useQueryClient();

  const handleCreateHighlight = useCallback(async (title) => {
    if (!title?.trim()) return;
    try {
      await apiClient.post('/users/me/highlights', { title: title.trim(), story_ids: [] });
      queryClient.invalidateQueries({ queryKey: userKeys.highlights(userId) });
      setShowCreateHighlight(false);
      toast.success('Destacado creado');
    } catch {
      toast.error('Error al crear destacado');
    }
  }, [userId, queryClient]);

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
      fd.append('file', file);
      await apiClient.post('/upload/avatar', fd);
      refetch();
      toast.success('Foto actualizada');
    } catch {
      toast.error('Error al subir la foto');
    }
  }, [refetch]);

  const handleMessage = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiClient.post('/chat/conversations', { other_user_id: user.user_id });
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
      <div aria-busy="true" aria-label="Cargando perfil" className="min-h-screen bg-white">
        <div className="h-[52px] bg-white border-b border-stone-200" />
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-5">
            <div className="w-[86px] h-[86px] rounded-full bg-stone-100 animate-pulse shrink-0" />
            <div className="flex flex-1 justify-around">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center">
                  <div className="w-[28px] h-[17px] bg-stone-100 rounded mx-auto mb-1.5 animate-pulse" />
                  <div className="w-[52px] h-[13px] bg-stone-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 h-3.5 w-1/3 bg-stone-100 rounded animate-pulse" />
          <div className="mt-2 h-3 w-[60%] bg-stone-100 rounded animate-pulse" />
          <div className="mt-3 flex gap-1.5">
            <div className="h-[34px] flex-1 bg-stone-100 rounded-xl animate-pulse" />
            <div className="h-[34px] flex-1 bg-stone-100 rounded-xl animate-pulse" />
            <div className="h-[34px] w-[34px] bg-stone-100 rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="mt-2 flex border-t border-stone-200">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 flex justify-center py-3">
              <div className="w-6 h-6 bg-stone-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-px bg-stone-100">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-stone-50 animate-pulse" />
          ))}
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
    <div className="min-h-screen bg-white pb-20">
      <SEO
        title={`${user.name || user.username} — Hispaloshop`}
        description={user.bio?.slice(0, 160) || `Perfil de ${user.name} en Hispaloshop`}
        image={user.profile_image}
      />
      <ProfileHeader
        user={user}
        isOwn={isOwn}
        onEditProfile={() => setShowEditProfile(true)}
        onShare={handleShare}
        onAvatarChange={handleAvatarChange}
        onFollowToggle={handleFollowToggle}
        onMessage={handleMessage}
        highlights={highlights}
        onCreateHighlight={() => setShowCreateHighlight(true)}
        onSwitchTab={(tabId) => tabsRef.current?.switchTab(tabId)}
      />

      <ProfileTabs
        ref={tabsRef}
        userId={user.user_id}
        role={user.role}
        isOwn={isOwn}
        isPrivate={Boolean(user.is_private)}
        isFollowing={Boolean(user.is_following)}
        onPostClick={(post) => setSelectedPost(post)}
        onProductClick={(product) => setSelectedProduct(product)}
      />

      {showCreateHighlight && (
        <CreateHighlightSheet
          onClose={() => setShowCreateHighlight(false)}
          onCreate={handleCreateHighlight}
        />
      )}

      {isOwn && (
        <EditProfileSheet
          isOpen={showEditProfile}
          profile={profile}
          userId={user.user_id}
          onClose={() => { setShowEditProfile(false); refetch(); }}
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

/* ── Inline create-highlight sheet ───────────────────────────────── */

function CreateHighlightSheet({ onClose, onCreate }) {
  const [title, setTitle] = useState('');

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-[9999] rounded-t-xl bg-white px-5 pb-8 pt-4">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-stone-200" />
        <div className="mb-4 text-base font-semibold">Nuevo destacado</div>
        <input
          type="text"
          placeholder="Nombre del destacado"
          maxLength={30}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-stone-100 py-3 text-sm font-semibold text-stone-950"
          >
            Cancelar
          </button>
          <button
            onClick={() => onCreate(title)}
            disabled={!title.trim()}
            className="flex-1 rounded-xl bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
