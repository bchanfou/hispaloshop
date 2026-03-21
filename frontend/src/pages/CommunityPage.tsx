// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Users, Settings, RefreshCw, Pin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

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
      <span key={i} style={{ color: '#0c0a09', fontWeight: 600 }}>{part}</span>
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

  const font = { fontFamily: 'inherit' };

  if (isError) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafaf9', ...font }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: '#ffffff',
          borderBottom: '1px solid #e7e5e4',
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        }}>
          <button onClick={() => navigate(-1)}
            aria-label="Volver"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={22} color="#0c0a09" />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0c0a09' }}>Comunidad</span>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, padding: '60px 16px',
        }}>
          <Users size={56} color="#78716c" strokeWidth={1} />
          <p style={{ fontSize: 15, color: '#78716c' }}>Error al cargar la comunidad</p>
          <button onClick={() => refetch()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', background: '#ffffff',
              color: '#0c0a09', borderRadius: '9999px',
              border: '1px solid #e7e5e4',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
            aria-label="Reintentar carga">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafaf9', ...font }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: '#ffffff',
          borderBottom: '1px solid #e7e5e4',
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        }}>
          <button onClick={() => navigate(-1)}
            aria-label="Volver"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={22} color="#0c0a09" />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0c0a09' }}>Comunidad</span>
        </div>
        <div style={{ padding: '0 16px' }} aria-busy="true" aria-label="Cargando comunidad">
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
      <div style={{ minHeight: '100vh', background: '#fafaf9', ...font }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: '#ffffff',
          borderBottom: '1px solid #e7e5e4',
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        }}>
          <button onClick={() => navigate(-1)}
            aria-label="Volver"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={22} color="#0c0a09" />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0c0a09' }}>Comunidad</span>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, padding: '60px 16px',
        }}>
          <Users size={56} color="#78716c" strokeWidth={1} />
          <p style={{ fontSize: 15, color: '#78716c' }}>Comunidad no encontrada</p>
          <Link to="/communities" style={{
            padding: '10px 24px', background: '#0c0a09',
            color: '#ffffff', borderRadius: '9999px',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            Volver a comunidades
          </Link>
        </div>
      </div>
    );
  }

  const isMember = community.is_member;
  const isAdmin = community.is_admin || user?.id === community.creator_id;

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', paddingBottom: 100, ...font }}>
      {/* ── Topbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: '#ffffff',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Volver">
          <ArrowLeft size={22} color="#0c0a09" />
        </button>
        <span style={{
          fontSize: 17, fontWeight: 700, color: '#0c0a09', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {community.name}
        </span>
        {isAdmin && (
          <Link to={`/communities/${slug}/settings`}
            aria-label="Configuración"
            style={{ display: 'flex', padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', color: '#78716c' }}>
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
            <h1 className="text-xl font-bold text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
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
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-[50px] z-[39] mx-auto flex max-w-[600px] border-b border-stone-200 bg-white">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 cursor-pointer border-b-2 bg-transparent py-3 text-sm transition-colors ${
              tab === t.id
                ? 'border-stone-950 font-semibold text-stone-950'
                : 'border-transparent text-stone-500'
            }`}
            style={{ fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
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
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'fixed', top: 110, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
          >
            <button
              onClick={handleNewPostsPill}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px',
                background: '#0c0a09', color: '#ffffff',
                borderRadius: '9999px',
                border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
              aria-label="Ver nuevos posts"
            >
              ↑ Ver nuevos posts
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
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
      toast.error('Error al actualizar membresía');
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
      style={{
        padding: '8px 20px', borderRadius: '9999px',
        border: joined ? '1px solid #e7e5e4' : 'none',
        background: joined ? '#ffffff' : '#0c0a09',
        color: joined ? '#78716c' : '#ffffff',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
        flexShrink: 0,
      }}>
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
    getNextPageParam: last => last?.has_more ? (last?.page || 1) + 1 : undefined,
    enabled: !!communityId,
  });

  const refetchFeed = () => queryClient.invalidateQueries({ queryKey: ['community-feed', communityId] });
  const posts = data?.pages?.flatMap(p => p?.posts || []) ?? [];

  return (
    <div style={{ padding: '12px 16px' }}>
      {isMember && (
        <button onClick={() => setShowPostForm(!showPostForm)}
          style={{
            width: '100%', padding: '12px 16px',
            background: '#ffffff',
            border: '1px solid #e7e5e4',
            borderRadius: '9999px',
            textAlign: 'left', cursor: 'pointer',
            fontSize: 14, color: '#78716c',
            marginBottom: 14, transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}>
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
          <div key={i} style={{
            height: 120, borderRadius: '16px',
            marginBottom: 10, background: '#f5f5f4',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))
      ) : isError ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8, padding: '40px 0', color: '#78716c',
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09', margin: 0 }}>Error al cargar posts</p>
          <button onClick={() => refetchQuery()}
            aria-label="Reintentar carga de posts"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '9999px',
              border: '1px solid #e7e5e4', background: '#ffffff',
              color: '#0c0a09', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8, padding: '40px 0', color: '#78716c',
        }}>
          <Users size={48} strokeWidth={1} color="#78716c" />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0c0a09', margin: 0 }}>Aún no hay posts</p>
          <p style={{ fontSize: 13, margin: 0 }}>
            {isMember ? '¡Sé el primero en publicar algo!' : 'Únete para ver y publicar contenido'}
          </p>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <CommunityPostCard key={post.id || post._id} post={post} isAdmin={isAdmin} onDelete={refetchFeed} />
          ))}
          {hasNextPage && (
            <button onClick={() => fetchNextPage()}
              style={{
                width: '100%', marginTop: 8, padding: '10px',
                borderRadius: '9999px',
                border: '1px solid #e7e5e4',
                background: '#ffffff',
                color: '#78716c',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
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
      toast.error('Escribe algo o añade una imagen');
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
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e7e5e4',
        padding: 14, marginBottom: 14,
      }}>
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder="¿Qué quieres compartir? Puedes usar #hashtags"
        rows={3} maxLength={1000}
        style={{
          resize: 'none', marginBottom: 10, lineHeight: 1.5,
          width: '100%', padding: '10px 12px',
          background: '#f5f5f4',
          border: '1px solid #e7e5e4',
          borderRadius: '12px',
          outline: 'none', color: '#0c0a09',
          fontFamily: 'inherit', fontSize: 14,
          boxSizing: 'border-box',
        }}
        autoFocus
      />

      {imagePreview && (
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <img loading="lazy" src={imagePreview} alt=""
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: '12px' }} />
          <button onClick={() => { setImagePreview(null); setImageUrl(null); }}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.6)', color: '#ffffff',
              border: 'none', borderRadius: '50%',
              width: 26, height: 26, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ×
          </button>
          {isUploading && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '12px',
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 24, height: 24, border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => fileRef.current?.click()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716c', fontSize: 20, padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Subir imagen"
          title="Añadir imagen">
          📷
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
        <span style={{ fontSize: 11, color: '#78716c', flex: 1, fontFamily: 'inherit' }}>{text.length}/1000</span>
        <button onClick={onClose}
          style={{
            padding: '6px 12px', borderRadius: '9999px',
            border: '1px solid #e7e5e4', background: '#ffffff',
            color: '#78716c', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
          Cancelar
        </button>
        <button onClick={submit} disabled={isPosting || isUploading}
          style={{
            padding: '6px 12px', borderRadius: '9999px',
            border: 'none', background: '#0c0a09', color: '#ffffff',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            opacity: (isPosting || isUploading) ? 0.5 : 1,
            fontFamily: 'inherit',
          }}>
          {isPosting ? '...' : 'Publicar'}
        </button>
      </div>
    </motion.div>
  );
};

/* ── Post Card ── */
const CommunityPostCard = ({ post, isAdmin, onDelete }) => {
  // G4 — pinned indicator rendered above the card wrapper
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.is_liked);
  const [likes, setLikes] = useState(post.likes_count || 0);
  const isOwn = user?.id === post.author_id;
  const postId = post.id || post._id;

  const toggleLike = async () => {
    setLiked(!liked);
    setLikes(l => liked ? l - 1 : l + 1);
    try {
      if (liked) {
        await apiClient.delete(`/community-posts/${postId}/like`);
      } else {
        await apiClient.post(`/community-posts/${postId}/like`);
      }
    } catch {
      setLiked(liked);
      setLikes(post.likes_count || 0);
    }
  };

  const deletePost = async () => {
    if (!window.confirm('¿Eliminar este post?')) return;
    try {
      await apiClient.delete(`/community-posts/${postId}`);
      toast.success('Post eliminado');
      onDelete();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div>
      {/* G4 — Pinned indicator */}
      {post.is_pinned && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}
          className="flex items-center gap-1 text-xs text-stone-500 mb-1">
          <Pin size={12} color="#78716c" />
          <span style={{ fontSize: 11, color: '#78716c', fontFamily: 'inherit' }}>Fijado</span>
        </div>
      )}
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e7e5e4',
      marginBottom: 10, overflow: 'hidden',
    }}>
      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
        <Link to={`/${post.author_username}`}
          style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <img
            src={post.author_avatar || `https://ui-avatars.com/api/?name=${post.author_username}&size=36`}
            style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
            alt="" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#0c0a09', fontFamily: 'inherit' }}>
              {post.author_username}
              {post.author_is_seller && (
                <span style={{
                  marginLeft: 6, fontSize: 9,
                  padding: '1px 6px', borderRadius: 4,
                  background: '#f5f5f4', color: '#78716c',
                  fontWeight: 600,
                }}>
                  Vendedor
                </span>
              )}
            </p>
            <p style={{ fontSize: 11, color: '#78716c', margin: 0, fontFamily: 'inherit' }}>
              {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </Link>
        {(isOwn || isAdmin) && (
          <button onClick={deletePost}
            aria-label="Eliminar post"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#78716c', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ···
          </button>
        )}
      </div>

      {/* Content */}
      {post.text && (
        <div style={{ padding: '0 14px 12px' }}>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: '#0c0a09', margin: 0, fontFamily: 'inherit' }}>
            {renderTextWithHashtags(post.text)}
          </p>
        </div>
      )}

      {post.image_url && (
        <img loading="lazy" src={post.image_url} alt="Imagen del post"
          loading="lazy"
          style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }} />
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, padding: '10px 14px', borderTop: '1px solid #e7e5e4' }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleLike}
          aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 13, color: liked ? '#0c0a09' : '#78716c',
            fontWeight: liked ? 700 : 400, padding: 0,
            fontFamily: 'inherit',
          }}>
          <span style={{ fontSize: 18 }}>{liked ? '❤️' : '🤍'}</span>
          {likes > 0 && likes}
        </motion.button>

        <span style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 13, color: '#78716c',
          fontFamily: 'inherit',
        }}>
          <span style={{ fontSize: 18 }}>💬</span>
          {post.comments_count > 0 && post.comments_count}
        </span>

        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${window.location.origin}/community-posts/${postId}`);
              toast.success('Enlace copiado');
            } catch {
              toast.error('No se pudo copiar el enlace');
            }
          }}
          aria-label="Compartir post"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 13, color: '#78716c', padding: 0,
          }}>
          <span style={{ fontSize: 18 }}>↗️</span>
        </button>
      </div>
    </div>
    </div>
  );
};

/* ── Members Tab ── */
const CommunityMembers = ({ communityId }) => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['community-members', communityId, page],
    queryFn: () => apiClient.get(`/communities/${communityId}/members?limit=30&page=${page}`),
  });

  const members = data?.members || [];
  const hasMore = data?.has_more || false;

  const handleFollow = async (e, member) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await apiClient.post(`/users/${member.user_id}/follow`);
      toast.success(`Siguiendo a ${member.username || 'usuario'}`);
    } catch {
      toast.error('Error al seguir');
    }
  };

  return (
    <div style={{ padding: '12px 16px' }}>
      {isLoading ? (
        Array(4).fill(0).map((_, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
            borderBottom: '1px solid #e7e5e4',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f5f5f4', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: 100, height: 14, borderRadius: 4, background: '#f5f5f4', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 4 }} />
              <div style={{ width: 60, height: 10, borderRadius: 4, background: '#f5f5f4', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        ))
      ) : isError ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ color: '#78716c', fontSize: 14, marginBottom: 8 }}>Error al cargar miembros</p>
          <button onClick={() => refetch()}
            aria-label="Reintentar carga de miembros"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '9999px',
              border: '1px solid #e7e5e4', background: '#ffffff',
              color: '#0c0a09', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      ) : members.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '24px 0', color: '#78716c', fontSize: 14 }}>
          Sin miembros todavía
        </p>
      ) : (
        <>
          {members.map(member => {
            const isOwnProfile = user?.id === member.user_id || user?.user_id === member.user_id;
            return (
              <Link key={member.id || member._id || member.user_id} to={`/${member.username || member.user_id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid #e7e5e4',
                  textDecoration: 'none', color: 'inherit',
                }}>
                <img
                  src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.username || 'U')}&size=44`}
                  style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }}
                  alt={member.username ? `Avatar de ${member.username}` : ''}
                  loading="lazy" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#0c0a09', fontFamily: 'inherit' }}>
                    {member.username || 'Usuario'}
                  </p>
                  <p style={{ fontSize: 11, color: '#78716c', margin: 0, fontFamily: 'inherit' }}>
                    {member.is_admin && '👑 Admin'}
                    {member.is_seller && (member.is_admin ? ' · ' : '') + '✓ Vendedor'}
                  </p>
                </div>
                {!isOwnProfile && (
                  <button
                    onClick={(e) => handleFollow(e, member)}
                    aria-label={`Seguir a ${member.username || 'usuario'}`}
                    style={{
                      padding: '6px 14px', borderRadius: '9999px',
                      border: '1px solid #e7e5e4',
                      background: '#ffffff', color: '#0c0a09',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit', flexShrink: 0,
                    }}>
                    Seguir
                  </button>
                )}
              </Link>
            );
          })}
          {hasMore && (
            <button onClick={() => setPage(p => p + 1)}
              style={{
                width: '100%', marginTop: 8, padding: '10px',
                borderRadius: '9999px',
                border: '1px solid #e7e5e4',
                background: '#ffffff', color: '#78716c',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
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
  <div style={{ padding: '20px 16px' }}>
    {community.description && (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#0c0a09', fontFamily: 'inherit', margin: '0 0 8px' }}>
          Descripción
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#0c0a09', fontFamily: 'inherit', margin: 0 }}>
          {community.description}
        </p>
      </div>
    )}

    <div style={{
      background: '#f5f5f4',
      borderRadius: '16px', padding: 16, marginBottom: 20,
    }}>
      {[
        { label: 'Fundada', value: community.created_at ? new Date(community.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : '—' },
        { label: 'Miembros', value: community.member_count?.toLocaleString() },
        { label: 'Posts', value: community.post_count?.toLocaleString() },
        { label: 'Creada por', value: `@${community.creator_username}` },
      ].map((row, i, arr) => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: i < arr.length - 1 ? '1px solid #e7e5e4' : 'none',
          fontSize: 14, fontFamily: 'inherit',
        }}>
          <span style={{ color: '#78716c' }}>{row.label}</span>
          <span style={{ fontWeight: 600, color: '#0c0a09' }}>{row.value}</span>
        </div>
      ))}
    </div>

    {community.categories?.length > 0 && (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#0c0a09', fontFamily: 'inherit' }}>Categorías</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {community.categories.map(cat => (
            <span key={cat} style={{
              fontSize: 12, padding: '5px 12px',
              borderRadius: '9999px',
              background: '#ffffff',
              border: '1px solid #e7e5e4',
              color: '#0c0a09', fontWeight: 500,
              fontFamily: 'inherit',
            }}>
              {cat}
            </span>
          ))}
        </div>
      </div>
    )}

    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#0c0a09', fontFamily: 'inherit' }}>
        Normas de la comunidad
      </h3>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e7e5e4',
        borderRadius: '16px', padding: '12px 14px',
      }}>
        {[
          'Contenido relacionado con alimentación y gastronomía',
          'Trato respetuoso entre miembros',
          'Sin spam ni publicidad no autorizada',
          'Sin bebidas alcohólicas',
          'El admin puede eliminar posts que no cumplan las normas',
        ].map((rule, i) => (
          <p key={i} style={{ fontSize: 13, color: '#0c0a09', margin: i < 4 ? '0 0 6px' : 0, display: 'flex', gap: 8, fontFamily: 'inherit' }}>
            <span style={{ color: '#78716c', flexShrink: 0 }}>{i + 1}.</span>
            {rule}
          </p>
        ))}
      </div>
    </div>
  </div>
);
