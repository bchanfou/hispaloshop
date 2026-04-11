// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Users, Settings, RefreshCw, Pin, Tag, Flag, Search, X, Heart, MessageCircle, MessageSquare, Share, MoreHorizontal, Image, PackageSearch, Trash2 } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
// @ts-ignore — JS module
import ReportButton from '../components/moderation/ReportButton';
import { useTranslation } from 'react-i18next';
import i18n from "../locales/i18n";
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
const renderTextWithHashtags = text => {
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) => part.startsWith('#') ? <Link key={i} to={`/hashtag/${encodeURIComponent(part.slice(1))}`} className="text-stone-950 font-semibold hover:underline">{part}</Link> : part);
};
const TABS = [{
  id: 'feed',
  label: 'Posts'
}, {
  id: 'members',
  label: 'Miembros'
}, {
  id: 'about',
  label: 'Info'
}];
export default function CommunityPage() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('feed');
  const {
    user
  } = useAuth();
  const [showNewPostsPill, setShowNewPostsPill] = useState(false);
  const queryClient = useQueryClient();
  const hiddenAtRef = useRef(null);
  const {
    data: community,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => apiClient.get(`/communities/${slug}`)
  });

  /* Track last visit server-side and show "new posts" pill on return from background */
  const communityId = community?.id || community?._id;
  useEffect(() => {
    if (!communityId) return;
    // Record visit server-side
    apiClient.post(`/communities/${communityId}/visit`).catch(() => {});
    trackEvent('community_viewed', { community_id: communityId });
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
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    queryClient.invalidateQueries({
      queryKey: ['community-feed', communityId]
    });
    // Re-record visit server-side
    if (communityId) {
      apiClient.post(`/communities/${communityId}/visit`).catch(() => {});
    }
  }, [communityId, queryClient]);
  if (isError) {
    return <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} aria-label="Volver" className="bg-transparent border-none cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft size={22} className="text-stone-950" />
          </button>
          <span className="text-[17px] font-bold text-stone-950">Comunidad</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-[60px]">
          <Users size={56} className="text-stone-500" strokeWidth={1} />
          <p className="text-[15px] text-stone-500">{i18n.t('community.errorAlCargarLaComunidad', 'Error al cargar la comunidad')}</p>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-6 py-2.5 bg-white text-stone-950 rounded-full border border-stone-200 text-sm font-semibold cursor-pointer" aria-label="Reintentar carga">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      </div>;
  }
  if (isLoading) {
    return <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} aria-label="Volver" className="bg-transparent border-none cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
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
            {[1, 2, 3].map(i => <div key={i} className="h-3 w-14 animate-pulse rounded-full bg-stone-100" />)}
          </div>
          {/* Posts skeleton */}
          {[1, 2, 3].map(i => <div key={i} className="mt-4 flex gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-stone-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 animate-pulse rounded-full bg-stone-100" />
                <div className="h-3 w-full animate-pulse rounded-full bg-stone-100" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-stone-100" />
              </div>
            </div>)}
        </div>
      </div>;
  }
  if (!community) {
    return <div className="min-h-screen bg-stone-50">
        <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} aria-label="Volver" className="bg-transparent border-none cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
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
      </div>;
  }
  const isMember = community.is_member;
  const isCreator = community.role === 'creator' || (user?.user_id || user?.id) === community.creator_id;
  const isAdmin = community.is_admin || isCreator;
  return <div className="min-h-screen bg-stone-50 pb-[100px] max-w-[975px] mx-auto">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Volver">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {community.name}
        </span>
        {!isCreator && communityId && (
          <div className="flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center text-stone-500">
            <ReportButton contentType="community" contentId={communityId} contentOwnerId={community?.creator_id} />
          </div>
        )}
        {isCreator && <Link to={`/communities/${slug}/settings`} aria-label={i18n.t('community.configuracion', 'Configuración')} className="flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center text-stone-500">
            <Settings size={20} />
          </Link>}
      </div>

      {/* ── Cover Image (3:1) ── */}
      <div className="relative">
        <div className="aspect-[3/1] overflow-hidden" style={{
        background: community.cover_image ? '#f5f5f4' : ['#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c'][(community.name || 'C').charCodeAt(0) % 5]
      }}>
          {community.cover_image ? <img loading="lazy" src={community.cover_image} alt="" className="block h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[56px]">
              {community.emoji || '🌿'}
            </div>}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
        {/* Logo overlapping cover bottom */}
        <div className="absolute -bottom-8 left-4 max-w-[600px] mx-auto">
          <div className="h-16 w-16 rounded-xl overflow-hidden border-[3px] border-white shadow-sm" style={{ background: '#f5f5f4' }}>
            {community.logo_url
              ? <img src={community.logo_url} alt={community.name} className="w-full h-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center text-[28px]" style={{ background: ['#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c'][(community.name || 'C').charCodeAt(0) % 5] }}>
                  {community.emoji || '🌿'}
                </div>}
          </div>
        </div>
      </div>

      {/* ── Info + Join ── */}
      <div className="mx-auto max-w-[600px] px-4 pt-11">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-stone-950 m-0 leading-tight">
              {community.name}
            </h1>
            {community.category && <span className="inline-block mt-1 text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                {community.category}
              </span>}
          </div>
          <JoinButton communityId={community.id || community._id} isMember={isMember} onToggle={refetch} />
          {isMember && <button type="button" onClick={async () => {
            try {
              const chatRes = await apiClient.post('/chat/groups/community', { community_id: community.id || community._id });
              trackEvent('community_chat_joined', { community_id: community.id || community._id });
              toast.success(i18n.t('community.chat_activated', 'Chat de la comunidad activado'));
              const convId = chatRes?.conversation_id || chatRes?.id;
              if (convId) navigate(`/messages/${convId}`);
            } catch (err) {
              if (err?.response?.status === 409) toast(i18n.t('community.chat_already_joined', 'Ya estás en el chat'));
              else toast.error('Error');
            }
          }} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 bg-white text-[13px] font-medium text-stone-700 cursor-pointer hover:bg-stone-50 transition-colors shrink-0">
            <MessageSquare size={14} /> {i18n.t('community.activate_chat', 'Chat')}
          </button>}
        </div>

        {community.description && <p className="text-sm text-stone-600 leading-snug m-0 mb-2">{community.description}</p>}

        {community.tags?.length > 0 && <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-1">
            {community.tags.map(tag => <span key={tag} className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-500">
                #{tag}
              </span>)}
          </div>}

        {/* Community stats */}
        <div className="text-xs text-stone-500 flex items-center gap-1 mt-1.5">
          <span>{(community.member_count || 0).toLocaleString()} miembros</span>
          <span>·</span>
          <span>{(community.post_count || 0).toLocaleString()} publicaciones</span>
          {community.created_at && <>
              <span>·</span>
              <span>Creada {formatRelativeTime(community.created_at)}</span>
            </>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-[50px] z-[39] mx-auto flex max-w-[600px] border-b border-stone-200 bg-white">
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 cursor-pointer border-b-2 bg-transparent py-3 text-sm transition-colors ${tab === t.id ? 'border-stone-950 font-semibold text-stone-950' : 'border-transparent text-stone-500'}`}>
            {t.label}
          </button>)}
      </div>

      {/* ── Ofertas para miembros ── */}
      {tab === 'about' && <MemberOffersSection communityId={community.id || community._id} isMember={isMember} />}

      {/* ── Tab content ── */}
      <div className="max-w-[600px] mx-auto">
        {tab === 'feed' && <CommunityFeed communityId={community.id || community._id} isMember={isMember} isAdmin={isAdmin} />}
        {tab === 'members' && <CommunityMembers communityId={community.id || community._id} />}
        {tab === 'about' && <CommunityAbout community={community} />}
      </div>

      {/* ── New posts pill ── */}
      <AnimatePresence>
        {showNewPostsPill && tab === 'feed' && <motion.div initial={{
        opacity: 0,
        y: -20,
        scale: 0.9
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -20,
        scale: 0.9
      }} transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25
      }} className="fixed top-[110px] left-1/2 -translate-x-1/2 z-50">
            <button onClick={handleNewPostsPill} className="flex items-center gap-2 px-5 py-2.5 bg-stone-950 text-white rounded-full border-none cursor-pointer text-[13px] font-semibold shadow-lg whitespace-nowrap" aria-label="Ver nuevos posts">
              ↑ Ver nuevos posts
            </button>
          </motion.div>}
      </AnimatePresence>
    </div>;
}

/* ── Join Button ── */
const JoinButton = ({
  communityId,
  isMember,
  onToggle
}) => {
  const [joined, setJoined] = useState(isMember);
  const [loading, setLoading] = useState(false);

  // Sync with prop when server data refreshes
  useEffect(() => {
    setJoined(isMember);
  }, [isMember]);
  const toggle = async () => {
    if (loading) return;
    const wasJoined = joined;
    // Optimistic
    setJoined(!wasJoined);
    setLoading(true);
    try {
      if (wasJoined) {
        await apiClient.delete(`/communities/${communityId}/join`);
        trackEvent('community_left', { community_id: communityId });
      } else {
        await apiClient.post(`/communities/${communityId}/join`);
        trackEvent('community_joined', { community_id: communityId });
      }
      onToggle?.();
    } catch {
      setJoined(wasJoined);
      toast.error(i18n.t('community.errorAlActualizarMembresia', 'Error al actualizar membresía'));
    } finally {
      setLoading(false);
    }
  };
  return <motion.button whileTap={{
    scale: 0.94
  }} onClick={toggle} disabled={loading} aria-label={joined ? i18n.t('community.salirDeLaComunidad', 'Salir de la comunidad') : 'Unirse a la comunidad'} className={`px-5 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-all shrink-0 ${joined ? 'border border-stone-200 bg-white text-stone-500' : 'border-none bg-stone-950 text-white'}`}>
      {loading ? '...' : joined ? 'Unida' : 'Unirse'}
    </motion.button>;
};

/* ── Community Feed ── */
const CommunityFeed = ({
  communityId,
  isMember,
  isAdmin
}) => {
  const [showPostForm, setShowPostForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    refetch: refetchQuery
  } = useInfiniteQuery({
    queryKey: ['community-feed', communityId],
    queryFn: ({
      pageParam = 1
    }) => apiClient.get(`/communities/${communityId}/posts?page=${pageParam}&limit=10`),
    initialPageParam: 1,
    getNextPageParam: last => last?.has_more ? (last?.page || 1) + 1 : undefined,
    enabled: !!communityId
  });
  // Search query
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['community-search', communityId, debouncedSearch],
    queryFn: () => apiClient.get(`/communities/${communityId}/posts/search?q=${encodeURIComponent(debouncedSearch)}&limit=20`),
    enabled: !!communityId && debouncedSearch.length >= 2,
  });

  const refetchFeed = () => queryClient.invalidateQueries({
    queryKey: ['community-feed', communityId]
  });

  const isSearching = debouncedSearch.length >= 2;
  const allPosts = isSearching ? (searchData?.posts || []) : (data?.pages?.flatMap(p => p?.posts || []) ?? []);
  // Pinned posts float to top
  const posts = [...allPosts].sort((a, b) => {
    const aPinned = a.pinned || a.is_pinned;
    const bPinned = b.pinned || b.is_pinned;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });
  return <div className="px-4 pt-3">
      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={15} strokeWidth={1.5} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar en la comunidad..." className="h-10 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-9 text-[13px] text-stone-950 outline-none placeholder:text-stone-400" />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-stone-100 border-none cursor-pointer p-1 rounded-full hover:bg-stone-200 transition-colors" aria-label="Limpiar búsqueda">
          <X size={12} strokeWidth={2} className="text-stone-500" />
        </button>}
      </div>

      {isMember && !isSearching && <button onClick={() => setShowPostForm(!showPostForm)} className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl text-left cursor-pointer text-[13px] text-stone-400 mb-3 hover:border-stone-300 transition-colors">
          Comparte algo con la comunidad...
        </button>}

      <AnimatePresence>
        {showPostForm && <CommunityPostForm communityId={communityId} onClose={() => setShowPostForm(false)} onSuccess={() => {
        setShowPostForm(false);
        refetchFeed();
      }} />}
      </AnimatePresence>

      {(isSearching ? searchLoading : isLoading) ? Array(3).fill(0).map((_, i) => <div key={i} className="h-[120px] rounded-2xl mb-2.5 bg-stone-100 animate-pulse" />) : isError && !isSearching ? <div className="flex flex-col items-center justify-center gap-2 py-10 text-stone-500">
          <p className="text-[15px] font-medium text-stone-950 m-0">Error al cargar posts</p>
          <button onClick={() => refetchQuery()} aria-label="Reintentar carga de posts" className="flex items-center gap-1.5 px-4 py-2 rounded-2xl border border-stone-200 bg-white text-stone-950 text-[13px] font-medium cursor-pointer hover:bg-stone-50 transition-colors">
            <RefreshCw size={13} strokeWidth={1.5} /> Reintentar
          </button>
        </div> : posts.length === 0 ? <div className="flex flex-col items-center justify-center gap-2 py-10 text-stone-500">
          <Users size={48} strokeWidth={1} className="text-stone-500" />
          <p className="text-[15px] font-semibold text-stone-950 m-0">{i18n.t('community.aunNoHayPosts', 'Aún no hay posts')}</p>
          <p className="text-[13px] m-0">
            {isMember ? i18n.t('community.seElPrimeroEnPublicarAlgo', '¡Sé el primero en publicar algo!') : 'Únete para ver y publicar contenido'}
          </p>
        </div> : <>
          {posts.map(post => <CommunityPostCard key={post.id || post._id} post={post} isAdmin={isAdmin} onDelete={refetchFeed} onRefresh={refetchFeed} />)}
          {hasNextPage && !isSearching && <button onClick={() => fetchNextPage()} className="w-full mt-2 py-2.5 rounded-2xl border border-stone-200 bg-white text-stone-500 text-[13px] font-medium cursor-pointer hover:bg-stone-50 transition-colors">
              Ver más
            </button>}
        </>}
    </div>;
};

/* ── Post Form ── */
const CommunityPostForm = ({
  communityId,
  onClose,
  onSuccess
}) => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const fileRef = useRef(null);
  const searchTimerRef = useRef(null);

  // Search products by name
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (productSearch.length < 2) { setProductResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/products?q=${encodeURIComponent(productSearch)}&limit=6`);
        setProductResults(res?.products || res?.items || []);
      } catch { setProductResults([]); }
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [productSearch]);

  // Revoke blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);
  const handleImage = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.post('/upload/product-image', formData, {
        timeout: 30000
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
      toast.error(i18n.t('community.escribeAlgoOAnadeUnaImagen', 'Escribe algo o añade una imagen'));
      return;
    }
    setIsPosting(true);
    try {
      await apiClient.post(`/communities/${communityId}/posts`, {
        text: text.trim(),
        image_url: imageUrl,
        product_ids: selectedProducts.map(p => p.id || p._id),
      });
      trackEvent('community_post_created', { community_id: communityId });
      onSuccess();
    } catch {
      toast.error('Error al publicar');
    } finally {
      setIsPosting(false);
    }
  };
  return <motion.div initial={{
    opacity: 0,
    y: -8
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: -8
  }} className="bg-white rounded-2xl border border-stone-100 p-3.5 mb-3">
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder={i18n.t('community.queQuieresCompartirPuedesUsarHas', '¿Qué quieres compartir? Puedes usar #hashtags')} rows={3} maxLength={1000} className="resize-none mb-2.5 leading-relaxed w-full px-3 py-2.5 bg-stone-100 border border-stone-200 rounded-xl outline-none text-stone-950 text-sm box-border" autoFocus />

      {imagePreview && <div className="relative mb-2.5">
          <img loading="lazy" src={imagePreview} alt="" className="w-full max-h-[200px] object-cover rounded-xl" />
          <button onClick={() => {
        setImagePreview(null);
        setImageUrl(null);
      }} className="absolute top-2 right-2 bg-stone-950/70 text-white border-none rounded-full w-7 h-7 cursor-pointer flex items-center justify-center backdrop-blur-sm hover:bg-stone-950/90 transition-colors">
            <X size={14} strokeWidth={2} />
          </button>
          {isUploading && <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>}
        </div>}

      {/* Selected products */}
      {selectedProducts.length > 0 && <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
        {selectedProducts.map(p => <div key={p.id || p._id} className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-2.5 py-1.5 shrink-0">
          {(p.image || p.images?.[0]) && <img src={p.image || p.images?.[0]} alt="" className="w-7 h-7 rounded-lg object-cover" />}
          <span className="text-[12px] font-medium text-stone-950 max-w-[120px] truncate">{p.name}</span>
          {p.price != null && <span className="text-[11px] text-stone-500 tabular-nums">{Number(p.price).toFixed(2)} €</span>}
          <button onClick={() => setSelectedProducts(prev => prev.filter(sp => (sp.id || sp._id) !== (p.id || p._id)))} className="bg-transparent border-none cursor-pointer text-stone-300 p-0 leading-none hover:text-stone-500 transition-colors">
            <X size={13} strokeWidth={2} />
          </button>
        </div>)}
      </div>}

      {/* Product picker */}
      {showProductPicker && <div className="mb-2.5">
        <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar producto para enlazar..." className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-xl text-[13px] text-stone-950 outline-none mb-1.5 box-border" autoFocus />
        {productResults.length > 0 && <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
          {productResults.map(p => {
            const pid = p.id || p._id;
            const alreadySelected = selectedProducts.some(sp => (sp.id || sp._id) === pid);
            return <button key={pid} disabled={alreadySelected || selectedProducts.length >= 5} onClick={() => {
              setSelectedProducts(prev => [...prev, { id: pid, name: p.name, price: p.price, image: p.images?.[0] || p.image }]);
              setProductSearch('');
              setProductResults([]);
            }} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer border-none ${alreadySelected ? 'bg-stone-100 opacity-50' : 'bg-white hover:bg-stone-50'}`}>
              {(p.images?.[0] || p.image) && <img src={p.images?.[0] || p.image} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
              <span className="flex-1 text-[13px] text-stone-950 truncate">{p.name}</span>
              {p.price != null && <span className="text-[12px] text-stone-500 shrink-0">{Number(p.price).toFixed(2)}€</span>}
            </button>;
          })}
        </div>}
      </div>}

      <div className="flex gap-1.5 items-center">
        <button onClick={() => fileRef.current?.click()} className="bg-transparent border-none cursor-pointer text-stone-400 p-2 rounded-full hover:bg-stone-100 transition-colors flex items-center justify-center" aria-label="Subir imagen" title={i18n.t('community.anadirImagen', 'Añadir imagen')}>
          <Image size={18} strokeWidth={1.5} />
        </button>
        <button onClick={() => setShowProductPicker(v => !v)} className={`bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-stone-100 transition-colors flex items-center justify-center ${showProductPicker ? 'text-stone-950' : 'text-stone-400'}`} aria-label="Enlazar producto" title="Enlazar producto">
          <PackageSearch size={18} strokeWidth={1.5} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        <span className="text-[11px] text-stone-400 flex-1 text-right tabular-nums">{text.length}/1000</span>
        <button onClick={onClose} className="px-3.5 py-1.5 rounded-full border border-stone-200 bg-white text-stone-600 text-[12px] font-medium cursor-pointer hover:bg-stone-50 transition-colors">
          Cancelar
        </button>
        <button onClick={submit} disabled={isPosting || isUploading} className="px-4 py-1.5 rounded-full border-none bg-stone-950 text-white text-[12px] font-medium cursor-pointer disabled:opacity-40 transition-opacity">
          {isPosting ? '...' : 'Publicar'}
        </button>
      </div>
    </motion.div>;
};

/* ── Post Card (C-01: comments, C-08: share, C-09: pin) ── */
const CommunityPostCard = ({
  post,
  isAdmin,
  onDelete,
  onRefresh
}) => {
  const {
    user
  } = useAuth();
  const [liked, setLiked] = useState(post.is_liked);
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [showMenu, setShowMenu] = useState(false);
  const isOwn = (user?.user_id || user?.id) === post.author_id;
  const postId = post.id || post._id;
  const [showReportModal, setShowReportModal] = useState(false);
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
  return <div>
      {(post.pinned || post.is_pinned) && <div className="flex items-center gap-1.5 mb-1">
          <span className="text-stone-400 text-[11px] inline-flex items-center gap-1 font-medium">
            <Pin size={11} strokeWidth={1.5} /> Fijado
          </span>
        </div>}
    <div className="bg-white rounded-2xl border border-stone-100 mb-2.5 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-3">
        <Link to={`/${post.author_username}`} className="flex gap-2.5 items-center no-underline text-inherit">
          <img src={post.author_avatar || post.author_profile_image || post.author_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_username || 'U')}&size=36&background=e7e5e4&color=78716c`} onError={e => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_username || 'U')}&size=36&background=e7e5e4&color=78716c`;
          }} className="w-9 h-9 rounded-full shrink-0 object-cover bg-stone-100" alt="" />
          <div>
            <p className="text-sm font-semibold m-0 text-stone-950">
              {post.author_username}
              {post.author_is_seller && <span className="ml-1.5 text-[9px] px-1.5 py-px rounded-full bg-stone-100 text-stone-500 font-medium tracking-wide uppercase">
                  Vendedor
                </span>}
            </p>
            <p className="text-[11px] text-stone-500 m-0">
              {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </Link>
        {/* Menu: pin + delete (admin/owner) + report (anyone) */}
        {user && <div className="relative">
            <button onClick={() => setShowMenu(v => !v)} aria-label="Opciones del post" className="bg-transparent border-none cursor-pointer text-stone-400 p-2 rounded-full hover:bg-stone-50 transition-colors flex items-center justify-center">
              <MoreHorizontal size={18} strokeWidth={1.5} />
            </button>
            <AnimatePresence>
              {showMenu && <motion.div initial={{
              opacity: 0,
              scale: 0.9
            }} animate={{
              opacity: 1,
              scale: 1
            }} exit={{
              opacity: 0,
              scale: 0.9
            }} className="absolute right-0 top-full z-20 bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden min-w-[170px] py-1">
                  {isAdmin && <button onClick={togglePin} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-stone-700 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left">
                      <Pin size={15} strokeWidth={1.5} />
                      {post.is_pinned || post.pinned ? 'Desfijar' : 'Fijar arriba'}
                    </button>}
                  {(isOwn || isAdmin) && <button onClick={deletePost} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-stone-700 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left">
                    <Trash2 size={15} strokeWidth={1.5} /> Eliminar
                  </button>}
                  {!isOwn && <button onClick={() => { setShowMenu(false); setShowReportModal(true); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-stone-700 bg-transparent border-none cursor-pointer hover:bg-stone-50 text-left">
                    <Flag size={15} strokeWidth={1.5} /> Reportar
                  </button>}
                </motion.div>}
            </AnimatePresence>
          </div>}
      </div>

      {showReportModal && <ReportModal contentType="post" contentId={postId} onClose={() => setShowReportModal(false)} />}

      {post.text && <div className="px-3.5 pb-3">
          <p className="text-sm leading-relaxed text-stone-950 m-0">
            {renderTextWithHashtags(post.text)}
          </p>
        </div>}

      {post.image_url && <img loading="lazy" src={post.image_url} alt="Imagen del post" className="w-full block max-h-[400px] object-cover" />}

      {/* Linked products */}
      {post.products?.length > 0 && <div className="px-3.5 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
        {post.products.map(p => <Link key={p.id} to={`/products/${p.slug || p.id}`} className="flex items-center gap-2.5 bg-white border border-stone-200 rounded-2xl px-3 py-2.5 shrink-0 no-underline hover:border-stone-300 transition-colors">
          {p.image && <img src={p.image} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />}
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-stone-950 m-0 truncate max-w-[140px]">{p.name}</p>
            {p.price != null && <p className="text-[12px] font-semibold text-stone-950 m-0 mt-0.5">{Number(p.price).toFixed(2)} €</p>}
          </div>
        </Link>)}
      </div>}

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-stone-100">
        <motion.button whileTap={{
          scale: 0.9
        }} onClick={toggleLike} aria-label={liked ? 'Quitar me gusta' : 'Me gusta'} className={`bg-transparent border-none cursor-pointer flex items-center gap-1.5 text-[13px] px-2.5 py-2 rounded-full transition-colors ${liked ? 'text-stone-950 font-semibold' : 'text-stone-500 font-normal hover:bg-stone-50'}`}>
          <Heart size={17} strokeWidth={liked ? 0 : 1.5} fill={liked ? '#0c0a09' : 'none'} />
          {likes > 0 && <span className="tabular-nums">{likes}</span>}
        </motion.button>

        <button onClick={() => setShowComments(v => !v)} aria-label="Comentarios" className={`bg-transparent border-none cursor-pointer flex items-center gap-1.5 text-[13px] px-2.5 py-2 rounded-full transition-colors ${showComments ? 'text-stone-950 font-semibold' : 'text-stone-500 hover:bg-stone-50'}`}>
          <MessageCircle size={17} strokeWidth={1.5} />
          {commentsCount > 0 && <span className="tabular-nums">{commentsCount}</span>}
        </button>

        <button onClick={async () => {
          const url = `${window.location.origin}/community-posts/${postId}`;
          if (navigator.share) {
            try {
              await navigator.share({
                title: post.text?.slice(0, 60) || 'Post de comunidad',
                url
              });
            } catch {/* cancelled */}
          } else {
            try {
              await navigator.clipboard.writeText(url);
              toast.success('Enlace copiado');
            } catch {/* silent */}
          }
        }} aria-label="Compartir post" className="bg-transparent border-none cursor-pointer flex items-center gap-1.5 text-[13px] text-stone-500 px-2.5 py-2 rounded-full hover:bg-stone-50 transition-colors">
          <Share size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* C-01: Comments section */}
      <AnimatePresence>
        {showComments && <CommentsSection postId={postId} onCountChange={setCommentsCount} />}
      </AnimatePresence>
    </div>
    </div>;
};

/* ── C-01: Comments Section ── */
const CommentsSection = ({
  postId,
  onCountChange
}) => {
  const {
    user
  } = useAuth();
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
      if (p === 1) setComments(items);else setComments(prev => [...prev, ...items]);
      setHasMore(res?.has_more || false);
      setPage(p);
    } catch {/* silent */} finally {
      setLoading(false);
    }
  }, [postId]);
  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);
  const submitComment = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await apiClient.post(`/community-posts/${postId}/comments`, {
        text: text.trim()
      });
      setText('');
      await fetchComments(1);
      onCountChange?.(c => c + 1);
    } catch {
      toast.error('Error al comentar');
    } finally {
      setPosting(false);
    }
  };
  return <motion.div initial={{
    height: 0,
    opacity: 0
  }} animate={{
    height: 'auto',
    opacity: 1
  }} exit={{
    height: 0,
    opacity: 0
  }} transition={{
    duration: 0.2
  }} className="overflow-hidden border-t border-stone-100">
      <div className="px-3.5 py-3 max-h-[280px] overflow-y-auto space-y-3">
        {loading ? <div className="flex justify-center py-3">
            <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
          </div> : comments.length === 0 ? <p className="text-[13px] text-stone-400 text-center py-2 m-0">{i18n.t('feed.noComments', 'Sin comentarios aún')}</p> : <>
            {comments.map(c => <div key={c.id || c._id} className="flex gap-2">
                <img src={c.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author_username || 'U')}&size=28&background=e7e5e4&color=78716c`} className="w-7 h-7 rounded-full shrink-0 object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] m-0">
                    <span className="font-semibold text-stone-950">{c.author_username}</span>{' '}
                    <span className="text-stone-700">{c.text}</span>
                  </p>
                  <p className="text-[10px] text-stone-400 m-0 mt-0.5">{formatRelativeTime(c.created_at)}</p>
                </div>
              </div>)}
            {hasMore && <button onClick={() => fetchComments(page + 1)} className="text-[12px] text-stone-400 font-medium bg-transparent border-none cursor-pointer p-0 hover:text-stone-600 transition-colors">
                Ver más comentarios
              </button>}
          </>}
      </div>

      {/* Comment input */}
      {user && <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-stone-100">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => {
        if (e.key === 'Enter') submitComment();
      }} placeholder="Escribe un comentario..." maxLength={500} className="flex-1 h-9 rounded-full bg-stone-50 border border-stone-200 px-3.5 text-[13px] text-stone-950 outline-none placeholder:text-stone-400" />
          <button onClick={submitComment} disabled={!text.trim() || posting} className={`text-[13px] font-medium bg-transparent border-none cursor-pointer px-1 transition-colors ${text.trim() ? 'text-stone-950' : 'text-stone-300'}`}>
            {posting ? '...' : 'Publicar'}
          </button>
        </div>}
    </motion.div>;
};

/* ── Members Tab ── */
const CommunityMembers = ({
  communityId
}) => {
  const {
    user
  } = useAuth();
  const [page, setPage] = useState(1);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [pendingIds, setPendingIds] = useState(new Set());
  const {
    data,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['community-members', communityId, page],
    queryFn: () => apiClient.get(`/communities/${communityId}/members?limit=30&page=${page}`)
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
      setPendingIds(prev => {
        const s = new Set(prev);
        s.delete(uid);
        return s;
      });
    }
  };
  return <div className="px-4 pt-3">
      {isLoading ? Array(4).fill(0).map((_, i) => <div key={i} className="flex items-center gap-3 py-3 border-b border-stone-200">
            <div className="w-11 h-11 rounded-full bg-stone-100 animate-pulse" />
            <div className="flex-1">
              <div className="w-[100px] h-3.5 rounded bg-stone-100 animate-pulse mb-1" />
              <div className="w-[60px] h-2.5 rounded bg-stone-100 animate-pulse" />
            </div>
          </div>) : isError ? <div className="text-center py-6">
          <p className="text-stone-500 text-sm mb-2">Error al cargar miembros</p>
          <button onClick={() => refetch()} aria-label="Reintentar carga de miembros" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-950 text-[13px] font-semibold cursor-pointer">
            <RefreshCw size={13} /> Reintentar
          </button>
        </div> : members.length === 0 ? <p className="text-center py-6 text-stone-500 text-sm">
          Sin miembros todavía
        </p> : <>
          {members.map(member => {
        const isOwnProfile = user?.id === member.user_id || user?.user_id === member.user_id;
        return <Link key={member.id || member._id || member.user_id} to={`/${member.username || member.user_id}`} className="flex items-center gap-3 py-3 border-b border-stone-200 no-underline text-inherit">
                <img src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.username || 'U')}&size=44`} className="w-11 h-11 rounded-full shrink-0" alt={member.username ? `Avatar de ${member.username}` : ''} loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold m-0 text-stone-950">
                    {member.username || 'Usuario'}
                  </p>
                  <p className="text-[11px] text-stone-500 m-0">
                    {member.role === 'creator' && '👑 Creador'}
                    {member.role === 'moderator' && '🛡️ Moderador'}
                    {member.is_seller && ((member.role === 'creator' || member.role === 'moderator') ? ' · ' : '') + '✓ Vendedor'}
                  </p>
                </div>
                {!isOwnProfile && <button onClick={e => handleFollow(e, member)} disabled={followedIds.has(member.user_id) || pendingIds.has(member.user_id)} aria-label={followedIds.has(member.user_id) ? `Ya sigues a ${member.username || 'usuario'}` : `Seguir a ${member.username || 'usuario'}`} className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold shrink-0 ${followedIds.has(member.user_id) ? 'border-stone-200 bg-white text-stone-400 cursor-default' : 'border-stone-200 bg-white text-stone-950 cursor-pointer'}`}>
                    {followedIds.has(member.user_id) ? 'Siguiendo' : pendingIds.has(member.user_id) ? '...' : 'Seguir'}
                  </button>}
              </Link>;
      })}
          {hasMore && <button onClick={() => setPage(p => p + 1)} className="w-full mt-2 py-2.5 rounded-2xl border border-stone-200 bg-white text-stone-500 text-[13px] font-medium cursor-pointer hover:bg-stone-50 transition-colors">
              Ver más
            </button>}
        </>}
    </div>;
};

/* ── About Tab ── */
const CommunityAbout = ({
  community
}) => <div className="px-4 pt-5">
    {community.description && <div className="mb-5">
        <h3 className="text-base font-bold mb-2 text-stone-950 mt-0">
          Descripción
        </h3>
        <p className="text-sm leading-relaxed text-stone-950 m-0">
          {community.description}
        </p>
      </div>}

    <div className="bg-stone-100 rounded-2xl p-4 mb-5">
      {[{
      label: 'Fundada',
      value: community.created_at ? new Date(community.created_at).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric'
      }) : '—'
    }, {
      label: 'Miembros',
      value: community.member_count?.toLocaleString()
    }, {
      label: 'Posts',
      value: community.post_count?.toLocaleString()
    }, {
      label: 'Creada por',
      value: `@${community.creator_username}`
    }].map((row, i, arr) => <div key={row.label} className={`flex justify-between py-2 text-sm ${i < arr.length - 1 ? 'border-b border-stone-200' : ''}`}>
          <span className="text-stone-500">{row.label}</span>
          <span className="font-semibold text-stone-950">{row.value}</span>
        </div>)}
    </div>

    {/* C-06: handle both singular category (string) and plural categories (array) */}
    {(community.category || community.categories?.length > 0) && <div className="mb-5">
        <h3 className="text-base font-bold mb-2 text-stone-950 mt-0">{i18n.t('products.category', 'Categoría')}</h3>
        <div className="flex gap-1.5 flex-wrap">
          {(Array.isArray(community.categories) && community.categories.length > 0 ? community.categories : community.category ? [community.category] : []).map(cat => <span key={cat} className="text-xs px-3 py-[5px] rounded-full bg-white border border-stone-200 text-stone-950 font-medium">
              {cat}
            </span>)}
        </div>
      </div>}

    {/* Community rules — custom from DB, or empty state */}
    {community.rules?.length > 0 ? <div>
      <h3 className="text-base font-bold mb-2 text-stone-950 mt-0">
        Normas de la comunidad
      </h3>
      <div className="bg-white shadow-sm rounded-2xl px-3.5 py-3">
        {community.rules.map((rule, i) => <p key={i} className={`text-[13px] text-stone-950 flex gap-2 ${i < community.rules.length - 1 ? 'mb-1.5' : 'm-0'} ${i === 0 ? 'mt-0' : ''}`}>
            <span className="text-stone-500 shrink-0">{i + 1}.</span>
            {rule}
          </p>)}
      </div>
    </div> : <div>
      <h3 className="text-base font-bold mb-2 text-stone-950 mt-0">
        Normas de la comunidad
      </h3>
      <p className="text-[13px] text-stone-500 m-0">
        Esta comunidad aún no ha definido normas específicas. Se aplican las normas generales de HispaloShop.
      </p>
    </div>}
  </div>;

/* ── Member Offers Section (About tab) ── */
const MemberOffersSection = ({ communityId, isMember }) => {
  const { data: discountData } = useQuery({
    queryKey: ['community-discount', communityId],
    queryFn: () => apiClient.get(`/communities/${communityId}/discount`),
    enabled: !!communityId,
  });
  const { data: flashData } = useQuery({
    queryKey: ['community-flash-offers', communityId],
    queryFn: () => apiClient.get(`/communities/${communityId}/flash-offers`),
    enabled: !!communityId,
  });

  const discount = discountData?.discount;
  const flashOffers = flashData?.offers || [];
  const hasOffers = (discount?.is_active && discount?.value > 0) || flashOffers.length > 0;

  return <div className="max-w-[600px] mx-auto px-4 pt-4">
    <div className={`rounded-2xl p-4 ${hasOffers ? 'bg-stone-950 text-white' : 'bg-stone-100'}`}>
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <Tag size={14} className={hasOffers ? 'text-white/60' : 'text-stone-400'} />
        <span className={`text-sm font-semibold ${hasOffers ? 'text-white' : 'text-stone-950'}`}>Ofertas para miembros</span>
      </div>

      {discount?.is_active && discount?.value > 0 && <div className="text-center mb-3">
        <p className="text-2xl font-bold m-0">
          -{discount.value}{discount.type === 'percentage' ? '%' : '€'}
        </p>
        <p className={`text-[13px] m-0 ${hasOffers ? 'text-white/70' : 'text-stone-500'}`}>
          Descuento automático en todos los productos del productor
        </p>
        {!isMember && <p className="text-[12px] mt-1 m-0 text-white/50">Únete para obtener el descuento</p>}
      </div>}

      {flashOffers.length > 0 && <div className="mt-3 space-y-2">
        <p className={`text-[12px] font-semibold uppercase tracking-wide ${hasOffers ? 'text-white/60' : 'text-stone-400'}`}>Ofertas flash</p>
        {flashOffers.map(o => <Link key={o.id} to={`/products/${o.product?.slug || o.product_id}`} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2 no-underline">
          {o.product?.image && <img src={o.product.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white m-0 truncate">{o.product?.name || 'Producto'}</p>
            <p className="text-[11px] text-white/60 m-0">
              -{o.discount_value}{o.discount_type === 'percentage' ? '%' : '€'} · Expira {formatRelativeTime(o.expires_at)}
            </p>
          </div>
        </Link>)}
      </div>}

      {!hasOffers && <p className={`text-sm text-center m-0 ${hasOffers ? 'text-white/70' : 'text-stone-500'}`}>
        Próximamente — El productor podrá ofrecer descuentos exclusivos para miembros
      </p>}
    </div>
  </div>;
};

/* ── Report Modal ── */
const ReportModal = ({ contentType, contentId, onClose }) => {
  const REASONS = [
    { id: 'spam', label: 'Spam' },
    { id: 'offensive', label: 'Contenido ofensivo' },
    { id: 'harassment', label: 'Acoso' },
    { id: 'misinformation', label: 'Desinformación' },
    { id: 'irrelevant', label: 'No relacionado' },
    { id: 'other', label: 'Otro motivo' },
  ];
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason) { toast.error('Selecciona un motivo'); return; }
    setSending(true);
    try {
      await apiClient.post('/communities/reports', { content_type: contentType, content_id: contentId, reason, details: details.trim() });
      toast.success('Reporte enviado. Gracias.');
      onClose();
    } catch { toast.error('Error al enviar reporte'); } finally { setSending(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-[400px] bg-white rounded-t-3xl sm:rounded-3xl p-5 mx-4 mb-0 sm:mb-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-stone-950 m-0">Reportar {contentType === 'post' ? 'publicación' : contentType === 'comment' ? 'comentario' : 'contenido'}</h3>
        <button onClick={onClose} className="bg-stone-100 border-none cursor-pointer p-1.5 rounded-full text-stone-500 hover:bg-stone-200 transition-colors"><X size={16} strokeWidth={2} /></button>
      </div>
      <div className="flex flex-col gap-1.5 mb-4">
        {REASONS.map(r => <button key={r.id} onClick={() => setReason(r.id)} className={`text-left px-3.5 py-3 rounded-2xl text-[13px] font-medium cursor-pointer transition-all ${reason === r.id ? 'bg-stone-950 text-white border-none' : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'}`}>
          {r.label}
        </button>)}
      </div>
      <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Detalles adicionales (opcional)" rows={2} maxLength={500} className="w-full resize-none px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-[13px] text-stone-950 outline-none mb-4 box-border placeholder:text-stone-400" />
      <button onClick={submit} disabled={sending || !reason} className="w-full py-3 rounded-full bg-stone-950 text-white text-[13px] font-medium border-none cursor-pointer disabled:opacity-40 transition-opacity">
        {sending ? 'Enviando...' : 'Enviar reporte'}
      </button>
    </motion.div>
  </div>;
};