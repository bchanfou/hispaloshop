import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Users, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
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
      <span key={i} style={{ color: 'var(--color-black)', fontWeight: 600 }}>{part}</span>
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

  const { data: community, isLoading, refetch } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => apiClient.get(`/communities/${slug}`),
  });

  const font = { fontFamily: 'var(--font-sans)' };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        }}>
          <button onClick={() => navigate(-1)}
            aria-label="Volver"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={22} color="var(--color-black)" />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>Comunidad</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={28} color="var(--color-stone)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (!community) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        }}>
          <button onClick={() => navigate(-1)}
            aria-label="Volver"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={22} color="var(--color-black)" />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>Comunidad</span>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, padding: '60px 16px',
        }}>
          <Users size={56} color="var(--color-stone)" strokeWidth={1} />
          <p style={{ fontSize: 15, color: 'var(--color-stone)' }}>Comunidad no encontrada</p>
          <Link to="/communities" style={{
            padding: '10px 24px', background: 'var(--color-black)',
            color: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
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
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', paddingBottom: 100, ...font }}>
      {/* ── Topbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Volver">
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{
          fontSize: 17, fontWeight: 700, color: 'var(--color-black)', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {community.name}
        </span>
        {isAdmin && (
          <Link to={`/communities/${slug}/settings`}
            aria-label="Configuración"
            style={{ display: 'flex', padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', color: 'var(--color-stone)' }}>
            <Settings size={20} />
          </Link>
        )}
      </div>

      {/* ── Cover Image (3:1) ── */}
      <div style={{ position: 'relative' }}>
        <div style={{
          aspectRatio: '3/1', overflow: 'hidden',
          background: community.cover_image
            ? 'var(--color-surface)'
            : ['#d6d3d1','#a8a29e','#78716c','#57534e','#44403c'][community.name.charCodeAt(0) % 5],
        }}>
          {community.cover_image ? (
            <img src={community.cover_image} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56,
            }}>
              {community.emoji || '🌿'}
            </div>
          )}
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
          }} />
          {/* Name + stats overlay */}
          <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-white)', margin: '0 0 4px', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              {community.name}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
              {community.member_count?.toLocaleString()} miembros · @{community.creator_username}
            </p>
          </div>
        </div>
      </div>

      {/* ── Info + Join ── */}
      <div style={{ padding: '12px 16px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {community.description && (
            <p style={{ fontSize: 14, color: 'var(--color-black)', lineHeight: 1.5, margin: 0, flex: 1, marginRight: 12 }}>
              {community.description}
            </p>
          )}
          <JoinButton communityId={community.id || community._id} isMember={isMember} onToggle={refetch} />
        </div>

        {community.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {community.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 11, padding: '3px 10px',
                borderRadius: 'var(--radius-full, 999px)',
                background: 'var(--color-surface)',
                color: 'var(--color-stone)', ...font,
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-white)',
        position: 'sticky', top: 50, zIndex: 39,
        maxWidth: 600, margin: '0 auto',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '12px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--color-black)' : 'var(--color-stone)',
              borderBottom: tab === t.id ? '2px solid var(--color-black)' : '2px solid transparent',
              transition: 'var(--transition-fast)', ...font,
            }}>
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

  const toggle = async () => {
    setLoading(true);
    try {
      if (joined) {
        await apiClient.delete(`/communities/${communityId}/join`);
      } else {
        await apiClient.post(`/communities/${communityId}/join`);
      }
      setJoined(!joined);
      onToggle?.();
    } catch {
      toast.error('Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={toggle}
      disabled={loading}
      style={{
        padding: '8px 20px', borderRadius: 'var(--radius-full, 999px)',
        border: joined ? '1px solid var(--color-border)' : 'none',
        background: joined ? 'var(--color-white)' : 'var(--color-black)',
        color: joined ? 'var(--color-stone)' : 'var(--color-white)',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'var(--transition-fast)',
        fontFamily: 'var(--font-sans)',
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

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['community-feed', communityId],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get(`/communities/${communityId}/posts?page=${pageParam}&limit=10`),
    getNextPageParam: last => last.has_more ? last.page + 1 : undefined,
    enabled: !!communityId,
  });

  const refetchFeed = () => queryClient.invalidateQueries({ queryKey: ['community-feed', communityId] });
  const posts = data?.pages.flatMap(p => p.posts) ?? [];

  return (
    <div style={{ padding: '12px 16px' }}>
      {isMember && (
        <button onClick={() => setShowPostForm(!showPostForm)}
          style={{
            width: '100%', padding: '12px 16px',
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full, 999px)',
            textAlign: 'left', cursor: 'pointer',
            fontSize: 14, color: 'var(--color-stone)',
            marginBottom: 14, transition: 'var(--transition-fast)',
            fontFamily: 'var(--font-sans)',
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
            height: 120, borderRadius: 'var(--radius-xl)',
            marginBottom: 10, background: 'var(--color-surface)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))
      ) : posts.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8, padding: '40px 0', color: 'var(--color-stone)',
        }}>
          <Users size={48} strokeWidth={1} color="var(--color-stone)" />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>Aún no hay posts</p>
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
                borderRadius: 'var(--radius-full, 999px)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-white)',
                color: 'var(--color-stone)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
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
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        padding: 14, marginBottom: 14,
      }}>
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder="¿Qué quieres compartir? Puedes usar #hashtags"
        rows={3} maxLength={1000}
        style={{
          resize: 'none', marginBottom: 10, lineHeight: 1.5,
          width: '100%', padding: '10px 12px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          outline: 'none', color: 'var(--color-black)',
          fontFamily: 'var(--font-sans)', fontSize: 14,
          boxSizing: 'border-box',
        }}
        autoFocus
      />

      {imagePreview && (
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <img src={imagePreview} alt=""
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
          <button onClick={() => { setImagePreview(null); setImageUrl(null); }}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.6)', color: 'var(--color-white)',
              border: 'none', borderRadius: '50%',
              width: 26, height: 26, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ×
          </button>
          {isUploading && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'var(--radius-md)',
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--color-white)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => fileRef.current?.click()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-stone)', fontSize: 20, padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Subir imagen"
          title="Añadir imagen">
          📷
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
        <span style={{ fontSize: 11, color: 'var(--color-stone)', flex: 1, fontFamily: 'var(--font-sans)' }}>{text.length}/1000</span>
        <button onClick={onClose}
          style={{
            padding: '6px 12px', borderRadius: 'var(--radius-full, 999px)',
            border: '1px solid var(--color-border)', background: 'var(--color-white)',
            color: 'var(--color-stone)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}>
          Cancelar
        </button>
        <button onClick={submit} disabled={isPosting || isUploading}
          style={{
            padding: '6px 12px', borderRadius: 'var(--radius-full, 999px)',
            border: 'none', background: 'var(--color-black)', color: 'var(--color-white)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            opacity: (isPosting || isUploading) ? 0.5 : 1,
            fontFamily: 'var(--font-sans)',
          }}>
          {isPosting ? '...' : 'Publicar'}
        </button>
      </div>
    </motion.div>
  );
};

/* ── Post Card ── */
const CommunityPostCard = ({ post, isAdmin, onDelete }) => {
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
    <div style={{
      background: 'var(--color-white)',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--color-border)',
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
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
              {post.author_username}
              {post.author_is_seller && (
                <span style={{
                  marginLeft: 6, fontSize: 9,
                  padding: '1px 6px', borderRadius: 4,
                  background: 'var(--color-surface)', color: 'var(--color-stone)',
                  fontWeight: 600,
                }}>
                  Vendedor
                </span>
              )}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: 0, fontFamily: 'var(--font-sans)' }}>
              {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </Link>
        {(isOwn || isAdmin) && (
          <button onClick={deletePost}
            aria-label="Opciones"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-stone)', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ···
          </button>
        )}
      </div>

      {/* Content */}
      {post.text && (
        <div style={{ padding: '0 14px 12px' }}>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--color-black)', margin: 0, fontFamily: 'var(--font-sans)' }}>
            {renderTextWithHashtags(post.text)}
          </p>
        </div>
      )}

      {post.image_url && (
        <img src={post.image_url} alt=""
          style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }} />
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, padding: '10px 14px', borderTop: '1px solid var(--color-border)' }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleLike}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 13, color: liked ? 'var(--color-black)' : 'var(--color-stone)',
            fontWeight: liked ? 700 : 400, padding: 0,
            fontFamily: 'var(--font-sans)',
          }}>
          <span style={{ fontSize: 18 }}>{liked ? '❤️' : '🤍'}</span>
          {likes > 0 && likes}
        </motion.button>

        <span style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 13, color: 'var(--color-stone)',
          fontFamily: 'var(--font-sans)',
        }}>
          <span style={{ fontSize: 18 }}>💬</span>
          {post.comments_count > 0 && post.comments_count}
        </span>

        <button
          onClick={async () => {
            await navigator.clipboard.writeText(`${window.location.origin}/community-posts/${postId}`);
            toast.success('Enlace copiado');
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 13, color: 'var(--color-stone)', padding: 0,
          }}>
          <span style={{ fontSize: 18 }}>↗️</span>
        </button>
      </div>
    </div>
  );
};

/* ── Members Tab ── */
const CommunityMembers = ({ communityId }) => {
  const { data } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: () => apiClient.get(`/communities/${communityId}/members?limit=30`),
  });

  const members = data?.members || [];

  return (
    <div style={{ padding: '12px 16px' }}>
      {members.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-stone)', fontSize: 14 }}>
          Sin miembros todavía
        </p>
      ) : (
        members.map(member => (
          <Link key={member.id || member._id || member.user_id} to={`/${member.username}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: '1px solid var(--color-border)',
              textDecoration: 'none', color: 'inherit',
            }}>
            <img
              src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.username}&size=44`}
              style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} alt="" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
                {member.username}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                {member.is_admin && '👑 Admin'}
                {member.is_seller && (member.is_admin ? ' · ' : '') + '✓ Vendedor'}
              </p>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full, 999px)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-white)', color: 'var(--color-black)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', flexShrink: 0,
              }}>
              Seguir
            </button>
          </Link>
        ))
      )}
    </div>
  );
};

/* ── About Tab ── */
const CommunityAbout = ({ community }) => (
  <div style={{ padding: '20px 16px' }}>
    {community.description && (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: '0 0 8px' }}>
          Descripción
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {community.description}
        </p>
      </div>
    )}

    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-xl)', padding: 16, marginBottom: 20,
    }}>
      {[
        { label: 'Fundada', value: new Date(community.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) },
        { label: 'Miembros', value: community.member_count?.toLocaleString() },
        { label: 'Posts', value: community.post_count?.toLocaleString() },
        { label: 'Creada por', value: `@${community.creator_username}` },
      ].map((row, i, arr) => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
          fontSize: 14, fontFamily: 'var(--font-sans)',
        }}>
          <span style={{ color: 'var(--color-stone)' }}>{row.label}</span>
          <span style={{ fontWeight: 600, color: 'var(--color-black)' }}>{row.value}</span>
        </div>
      ))}
    </div>

    {community.categories?.length > 0 && (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>Categorías</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {community.categories.map(cat => (
            <span key={cat} style={{
              fontSize: 12, padding: '5px 12px',
              borderRadius: 'var(--radius-full, 999px)',
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-black)', fontWeight: 500,
              fontFamily: 'var(--font-sans)',
            }}>
              {cat}
            </span>
          ))}
        </div>
      </div>
    )}

    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
        Normas de la comunidad
      </h3>
      <div style={{
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', padding: '12px 14px',
      }}>
        {[
          'Contenido relacionado con alimentación y gastronomía',
          'Trato respetuoso entre miembros',
          'Sin spam ni publicidad no autorizada',
          'Sin bebidas alcohólicas',
          'El admin puede eliminar posts que no cumplan las normas',
        ].map((rule, i) => (
          <p key={i} style={{ fontSize: 13, color: 'var(--color-black)', margin: i < 4 ? '0 0 6px' : 0, display: 'flex', gap: 8, fontFamily: 'var(--font-sans)' }}>
            <span style={{ color: 'var(--color-stone)', flexShrink: 0 }}>{i + 1}.</span>
            {rule}
          </p>
        ))}
      </div>
    </div>
  </div>
);
