import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, Send, PenSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInternalChatData } from '../../features/chat/hooks/useInternalChatData';

/**
 * HomeHeader — Instagram-style
 * Sticky 48px header con:
 *   izquierda → logo / "Hispaloshop"
 *   centro    → "Para ti ▼ / Siguiendo" dropdown tap-to-switch
 *   derecha   → notificaciones (♥) + mensajes (✉)
 */
export default function HomeHeader({ activeTab, onTabChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Conteo de mensajes no leídos para el badge DM
  const { conversations } = useInternalChatData();
  const unreadDMs = user
    ? conversations.filter((c) => (c.unread_count ?? 0) > 0).length
    : 0;

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const tabs = [
    { id: 'foryou',    label: 'Para ti' },
    { id: 'following', label: 'Siguiendo' },
  ];

  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? 'Para ti';

  const handleTabSelect = (id) => {
    onTabChange(id);
    setDropdownOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-50 border-b border-stone-100 bg-white/95 backdrop-blur-xl"
      data-testid="home-header"
    >
      <div className="flex h-12 items-center px-3">

        {/* ── Izquierda: logo ── */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
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
          <span className="hidden text-[15px] font-semibold tracking-tight text-stone-950 sm:block">
            Hispaloshop
          </span>
        </Link>

        {/* ── Centro: Para ti / Siguiendo dropdown ── */}
        <div className="flex flex-1 items-center justify-center" ref={dropdownRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors active:bg-stone-100"
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="text-[15px] font-semibold tracking-tight text-stone-950">
                {activeLabel}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-stone-500 transition-transform duration-200 ${
                  dropdownOpen ? '-rotate-180' : ''
                }`}
                strokeWidth={2.5}
              />
            </button>

            {/* Dropdown list */}
            {dropdownOpen ? (
              <div
                role="listbox"
                aria-label="Seleccionar feed"
                className="absolute left-1/2 top-[calc(100%+8px)] z-[60] w-[160px] -translate-x-1/2 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-[0_12px_40px_rgba(15,15,15,0.12)]"
              >
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleTabSelect(tab.id)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-[14px] transition-colors hover:bg-stone-50 ${
                        isActive
                          ? 'font-semibold text-stone-950'
                          : 'font-medium text-stone-500'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {isActive ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-950" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Derecha: notificaciones + mensajes ── */}
        <div className="flex shrink-0 items-center gap-0.5">
          {/* Notificaciones */}
          <button
            type="button"
            onClick={() => navigate(user ? '/notifications' : '/login')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-800 transition-colors hover:bg-stone-100 active:bg-stone-200"
            aria-label="Notificaciones"
            data-testid="home-notifications-btn"
          >
            <Heart className="h-[22px] w-[22px]" strokeWidth={1.8} />
          </button>

          {/* DM / Mensajes — abre panel embebido vía toggle-chat event */}
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
            {/* Badge de no leídos */}
            {unreadDMs > 0 ? (
              <span className="absolute right-[9px] top-[8px] flex h-[13px] min-w-[13px] items-center justify-center rounded-full bg-stone-950 px-[2.5px] text-[7.5px] font-bold leading-none text-white">
                {unreadDMs > 9 ? '9+' : unreadDMs}
              </span>
            ) : null}
          </button>

          {/* Crear (solo visible en mobile cuando el + de BottomNav no está visible) */}
          <button
            type="button"
            onClick={() => {
              const event = new CustomEvent('open-creator', { detail: { mode: 'post' } });
              window.dispatchEvent(event);
            }}
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
