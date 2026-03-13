import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Send, PenSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInternalChatData } from '../../features/chat/hooks/useInternalChatData';
import { useUnreadNotifications } from '../../hooks/api/useNotifications';

/**
 * HomeHeader — Apple × Instagram
 *
 * Izquierda  → Monograma "H" (logo compacto)
 * Centro     → Pill toggle "Para ti / Siguiendo" (tap directo, sin dropdown)
 * Derecha    → Notificaciones (♥ + badge) · DM (✈ + badge) · Crear (✏ desktop)
 */
export default function HomeHeader({ activeTab, onTabChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { conversations } = useInternalChatData();
  const unreadDMs = user
    ? conversations.filter((c) => (c.unread_count ?? 0) > 0).length
    : 0;

  const { data: notifData } = useUnreadNotifications();
  const unreadNotifs = user ? (notifData?.count ?? 0) : 0;

  const tabs = [
    { id: 'foryou',    label: 'Para ti'   },
    { id: 'following', label: 'Siguiendo' },
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b border-stone-100 bg-white/95 backdrop-blur-xl"
      data-testid="home-header"
    >
      <div className="flex h-12 items-center px-3">

        {/* ── Izquierda: logo ── */}
        <Link
          to="/"
          className="flex shrink-0 items-center"
          aria-label="Hispaloshop"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-stone-200 bg-stone-50">
            <img
              src="/logo.png"
              alt=""
              className="h-5 w-5 object-contain"
              loading="eager"
            />
          </div>
        </Link>

        {/* ── Centro: pill toggle ── */}
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center rounded-full bg-stone-100 p-[3px]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`rounded-full px-4 py-[5px] text-[13px] font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-stone-950 shadow-[0_1px_4px_rgba(0,0,0,0.10)]'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Derecha: notificaciones + DM + crear ── */}
        <div className="flex shrink-0 items-center gap-0.5">

          {/* Notificaciones */}
          <button
            type="button"
            onClick={() => navigate(user ? '/notifications' : '/login')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-800 transition-colors hover:bg-stone-100 active:bg-stone-200"
            aria-label="Notificaciones"
            data-testid="home-notifications-btn"
          >
            <Heart
              className={`h-[22px] w-[22px] transition-all duration-150 ${
                unreadNotifs > 0 ? 'fill-stone-950 text-stone-950' : ''
              }`}
              strokeWidth={unreadNotifs > 0 ? 0 : 1.8}
            />
            {unreadNotifs > 0 ? (
              <span className="absolute right-[9px] top-[9px] flex h-[13px] min-w-[13px] items-center justify-center rounded-full bg-stone-950 px-[2.5px] text-[7.5px] font-bold leading-none text-white">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            ) : null}
          </button>

          {/* DM */}
          <button
            type="button"
            onClick={() => {
              if (!user) { navigate('/login'); return; }
              window.dispatchEvent(new CustomEvent('toggle-chat'));
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-800 transition-colors hover:bg-stone-100 active:bg-stone-200"
            aria-label="Mensajes directos"
            data-testid="home-chat-btn"
          >
            <Send className="h-[21px] w-[21px]" strokeWidth={1.8} />
            {unreadDMs > 0 ? (
              <span className="absolute right-[9px] top-[9px] flex h-[13px] min-w-[13px] items-center justify-center rounded-full bg-stone-950 px-[2.5px] text-[7.5px] font-bold leading-none text-white">
                {unreadDMs > 9 ? '9+' : unreadDMs}
              </span>
            ) : null}
          </button>

          {/* Crear (solo desktop) */}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('open-creator', { detail: { mode: 'post' } }))
            }
            className="hidden h-10 w-10 items-center justify-center rounded-full text-stone-800 transition-colors hover:bg-stone-100 active:bg-stone-200 sm:flex"
            aria-label="Crear publicación"
            data-testid="home-create-btn"
          >
            <PenSquare className="h-[20px] w-[20px]" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
