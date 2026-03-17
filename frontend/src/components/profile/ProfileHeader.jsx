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
    // Fallback: show current user only
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

  const profileUrl = `https://hispaloshop.com/user/${user?.username}`;

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

  const showStoreButton =
    !isOwn && (user?.role === 'producer' || user?.role === 'importer');
  const roleLabel = ROLE_LABELS[user?.role];
  const bioTruncated =
    user?.bio && user.bio.length > 150 && !bioExpanded
      ? user.bio.slice(0, 150) + '...'
      : user?.bio;

  /* ── highlights placeholder ────────────────────────────────────── */

  const highlights = []; // TODO: fetch or receive via props

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      {/* ── 1. TOPBAR ────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {isOwn ? (
          <>
            {/* spacer */}
            <div style={{ width: 40 }} />

            {/* username dropdown */}
            <button
              onClick={() => setShowAccountSwitcher(true)}
              aria-label="Cambiar cuenta"
              aria-expanded={showAccountSwitcher}
              aria-haspopup="dialog"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--color-black)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              @{user?.username}
              <ChevronDown size={14} />
            </button>

            {/* settings */}
            <button
              onClick={() => navigate('/settings')}
              aria-label="Ajustes"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={22} color="var(--color-stone)" />
            </button>
          </>
        ) : (
          <>
            {/* back */}
            <button
              onClick={() => navigate(-1)}
              aria-label="Volver"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={22} color="var(--color-black)" />
            </button>

            {/* username */}
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)' }}>
              @{user?.username}
            </span>

            {/* more */}
            <button
              onClick={() => setShowOptionsSheet(true)}
              aria-label="Más opciones"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MoreHorizontal size={22} color="var(--color-black)" />
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
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 9998,
              }}
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
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                background: 'var(--color-white)',
                borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
                padding: '16px 20px 32px',
              }}
            >
              {/* handle */}
              <div
                style={{
                  width: 36,
                  height: 4,
                  background: 'var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  margin: '0 auto 20px',
                }}
              />

              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Cuentas</div>

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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '10px 0',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <img
                      src={acc.avatar_url || '/default-avatar.png'}
                      alt={acc.username}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--color-black)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {acc.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-stone)' }}>
                        @{acc.username}
                      </div>
                    </div>
                    {acc.role && (
                      <span
                        style={{
                          fontSize: 10,
                          background: 'var(--color-surface)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          textTransform: 'uppercase',
                          color: 'var(--color-stone)',
                          fontWeight: 500,
                        }}
                      >
                        {ROLE_LABELS[acc.role] || acc.role}
                      </span>
                    )}
                    {isActive && <Check size={18} color="var(--color-black)" />}
                  </button>
                );
              })}

              <div
                style={{
                  height: 1,
                  background: 'var(--color-border)',
                  margin: '12px 0',
                }}
              />

              <button
                onClick={() => {
                  setShowAccountSwitcher(false);
                  navigate('/login?add_account=true');
                }}
                style={{
                  width: '100%',
                  padding: 14,
                  background: 'var(--color-surface)',
                  border: 'none',
                  borderRadius: 'var(--radius-xl)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  color: 'var(--color-black)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                + Agregar cuenta
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 3. AVATAR + STATS ROW ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: 16 }}>
        {/* avatar */}
        <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
          <img
            src={user?.profile_image || user?.avatar_url || '/default-avatar.png'}
            alt={user?.name}
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              border: `2px solid ${user?.has_active_story ? 'var(--color-black)' : 'var(--color-border)'}`,
              objectFit: 'cover',
            }}
          />
          {isOwn && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Cambiar foto de perfil"
                style={{
                  position: 'absolute',
                  bottom: -6,
                  right: -6,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--color-black)',
                  border: '2px solid var(--color-white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Camera size={12} color="var(--color-white)" />
                </span>
              </button>
            </>
          )}
        </div>

        {/* stats */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'space-around',
            textAlign: 'center',
          }}
        >
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
              style={{ cursor: stat.link ? 'pointer' : 'default' }}
            >
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-black)' }}>
                {formatCount(stat.value)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--color-stone)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. INFO SECTION ──────────────────────────────────────── */}
      <div style={{ padding: '0 16px 12px' }}>
        {/* name + badges */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)' }}>
            {user?.name}
          </span>
          {roleLabel && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: user?.role === 'influencer' ? 'var(--color-black)' : 'var(--color-surface)',
                color: user?.role === 'influencer' ? 'var(--color-white)' : 'var(--color-stone)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                marginLeft: 6,
              }}
            >
              {roleLabel}
            </span>
          )}
          {user?.is_verified && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                background: 'var(--color-surface)',
                color: 'var(--color-black)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                marginLeft: 4,
              }}
            >
              ✓ Verificado
            </span>
          )}
        </div>

        {/* bio */}
        {user?.bio && (
          <div style={{ fontSize: 14, color: 'var(--color-black)', lineHeight: 1.5, marginTop: 4 }}>
            {bioTruncated}
            {user.bio.length > 150 && !bioExpanded && (
              <button
                onClick={() => setBioExpanded(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-stone)',
                  fontSize: 14,
                  fontWeight: 500,
                  padding: 0,
                  marginLeft: 2,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Ver más
              </button>
            )}
          </div>
        )}

        {/* Influencer public stats + discount code */}
        {user?.role === 'influencer' && (user?.sales_count > 0 || user?.discount_code) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {user?.sales_count > 0 && (
              <span style={{ fontSize: 12, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                {user.sales_count} ventas generadas
              </span>
            )}
            {user?.producers_count > 0 && (
              <span style={{ fontSize: 12, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                · {user.producers_count} productores apoyados
              </span>
            )}
            {user?.discount_code && (
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(user.discount_code); toast.success('Código copiado: ' + user.discount_code); } catch { toast.error('No se pudo copiar'); }
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600,
                  background: 'var(--color-black)', color: 'var(--color-white)',
                  padding: '4px 12px', borderRadius: 'var(--radius-full)',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                <Copy size={10} />
                {user.discount_code}
              </button>
            )}
          </div>
        )}

        {/* website */}
        {user?.website && /^https?:\/\//i.test(user.website) && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}
          >
            <ExternalLink size={12} color="var(--color-stone)" />
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: 'var(--color-stone)',
                textDecoration: 'none',
              }}
            >
              {user.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}

        {/* location */}
        {user?.location && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}
          >
            <MapPin size={12} color="var(--color-stone)" />
            <span style={{ fontSize: 13, color: 'var(--color-stone)' }}>{user.location}</span>
          </div>
        )}
      </div>

      {/* ── 5. ACTION BUTTONS ────────────────────────────────────── */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
        {isOwn ? (
          <>
            <button
              onClick={onEditProfile}
              style={{
                flex: 1,
                padding: '10px 8px',
                minHeight: 44,
                fontSize: 13,
                fontWeight: 600,
                background: 'var(--color-surface)',
                color: 'var(--color-black)',
                border: 'none',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Editar perfil
            </button>
            <button
              onClick={shareProfile}
              style={{
                flex: 1,
                padding: '10px 8px',
                minHeight: 44,
                fontSize: 13,
                fontWeight: 600,
                background: 'var(--color-surface)',
                color: 'var(--color-black)',
                border: 'none',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Compartir perfil
            </button>
          </>
        ) : (
          <>
            {/* follow */}
            <button
              onClick={onFollowToggle}
              aria-label={user?.is_following ? `Dejar de seguir a ${user?.name}` : `Seguir a ${user?.name}`}
              style={{
                flex: 1,
                padding: '10px 12px',
                minHeight: 44,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                ...(user?.is_following
                  ? {
                      background: 'var(--color-white)',
                      color: 'var(--color-black)',
                      border: '1.5px solid var(--color-border)',
                    }
                  : {
                      background: 'var(--color-black)',
                      color: 'var(--color-white)',
                      border: 'none',
                    }),
              }}
            >
              {user?.is_following ? 'Siguiendo' : 'Seguir'}
            </button>

            {/* message */}
            <button
              onClick={onMessage}
              aria-label="Enviar mensaje"
              style={{
                flex: 1,
                padding: '10px 12px',
                minHeight: 44,
                fontSize: 13,
                fontWeight: 600,
                background: 'var(--color-white)',
                color: 'var(--color-black)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <MessageCircle size={16} />
              {!showStoreButton && 'Mensaje'}
            </button>

            {/* store */}
            {showStoreButton && (
              <button
                onClick={() =>
                  navigate(`/store/${user?.store_slug || user?.username}`)
                }
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--color-white)',
                  color: 'var(--color-black)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontFamily: 'var(--font-sans)',
                }}
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
        <div
          style={{
            padding: '0 16px 8px',
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {isOwn && (
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <button
                onClick={() => toast('Próximamente')}
                aria-label="Crear historia destacada"
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  border: '2px dashed var(--color-border)',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <Plus size={20} color="var(--color-stone)" />
              </button>
              <span style={{ fontSize: 10, color: 'var(--color-stone)' }}>Nueva</span>
            </div>
          )}

          {highlights.map((hl, i) => (
            <div
              key={hl.id || i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  background: 'var(--color-surface)',
                  overflow: 'hidden',
                }}
              >
                {hl.image && (
                  <img
                    src={hl.image}
                    alt={hl.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  textAlign: 'center',
                  color: 'var(--color-black)',
                  maxWidth: 62,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
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
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 9998,
              }}
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
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                background: 'var(--color-white)',
                borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
                padding: '16px 0 32px',
              }}
            >
              {/* handle */}
              <div
                style={{
                  width: 36,
                  height: 4,
                  background: 'var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  margin: '0 auto 20px',
                }}
              />

              {showStoreButton && (
                <>
                  <OptionRow
                    icon={<Store size={20} />}
                    label="Visitar tienda"
                    onClick={() => {
                      setShowOptionsSheet(false);
                      navigate(`/store/${user?.store_slug || user?.username}`);
                    }}
                  />
                  <OptionRow
                    icon={<Package size={20} />}
                    label="Ver productos"
                    onClick={() => setShowOptionsSheet(false)}
                  />
                </>
              )}

              <OptionRow
                icon={<Copy size={20} />}
                label="Copiar enlace del perfil"
                onClick={() => {
                  copyProfileLink();
                  setShowOptionsSheet(false);
                }}
              />
              <OptionRow
                icon={<Share2 size={20} />}
                label="Compartir perfil"
                onClick={() => {
                  shareProfile();
                  setShowOptionsSheet(false);
                }}
              />

              <div
                style={{
                  height: 1,
                  background: 'var(--color-border)',
                  margin: '12px 0',
                }}
              />

              <OptionRow
                label={`Bloquear a @${user?.username}`}
                color="var(--color-stone)"
                onClick={() => {
                  toast('Próximamente');
                  setShowOptionsSheet(false);
                }}
              />
              <OptionRow
                label="Reportar cuenta"
                color="var(--color-stone)"
                onClick={() => {
                  toast('Próximamente');
                  setShowOptionsSheet(false);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Option row for the bottom sheet ─────────────────────────────── */

function OptionRow({ icon, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px 20px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 15,
        fontWeight: 500,
        color: color || 'var(--color-black)',
        fontFamily: 'var(--font-sans)',
        transition: 'var(--transition-fast)',
      }}
      onPointerEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface)'; }}
      onPointerLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}
      {label}
    </button>
  );
}
