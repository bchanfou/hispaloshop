// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, X, Loader2, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Memoized user row to avoid re-renders on list update ── */
const UserRow = React.memo(function UserRow({ u, isMe, onFollow, onUnfollow }) {
  const userId = u.user_id || u.id;
  return (
    <div className="flex items-center gap-3 border-b border-stone-100 py-3">
      {/* Avatar */}
      <Link to={`/${u.username || userId}`} className="shrink-0">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-stone-100">
          {(u.avatar_url || u.profile_image) ? (
            <img
              src={u.avatar_url || u.profile_image}
              alt={`Foto de ${u.full_name || u.username || 'usuario'}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-base font-bold text-stone-400">
              {(u.full_name || u.username || '?')[0].toUpperCase()}
            </span>
          )}
        </div>
      </Link>

      {/* Name */}
      <Link to={`/${u.username || userId}`} className="min-w-0 flex-1 no-underline">
        <p className="truncate text-sm font-semibold text-stone-950">
          {u.full_name || u.username || 'Usuario'}
          {u.is_verified && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-1 inline-block align-middle" aria-label="Cuenta verificada">
              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75S9.33 2.63 8.66 3.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" fill="#0c0a09"/>
              <path d="M9.5 12.5l2 2 4-4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </p>
        {u.username && (
          <p className="mt-0.5 truncate text-xs text-stone-500">
            @{u.username}
          </p>
        )}
      </Link>

      {/* Action button */}
      {!isMe && (
        <button
          onClick={() => u.is_following ? onUnfollow(userId) : onFollow(userId)}
          aria-label={u.is_following ? `Dejar de seguir a ${u.full_name || u.username}` : `Seguir a ${u.full_name || u.username}`}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
            u.is_following
              ? 'bg-stone-100 text-stone-950'
              : 'bg-stone-950 text-white hover:bg-stone-800'
          }`}
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
});

export default function FollowersPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);

  // Determine tab from URL path
  const isFollowingPath = window.location.pathname.includes('/following');
  const [tab, setTab] = useState(isFollowingPath ? 'following' : 'followers');
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

  const handleLoadMore = useCallback(() => fetchUsers(page + 1, true), [fetchUsers, page]);

  const followInFlightRef = useRef(new Set());

  const handleFollow = useCallback(async (targetId) => {
    if (followInFlightRef.current.has(targetId)) return;
    followInFlightRef.current.add(targetId);
    // Optimistic update
    setUsers(prev => prev.map(u => {
      const uid = u.user_id || u.id;
      return uid === targetId ? { ...u, is_following: true } : u;
    }));
    try {
      await apiClient.post(`/users/${targetId}/follow`);
    } catch {
      // Revert on error
      setUsers(prev => prev.map(u => {
        const uid = u.user_id || u.id;
        return uid === targetId ? { ...u, is_following: false } : u;
      }));
      toast.error('Error al seguir usuario');
    } finally {
      followInFlightRef.current.delete(targetId);
    }
  }, []);

  const handleUnfollow = useCallback(async (targetId) => {
    if (followInFlightRef.current.has(targetId)) return;
    followInFlightRef.current.add(targetId);
    // Optimistic update
    setUsers(prev => prev.map(u => {
      const uid = u.user_id || u.id;
      return uid === targetId ? { ...u, is_following: false } : u;
    }));
    try {
      await apiClient.delete(`/users/${targetId}/follow`);
    } catch {
      // Revert on error
      setUsers(prev => prev.map(u => {
        const uid = u.user_id || u.id;
        return uid === targetId ? { ...u, is_following: true } : u;
      }));
      toast.error('Error al dejar de seguir');
    } finally {
      followInFlightRef.current.delete(targetId);
    }
  }, []);

  const hasMore = users.length < total;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="flex p-1"
          >
            <ArrowLeft size={22} className="text-stone-950" />
          </button>
          <span className="text-[17px] font-bold text-stone-950">
            @{username}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200" role="tablist">
          {['followers', 'following'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(''); }}
              role="tab"
              aria-selected={tab === t}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-stone-950 font-bold text-stone-950'
                  : 'border-b-2 border-transparent text-stone-500'
              }`}
            >
              {t === 'followers' ? 'Seguidores' : 'Siguiendo'}
              {!loading && tab === t && (
                <span className="ml-1.5 text-xs font-bold">
                  {total}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[600px] px-4 pb-20 pt-3">
        {/* ── Search ── */}
        <div className="mb-4 flex h-10 items-center gap-2 rounded-full bg-stone-100 px-3.5">
          <Search size={16} className="shrink-0 text-stone-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar usuarios"
            className="flex-1 bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); inputRef.current?.focus(); }}
              aria-label="Borrar búsqueda"
              className="flex p-0"
            >
              <X size={16} className="text-stone-400" />
            </button>
          )}
        </div>

        {/* ── Loading skeleton ── */}
        {loading ? (
          <div>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 border-b border-stone-100 py-3">
                <div className="h-11 w-11 animate-pulse rounded-full bg-stone-100" />
                <div className="flex-1">
                  <div className="mb-1.5 h-3.5 w-[120px] animate-pulse rounded bg-stone-100" />
                  <div className="h-3 w-[80px] animate-pulse rounded bg-stone-100" />
                </div>
                <div className="h-8 w-20 animate-pulse rounded-full bg-stone-100" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[15px] font-semibold text-stone-950">
              {search ? 'Sin resultados' : tab === 'followers' ? 'Sin seguidores' : 'No sigue a nadie'}
            </p>
            <p className="mt-1 text-[13px] text-stone-500">
              {search ? 'Prueba con otro término' : tab === 'followers' ? 'Aún no tiene seguidores' : 'Aún no sigue a nadie'}
            </p>
          </div>
        ) : (
          <>
            {users.map(u => {
              const userId = u.user_id || u.id;
              const isMe = userId === user?.user_id;
              return (
                <UserRow
                  key={userId}
                  u={u}
                  isMe={isMe}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                />
              );
            })}

            {/* Load more */}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  aria-label="Cargar más usuarios"
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-7 py-2.5 text-[13px] font-semibold text-stone-950 transition-colors hover:bg-stone-50 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Cargar más'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
