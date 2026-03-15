import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
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
      <span key={i} style={{ color: 'var(--color-green)', fontWeight: 500 }}>{part}</span>
    ) : part
  );
};

export default function CommunityPage() {
  const { slug } = useParams();
  const [tab, setTab] = useState('feed');
  const { user } = useAuth();

  const { data: community, isLoading, refetch } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => apiClient.get(`/communities/${slug}`),
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 16, background: 'var(--color-cream)', minHeight: '100vh' }}>
        <div style={{ height: 140, borderRadius: 'var(--radius-md)', marginBottom: 16, background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 24, width: '60%', borderRadius: 6, marginBottom: 8, background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 16, width: '40%', borderRadius: 6, background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    );
  }

  if (!community) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-stone)', background: 'var(--color-cream)', minHeight: '100vh' }}>
        <p style={{ fontSize: 48 }}>🔍</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-black)' }}>Comunidad no encontrada</p>
        <Link to="/communities" style={{ color: 'var(--color-black)', fontSize: 14, textDecoration: 'underline' }}>
          Volver a comunidades
        </Link>
      </div>
    );
  }

  const isMember = community.is_member;
  const isAdmin = community.is_admin || user?.id === community.creator_id;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 100, background: 'var(--color-cream)', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ position: 'relative' }}>
        <div style={{
          height: 140, overflow: 'hidden',
          background: community.cover_image
            ? 'var(--color-surface)'
            : `hsl(${(community.name.charCodeAt(0) * 7) % 360},40%,70%)`,
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
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between', marginTop: 12, marginBottom: 8,
          }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px', color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
                {community.name}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--color-stone)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                {community.member_count?.toLocaleString()} miembros
                {' · '}Creada por @{community.creator_username}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {isAdmin && (
                <Link to={`/communities/${slug}/settings`}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', color: 'var(--color-stone)',
                    fontSize: 12, fontWeight: 600, textDecoration: 'none',
                    display: 'flex', alignItems: 'center',
                  }}>
                  ⚙️
                </Link>
              )}
              <JoinButton communityId={community.id || community._id} isMember={isMember} onToggle={refetch} />
            </div>
          </div>

          {community.description && (
            <p style={{ fontSize: 14, color: 'var(--color-black)', lineHeight: 1.5, margin: '0 0 12px', fontFamily: 'var(--font-sans)' }}>
              {community.description}
            </p>
          )}

          {community.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {community.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 11, padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-stone)',
                  fontFamily: 'var(--font-sans)',
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-white)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        {[
          { id: 'feed', label: 'Feed' },
          { id: 'members', label: 'Miembros' },
          { id: 'about', label: 'Info' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: 13,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14,
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--color-black)' : 'var(--color-stone)',
              borderBottom: tab === t.id ? '1.5px solid var(--color-black)' : '1.5px solid transparent',
              transition: 'all 0.15s ease',
              fontFamily: 'var(--font-sans)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
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
        padding: '6px 14px', borderRadius: 'var(--radius-full)',
        border: joined ? '1px solid var(--color-border)' : 'none',
        background: joined ? 'var(--color-white)' : 'var(--color-black)',
        color: joined ? 'var(--color-stone)' : '#fff',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'var(--font-sans)',
      }}>
      {loading ? '...' : joined ? 'Unida ✓' : 'Unirse'}
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
            background: 'var(--color-cream)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            textAlign: 'left', cursor: 'pointer',
            fontSize: 14, color: 'var(--color-stone)',
            marginBottom: 14, transition: 'all 0.15s ease',
            fontFamily: 'var(--font-sans)',
          }}>
          ✍️ Comparte algo con la comunidad...
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
          <div key={i} style={{ height: 120, borderRadius: 'var(--radius-md)', marginBottom: 10, background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-stone)' }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>💬</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)' }}>Aún no hay posts</p>
          <p style={{ fontSize: 13 }}>
            {isMember ? '¡Sé el primero en publicar algo!' : 'Únete a la comunidad para ver y publicar contenido'}
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
                borderRadius: 'var(--radius-full)',
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

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.post('/upload/product-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
        borderRadius: 'var(--radius-lg)',
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
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />
          <button onClick={() => { setImagePreview(null); setImageUrl(null); }}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              border: 'none', borderRadius: '50%',
              width: 26, height: 26, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ×
          </button>
          {isUploading && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 8,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 24, height: 24, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => fileRef.current?.click()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-stone)', fontSize: 20, padding: 4 }}
          title="Añadir imagen">
          📷
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
        <span style={{ fontSize: 11, color: 'var(--color-stone)', flex: 1, fontFamily: 'var(--font-sans)' }}>{text.length}/1000</span>
        <button onClick={onClose}
          style={{
            padding: '6px 12px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)', background: 'var(--color-white)',
            color: 'var(--color-stone)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}>
          Cancelar
        </button>
        <button onClick={submit} disabled={isPosting || isUploading}
          style={{
            padding: '6px 12px', borderRadius: 'var(--radius-full)',
            border: 'none', background: 'var(--color-black)', color: '#fff',
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
      borderRadius: 'var(--radius-lg)',
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
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-stone)', padding: 4 }}>
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
            fontSize: 13, color: liked ? '#FF375F' : 'var(--color-stone)',
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

  return (
    <div style={{ padding: '12px 16px' }}>
      {(data?.members || []).map(member => (
        <Link key={member.id || member._id || member.user_id} to={`/${member.username}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0',
            borderBottom: '1px solid var(--color-border)',
            textDecoration: 'none', color: 'inherit',
          }}>
          <img
            src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.username}&size=40`}
            style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} alt="" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>{member.username}</p>
            <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: 0, fontFamily: 'var(--font-sans)' }}>
              {member.is_admin ? '👑 Admin' : ''}
              {member.is_seller ? ' · ✓ Vendedor' : ''}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

/* ── About Tab ── */
const CommunityAbout = ({ community }) => (
  <div style={{ padding: '20px 16px' }}>
    {community.description && (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>Descripción</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
          {community.description}
        </p>
      </div>
    )}
    {[
      { label: 'Fundada', value: new Date(community.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) },
      { label: 'Miembros', value: community.member_count?.toLocaleString() },
      { label: 'Posts', value: community.post_count?.toLocaleString() },
      { label: 'Creada por', value: `@${community.creator_username}` },
    ].map(row => (
      <div key={row.label} style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: 14,
        fontFamily: 'var(--font-sans)',
      }}>
        <span style={{ color: 'var(--color-stone)' }}>{row.label}</span>
        <span style={{ fontWeight: 600, color: 'var(--color-black)' }}>{row.value}</span>
      </div>
    ))}
    <div style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>Normas de la comunidad</h3>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)', padding: '12px 14px',
      }}>
        {[
          'Contenido relacionado con alimentación y gastronomía',
          'Trato respetuoso entre miembros',
          'Sin spam ni publicidad no autorizada',
          'Sin bebidas alcohólicas',
          'El admin puede eliminar posts que no cumplan las normas',
        ].map((rule, i) => (
          <p key={i} style={{ fontSize: 13, color: 'var(--color-black)', margin: '0 0 6px', display: 'flex', gap: 8, fontFamily: 'var(--font-sans)' }}>
            <span style={{ color: 'var(--color-stone)', flexShrink: 0 }}>{i + 1}.</span>
            {rule}
          </p>
        ))}
      </div>
    </div>
  </div>
);
