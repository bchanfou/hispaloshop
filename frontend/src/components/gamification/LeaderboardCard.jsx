import React from 'react';

/**
 * LeaderboardCard — Top 10 ranked user list.
 * #1/#2/#3 get 44px avatars; rest get 36px. Stone palette. Apple minimalist DNA.
 *
 * @param {{ user_id: string, username?: string, name?: string, avatar?: string, xp: number }[]} users
 */
export default function LeaderboardCard({ users = [] }) {
  if (!users.length) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-400">
        Sin datos de clasificacion
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-stone-950 tracking-tight">
          Clasificacion
        </h3>
      </div>

      <ul className="divide-y divide-stone-100">
        {users.slice(0, 10).map((user, i) => {
          const rank = i + 1;
          const isTop3 = rank <= 3;
          const avatarSize = isTop3 ? 44 : 36;

          return (
            <li
              key={user.user_id || i}
              className="flex items-center gap-3 px-5 py-3"
            >
              {/* Rank */}
              <span
                className={`w-6 text-center font-semibold tabular-nums shrink-0 ${
                  isTop3 ? 'text-stone-950 text-base' : 'text-stone-400 text-sm'
                }`}
              >
                {rank}
              </span>

              {/* Avatar */}
              <div
                className="shrink-0 rounded-full bg-stone-200 overflow-hidden"
                style={{ width: avatarSize, height: avatarSize }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || user.username || ''}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-stone-500 text-xs font-semibold uppercase">
                    {(user.name || user.username || '?').charAt(0)}
                  </div>
                )}
              </div>

              {/* Name + XP */}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate ${
                    isTop3
                      ? 'text-sm font-semibold text-stone-950'
                      : 'text-sm font-medium text-stone-700'
                  }`}
                >
                  {user.name || user.username || 'Usuario'}
                </p>
              </div>

              {/* XP */}
              <span className="shrink-0 text-xs font-semibold text-stone-500 tabular-nums">
                {(user.xp || 0).toLocaleString('es-ES')} XP
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
