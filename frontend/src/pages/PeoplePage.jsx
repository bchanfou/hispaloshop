import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';

const ROLE_PILLS = [
  { id: 'all', label: 'Todos' },
  { id: 'producer', label: 'Productores' },
  { id: 'influencer', label: 'Influencers' },
  { id: 'consumer', label: 'Consumidores' },
  { id: 'importer', label: 'Importadores' },
];

const ROLE_LABELS = {
  producer: 'Productor',
  influencer: 'Influencer',
  consumer: 'Consumidor',
  importer: 'Importador',
};

export default function PeoplePage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState('all');
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [followedIds, setFollowedIds] = useState(new Set());
  const sentinelRef = useRef(null);

  // Fetch users
  const fetchUsers = useCallback(async (role, nextCursor = null, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (role && role !== 'all') params.set('role', role);
      if (nextCursor) params.set('cursor', nextCursor);
      const data = await apiClient.get(`/discovery/people?${params}`);
      const list = data?.users || [];
      setUsers(prev => append ? [...prev, ...list] : list);
      setCursor(data?.next_cursor || null);
      setHasMore(Boolean(data?.has_more));
    } catch {
      if (!append) setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(activeRole);
  }, [activeRole, fetchUsers]);

  // Infinite scroll
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && cursor) fetchUsers(activeRole, cursor, true); },
      { rootMargin: '200px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, loading, cursor, activeRole, fetchUsers]);

  const handleFollow = useCallback(async (userId) => {
    try {
      await apiClient.post(`/users/${userId}/follow`, {});
      setFollowedIds(prev => new Set([...prev, userId]));
    } catch { /* ignore */ }
  }, []);

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setCursor(null);
    setHasMore(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-cream)] font-sans pb-20">
      {/* Topbar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-950"
        >
          <ArrowLeft size={22} />
        </button>
        <span className="text-[17px] font-bold text-stone-950">Descubrir personas</span>
      </div>

      {/* Role filter pills */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-3">
        {ROLE_PILLS.map(pill => (
          <button
            key={pill.id}
            onClick={() => handleRoleChange(pill.id)}
            aria-pressed={activeRole === pill.id}
            className={`min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
              activeRole === pill.id
                ? 'bg-stone-950 text-white border border-stone-950'
                : 'bg-white text-stone-950 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Users grid */}
      <div className="px-4">
        {loading && users.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-stone-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <UserPlus size={48} className="mb-3 text-stone-300" />
            <p className="text-[15px] font-medium text-stone-950">No hay personas</p>
            <p className="mt-1 text-[13px] text-stone-500">Prueba con otro filtro</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {users.map(u => {
                const isFollowed = followedIds.has(u.user_id) || u.is_following;
                return (
                  <div key={u.user_id} className="flex flex-col items-center rounded-xl border border-stone-200 bg-white p-4">
                    <Link to={`/user/${u.username || u.user_id}`} className="mb-2 h-14 w-14 overflow-hidden rounded-full bg-stone-100 block">
                      {u.profile_image ? (
                        <img src={u.profile_image} alt={u.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-stone-400">
                          {(u.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <Link to={`/user/${u.username || u.user_id}`} className="w-full text-center no-underline">
                      <p className="truncate text-[13px] font-semibold text-stone-950">{u.name}</p>
                    </Link>
                    <span className="mt-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                    <p className="mt-1 text-[11px] text-stone-400">{u.followers_count || 0} seguidores</p>

                    {currentUser ? (
                      <button
                        onClick={() => !isFollowed && handleFollow(u.user_id)}
                        disabled={isFollowed}
                        className={`mt-2.5 flex w-full min-h-[36px] items-center justify-center gap-1 rounded-full text-[11px] font-semibold border-none cursor-pointer transition-colors ${
                          isFollowed
                            ? 'bg-stone-100 text-stone-500'
                            : 'bg-stone-950 text-white hover:bg-stone-800'
                        }`}
                      >
                        {isFollowed ? 'Siguiendo' : <><UserPlus size={12} /> Seguir</>}
                      </button>
                    ) : (
                      <Link to="/login" className="mt-2.5 flex w-full min-h-[36px] items-center justify-center gap-1 rounded-full bg-stone-950 text-[11px] font-semibold text-white no-underline">
                        <UserPlus size={12} /> Seguir
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-stone-400" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
