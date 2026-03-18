import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, X, Loader2, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

const font = { fontFamily: 'var(--font-sans)' };

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function FollowersPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);

  // Determine tab from URL path
  const isFollowing = window.location.pathname.includes('/following');
  const [tab, setTab] = useState(isFollowing ? 'following' : 'followers');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);

  // Resolve username to user_id
  useEffect(() => {
    if (user?.username === username || user?.user_id === username) {
      setProfileUserId(user.user_id);
    } else {
      apiClient.get(`/users/by-username/${username}`)
        .then(data => setProfileUserId(data?.user_id))
        .catch(() => setProfileUserId(username));
    }
  }, [username, user]);

  const fetchUsers = useCallback(async (pageNum = 1, append = false) => {
    if (!profileUserId) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const endpoint = tab === 'followers'
        ? `/users/${profileUserId}/followers`
        : `/users/${profileUserId}/following`;

      const params = { page: pageNum, limit: 20 };
      if (debouncedSearch) params.search = debouncedSearch;

      const data = await apiClient.get(endpoint, { params });
      const list = data?.users || [];
      setUsers(prev => append ? [...prev, ...list] : list);
      setTotal(data?.total || 0);
      setPage(pageNum);
    } catch {
      if (!append) setUsers([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [profileUserId, tab, debouncedSearch]);

  useEffect(() => {
    setUsers([]);
    setPage(1);
    fetchUsers(1);
  }, [fetchUsers]);

  const handleLoadMore = () => fetchUsers(page + 1, true);

  const handleFollow = async (targetId) => {
    try {
      await apiClient.post(`/users/${targetId}/follow`);
      setUsers(prev => prev.map(u =>
        u.id === targetId ? { ...u, is_following: true } : u
      ));
    } catch {
      toast.error('Error al seguir usuario');
    }
  };

  const handleUnfollow = async (targetId) => {
    try {
      await apiClient.delete(`/users/${targetId}/follow`);
      setUsers(prev => prev.map(u =>
        u.id === targetId ? { ...u, is_following: false } : u
      ));
    } catch {
      toast.error('Error al dejar de seguir');
    }
  };

  const isOwnProfile = user?.username === username || user?.user_id === username;
  const hasMore = users.length < total;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      {/* ── Topbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <button onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <ArrowLeft size={22} color="var(--color-black)" />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>
            @{username}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          {['followers', 'following'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(''); }}
              style={{
                flex: 1, padding: '10px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: tab === t ? 700 : 500,
                color: tab === t ? 'var(--color-black)' : 'var(--color-stone)',
                borderBottom: tab === t ? '2px solid var(--color-black)' : '2px solid transparent',
                ...font,
              }}
            >
              {t === 'followers' ? 'Seguidores' : 'Siguiendo'}
              {!loading && tab === t && (
                <span style={{
                  marginLeft: 6, fontSize: 12, fontWeight: 700,
                  color: tab === t ? 'var(--color-black)' : 'var(--color-stone)',
                }}>
                  {total}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '12px 16px 80px' }}>
        {/* ── Search ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-full, 999px)',
          padding: '8px 14px', marginBottom: 16,
        }}>
          <Search size={16} color="var(--color-stone)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontSize: 14,
              color: 'var(--color-black)', ...font,
            }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); inputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <X size={16} color="var(--color-stone)" />
            </button>
          )}
        </div>

        {/* ── Loading ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: 120, height: 14, borderRadius: 6, background: 'var(--color-surface)', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: 80, height: 12, borderRadius: 6, background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
                <div style={{ width: 80, height: 32, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)', margin: '0 0 4px' }}>
              {search ? 'Sin resultados' : tab === 'followers' ? 'Sin seguidores' : 'No sigue a nadie'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-stone)', margin: 0 }}>
              {search ? 'Prueba con otro término' : tab === 'followers' ? 'Aún no tiene seguidores' : 'Aún no sigue a nadie'}
            </p>
          </div>
        ) : (
          <>
            {users.map(u => {
              const isMe = u.id === user?.user_id;
              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0', borderBottom: '1px solid var(--color-border)',
                }}>
                  {/* Avatar */}
                  <Link to={`/${u.username || u.id}`} style={{ flexShrink: 0 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--color-surface)',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-stone)' }}>
                          {(u.full_name || u.username || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Name */}
                  <Link to={`/${u.username || u.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <p style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--color-black)', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {u.full_name || u.username || 'Usuario'}
                      {u.is_verified && (
                        <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--color-stone)' }}>✓</span>
                      )}
                    </p>
                    {u.username && (
                      <p style={{
                        fontSize: 12, color: 'var(--color-stone)', margin: '2px 0 0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        @{u.username}
                      </p>
                    )}
                  </Link>

                  {/* Action button */}
                  {!isMe && (
                    <button
                      onClick={() => u.is_following ? handleUnfollow(u.id) : handleFollow(u.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 16px', flexShrink: 0,
                        background: u.is_following ? 'var(--color-surface)' : 'var(--color-black)',
                        color: u.is_following ? 'var(--color-black)' : 'var(--color-white)',
                        border: u.is_following ? '1px solid var(--color-border)' : 'none',
                        borderRadius: 'var(--radius-lg)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', ...font,
                      }}
                    >
                      {u.is_following ? (
                        <><UserCheck size={14} /> Siguiendo</>
                      ) : (
                        <><UserPlus size={14} /> Seguir</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: 'center', paddingTop: 16 }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    padding: '10px 28px', background: 'var(--color-white)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-full, 999px)',
                    fontSize: 13, fontWeight: 600, color: 'var(--color-black)',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                    ...font,
                  }}
                >
                  {loadingMore ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    'Cargar más'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
      `}</style>
    </div>
  );
}
