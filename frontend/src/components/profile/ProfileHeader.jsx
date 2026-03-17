import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronDown,
  Settings,
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
} from 'lucide-react';

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
            <button
              onClick={() => navigate('/settings')}
              aria-label="Ajustes"
              className="flex items-center justify-center p-2.5"
            >
              <Settings size={22} className="text-stone-500" />
            </button>
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
                      if (!isActive) {
                        localStorage.setItem('hsp_token', acc.token);
                        window.location.reload();
                      }
                      setShowAccountSwitcher(false);
                    }}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <img
                      src={acc.avatar_url || '/default-avatar.png'}
                      alt={acc.username}
                      className="h-11 w-11 rounded-full object-cover"
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

      {/* ── 3. AVATAR + STATS ROW ────────────────────────────────── */}
      <div className="flex items-center gap-5 p-4">
        {/* avatar */}
        <div className="relative h-[84px] w-[84px] shrink-0">
          <img
            src={user?.profile_image || user?.avatar_url || '/default-avatar.png'}
            alt={user?.name}
            onClick={!isOwn && user?.has_active_story ? () => navigate(`/stories/${user?.user_id}`) : undefined}
            className={`h-[84px] w-[84px] rounded-full object-cover ring-2 ${
              user?.has_active_story ? 'ring-stone-950 cursor-pointer' : 'ring-stone-200'
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
                className="absolute -bottom-1.5 -right-1.5 flex h-11 w-11 items-center justify-center rounded-full"
              >
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white bg-stone-950">
                  <Camera size={12} className="text-white" />
                </span>
              </button>
            </>
          )}
        </div>

        {/* stats */}
        <div className="flex flex-1 justify-around text-center">
          {[
            { value: user?.posts_count, label: 'Publicaciones', link: null },
            { value: user?.followers_count, label: 'Seguidores', link: `/user/${user?.username}/followers` },
            { value: user?.following_count, label: 'Seguidos', link: `/user/${user?.username}/following` },
          ].map((stat) => (
            <div
              key={stat.label}
              onClick={stat.link ? () => navigate(stat.link) : undefined}
              role={stat.link ? 'button' : undefined}
              tabIndex={stat.link ? 0 : undefined}
              onKeyDown={stat.link ? (e) => { if (e.key === 'Enter') navigate(stat.link); } : undefined}
              className={stat.link ? 'cursor-pointer' : ''}
            >
              <div className="text-lg font-semibold text-stone-950">{formatCount(stat.value)}</div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. INFO SECTION ──────────────────────────────────────── */}
      <div className="px-4 pb-3">
        {/* name + badges */}
        <div className="mb-0.5 flex flex-wrap items-center">
          <span className="text-[15px] font-semibold text-stone-950">{user?.name}</span>
          {roleLabel && (
            <span className={`ml-1.5 rounded-full px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-wide ${
              user?.role === 'influencer'
                ? 'bg-stone-950 text-white'
                : 'bg-stone-100 text-stone-500'
            }`}>
              {roleLabel}
            </span>
          )}
          {user?.is_verified && (
            <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-950">
              ✓ Verificado
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
                className="ml-0.5 text-sm font-medium text-stone-500"
              >
                Ver más
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
                <Star size={12} className="fill-amber-400 text-amber-400" />
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
                className="inline-flex items-center gap-1 rounded-full bg-stone-950 px-3 py-1 text-[11px] font-semibold text-white"
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

      {/* ── 5. ACTION BUTTONS ────────────────────────────────────── */}
      <div className="flex gap-2 px-4 pb-4">
        {isOwn ? (
          <>
            <button onClick={onEditProfile} className="min-h-[44px] flex-1 rounded-xl bg-stone-100 px-2 py-2.5 text-[13px] font-semibold text-stone-950">
              Editar perfil
            </button>
            <button onClick={shareProfile} className="min-h-[44px] flex-1 rounded-xl bg-stone-100 px-2 py-2.5 text-[13px] font-semibold text-stone-950">
              Compartir perfil
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onFollowToggle}
              aria-label={
                user?.follow_request_pending
                  ? 'Solicitud pendiente'
                  : user?.is_following
                  ? `Dejar de seguir a ${user?.name}`
                  : user?.is_private
                  ? `Solicitar seguir a ${user?.name}`
                  : `Seguir a ${user?.name}`
              }
              className={`min-h-[44px] flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
                user?.is_following
                  ? 'border-[1.5px] border-stone-200 bg-white text-stone-950'
                  : user?.follow_request_pending
                  ? 'border-[1.5px] border-stone-200 bg-white text-stone-500'
                  : 'bg-stone-950 text-white'
              }`}
              disabled={user?.follow_request_pending}
            >
              {user?.follow_request_pending
                ? 'Solicitado'
                : user?.is_following
                ? 'Siguiendo'
                : user?.is_private
                ? 'Solicitar seguir'
                : 'Seguir'}
            </button>
            <button
              onClick={onMessage}
              aria-label="Enviar mensaje"
              disabled={user?.is_private && !user?.is_following}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-950 ${
                user?.is_private && !user?.is_following ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <MessageCircle size={16} />
              {!showStoreButton && 'Mensaje'}
            </button>
            {showStoreButton && (
              <button
                onClick={() => navigate(`/store/${user?.store_slug || user?.username}`)}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-950"
              >
                <Store size={16} />
                Tienda
              </button>
            )}
          </>
        )}
      </div>

      {/* ── 5b. MUTUAL FOLLOWERS (Q10) ───────────────────────────── */}
      {!isOwn && user?.mutual_followers?.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="flex -space-x-2">
            {user.mutual_followers.slice(0, 3).map((mf) => (
              <img
                key={mf.user_id}
                src={mf.profile_image || '/default-avatar.png'}
                alt={mf.username}
                className="h-5 w-5 rounded-full border border-white object-cover"
              />
            ))}
          </div>
          <span className="text-[12px] text-stone-500">
            Seguido por{' '}
            <span className="font-medium text-stone-700">{user.mutual_followers[0]?.username}</span>
            {user.mutual_followers_count > 1 && (
              <> y <span className="font-medium text-stone-700">{user.mutual_followers_count - 1} más</span></>
            )}
          </span>
        </div>
      )}

      {/* ── 6. HIGHLIGHTS ────────────────────────────────────────── */}
      {(isOwn || highlights.length > 0) && (
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
          {isOwn && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onCreateHighlight || (() => toast('Próximamente'))}
                aria-label="Crear historia destacada"
                className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-stone-200"
              >
                <Plus size={20} className="text-stone-500" />
              </button>
              <span className="text-[10px] text-stone-500">Nueva</span>
            </div>
          )}

          {highlights.map((hl, i) => (
            <div key={hl.highlight_id || hl.id || i} className="flex shrink-0 flex-col items-center gap-1">
              <div className="h-[62px] w-[62px] overflow-hidden rounded-full bg-stone-100 ring-2 ring-stone-200">
                {(hl.cover_url || hl.image) && (
                  <img src={hl.cover_url || hl.image} alt={hl.title} className="h-full w-full object-cover" />
                )}
              </div>
              <span className="max-w-[62px] truncate text-[10px] text-stone-950">
                {hl.title?.slice(0, 12)}
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

              <OptionRow label={`Bloquear a @${user?.username}`} muted onClick={() => { toast('Próximamente'); setShowOptionsSheet(false); }} />
              <OptionRow label="Reportar cuenta" muted onClick={() => { toast('Próximamente'); setShowOptionsSheet(false); }} />
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
