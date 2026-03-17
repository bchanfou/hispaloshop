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
  const bioTruncated =
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
            className={`h-[84px] w-[84px] rounded-full object-cover ring-2 ${
              user?.has_active_story ? 'ring-stone-950' : 'ring-stone-200'
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

        {/* bio */}
        {user?.bio && (
          <div className="mt-1 text-sm leading-relaxed text-stone-950">
            {bioTruncated}
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
              aria-label={user?.is_following ? `Dejar de seguir a ${user?.name}` : `Seguir a ${user?.name}`}
              className={`min-h-[44px] flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${
                user?.is_following
                  ? 'border-[1.5px] border-stone-200 bg-white text-stone-950'
                  : 'bg-stone-950 text-white'
              }`}
            >
              {user?.is_following ? 'Siguiendo' : 'Seguir'}
            </button>
            <button
              onClick={onMessage}
              aria-label="Enviar mensaje"
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-950"
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
                {hl.title?.slice(0, 8)}
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
                  <OptionRow icon={<Package size={20} />} label="Ver productos" onClick={() => setShowOptionsSheet(false)} />
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
