// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Users, Settings, RefreshCw, Pin, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'ahora';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

const renderTextWithHashtags = (text) => {
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('#') ? (
      <Link key={i} to={`/hashtag/${encodeURIComponent(part.slice(1))}`} className="text-stone-950 font-semibold hover:underline">{part}</Link>
    ) : part
  );
};

const TABS = [
  { id: 'feed', label: 'Posts' },
  { id: 'members', label: 'Miembros' },
  { id: 'about', label: 'Info' },
];

export default function CommunityPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('feed');
  const { user } = useAuth();
  const [showNewPostsPill, setShowNewPostsPill] = useState(false);
  const queryClient = useQueryClient();
  const hiddenAtRef = useRef(null);

  const { data: community, isLoading, isError, refetch } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => apiClient.get(`/communities/${slug}`),
  });

  /* Track last visit and show "new posts" pill on return from background */
  const communityId = community?.id || community?._id;
  useEffect(() => {
    if (!communityId) return;
    const storageKey = `community_last_visit_${communityId}`;
    // Record visit time when page becomes visible
    localStorage.setItem(storageKey, Date.now());

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        const hiddenDuration = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
        if (hiddenDuration > 30000) {
          setShowNewPostsPill(true);
        }
        hiddenAtRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [communityId]);

  const handleNewPostsPill = useCallback(() => {
    setShowNewPostsPill(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries({ queryKey: ['community-feed', communityId] });
    if (communityId) {
      localStorage.setItem(`community_last_visit_${communityId}`, Date.now());
    }
  }, [communityId, queryClient]);

  if (isError) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}
            aria-label="Volver"
            className="bg-transparent border-none cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft size={22} className="text-stone-950" />
          </button>
          <span className="text-[17px] font-bold text-stone-950">Comunidad</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-[60px]">
          <Users size={56} className="text-stone-500" strokeWidth={1} />
          <p className="text-[15px] text-stone-500">Error al cargar la comunidad</p>
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-stone-950 rounded-full border border-stone-200 text-sm font-semibold cursor-pointer"
            aria-label="Reintentar carga">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}
            aria-label="Volver"
            className="bg-transparent border-none cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft size={22} className="text-stone-950" />
          </button>
          <span className="text-[17px] font-bold text-stone-950">Comunidad</span>
        </div>
        <div className="px-4" aria-busy="true" aria-label="Cargando comunidad">
          {/* Cover skeleton */}
          <div className="mt-4 h-40 w-full animate-pulse rounded-2xl bg-stone-100" />
          {/* Title + meta skeleton */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-full bg-stone-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-stone-100" />
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-stone-100" />
            </div>
          </div>
          {/* Tabs skeleton */}
          <div className="mt-5 flex gap-6 border-b border-stone-100 pb-3">
            {[1,2,3].map(i => <div key={i} className="h-3 w-14 animate-pulse rounded-full bg-stone-100" />)}
          </div>
          {/* Posts skeleton */}
          {[1,2,3].map(i => (
            <div key={i} className="mt-4 flex gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-stone-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 animate-pulse rounded-full bg-stone-100" />
                <div className="h-3 w-full animate-pulse rounded-full bg-stone-100" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}
            aria-label="Volver"
            className="bg-transparent border-none cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft size={22} className="text-stone-950" />
          </button>
          <span className="text-[17px] font-bold text-stone-950">Comunidad</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-[60px]">
          <Users size={56} className="text-stone-500" strokeWidth={1} />
          <p className="text-[15px] text-stone-500">Comunidad no encontrada</p>
          <Link to="/communities" className="px-6 py-2.5 bg-stone-950 text-white rounded-full text-sm font-semibold no-underline">
            Volver a comunidades
          </Link>
        </div>
      </div>
    );
  }

  const isMember = community.is_member;
  const isAdmin = community.is_admin || user?.id === community.creator_id;

  return (
    <div className="min-h-screen bg-stone-50 pb-[100px] max-w-[975px] mx-auto">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)}
          className="bg-transparent border-none cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Volver">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {community.name}
        </span>
        {isAdmin && (
          <Link to={`/communities/${slug}/settings`}
            aria-label={t('community.configuracion', 'Configuración')}
            className="flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center text-stone-500">
            <Settings size={20} />
          </Link>
        )}
      </div>

      {/* ── Cover Image (16:9) ── */}
      <div className="relative">
        <div className="aspect-[16/9] overflow-hidden" style={{
          background: community.cover_image
            ? '#f5f5f4'
            : ['#d6d3d1','#a8a29e','#78716c','#57534e','#44403c'][(community.name || 'C').charCodeAt(0) % 5],
        }}>
          {community.cover_image ? (
            <img loading="lazy" src={community.cover_image} alt="" className="block h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[56px]">
              {community.emoji || '🌿'}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h1 className="text-xl font-bold text-white drop-shadow-md">
              {community.name}
            </h1>
            <p className="mt-0.5 text-[13px] text-white/85">
              {community.member_count?.toLocaleString()} miembros
            </p>
          </div>
        </div>
      </div>

      {/* ── Info + Join ── */}
      <div className="mx-auto max-w-[600px] px-4 pt-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          {community.description && (
            <p className="flex-1 text-sm text-stone-600 leading-snug m-0">{community.description}</p>
          )}
          <JoinButton communityId={community.id || community._id} isMember={isMember} onToggle={refetch} />
        </div>

        {community.tags?.length > 0 && (
          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-1">
            {community.tags.map(tag => (
              <span key={tag} className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-500">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Community stats */}
        <div className="text-xs text-stone-500 flex items-center gap-1 mt-1.5">
          <span>{(community.member_count || 0).toLocaleString()} miembros</span>
          <span>·</span>
          <span>{(community.post_count || 0).toLocaleString()} publicaciones</span>
          {community.created_at && (
            <>
              <span>·</span>
              <span>Creada {formatRelativeTime(community.created_at)}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-[50px] z-[39] mx-auto flex max-w-[600px] border-b border-stone-200 bg-white">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 cursor-pointer border-b-2 bg-transparent py-3 text-sm transition-colors ${
              tab === t.id
                ? 'border-stone-950 font-semibold text-stone-950'
                : 'border-transparent text-stone-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Ofertas para miembros ── */}
      {tab === 'about' && (
        <div className="max-w-[600px] mx-auto px-4 pt-4">
          <div className="bg-stone-50 rounded-2xl p-4">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Tag size={14} className="text-stone-400" />
              <span className="text-sm font-semibold text-stone-950">Ofertas para miembros</span>
            </div>
            <p className="text-sm text-stone-500 text-center m-0">
              Próximamente — Los productores podrán ofrecer descuentos exclusivos para miembros de esta comunidad
            </p>
          </div>
        </div>
      )}

      {/* ── Tab content ── */}
      <div className="max-w-[600px] mx-auto">
        {tab === 'feed' && (
          <CommunityFeed communityId={community.id || community._id} isMember={isMember} isAdmin={isAdmin} />
        )}
        {tab === 'members' && (
          <CommunityMembers communityId={community.id || community._id} />
        )}
        {tab === 'about' && (
          <CommunityAbout community={community} />
        )}
      </div>

      {/* ── New posts pill ── */}
      <AnimatePresence>
        {showNewPostsPill && tab === 'feed' && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-[110px] left-1/2 -translate-x-1/2 z-50"
          >
            <button
              onClick={handleNewPostsPill}
              className="flex items-center gap-2 px-5 py-2.5 bg-stone-950 text-white rounded-full border-none cursor-pointer text-[13px] font-semibold shadow-lg whitespace-nowrap"
              aria-label="Ver nuevos posts"
            >
              ↑ Ver nuevos posts
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Join Button ── */
const JoinButton = ({ communityId, isMember, onToggle }) => {
  const [joined, setJoined] = useState(isMember);
  const [loading, setLoading] = useState(false);

  // Sync with prop when server data refreshes
  useEffect(() => { setJoined(isMember); }, [isMember]);

  const toggle = async () => {
    if (loading) return;
    const wasJoined = joined;
    // Optimistic
    setJoined(!wasJoined);
    setLoading(true);
    try {
      if (wasJoined) {
        await apiClient.delete(`/communities/${communityId}/join`);
      } else {
        await apiClient.post(`/communities/${communityId}/join`);
      }
      onToggle?.();
    } catch {
      setJoined(wasJoined);
      toast.error(t('community.errorAlActualizarMembresia', 'Error al actualizar membresía'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={toggle}
      disabled={loading}
      aria-label={joined ? 'Salir de la comunidad' : 'Unirse a la comunidad'}
      className={`px-5 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-all shrink-0 ${
        joined
          ? 'border border-stone-200 bg-white text-stone-500'
          : 'border-none bg-stone-950 text-white'
      }`}>
      {loading ? '...' : joined ? 'Unida' : 'Unirse'}
    </motion.button>
  );
};

/* ── Community Feed ── */
const CommunityFeed = ({ communityId, isMember, isAdmin }) => {
  const [showPostForm, setShowPostForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, refetch: refetchQuery } = useInfiniteQuery({
    queryKey: ['community-feed', communityId],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get(`/communities/${communityId}/posts?page=${pageParam}&limit=10`),
    initialPageParam: 1,
    getNextPageParam: last => last?.has_more ? (last?.page || 1) + 1 : undefined,
    enabled: !!communityId,
  });

  const refetchFeed = () => queryClient.invalidateQueries({ queryKey: ['community-feed', communityId] });
  const allPosts = data?.pages?.flatMap(p => p?.posts || []) ?? [];
  // Pinned posts float to top
  const posts = [...allPosts].sort((a, b) => {
    const aPinned = a.pinned || a.is_pinned;
    const bPinned = b.pinned || b.is_pinned;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <div className="px-4 pt-3">
      {isMember && (
        <button onClick={() => setShowPostForm(!showPostForm)}
          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-full text-left cursor-pointer text-sm text-stone-500 mb-3.5 transition-all">
          Comparte algo con la comunidad...
        </button>
      )}

      <AnimatePresence>
        {showPostForm && (
          <CommunityPostForm
            communityId={communityId}
            onClose={() => setShowPostForm(false)}
            onSuccess={() => { setShowPostForm(false); refetchFeed(); }}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        Array(3).fill(0).map((_, i) => (
          <div key={i} className="h-[120px] rounded-2xl mb-2.5 bg-stone-100 animate-pulse" />
        ))
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-stone-500">
          <p className="text-[15px] font-semibold text-stone-950 m-0">Error al cargar posts</p>
          <button onClick={() => refetchQuery()}
            aria-label="Reintentar carga de posts"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-950 text-[13px] font-semibold cursor-pointer">
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-stone-500">
          <Users size={48} strokeWidth={1} className="text-stone-500" />
          <p className="text-[15px] font-semibold text-stone-950 m-0">Aún no hay posts</p>
          <p className="text-[13px] m-0">
            {isMember ? '¡Sé el primero en publicar algo!' : 'Únete para ver y publicar contenido'}
          </p>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <CommunityPostCard key={post.id || post._id} post={post} isAdmin={isAdmin} onDelete={refetchFeed} onRefresh={refetchFeed} />
          ))}
          {hasNextPage && (
            <button onClick={() => fetchNextPage()}
              className="w-full mt-2 py-2.5 rounded-full border border-stone-200 bg-white text-stone-500 text-[13px] font-semibold cursor-pointer">
              Ver más posts
            </button>
          )}
        </>
      )}
    </div>
  );
};

/* ── Post Form ── */
const CommunityPostForm = ({ communityId, onClose, onSuccess }) => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef(null);

  // Revoke blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.post('/upload/product-image', formData, {
        timeout: 30000,
      });
      setImageUrl(data.url || data.path || data.image_url);
    } catch {
      toast.error('Error al subir imagen');
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async () => {
    if (!text.trim() && !imageUrl) {
      toast.error(t('community.escribeAlgoOAnadeUnaImagen', 'Escribe algo o añade una imagen'));
      return;
    }
    setIsPosting(true);
    try {
      await apiClient.post(`/communities/${communityId}/posts`, {
        text: text.trim(),
        image_url: imageUrl,
      });
      onSuccess();
    } catch {
      toast.error('Error al publicar');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white rounded-2xl shadow-sm p-3.5 mb-3.5">
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder={t('community.queQuieresCompartirPuedesUsarHas', '¿Qué quieres compartir? Puedes usar #hashtags')}
        rows={3} maxLength={1000}
        className="resize-none mb-2.5 leading-relaxed w-full px-3 py-2.5 bg-stone-100 border border-stone-200 rounded-xl outline-none text-stone-950 text-sm box-border"
        autoFocus
      />

      {imagePreview && (
        <div className="relative mb-2.5">
          <img loading="lazy" src={imagePreview} alt=""
            className="w-full max-h-[200px] object-cover rounded-xl" />
          <button onClick={() => { setImagePreview(null); setImageUrl(null); }}
            className="absolute top-1.5 right-1.5 bg-black/60 text-white border-none rounded-full w-[26px] h-[26px] cursor-pointer text-base flex items-center justify-center">
            ×
          </button>
          {isUploading && (
            <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <button onClick={() => fileRef.current?.click()}
          className="bg-transparent border-none cursor-pointer text-stone-500 text-xl p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Subir imagen"
          title={t('community.anadirImagen', 'Añadir imagen')}>
          📷
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        <span className="text-[11px] text-stone-500 flex-1">{text.length}/1000</span>
        <button onClick={onClose}
          className="px-3 py-1.5 rounded-full border border-stone-200 bg-white text-stone-500 text-xs font-semibold cursor-pointer">
          Cancelar
        </button>
        <button onClick={submit} disabled={isPosting || isUploading}
          className={`px-3 py-1.5 rounded-full border-none bg-stone-950 text-white text-xs font-semibold cursor-pointer ${
            (isPosting || isUploading) ? 'opacity-50' : 'opacity-100'
          }`}>
          {isPosting ? '...' : 'Publicar'}
        </button>
      </div>
    </motion.div>
  );
};

/* ── Post Card (C-01: comments, C-08: share, C-09: pin) ── */
const CommunityPostCard = ({ post, isAdmin, onDelete, onRefresh }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.is_liked);
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [showMenu, setShowMenu] = useState(false);
  const isOwn = (user?.user_id || user?.id) === post.author_id;
  const postId = post.id || post._id;

  const toggleLike = async () => {
    const prevLiked = liked;
    const prevLikes = likes;
    setLiked(!prevLiked);
    setLikes(l => prevLiked ? l - 1 : l + 1);
    try {
      if (prevLiked) {
        await apiClient.delete(`/community-posts/${postId}/like`);
      } else {
        await apiClient.post(`/community-posts/${postId}/like`);
      }
    } catch {
      setLiked(prevLiked);
      setLikes(prevLikes);
    }
  };

  const deletePost = async () => {
    setShowMenu(false);
    if (!window.confirm('¿Eliminar este post?')) return;
    try {
      await apiClient.delete(`/community-posts/${postId}`);
      toast.success('Post eliminado');
      onDelete();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const togglePin = async () => {
    setShowMenu(false);
    try {
      await apiClient.patch(`/community-posts/${postId}/pin`);
      toast.success(post.is_pinned ? 'Post desfijado' : 'Post fijado');
      onRefresh?.();
    } catch {
      toast.error('Error al fijar post');
    }
  };

  return (
    <div>
      {(post.pinned || post.is_pinned) && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className="bg-stone-100 text-stone-600 text-[11px] rounded-full px-2 py-0.5 inline-flex items-center gap-1">
            <Pin size={10} /> Fijado
          </span>
        </div>
      )}
    <div className="bg-white rounded-2xl shadow-sm mb-2.5 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-3">
        <Link to={`/${post.author_username}`}
          className="flex gap-2.5 items-center no-underline text-inherit">
          <img
            src={post.author_avatar || post.author_profile_image || post.author_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_username || 'U')}&size=36&background=e7e5e4&color=78716c`}
            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_username || 'U')}&size=36&background=e7e5e4&color=78716c`; }}
            className="w-9 h-9 rounded-full shrink-0 object-cover bg-stone-100"
            alt="" />
          <div>
            <p className="text-sm font-semibold m-0 text-stone-950">
              {post.author_username}
              {post.author_is_seller && (
                <span className="ml-1.5 text-[9px] px-1.5 py-px rounded bg-stone-100 text-stone-500 font-semibold">
                  Vendedor
                </span>
              )}
            </p>
            <p className="text-[11px] text-stone-500 m-0">
              {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </Link>
        {/* C-09: Menu with pin + delete */}
        {(isOwn || isAdmin) && (
          <div className="relative">
            <button onClick={() => setShowMenu(v => !v)}
              aria-label="Opciones del post"
              className="bg-transparent border-none cursor-pointer text-base text-stone-500 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
              ···
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute right-0 top-full z-20 bg-white rounded-xl shadow-lg border border-stone-100 overflow-hidden min-w-[160px]"
                >
                  {isAdmin && (
                    <button onClick={togglePin}
                      className="flex items-center gap-2 w-full px-3.5 py-2.5 text-[13px] text-stone-700 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left">
                      <Pin size={14} />
                      {post.is_pinned || post.pinned ? 'Desfijar' : 'Fijar arriba'}
                    </button>
                  )}
                  <button onClick={deletePost}
                    className="flex items-center gap-2 w-full px-3.5 py-2.5 text-[13px] text-stone-700 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left">
                    🗑️ Eliminar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {post.text && (
        <div className="px-3.5 pb-3">
          <p className="text-sm leading-relaxed text-stone-950 m-0">
            {renderTextWithHashtags(post.text)}
          </p>
        </div>
      )}

      {post.image_url && (
        <img loading="lazy" src={post.image_url} alt="Imagen del post"
          className="w-full block max-h-[400px] object-cover" />
      )}

      {/* Actions */}
      <div className="flex gap-4 px-3.5 py-2.5 border-t border-stone-200">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleLike}
          aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
          className={`bg-transparent border-none cursor-pointer flex items-center gap-[5px] text-[13px] p-0 ${
            liked ? 'text-stone-950 font-bold' : 'text-stone-500 font-normal'
          }`}>
          <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
          {likes > 0 && likes}
        </motion.button>

        {/* C-01: Comment button */}
        <button
          onClick={() => setShowComments(v => !v)}
          aria-label="Comentarios"
          className="bg-transparent border-none cursor-pointer flex items-center gap-[5px] text-[13px] text-stone-500 p-0">
          <span className="text-lg">💬</span>
          {commentsCount > 0 && commentsCount}
        </button>

        <button
          onClick={async () => {
            const url = `${window.location.origin}/community-posts/${postId}`;
            if (navigator.share) {
              try { await navigator.share({ title: post.text?.slice(0, 60) || 'Post de comunidad', url }); } catch { /* cancelled */ }
            } else {
              try { await navigator.clipboard.writeText(url); toast.success('Enlace copiado'); } catch { /* silent */ }
            }
          }}
          aria-label="Compartir post"
          className="bg-transparent border-none cursor-pointer flex items-center gap-[5px] text-[13px] text-stone-500 p-0">
          <span className="text-lg">↗️</span>
        </button>
      </div>

      {/* C-01: Comments section */}
      <AnimatePresence>
        {showComments && (
          <CommentsSection postId={postId} onCountChange={setCommentsCount} />
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

/* ── C-01: Comments Section ── */
const CommentsSection = ({ postId, onCountChange }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchComments = useCallback(async (p = 1) => {
    try {
      const res = await apiClient.get(`/community-posts/${postId}/comments?page=${p}&limit=20`);
      const items = res?.comments || [];
      if (p === 1) setComments(items);
      else setComments(prev => [...prev, ...items]);
      setHasMore(res?.has_more || false);
      setPage(p);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [postId]);

  useEffect(() => { fetchComments(1); }, [fetchComments]);

  const submitComment = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await apiClient.post(`/community-posts/${postId}/comments`, { text: text.trim() });
      setText('');
      await fetchComments(1);
      onCountChange?.(c => c + 1);
    } catch {
      toast.error('Error al comentar');
    } finally {
      setPosting(false);
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden border-t border-stone-100"
    >
      <div className="px-3.5 py-3 max-h-[280px] overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-3">
            <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-[13px] text-stone-400 text-center py-2 m-0">Sin comentarios aún</p>
        ) : (
          <>
            {comments.map(c => (
              <div key={c.id || c._id} className="flex gap-2">
                <img
                  src={c.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author_username || 'U')}&size=28&background=e7e5e4&color=78716c`}
                  className="w-7 h-7 rounded-full shrink-0 object-cover"
                  alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] m-0">
                    <span className="font-semibold text-stone-950">{c.author_username}</span>{' '}
                    <span className="text-stone-700">{c.text}</span>
                  </p>
                  <p className="text-[10px] text-stone-400 m-0 mt-0.5">{formatRelativeTime(c.created_at)}</p>
                </div>
              </div>
            ))}
            {hasMore && (
              <button onClick={() => fetchComments(page + 1)}
                className="text-[12px] text-stone-500 font-medium bg-transparent border-none cursor-pointer p-0 hover:underline">
                Ver más comentarios
              </button>
            )}
          </>
        )}
      </div>

      {/* Comment input */}
      {user && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-stone-100">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
            placeholder="Escribe un comentario..."
            maxLength={500}
            className="flex-1 h-8 rounded-full bg-stone-100 border-none px-3 text-[13px] text-stone-950 outline-none placeholder:text-stone-400"
          />
          <button
            onClick={submitComment}
            disabled={!text.trim() || posting}
            className={`text-[13px] font-semibold bg-transparent border-none cursor-pointer p-0 ${
              text.trim() ? 'text-stone-950' : 'text-stone-300'
            }`}>
            {posting ? '...' : 'Enviar'}
          </button>
        </div>
      )}
    </motion.div>
  );
};

/* ── Members Tab ── */
const CommunityMembers = ({ communityId }) => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [pendingIds, setPendingIds] = useState(new Set());
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['community-members', communityId, page],
    queryFn: () => apiClient.get(`/communities/${communityId}/members?limit=30&page=${page}`),
  });

  const members = data?.members || [];
  const hasMore = data?.has_more || false;

  const handleFollow = async (e, member) => {
    e.preventDefault();
    e.stopPropagation();
    const uid = member.user_id;
    if (pendingIds.has(uid)) return;
    setPendingIds(prev => new Set(prev).add(uid));
    try {
      await apiClient.post(`/users/${uid}/follow`);
      setFollowedIds(prev => new Set(prev).add(uid));
    } catch {
      toast.error('Error al seguir');
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(uid); return s; });
    }
  };

  return (
    <div className="px-4 pt-3">
      {isLoading ? (
        Array(4).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-stone-200">
            <div className="w-11 h-11 rounded-full bg-stone-100 animate-pulse" />
            <div className="flex-1">
              <div className="w-[100px] h-3.5 rounded bg-stone-100 animate-pulse mb-1" />
              <div className="w-[60px] h-2.5 rounded bg-stone-100 animate-pulse" />
            </div>
          </div>
        ))
      ) : isError ? (
        <div className="text-center py-6">
          <p className="text-stone-500 text-sm mb-2">Error al cargar miembros</p>
          <button onClick={() => refetch()}
            aria-label="Reintentar carga de miembros"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-950 text-[13px] font-semibold cursor-pointer">
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      ) : members.length === 0 ? (
        <p className="text-center py-6 text-stone-500 text-sm">
          Sin miembros todavía
        </p>
      ) : (
        <>
          {members.map(member => {
            const isOwnProfile = user?.id === member.user_id || user?.user_id === member.user_id;
            return (
              <Link key={member.id || member._id || member.user_id} to={`/${member.username || member.user_id}`}
                className="flex items-center gap-3 py-3 border-b border-stone-200 no-underline text-inherit">
                <img
                  src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.username || 'U')}&size=44`}
                  className="w-11 h-11 rounded-full shrink-0"
                  alt={member.username ? `Avatar de ${member.username}` : ''}
                  loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold m-0 text-stone-950">
                    {member.username || 'Usuario'}
                  </p>
                  <p className="text-[11px] text-stone-500 m-0">
                    {member.is_admin && '👑 Admin'}
                    {member.is_seller && (member.is_admin ? ' · ' : '') + '✓ Vendedor'}
                  </p>
                </div>
                {!isOwnProfile && (
                  <button
                    onClick={(e) => handleFollow(e, member)}
                    disabled={followedIds.has(member.user_id) || pendingIds.has(member.user_id)}
                    aria-label={followedIds.has(member.user_id) ? `Ya sigues a ${member.username || 'usuario'}` : `Seguir a ${member.username || 'usuario'}`}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold shrink-0 ${
                      followedIds.has(member.user_id)
                        ? 'border-stone-200 bg-white text-stone-400 cursor-default'
                        : 'border-stone-200 bg-white text-stone-950 cursor-pointer'
                    }`}>
                    {followedIds.has(member.user_id) ? 'Siguiendo' : pendingIds.has(member.user_id) ? '...' : 'Seguir'}
                  </button>
                )}
              </Link>
            );
          })}
          {hasMore && (
            <button onClick={() => setPage(p => p + 1)}
              className="w-full mt-2 py-2.5 rounded-full border border-stone-200 bg-white text-stone-500 text-[13px] font-semibold cursor-pointer">
              Ver más miembros
            </button>
          )}
        </>
      )}
    </div>
  );
};

/* ── About Tab ── */
const CommunityAbout = ({ community }) => (
  <div className="px-4 pt-5">
    {community.description && (
      <div className="mb-5">
        <h3 className="text-base font-bold mb-2 text-stone-950 mt-0">
          Descripción
        </h3>
        <p className="text-sm leading-relaxed text-stone-950 m-0">
          {community.description}
        </p>
      </div>
    )}

    <div className="bg-stone-100 rounded-2xl p-4 mb-5">
      {[
        { label: 'Fundada', value: community.created_at ? new Date(community.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : '—' },
        { label: 'Miembros', value: community.member_count?.toLocaleString() },
        { label: 'Posts', value: community.post_count?.toLocaleString() },
        { label: 'Creada por', value: `@${community.creator_username}` },
      ].map((row, i, arr) => (
        <div key={row.label} className={`flex justify-between py-2 text-sm ${i < arr.length - 1 ? 'border-b border-stone-200' : ''}`}>
          <span className="text-stone-500">{row.label}</span>
          <span className="font-semibold text-stone-950">{row.value}</span>
        </div>
      ))}
    </div>

    {/* C-06: handle both singular category (string) and plural categories (array) */}
    {(community.category || community.categories?.length > 0) && (
      <div className="mb-5">
        <h3 className="text-base font-bold mb-2 text-stone-950 mt-0">Categoría</h3>
        <div className="flex gap-1.5 flex-wrap">
          {(Array.isArray(community.categories) && community.categories.length > 0
            ? community.categories
            : community.category ? [community.category] : []
          ).map(cat => (
            <span key={cat} className="text-xs px-3 py-[5px] rounded-full bg-white border border-stone-200 text-stone-950 font-medium">
              {cat}
            </span>
          ))}
        </div>
      </div>
    )}

    <div>
      <h3 className="text-base font-bold mb-2 text-stone-950 mt-0">
        Normas de la comunidad
      </h3>
      <div className="bg-white shadow-sm rounded-2xl px-3.5 py-3">
        {[
          'Contenido relacionado con alimentación y gastronomía',
          'Trato respetuoso entre miembros',
          'Sin spam ni publicidad no autorizada',
          'Sin bebidas alcohólicas',
          'El admin puede eliminar posts que no cumplan las normas',
        ].map((rule, i) => (
          <p key={i} className={`text-[13px] text-stone-950 flex gap-2 ${i < 4 ? 'mb-1.5' : 'm-0'} ${i === 0 ? 'mt-0' : ''}`}>
            <span className="text-stone-500 shrink-0">{i + 1}.</span>
            {rule}
          </p>
        ))}
      </div>
    </div>
  </div>
);
