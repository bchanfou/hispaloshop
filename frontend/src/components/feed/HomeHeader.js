import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api/client';

/**
 * HomeHeader v3 — Para ti / Siguiendo pill toggle + notification bell
 * Logo + cart are already in AppHeader
 */
export default function HomeHeader({ activeTab, onTabChange }) {
  const navigate = useNavigate();
  const tabs = [
    { id: 'foryou', label: 'Para ti' },
    { id: 'following', label: 'Siguiendo' },
  ];

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => apiClient.get('/notifications/unread-count'),
    staleTime: 60000,
  });
  const unreadCount = unreadData?.count ?? unreadData?.data?.count ?? 0;

  return (
    <div
      className="flex items-center justify-between bg-[var(--color-cream)] px-4 pb-1 pt-2"
      data-testid="home-header"
    >
      {/* Spacer to keep pill centred */}
      <div className="w-11" aria-hidden="true" />

      <div className="flex items-center rounded-full bg-[var(--color-surface)] p-[3px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`min-h-[44px] rounded-full px-4 text-[13px] font-sans transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--color-white)] font-semibold text-[var(--color-black)] shadow-sm'
                  : 'bg-transparent font-normal text-[var(--color-stone)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notification bell */}
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
