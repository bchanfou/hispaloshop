import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api/client';

/**
 * HomeHeader v5 — "hispaloshop" text logo left | Bell right (unified feed, no tabs)
 */
export default function HomeHeader() {
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
