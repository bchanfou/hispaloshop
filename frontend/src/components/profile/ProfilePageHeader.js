import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, LayoutDashboard, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_DASHBOARD_ROUTE = {
  producer:   '/producer/overview',
  importer:   '/importer/dashboard',
  influencer: '/influencer/dashboard',
  customer:   '/customer/orders',
  consumer:   '/customer/orders',
};

export default function ProfilePageHeader({ username, isOwnProfile, onShare }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const role = currentUser?.role || 'customer';
  const dashRoute = ROLE_DASHBOARD_ROUTE[role] || '/';

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
      }}
      data-testid="profile-page-header"
    >
      <div className="flex h-12 items-center px-2">

        {/* Left — back arrow (perfiles ajenos) · spacer (propio) */}
        {!isOwnProfile ? (
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: 'var(--color-stone)', transition: 'var(--transition-fast)' }}
            aria-label="Volver"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
        ) : (
          <div className="w-10" aria-hidden="true" />
        )}

        {/* Center — username */}
        <div className="flex flex-1 items-center justify-center gap-1">
          <span
            className="text-[15px] font-semibold leading-none tracking-tight"
            style={{ color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}
          >
            {username}
          </span>
          {isOwnProfile && (
            <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--color-stone)' }} strokeWidth={2.2} />
          )}
        </div>

        {/* Right — share (perfiles ajenos) + dashboard */}
        <div className="flex items-center">
          {!isOwnProfile && onShare ? (
            <button
              onClick={onShare}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: 'var(--color-stone)', transition: 'var(--transition-fast)' }}
              aria-label="Compartir perfil"
              data-testid="profile-share-btn"
            >
              <Share2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
          ) : null}
          {isOwnProfile ? (
            <button
              onClick={() => navigate(dashRoute)}
              className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold"
              style={{
                background: 'var(--color-black)',
                color: '#fff',
                transition: 'var(--transition-fast)',
              }}
              aria-label="Ir al dashboard"
              data-testid="profile-hamburger-btn"
            >
              <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
              Mi dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate(dashRoute)}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: 'var(--color-stone)', transition: 'var(--transition-fast)' }}
              aria-label="Ir al dashboard"
              data-testid="profile-hamburger-btn"
            >
              <LayoutDashboard className="h-5 w-5" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
