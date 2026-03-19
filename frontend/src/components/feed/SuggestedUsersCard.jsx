import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

const ROLE_LABELS = {
  producer: 'Productor',
  influencer: 'Influencer',
  consumer: 'Consumidor',
  importer: 'Importador',
};

const DISMISSED_KEY = 'hs_dismissed_suggestions';
const DISMISSED_TS_KEY = 'hs_dismissed_suggestions_ts';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getDismissed() {
  try {
    const ts = Number(localStorage.getItem(DISMISSED_TS_KEY) || '0');
    if (ts && Date.now() - ts > DISMISS_TTL_MS) {
      localStorage.removeItem(DISMISSED_KEY);
      localStorage.removeItem(DISMISSED_TS_KEY);
      return [];
    }
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch { return []; }
}

/**
 * Inline suggested-users card injected into the ForYou feed.
 * Horizontal scrollable with 4-6 user cards, dismissible.
 */
export default function SuggestedUsersCard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    let active = true;
    apiClient.get('/discovery/suggested-users?context=feed&limit=6')
      .then(data => {
        if (!active) return;
        const list = data?.users || [];
        const dismissed_ids = new Set(getDismissed());
        setUsers(list.filter(u => !dismissed_ids.has(u.user_id)));
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser]);

  const handleFollow = useCallback(async (userId) => {
    // Optimistic update
    setFollowedIds(prev => new Set([...prev, userId]));
    try {
      await apiClient.post(`/users/${userId}/follow`, {});
    } catch {
      // Rollback on failure
      setFollowedIds(prev => { const next = new Set(prev); next.delete(userId); return next; });
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    const ids = users.map(u => u.user_id);
    try {
      const prev = getDismissed();
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...new Set([...prev, ...ids])].slice(-50)));
      localStorage.setItem(DISMISSED_TS_KEY, String(Date.now()));
    } catch { /* localStorage full — ignore */ }
  }, [users]);

  if (!currentUser || dismissed || loading || users.length === 0) return null;

  return (
    <div className="border-b border-stone-100 bg-white py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <p className="text-[13px] font-semibold text-stone-950">Sugeridos para ti</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/discover/people')}
            className="text-[12px] font-semibold text-stone-500 bg-transparent border-none cursor-pointer hover:text-stone-700"
          >
            Ver todos
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Descartar sugerencias"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-400 hover:text-stone-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4">
        {users.map(user => {
          const isFollowed = followedIds.has(user.user_id);
          const avatar = user.profile_image;
          const roleLabel = ROLE_LABELS[user.role] || user.role;

          return (
            <div
              key={user.user_id}
              className="flex w-[140px] shrink-0 flex-col items-center rounded-xl border border-stone-100 bg-white p-3"
            >
              {/* Avatar */}
              <button
                onClick={() => navigate(`/${user.username || user.user_id}`)}
                className="mb-2 h-14 w-14 overflow-hidden rounded-full bg-stone-200 border-none p-0 cursor-pointer"
              >
                {avatar ? (
                  <img src={avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-stone-500">
                    {(user.name || '?')[0].toUpperCase()}
                  </div>
                )}
              </button>

              {/* Name */}
              <p className="mb-0.5 w-full truncate text-center text-[12px] font-semibold text-stone-950">
                {user.name}
              </p>

              {/* Role pill */}
              <span className="mb-2.5 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                {roleLabel}
              </span>

              {/* Follow button */}
              <button
                onClick={() => !isFollowed && handleFollow(user.user_id)}
                disabled={isFollowed}
                className={`flex w-full min-h-[36px] items-center justify-center gap-1 rounded-full text-[11px] font-semibold border-none cursor-pointer transition-colors ${
                  isFollowed
                    ? 'bg-stone-100 text-stone-500'
                    : 'bg-stone-950 text-white hover:bg-stone-800'
                }`}
              >
                {isFollowed ? 'Siguiendo' : (
                  <>
                    <UserPlus size={12} /> Seguir
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
