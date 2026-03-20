import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X } from 'lucide-react';
import apiClient from '../../services/api/client';

const ROLE_LABELS = {
  producer: 'Productor',
  influencer: 'Influencer',
  consumer: 'Consumidor',
  importer: 'Importador',
};

const AUTO_DISMISS_MS = 8000;

/**
 * Bottom sheet shown after following a user.
 * Shows 3-5 similar users based on shared follower graph.
 */
export default function PostFollowSheet({ followedUserId, followedUserName, onClose }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!followedUserId) return;
    let active = true;
    apiClient.get(`/discovery/suggested-users/post-follow/${followedUserId}?limit=5`)
      .then(data => { if (active) setUsers(data?.users || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [followedUserId]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  // Notify parent when animation completes exit
  const handleExitComplete = useCallback(() => {
    if (!visible) onClose?.();
  }, [visible, onClose]);

  const handleFollow = useCallback(async (userId) => {
    try {
      await apiClient.post(`/users/${userId}/follow`, {});
      setFollowedIds(prev => new Set([...prev, userId]));
    } catch { /* ignore */ }
  }, []);

  if (users.length === 0) return null;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/30"
            onClick={() => setVisible(false)}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-white pb-[max(16px,env(safe-area-inset-bottom))]"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-stone-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <div>
                <p className="text-[15px] font-semibold text-stone-950">
                  Personas similares
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  Similares a {followedUserName || 'este usuario'}
                </p>
              </div>
              <button
                onClick={() => setVisible(false)}
                aria-label="Cerrar"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* User list */}
            <div className="px-5 pb-4">
              {users.map(user => {
                const isFollowed = followedIds.has(user.user_id);
                return (
                  <div key={user.user_id} className="flex items-center gap-3 py-2.5">
                    <button
                      onClick={() => { setVisible(false); navigate(`/${user.username || user.user_id}`); }}
                      className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-stone-200 border-none p-0 cursor-pointer"
                    >
                      {user.profile_image ? (
                        <img loading="lazy" src={user.profile_image} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-stone-500">
                          {(user.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-stone-950">{user.name}</p>
                      <p className="text-[11px] text-stone-500">{ROLE_LABELS[user.role] || user.role}</p>
                    </div>

                    <button
                      onClick={() => !isFollowed && handleFollow(user.user_id)}
                      disabled={isFollowed}
                      className={`min-h-[36px] rounded-full px-4 text-[12px] font-semibold border-none cursor-pointer transition-colors ${
                        isFollowed
                          ? 'bg-stone-200 text-stone-500'
                          : 'bg-stone-950 text-white hover:bg-stone-800'
                      }`}
                    >
                      {isFollowed ? 'Siguiendo' : 'Seguir'}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
