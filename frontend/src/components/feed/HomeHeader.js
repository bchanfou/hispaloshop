import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import apiClient from '../../services/api/client';

/**
 * HomeHeader v6 — "hispaloshop" text logo left | "Para ti" / "Siguiendo" pill toggle center | Bell right
 */
export default function HomeHeader({ activeTab = 'foryou', onTabChange }) {
  const navigate = useNavigate();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => apiClient.get('/notifications/unread-count'),
    staleTime: 60000,
  });
  const unreadCount = unreadData?.count ?? unreadData?.data?.count ?? 0;

  return (
    <div
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-100/80 flex items-center justify-between px-4 pb-1 pt-2"
      data-testid="home-header"
    >
      {/* hispaloshop text logo — left */}
      <span className="text-[22px] font-black tracking-tight text-stone-950 font-apple lowercase">
        hispaloshop
      </span>

      {/* Feed tab toggle — center */}
      {onTabChange && (
        <div className="flex items-center rounded-full bg-stone-100 p-0.5 gap-0.5">
          {[
            { key: 'foryou', label: 'Para ti' },
            { key: 'following', label: 'Siguiendo' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`relative rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                activeTab === key ? 'text-white' : 'text-stone-500 bg-transparent'
              }`}
              aria-pressed={activeTab === key}
            >
              {activeTab === key && (
                <motion.span
                  layoutId="feed-tab-indicator"
                  className="absolute inset-0 rounded-full bg-stone-950"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Notification bell — right */}
      <button
        type="button"
        onClick={() => navigate('/notifications')}
        aria-label="Notificaciones"
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100"
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 w-2 h-2 rounded-full bg-stone-950"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}
