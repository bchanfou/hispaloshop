import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Send, Loader2, Trash2 } from 'lucide-react';
import PostCard from '../components/feed/PostCard';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { toast } from 'sonner';

const font = { fontFamily: 'var(--font-sans)' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}sem`;
}

export default function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [likedComments, setLikedComments] = useState(new Set());
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;
    apiClient.get(`/posts/${postId}`)
      .then((data) => { if (active) setPost(data?.post || data); })
      .catch(() => { if (active) setPost(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId]);

  const fetchComments = useCallback(() => {
    setCommentsLoading(true);
    apiClient.get(`/posts/${postId}/comments?limit=50`)
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSendComment = async () => {
    const text = newComment.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const comment = await apiClient.post(`/posts/${postId}/comments`, { text });
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setPost(prev => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
    } catch {
      toast.error('Error al enviar comentario');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await apiClient.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.comment_id !== commentId));
      setPost(prev => prev ? { ...prev, comments_count: Math.max(0, (prev.comments_count || 1) - 1) } : prev);
    } catch {
      toast.error('Error al eliminar comentario');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
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

  /* ── Not found ── */
  if (!post) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: 'var(--color-cream)', ...font,
      }}>
        <p style={{ fontSize: 15, color: 'var(--color-stone)' }}>Post no encontrado</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 24px', background: 'var(--color-black)', color: 'var(--color-white)',
            border: 'none', borderRadius: 'var(--radius-full)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', ...font,
          }}
        >
          Volver al feed
        </button>
      </div>
    );
  }

  const commentsCount = post.comments_count || comments.length;

  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh', paddingBottom: 72, ...font }}>
      {/* ── Topbar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>Publicación</span>
      </header>

      {/* ── Post ── */}
      <PostCard
        post={post}
        onLike={() => apiClient.post(`/posts/${postId}/like`).catch((err) => toast.error('Error al dar me gusta'))}
        onComment={() => inputRef.current?.focus()}
        onSave={() => apiClient.post(`/posts/${postId}/save`).catch((err) => toast.error('Error al guardar'))}
        onShare={async () => {
          const postUrl = `${window.location.origin}/posts/${postId}`;
          if (navigator.share) {
            await navigator.share({ title: 'Hispaloshop', text: 'Mira esta publicación', url: postUrl }).catch(() => {});
          } else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(postUrl);
            toast.success('Enlace copiado');
          }
        }}
      />

      {/* ── Comments Section ── */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 12px' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--color-stone)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Comentarios
          </span>
          {commentsCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--color-white)',
              background: 'var(--color-black)', borderRadius: 'var(--radius-full, 999px)',
              padding: '2px 8px', minWidth: 20, textAlign: 'center',
            }}>
              {commentsCount}
            </span>
          )}
        </div>

        {/* Comments list */}
        {commentsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    width: 100, height: 12, borderRadius: 4, marginBottom: 6,
                    background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                  <div style={{
                    width: '80%', height: 12, borderRadius: 4,
                    background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '32px 16px',
            color: 'var(--color-stone)', fontSize: 14,
          }}>
            Sé el primero en comentar
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {comments.map((c) => {
              const isOwn = user?.user_id === c.user_id;
              return (
                <div key={c.comment_id} style={{
                  display: 'flex', gap: 10, padding: '10px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  {/* Avatar */}
                  <Link to={`/user/${c.user_name || c.user_id}`} style={{ flexShrink: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--color-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'var(--color-stone)',
                      overflow: 'hidden',
                    }}>
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        (c.user_name || '?')[0].toUpperCase()
                      )}
                    </div>
                  </Link>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Link
                        to={`/user/${c.user_name || c.user_id}`}
                        style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-black)', textDecoration: 'none' }}
                      >
                        @{c.user_name || 'usuario'}
                      </Link>
                      {c.user_id === post.user_id && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: 'var(--color-white)',
                          background: '#0c0a09', borderRadius: 999,
                          padding: '1px 6px', lineHeight: '14px',
                        }}>
                          Autor
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--color-stone)' }}>
                        {timeAgo(c.created_at)}
                      </span>
                      {c.edited_at && (
                        <span style={{ fontSize: 10, color: 'var(--color-stone)', fontStyle: 'italic' }}>
                          editado
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: 14, color: 'var(--color-black)',
                      margin: 0, lineHeight: 1.45, wordBreak: 'break-word',
                    }}>
                      {c.text}
                    </p>
                  </div>

                  {/* Actions (like + delete) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingTop: 2 }}>
                    <button
                      onClick={() => setLikedComments(prev => {
                        const next = new Set(prev);
                        if (next.has(c.comment_id)) next.delete(c.comment_id);
                        else next.add(c.comment_id);
                        return next;
                      })}
                      aria-label={likedComments.has(c.comment_id) ? 'Quitar me gusta' : 'Me gusta'}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 4, display: 'flex',
                      }}
                    >
                      <Heart
                        size={14}
                        color={likedComments.has(c.comment_id) ? '#ef4444' : 'var(--color-stone)'}
                        fill={likedComments.has(c.comment_id) ? '#ef4444' : 'none'}
                        style={{ transition: 'color 0.2s, fill 0.2s' }}
                      />
                    </button>
                    {isOwn && (
                      <button
                        onClick={() => { if (window.confirm('¿Eliminar este comentario?')) handleDeleteComment(c.comment_id); }}
                        aria-label="Eliminar comentario"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 4, opacity: 0.4, display: 'flex',
                        }}
                      >
                        <Trash2 size={14} color="var(--color-stone)" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky Comment Input ── */}
      {isAuthenticated ? (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'var(--color-white)',
          borderTop: '1px solid var(--color-border)',
          paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
        }}>
          {/* Emoji quick reactions */}
          <div style={{ display: 'flex', gap: 4, padding: '4px 16px 0' }}>
            {['\u2764\uFE0F', '\uD83D\uDD25', '\uD83D\uDE0D', '\uD83E\uDD24', '\uD83D\uDC4F', '\uD83D\uDE2E'].map((emoji) => (
              <button key={emoji} onClick={() => setNewComment(prev => prev + emoji)} style={{ fontSize: 18, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>{emoji}</button>
            ))}
          </div>

          {/* Input row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px' }}>
            {/* User avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'var(--color-stone)',
              overflow: 'hidden',
            }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (user?.name || '?')[0].toUpperCase()
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Añade un comentario..."
              aria-label="Escribe un comentario"
              maxLength={500}
              style={{
                flex: 1, height: 40, padding: '0 14px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-full, 999px)',
                fontSize: 14, color: 'var(--color-black)',
                background: 'var(--color-surface)',
                outline: 'none', ...font,
              }}
            />

            <button
              onClick={handleSendComment}
              disabled={!newComment.trim() || sending}
              aria-label="Enviar comentario"
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: newComment.trim() ? 'var(--color-black)' : 'var(--color-surface)',
                border: 'none', cursor: newComment.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              {sending ? (
                <Loader2 size={16} color="var(--color-white)" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Send size={16} color={newComment.trim() ? 'var(--color-white)' : 'var(--color-stone)'} />
              )}
            </button>
          </div>

          {/* Character counter */}
          {newComment.length > 0 && (
            <div style={{ fontSize: 11, color: '#a8a29e', textAlign: 'right', padding: '0 16px 2px' }}>
              {newComment.length}/500
            </div>
          )}
        </div>
      ) : (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'var(--color-white)',
          borderTop: '1px solid var(--color-border)',
          padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: 'var(--color-stone)', margin: '0 0 8px' }}>
            Inicia sesión para comentar
          </p>
          <Link
            to="/login"
            style={{
              display: 'inline-flex', padding: '8px 24px',
              background: 'var(--color-black)', color: 'var(--color-white)',
              borderRadius: 'var(--radius-full, 999px)',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Iniciar sesión
          </Link>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
