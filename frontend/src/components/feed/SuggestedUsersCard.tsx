// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

interface SuggestedUser {
  user_id: string;
  name: string;
  username?: string;
  profile_image?: string;
  role?: string;
}

interface SuggestedUsersCardProps {
  onDismiss?: () => void;
}

export default function SuggestedUsersCard({ onDismiss }: SuggestedUsersCardProps) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    let active = true;
    apiClient
      .get('/discovery/suggested-users?limit=8')
      .then((data: any) => {
        if (!active) return;
        const list: SuggestedUser[] = data?.users || [];
        setUsers(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser]);

  const handleFollow = useCallback(async (userId: string) => {
    setFollowedIds((prev) => new Set([...prev, userId]));
    try {
      await apiClient.post(`/users/${userId}/follow`, {});
    } catch {
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.error('No se pudo seguir al usuario. Inténtalo de nuevo.');
    }
  }, []);

  const handleRemoveUser = useCallback((userId: string) => {
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  }, []);

  // If all users dismissed individually, notify parent
  useEffect(() => {
    if (!loading && users.length === 0 && onDismiss) {
      onDismiss();
    }
  }, [users, loading, onDismiss]);

  if (!currentUser || loading || users.length === 0) return null;

  return (
    <div className="border-y border-stone-100 bg-white py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-sm font-semibold text-stone-950">
          Sugerencias para ti
        </span>
        <Link
          to="/people"
          className="text-xs text-stone-500 hover:text-stone-700 hover:underline no-underline transition-colors"
        >
          Ver todo
        </Link>
      </div>

      {/* Horizontal scroll */}
      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4">
        {users.map((user) => {
          const isFollowed = followedIds.has(user.user_id);
          const avatar = user.profile_image;
          const displayName = user.name || user.username || '?';
          const displayUsername = user.username
            ? `@${user.username}`
            : undefined;

          return (
            <div
              key={user.user_id}
              className="relative flex w-[140px] shrink-0 flex-col items-center rounded-2xl shadow-sm bg-white px-3 pt-4 pb-3 lg:hover:shadow-md lg:hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Dismiss X */}
              <button
                onClick={() => handleRemoveUser(user.user_id)}
                aria-label={`Descartar ${displayName}`}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-300 hover:text-stone-500 transition-colors"
              >
                <X size={14} />
              </button>

              {/* Avatar — 64px */}
              <button
                onClick={() =>
                  navigate(`/${user.username || user.user_id}`)
                }
                className="mb-2 h-16 w-16 overflow-hidden rounded-full bg-stone-200 border-none p-0 cursor-pointer"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-stone-500">
                    {displayName[0].toUpperCase()}
                  </div>
                )}
              </button>

              {/* Name */}
              <p className="mb-0 w-[80px] truncate text-center text-sm font-semibold text-stone-950 leading-tight">
                {displayName}
              </p>

              {/* Username */}
              {displayUsername && (
                <p className="mb-0 w-[80px] truncate text-center text-xs text-stone-500 leading-tight mt-0.5">
                  {displayUsername}
                </p>
              )}

              {/* Follow button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => !isFollowed && handleFollow(user.user_id)}
                disabled={isFollowed}
                className={`mt-2.5 flex w-full items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold border-none cursor-pointer transition-colors ${
                  isFollowed
                    ? 'bg-stone-100 text-stone-950'
                    : 'bg-stone-950 text-white hover:bg-stone-800'
                }`}
              >
                {isFollowed ? 'Siguiendo' : 'Seguir'}
              </motion.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
