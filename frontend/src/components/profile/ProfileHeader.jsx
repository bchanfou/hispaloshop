import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronDown,
  MoreHorizontal,
  Camera,
  ExternalLink,
  MapPin,
  MessageCircle,
  Store,
  Share2,
  Check,
  Plus,
  Copy,
  Package,
  Star,
  ShoppingBag,
  UserPlus,
  Flag,
  ShieldBan,
} from 'lucide-react';
import apiClient from '../../services/api/client';

/* ── helpers ─────────────────────────────────────────────────────── */

function formatCount(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

const ROLE_LABELS = {
  producer: 'PRODUCTOR',
  influencer: 'INFLUENCER',
  importer: 'IMPORTADOR',
};

/* ── shared bottom‑sheet primitives ──────────────────────────────── */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sheetVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit: { y: '100%', transition: { duration: 0.22 } },
};

/* ── bio linkify helper (Q4) ─────────────────────────────────────── */

function LinkifiedBio({ text }) {
  if (!text) return null;
  // Split on @mentions and #hashtags, preserve separators
  const parts = text.split(/(@[a-zA-Z0-9_.]+|#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <a key={i} href={`/${encodeURIComponent(username)}`} className="font-medium text-stone-600 no-underline">
              {part}
            </a>
          );
        }
        if (part.startsWith('#')) {
          const tag = part.slice(1);
          return (
            <a key={i} href={`/search?q=${encodeURIComponent('#' + tag)}`} className="font-medium text-stone-600 no-underline">
              {part}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}

/* ── social icons (Q3) ───────────────────────────────────────────── */

function SocialIcon({ href, label, children }) {
  if (!href) return null;
  const url = href.startsWith('http') ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200">
      {children}
    </a>
  );
}

/* ── Instagram‑style story ring gradient ─────────────────────────── */

const STORY_RING_GRADIENT = '#2E7D52';

/* ── verified badge SVG ──────────────────────────────────────────── */

function VerifiedBadge({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="ml-1 inline-block align-middle"
      aria-label="Cuenta verificada"
    >
      <path
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75S9.33 2.63 8.66 3.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
        fill="#0c0a09"
      />
      <path
        d="M9.5 12.5l2 2 4-4.5"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── component ───────────────────────────────────────────────────── */

export default function ProfileHeader({
  user,
  isOwn,
  onEditProfile,
  onShare,
  onAvatarChange,
  onFollowToggle,
  onMessage,
  highlights = [],
  onCreateHighlight,
  onSwitchTab,
  onViewOwnStory,
  onViewHighlight,
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  /* close bottom sheets on Escape */
  useEffect(() => {
    if (!showAccountSwitcher && !showOptionsSheet) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowAccountSwitcher(false);
        setShowOptionsSheet(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showAccountSwitcher, showOptionsSheet]);

  /* ── accounts from localStorage ────────────────────────────────── */

  const accounts = useMemo(() => {
    try {
      const raw = localStorage.getItem('hsp_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [
      {
        token: localStorage.getItem('hsp_token') || '',
        user_id: user?.user_id,
        username: user?.username,
        name: user?.name,
        avatar_url: user?.avatar_url || user?.profile_image,
        role: user?.role,
      },
    ];
  }, [user]);

  const currentUserId = user?.user_id;

  /* ── avatar file pick ──────────────────────────────────────────── */

  const handleAvatarFile = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file && onAvatarChange) onAvatarChange(file);
    },
    [onAvatarChange],
  );

  /* ── share / copy helper ───────────────────────────────────────── */

  const profileUrl = `https://hispaloshop.com/${user?.username}`;

  const shareProfile = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: user?.name, text: user?.bio, url: profileUrl }); } catch { /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(profileUrl); toast('Enlace copiado'); } catch { toast.error('No se pudo copiar el enlace'); }
    }
  }, [user, profileUrl]);

  const copyProfileLink = useCallback(async () => {
    try { await navigator.clipboard.writeText(profileUrl); toast('Enlace copiado'); } catch { toast.error('No se pudo copiar el enlace'); }
  }, [profileUrl]);

  /* ── derived ───────────────────────────────────────────────────── */

  const showStoreButton = !isOwn && (user?.role === 'producer' || user?.role === 'importer');
  const roleLabel = ROLE_LABELS[user?.role];
  const bioText =
    user?.bio && user.bio.length > 150 && !bioExpanded
      ? user.bio.slice(0, 150) + '...'
      : user?.bio;

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div>
      {/* ── 1. TOPBAR ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 flex h-[52px] items-center justify-between border-b border-stone-200 bg-white px-3">
        {isOwn ? (
          <>
            <div className="w-10" />
            <button
              onClick={() => setShowAccountSwitcher(true)}
              aria-label="Cambiar cuenta"
              aria-expanded={showAccountSwitcher}
              aria-haspopup="dialog"
              className="flex items-center gap-1 text-[15px] font-semibold text-stone-950"
            >
              @{user?.username}
              <ChevronDown size={14} />
            </button>
            <div className="w-10" />
          </>
        ) : (
          <>
            <button
              onClick={() => navigate(-1)}
              aria-label="Volver"
              className="flex items-center justify-center p-2.5"
            >
              <ChevronLeft size={22} className="text-stone-950" />
            </button>
            <span className="text-[15px] font-semibold text-stone-950">
              @{user?.username}
            </span>
            <button
              onClick={() => setShowOptionsSheet(true)}
              aria-label="Más opciones"
              className="flex items-center justify-center p-2.5"
            >
              <MoreHorizontal size={22} className="text-stone-950" />
            </button>
          </>
        )}
      </div>

      {/* ── 2. ACCOUNT SWITCHER BOTTOM SHEET ─────────────────────── */}
      <AnimatePresence>
        {showAccountSwitcher && (
          <>
            <motion.div
              key="as-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setShowAccountSwitcher(false)}
              className="fixed inset-0 z-[9998] bg-black/40"
            />
            <motion.div
              key="as-sheet"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label="Cambiar cuenta"
              className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-xl bg-white px-5 pb-8 pt-4"
            >
              <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-stone-200" />
              <div className="mb-4 text-base font-semibold">Cuentas</div>

              {accounts.map((acc) => {
                const isActive = acc.user_id === currentUserId;
                return (
                  <button
                    key={acc.user_id || acc.username}
                    onClick={() => {
                      if (!isActive && acc.token) {
                        // Save current account before switching
                        const currentToken = localStorage.getItem('hispalo_access_token') || localStorage.getItem('hsp_token') || '';
                        if (currentToken && user) {
                          let existingAccounts = [];
                          try { existingAccounts = JSON.parse(localStorage.getItem('hsp_accounts') || '[]'); } catch { existingAccounts = []; }
                          const idx = existingAccounts.findIndex(a => a.user_id === user.user_id);
                          const currentAccObj = {
                            token: currentToken,
                            user_id: user.user_id,
                            username: user.username,
                            name: user.name,
                            avatar_url: user.profile_image || user.avatar_url,
                            role: user.role,
                          };
                          if (idx >= 0) existingAccounts[idx] = currentAccObj;
                          else existingAccounts.push(currentAccObj);
                          localStorage.setItem('hsp_accounts', JSON.stringify(existingAccounts));
                        }
                        // Switch to selected account
                        localStorage.setItem('hispalo_access_token', acc.token);
                        localStorage.setItem('hsp_token', acc.token);
                        window.location.href = `/profile/${acc.user_id}`;
                      }
                      setShowAccountSwitcher(false);
                    }}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <img
                      src={acc.avatar_url || '/default-avatar.png'}
                      alt={acc.username}
                      className="h-11 w-11 rounded-full object-cover"
                      onError={e => { e.target.src = '/default-avatar.png'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-stone-950">{acc.name}</div>
                      <div className="text-xs text-stone-500">@{acc.username}</div>
                    </div>
                    {acc.role && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase text-stone-500">
                        {ROLE_LABELS[acc.role] || acc.role}
                      </span>
                    )}
                    {isActive && <Check size={18} className="text-stone-950" />}
                  </button>
                );
              })}

              <div className="my-3 h-px bg-stone-200" />

              <button
                onClick={() => {
                  // Save current account before adding new one
                  const currentToken = localStorage.getItem('hispalo_access_token') || localStorage.getItem('hsp_token') || '';
                  if (currentToken && user) {
                    let existingAccounts = [];
                    try { existingAccounts = JSON.parse(localStorage.getItem('hsp_accounts') || '[]'); } catch { existingAccounts = []; }
                    const idx = existingAccounts.findIndex(a => a.user_id === user.user_id);
                    const currentAccObj = {
                      token: currentToken,
                      user_id: user.user_id,
                      username: user.username,
                      name: user.name,
                      avatar_url: user.profile_image || user.avatar_url,
                      role: user.role,
                    };
                    if (idx >= 0) existingAccounts[idx] = currentAccObj;
                    else existingAccounts.push(currentAccObj);
                    localStorage.setItem('hsp_accounts', JSON.stringify(existingAccounts));
                  }
                  setShowAccountSwitcher(false);
                  navigate('/login?add_account=true');
                }}
                className="w-full rounded-xl bg-stone-100 py-3.5 text-center text-sm font-medium text-stone-950"
              >
                + Agregar cuenta
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 3. AVATAR + STATS ROW (Instagram layout) ──────────────── */}
      <div className="flex items-center gap-5 px-4 pt-4 pb-2">
        {/* avatar with gradient story ring */}
        <div className="relative h-[86px] w-[86px] shrink-0">
          {user?.has_active_story && (
            <div
              className="absolute -inset-[3px] rounded-full"
              style={{ background: STORY_RING_GRADIENT }}
            />
          )}
          <img
            src={user?.profile_image || user?.avatar_url || '/default-avatar.png'}
            alt={user?.name}
            onClick={
              user?.has_active_story
                ? () => onViewOwnStory ? onViewOwnStory() : navigate(`/stories/${user?.user_id}`)
                : undefined
            }
            className={`relative h-[86px] w-[86px] rounded-full border-[3px] border-white object-cover ${
              user?.has_active_story ? 'cursor-pointer' : 'ring-1 ring-stone-200'
            }`}
          />
          {isOwn && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Cambiar foto de perfil"
                className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-stone-950 shadow-sm"
              >
                <Plus size={14} className="text-white" strokeWidth={3} />
              </button>
            </>
          )}
        </div>

        {/* stats (Instagram: bold number, light label) */}
        <div className="flex flex-1 justify-around text-center">
          {[
            { value: user?.posts_count, label: 'publicaciones', link: null },
            { value: user?.followers_count, label: 'seguidores', link: `/${user?.username}/followers` },
            { value: user?.following_count, label: 'seguidos', link: `/${user?.username}/following` },
          ].map((stat) => (
            <div
              key={stat.label}
              onClick={stat.link ? () => navigate(stat.link) : undefined}
              role={stat.link ? 'button' : undefined}
              tabIndex={stat.link ? 0 : undefined}
              onKeyDown={stat.link ? (e) => { if (e.key === 'Enter') navigate(stat.link); } : undefined}
              className={stat.link ? 'cursor-pointer' : ''}
            >
              <div className="text-[17px] font-bold text-stone-950 leading-tight">{formatCount(stat.value)}</div>
              <div className="text-[13px] text-stone-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. INFO SECTION ──────────────────────────────────────── */}
      <div className="px-4 pb-3">
        {/* name + badges (Instagram: name bold, verified blue check) */}
        <div className="mb-0.5 flex flex-wrap items-center">
          <span className="text-[14px] font-semibold text-stone-950">{user?.name}</span>
          {user?.is_verified && <VerifiedBadge size={16} />}
          {roleLabel && (
            <span className="ml-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium uppercase text-stone-700 border border-stone-200">
              {roleLabel}
            </span>
          )}
        </div>

        {/* bio (Q4: line breaks + linkify) */}
        {user?.bio && (
          <div className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-950">
            <LinkifiedBio text={bioText} />
            {user.bio.length > 150 && !bioExpanded && (
              <button
                onClick={() => setBioExpanded(true)}
                className="ml-0.5 text-[14px] text-stone-400"
              >
                más
              </button>
            )}
            {user.bio.length > 150 && bioExpanded && (
              <button
                onClick={() => setBioExpanded(false)}
                className="ml-0.5 text-[14px] text-stone-400"
              >
                menos
              </button>
            )}
          </div>
        )}

        {/* social links (Q3: influencer) */}
        {user?.role === 'influencer' && (user?.instagram || user?.tiktok || user?.youtube) && (
          <div className="mt-2 flex gap-2">
            <SocialIcon href={user.instagram} label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </SocialIcon>
            <SocialIcon href={user.tiktok} label="TikTok">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.11v-3.5a6.37 6.37 0 00-.82-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.37a8.16 8.16 0 004.76 1.52v-3.45a4.85 4.85 0 01-1-.75z"/></svg>
            </SocialIcon>
            <SocialIcon href={user.youtube} label="YouTube">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </SocialIcon>
          </div>
        )}

        {/* producer stats (Q2) */}
        {user?.role === 'producer' && user?.seller_stats && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {user.seller_stats.avg_rating > 0 && (
              <span className="flex items-center gap-1 text-xs text-stone-600">
                <Star size={12} className="fill-stone-950 text-stone-950" />
                {user.seller_stats.avg_rating} ({user.seller_stats.review_count})
              </span>
            )}
            {user.seller_stats.total_products > 0 && (
              <span className="flex items-center gap-1 text-xs text-stone-600">
                <Package size={12} /> {user.seller_stats.total_products} productos
              </span>
            )}
            {user.seller_stats.total_orders > 0 && (
              <span className="flex items-center gap-1 text-xs text-stone-600">
                <ShoppingBag size={12} /> {user.seller_stats.total_orders} ventas
              </span>
            )}
          </div>
        )}

        {/* Influencer public stats + discount code */}
        {user?.role === 'influencer' && (user?.sales_count > 0 || user?.discount_code) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {user?.sales_count > 0 && (
              <span className="text-xs text-stone-500">{user.sales_count} ventas generadas</span>
            )}
            {user?.producers_count > 0 && (
              <span className="text-xs text-stone-500">· {user.producers_count} productores apoyados</span>
            )}
            {user?.discount_code && (
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(user.discount_code); toast.success('Código copiado: ' + user.discount_code); } catch { toast.error('No se pudo copiar'); }
                }}
                className="inline-flex items-center gap-1 rounded-full bg-[#2E7D52] px-3 py-1 text-[11px] font-semibold text-white"
              >
                <Copy size={10} />
                {user.discount_code}
              </button>
            )}
          </div>
        )}

        {/* website */}
        {user?.website && /^https?:\/\//i.test(user.website) && (
          <div className="mt-1 flex items-center gap-1">
            <ExternalLink size={12} className="text-stone-500" />
            <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-stone-500 no-underline">
              {user.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}

        {/* location */}
        {user?.location && (
          <div className="mt-0.5 flex items-center gap-1">
            <MapPin size={12} className="text-stone-500" />
            <span className="text-[13px] text-stone-500">{user.location}</span>
          </div>
        )}
      </div>

      {/* ── 5. ACTION BUTTONS (Instagram layout) ────────────────── */}
      <div className="flex gap-1.5 px-4 pb-3">
        {isOwn ? (
          <>
            <button onClick={onEditProfile} className="min-h-[34px] flex-1 rounded-xl bg-stone-100 px-2 py-1.5 text-[13px] font-semibold text-stone-950">
              Editar perfil
            </button>
            <button onClick={shareProfile} className="min-h-[34px] flex-1 rounded-xl bg-stone-100 px-2 py-1.5 text-[13px] font-semibold text-stone-950">
              Compartir perfil
            </button>
            <button
              onClick={() => navigate('/explore/people')}
              aria-label="Descubrir personas"
              className="flex min-h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl bg-stone-100"
            >
              <UserPlus size={16} className="text-stone-950" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onFollowToggle}
              aria-label={
                user?.follow_request_pending
                  ? 'Cancelar solicitud'
                  : user?.is_following
                  ? `Dejar de seguir a ${user?.name}`
                  : user?.is_private
                  ? `Solicitar seguir a ${user?.name}`
                  : `Seguir a ${user?.name}`
              }
              className={`min-h-[34px] flex-1 rounded-xl px-3 py-1.5 text-[13px] font-semibold ${
                user?.is_following
                  ? 'bg-stone-100 text-stone-950'
                  : user?.follow_request_pending
                  ? 'bg-stone-100 text-stone-500'
                  : 'bg-[#2E7D52] text-white hover:bg-[#1F5C3B]'
              }`}
            >
              {user?.follow_request_pending
                ? 'Solicitado'
                : user?.is_following
                ? 'Siguiendo'
                : user?.is_private
                ? 'Solicitar'
                : 'Seguir'}
            </button>
            <button
              onClick={onMessage}
              aria-label="Enviar mensaje"
              disabled={user?.is_private && !user?.is_following}
              className={`flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-100 px-3 py-1.5 text-[13px] font-semibold text-stone-950 ${
                user?.is_private && !user?.is_following ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <MessageCircle size={15} />
              {!showStoreButton && 'Mensaje'}
            </button>
            {showStoreButton && (
              <button
                onClick={() => navigate(`/store/${user?.store_slug || user?.username}`)}
                className="flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-100 px-3 py-1.5 text-[13px] font-semibold text-stone-950"
              >
                <Store size={15} />
                Tienda
              </button>
            )}
            <button
              onClick={() => navigate('/explore/people')}
              aria-label="Descubrir personas"
              className="flex min-h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl bg-stone-100"
            >
              <UserPlus size={16} className="text-stone-950" />
            </button>
          </>
        )}
      </div>

      {/* ── 5b. MUTUAL FOLLOWERS (Instagram style) ───────────────── */}
      {!isOwn && user?.mutual_followers?.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="flex -space-x-1.5">
            {user.mutual_followers.slice(0, 3).map((mf) => (
              <img
                key={mf.user_id}
                src={mf.profile_image || '/default-avatar.png'}
                alt={mf.username}
                className="h-4 w-4 rounded-full border-[1.5px] border-white object-cover"
              />
            ))}
          </div>
          <span className="text-[12px] text-stone-500 leading-tight">
            Seguido por{' '}
            <span className="font-semibold text-stone-950">{user.mutual_followers[0]?.username}</span>
            {(user.mutual_followers_count || user.mutual_followers.length) > 1 && (
              <> y <span className="font-semibold text-stone-950">{(user.mutual_followers_count || user.mutual_followers.length) - 1} más que sigues</span></>
            )}
          </span>
        </div>
      )}

      {/* ── 6. HIGHLIGHTS (Instagram style circles) ──────────────── */}
      {(isOwn || highlights.length > 0) && (
        <div className="flex gap-4 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none">
          {isOwn && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={onCreateHighlight || (() => toast('Próximamente'))}
                aria-label="Crear historia destacada"
                className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border border-stone-200"
              >
                <Plus size={22} className="text-stone-400" />
              </button>
              <span className="text-[11px] text-stone-500">Nuevo</span>
            </div>
          )}

          {highlights.map((hl, i) => (
            <div
              key={hl.highlight_id || hl.id || i}
              className="flex shrink-0 flex-col items-center gap-1.5 cursor-pointer"
              onClick={() => onViewHighlight?.(hl)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onViewHighlight?.(hl); }}
            >
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-stone-100 ring-[1.5px] ring-stone-200 ring-offset-2 ring-offset-white">
                {(hl.cover_url || hl.image) ? (
                  <img src={hl.cover_url || hl.image} alt={hl.title} className="h-[64px] w-[64px] rounded-full object-cover" />
                ) : (
                  <span className="text-lg text-stone-400">✦</span>
                )}
              </div>
              <span className="max-w-[64px] truncate text-[11px] text-stone-950">
                {hl.title?.slice(0, 15)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 7. OPTIONS BOTTOM SHEET (other profile) ──────────────── */}
      <AnimatePresence>
        {showOptionsSheet && (
          <>
            <motion.div
              key="opt-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setShowOptionsSheet(false)}
              className="fixed inset-0 z-[9998] bg-black/40"
            />
            <motion.div
              key="opt-sheet"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label="Opciones de perfil"
              className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-xl bg-white pb-8 pt-4"
            >
              <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-stone-200" />

              {showStoreButton && (
                <>
                  <OptionRow icon={<Store size={20} />} label="Visitar tienda" onClick={() => { setShowOptionsSheet(false); navigate(`/store/${user?.store_slug || user?.username}`); }} />
                  <OptionRow icon={<Package size={20} />} label="Ver productos" onClick={() => { setShowOptionsSheet(false); onSwitchTab?.('products'); }} />
                </>
              )}

              <OptionRow icon={<Copy size={20} />} label="Copiar enlace del perfil" onClick={() => { copyProfileLink(); setShowOptionsSheet(false); }} />
              <OptionRow icon={<Share2 size={20} />} label="Compartir perfil" onClick={() => { shareProfile(); setShowOptionsSheet(false); }} />

              <div className="my-3 h-px bg-stone-200" />

              <OptionRow label={`Bloquear a @${user?.username}`} icon={<ShieldBan size={20} />} muted onClick={async () => {
                try {
                  await apiClient.post(`/users/${user?.user_id}/block`);
                  toast.success(`Has bloqueado a @${user?.username}`);
                } catch { toast.error('Error al bloquear'); }
                setShowOptionsSheet(false);
              }} />
              <OptionRow label="Reportar cuenta" icon={<Flag size={20} />} muted onClick={async () => {
                try {
                  await apiClient.post(`/users/${user?.user_id}/report`, { reason: 'inappropriate' });
                  toast.success('Reporte enviado');
                } catch { toast.error('Error al reportar'); }
                setShowOptionsSheet(false);
              }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Option row for the bottom sheet ─────────────────────────────── */

function OptionRow({ icon, label, onClick, muted }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15px] font-medium transition-all duration-150 hover:bg-stone-50 ${
        muted ? 'text-stone-500' : 'text-stone-950'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
