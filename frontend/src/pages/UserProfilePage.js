import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Store, X, Plus, Check, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserProfile, useUserFollow } from '../features/user/hooks';
import { resolveUserImage, useUserHighlightsQuery, userKeys } from '../features/user/queries';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import EditProfileSheet from '../components/profile/EditProfileSheet';
import PostViewer from '../components/PostViewer';
import StoryViewer from '../components/feed/StoryViewer';
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
  const [allPosts, setAllPosts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCreateHighlight, setShowCreateHighlight] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showOwnStory, setShowOwnStory] = useState(false);
  const [ownStories, setOwnStories] = useState(null);
  const [viewingHighlight, setViewingHighlight] = useState(null);
  const [highlightStories, setHighlightStories] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const tabsRef = useRef(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 180);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

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

  const handleCreateHighlight = useCallback(async (title, storyIds, coverUrl) => {
    if (!title?.trim()) return;
    try {
      await apiClient.post('/users/me/highlights', {
        title: title.trim(),
        story_ids: storyIds || [],
        cover_url: coverUrl || null,
      });
      queryClient.invalidateQueries({ queryKey: userKeys.highlights(userId) });
      setShowCreateHighlight(false);
      toast.success('Destacado creado');
    } catch {
      toast.error('Error al crear destacado');
    }
  }, [userId, queryClient]);

  /* ── View own stories ─────────────────────────────────────────── */
  const handleViewOwnStory = useCallback(async () => {
    try {
      const data = await apiClient.get(`/stories/${user?.user_id || userId}`);
      const items = Array.isArray(data) ? data : data?.items || data?.stories || [];
      if (items.length === 0) {
        toast('No tienes stories activos');
        return;
      }
      setOwnStories([{
        user_id: user?.user_id,
        user: { id: user?.user_id, name: user?.name, avatar_url: user?.profile_image, profile_image: user?.profile_image },
        items: items.map(s => ({
          id: s.id || s.story_id,
          story_id: s.id || s.story_id,
          image_url: s.image_url || s.media_url,
          video_url: s.video_url,
          caption: s.caption || s.text,
          created_at: s.created_at,
          products: s.products,
        })),
      }]);
      setShowOwnStory(true);
    } catch {
      toast.error('Error al cargar tus stories');
    }
  }, [user, userId]);

  /* ── View a highlight ─────────────────────────────────────────── */
  const handleViewHighlight = useCallback(async (highlight) => {
    const hlId = highlight.highlight_id || highlight.id;
    try {
      const data = await apiClient.get(`/users/${userId}/highlights/${hlId}`);
      const items = data?.stories || data?.items || [];
      if (items.length === 0) {
        toast('Este destacado no tiene stories');
        return;
      }
      setHighlightStories([{
        user_id: user?.user_id,
        user: { id: user?.user_id, name: user?.name, avatar_url: user?.profile_image, profile_image: user?.profile_image },
        items: items.map(s => ({
          id: s.id || s.story_id,
          story_id: s.id || s.story_id,
          image_url: s.image_url || s.media_url,
          video_url: s.video_url,
          caption: s.caption || s.text,
          created_at: s.created_at,
          products: s.products,
        })),
      }]);
      setViewingHighlight(highlight);
    } catch {
      toast.error('Error al cargar destacado');
    }
  }, [userId, user]);

  /* ── Handle post click (collect all posts for scrolling) ──── */
  const handlePostClick = useCallback((post, allPostsFromTab) => {
    setSelectedPost(post);
    if (allPostsFromTab) setAllPosts(allPostsFromTab);
  }, []);

  /* ── Handle delete post ───────────────────────────────────── */
  const handleDeletePost = useCallback((postId) => {
    setAllPosts(prev => prev.filter(p => (p.id || p.post_id) !== postId));
    setSelectedPost(null);
    queryClient.invalidateQueries({ queryKey: ['users', userId, 'posts'] });
    queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
  }, [userId, queryClient]);

  const handleFollowToggle = useCallback(async () => {
    if (!user || followLoading) return;
    try {
      await toggleFollow();
    } catch {
      toast.error('Error al actualizar');
    }
  }, [user, followLoading, toggleFollow]);

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
      <div aria-busy="true" aria-label="Cargando perfil" className="min-h-screen bg-[#F7F6F2]">
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
      <div className="min-h-screen bg-[#F7F6F2] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-semibold text-stone-950">Usuario no encontrado</p>
        <p className="text-sm text-stone-500">Este perfil no existe o ha sido eliminado.</p>
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
          className="mt-2 px-6 py-2.5 rounded-full bg-[#2E7D52] text-white text-sm font-semibold transition-all duration-150 hover:bg-[#1F5C3B] active:scale-95"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] pb-20">
      <SEO
        title={`${user.name || user.username} — Hispaloshop`}
        description={user.bio?.slice(0, 160) || `Perfil de ${user.name} en Hispaloshop`}
        image={user.profile_image}
      />

      {/* ── Sticky mini-header (only for other profiles, appears after scrolling 180px) ── */}
      {!isOwn && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: scrolled ? 0 : -48, opacity: scrolled ? 1 : 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-40 flex h-12 items-center justify-between bg-white/95 backdrop-blur-md border-b border-stone-100 px-3"
          aria-hidden={!scrolled}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="flex items-center justify-center p-2"
          >
            <ChevronLeft size={22} className="text-stone-950" />
          </button>
          <span className="text-[15px] font-semibold text-stone-950">
            @{user.username}
          </span>
          <div className="w-10" />
        </motion.div>
      )}

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
        onViewOwnStory={handleViewOwnStory}
        onViewHighlight={handleViewHighlight}
        onCreateStory={() => navigate('/create/story')}
      />

      {/* ── Store link for producers/importers ── */}
      {(user.role === 'producer' || user.role === 'importer') && (user.store_slug || user.store_id) && (
        <div className="px-4 pb-2">
          <a
            href={`/store/${user.store_slug || user.store_id}`}
            onClick={(e) => { e.preventDefault(); navigate(`/store/${user.store_slug || user.store_id}`); }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-950 hover:underline"
          >
            <Store size={14} />
            Ver tienda →
          </a>
        </div>
      )}

      <ProfileTabs
        ref={tabsRef}
        userId={user.user_id}
        role={user.role}
        isOwn={isOwn}
        isPrivate={Boolean(user.is_private)}
        isFollowing={Boolean(user.is_following)}
        onPostClick={(post, allPostsArr) => handlePostClick(post, allPostsArr)}
        onProductClick={(product) => setSelectedProduct(product)}
        onFollow={handleFollowToggle}
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
            posts={allPosts.length > 0 ? allPosts : [selectedPost]}
            profile={{ name: user.name, profile_image: user.profile_image }}
            onClose={() => setSelectedPost(null)}
            isOwn={isOwn}
            onDelete={handleDeletePost}
          />
        </OverlayErrorBoundary>
      )}

      {/* Own story viewer */}
      {showOwnStory && ownStories && (
        <StoryViewer
          stories={ownStories}
          initialIndex={0}
          onClose={() => { setShowOwnStory(false); setOwnStories(null); }}
        />
      )}

      {/* Highlight story viewer */}
      {viewingHighlight && highlightStories && (
        <StoryViewer
          stories={highlightStories}
          initialIndex={0}
          onClose={() => { setViewingHighlight(null); setHighlightStories(null); }}
        />
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

/* ── Create Highlight Sheet — shows archived stories to select ─── */

function CreateHighlightSheet({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [archivedStories, setArchivedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [coverUrl, setCoverUrl] = useState(null);
  const [step, setStep] = useState('select'); // 'select' | 'name'

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get('/stories/archive');
        const items = Array.isArray(data) ? data : data?.stories || data?.items || data?.data || [];
        if (!cancelled) setArchivedStories(items);
      } catch {
        if (!cancelled) setArchivedStories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleStory = (storyId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return next;
    });
  };

  const handleNext = () => {
    if (selectedIds.size === 0) {
      toast('Selecciona al menos un story');
      return;
    }
    // Set first selected as default cover
    if (!coverUrl) {
      const first = archivedStories.find(s => selectedIds.has(s.id || s.story_id));
      if (first) setCoverUrl(first.image_url || first.thumbnail_url || first.media_url);
    }
    setStep('name');
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreate(title, Array.from(selectedIds), coverUrl);
  };

  return (
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Nuevo destacado">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute bottom-0 left-0 right-0 z-[9999] rounded-t-xl bg-white px-5 pb-8 pt-4" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-stone-200 shrink-0" />

        {step === 'select' && (
          <>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <button onClick={onClose} className="text-sm text-stone-500">Cancelar</button>
              <span className="text-base font-semibold text-stone-950">Seleccionar stories</span>
              <button onClick={handleNext} className="text-sm font-semibold text-stone-950">Siguiente</button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
              </div>
            ) : archivedStories.length === 0 ? (
              <div className="py-12 text-center">
                <ImageIcon size={40} className="mx-auto text-stone-300 mb-3" />
                <p className="text-sm text-stone-500">No tienes stories archivados</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 -mx-1">
                <div className="grid grid-cols-3 gap-0.5">
                  {archivedStories.map((story) => {
                    const sid = story.id || story.story_id;
                    const thumb = story.image_url || story.thumbnail_url || story.media_url;
                    const isSelected = selectedIds.has(sid);
                    return (
                      <div
                        key={sid}
                        onClick={() => toggleStory(sid)}
                        className="relative aspect-square cursor-pointer overflow-hidden"
                        role="checkbox"
                        aria-checked={isSelected}
                      >
                        <img
                          src={thumb}
                          alt={story.caption || 'Story'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className={`absolute inset-0 transition-colors ${isSelected ? 'bg-white/30' : ''}`} />
                        <div className={`absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ${
                          isSelected ? 'bg-stone-950 border-stone-950' : 'bg-white/60 border-white'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        {story.created_at && (
                          <span className="absolute bottom-1 left-1 text-[10px] text-white drop-shadow-md">
                            {new Date(story.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {step === 'name' && (
          <>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <button onClick={() => setStep('select')} className="text-sm text-stone-500">Atrás</button>
              <span className="text-base font-semibold text-stone-950">Nuevo destacado</span>
              <div className="w-12" />
            </div>

            {/* Cover preview */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-100 ring-[1.5px] ring-stone-200 ring-offset-2 ring-offset-white">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Portada" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={28} className="text-stone-400" />
                    </div>
                  )}
                </div>
                {/* Cover selector */}
                <button
                  onClick={() => {
                    // Cycle through selected stories as cover
                    const selected = archivedStories.filter(s => selectedIds.has(s.id || s.story_id));
                    const currentIdx = selected.findIndex(s => (s.image_url || s.thumbnail_url || s.media_url) === coverUrl);
                    const nextIdx = (currentIdx + 1) % selected.length;
                    setCoverUrl(selected[nextIdx]?.image_url || selected[nextIdx]?.thumbnail_url || selected[nextIdx]?.media_url);
                  }}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-stone-950 shadow-sm"
                  aria-label="Cambiar portada"
                >
                  <ImageIcon size={12} className="text-white" />
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="Nombre del destacado"
              maxLength={30}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-4 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
              autoFocus
            />

            <p className="mb-4 text-xs text-stone-500 text-center">{selectedIds.size} stories seleccionados</p>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-stone-100 py-3 text-sm font-semibold text-stone-950"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim()}
                className="flex-1 rounded-xl bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Crear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
