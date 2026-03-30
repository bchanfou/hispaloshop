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
  Send,
  Check,
  Plus,
  Copy,
  Package,
  Star,
  ShoppingBag,
  UserPlus,
  Flag,
  ShieldBan,
  LogOut,
  Pencil,
  Trash2,
  Globe,
  Youtube,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import AnimatedNumber from '../motion/AnimatedNumber';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { getToken } from '../../lib/auth';
import { useHaptics } from '../../hooks/useHaptics';
import { InitialsAvatar } from '../ui/InitialsAvatar';

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

/* ── Green premium story ring gradient ────────────────────────────── */

const STORY_RING_GRADIENT = 'conic-gradient(#0c0a09 0deg, #57534e 90deg, #a8a29e 180deg, #57534e 270deg, #0c0a09 360deg)';

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
  onHighlightDeleted,
  onSwitchTab,
  onViewOwnStory,
  onViewHighlight,
  onCreateStory,
}) {
  const navigate = useNavigate();
  const { switchAccount, logoutAccount } = useAuth();
  const queryClient = useQueryClient();
  const { trigger } = useHaptics();
  const fileInputRef = useRef(null);

  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [accountsVersion, setAccountsVersion] = useState(0);
  const [accountToClose, setAccountToClose] = useState(null);
  const [closingAccount, setClosingAccount] = useState(false);

  /* highlight edit/delete state */
  const [highlightMenu, setHighlightMenu] = useState(null); // highlight object or null
  const [highlightEditName, setHighlightEditName] = useState('');
  const [highlightEditMode, setHighlightEditMode] = useState(null); // 'name' | 'cover' | 'delete' | null
  const [highlightDeleting, setHighlightDeleting] = useState(false);
  const [highlightSavingName, setHighlightSavingName] = useState(false);
  const longPressTimerRef = useRef(null);

  /* 8.1: Create highlight flow state */
  const [createHighlightOpen, setCreateHighlightOpen] = useState(false);
  const [createHighlightStep, setCreateHighlightStep] = useState(1); // 1=select stories, 2=name
  const [createHighlightName, setCreateHighlightName] = useState('');
  const [createHighlightSelectedIds, setCreateHighlightSelectedIds] = useState([]);
  const [createHighlightSaving, setCreateHighlightSaving] = useState(false);
  const [archivedStories, setArchivedStories] = useState([]);
  const [archivedStoriesLoading, setArchivedStoriesLoading] = useState(false);
  const [deleteConfirmHighlight, setDeleteConfirmHighlight] = useState(null);

  /* close bottom sheets on Escape */
  useEffect(() => {
    if (!showAccountSwitcher && !showOptionsSheet && !accountToClose) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowAccountSwitcher(false);
        setShowOptionsSheet(false);
        setAccountToClose(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showAccountSwitcher, showOptionsSheet, accountToClose]);

  /* ── accounts from localStorage ────────────────────────────────── */

  const accounts = useMemo(() => {
    const currentAccObj = {
      token: getToken() || '',
      user_id: user?.user_id || user?.id,
      username: user?.username,
      name: user?.name || user?.full_name || user?.display_name || user?.username,
      avatar_url: user?.avatar_url || user?.profile_image,
      role: user?.role,
    };
    try {
      const raw = localStorage.getItem('hsp_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Dedup: filter out current user, then prepend them
          const currentId = String(user?.user_id || user?.id || '');
          const others = parsed.filter(a => String(a.user_id || a.id || '') !== currentId);
          return [currentAccObj, ...others];
        }
      }
    } catch {
      /* ignore */
    }
    return [currentAccObj];
  }, [user, accountsVersion]);

  const currentUserId = String(user?.user_id || user?.id || '');
  const hasAlternativeAccount = useMemo(
    () => accounts.some((acc) => String(acc.user_id || acc.id || '') !== currentUserId && acc.token),
    [accounts, currentUserId],
  );

  /* ── sync account switcher cache when profile data changes ────── */
  useEffect(() => {
    if (!user) return;
    try {
      const accounts = JSON.parse(localStorage.getItem('hsp_accounts') || '[]');
      const idx = accounts.findIndex(a => String(a.user_id || a.id || '') === String(user.user_id || user.id || ''));
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], name: user.name || user.full_name, username: user.username, avatar_url: user.profile_image || user.avatar_url };
        localStorage.setItem('hsp_accounts', JSON.stringify(accounts));
      }
    } catch { /* ignore */ }
  }, [user?.name, user?.username, user?.profile_image, user?.avatar_url]);

  const handleCloseAccount = useCallback(async (acc) => {
    setClosingAccount(true);
    const isActive = String(acc.user_id || acc.id || '') === currentUserId;
    try {
      const result = await logoutAccount(acc);
      queryClient.clear();
      setAccountsVersion((v) => v + 1);
      setShowAccountSwitcher(false);
      setAccountToClose(null);

      if (isActive) {
        if (result?.switched && result?.user?.username) {
          toast.success('Sesion cerrada. Cambiado a otra cuenta.');
          navigate(`/${result.user.username}`);
        } else if (result?.switched) {
          toast.success('Sesion cerrada. Cambiado a otra cuenta.');
          navigate('/');
        } else {
          toast.success('Sesion cerrada');
          navigate('/login');
        }
        return;
      }

      toast.success('Cuenta eliminada del dispositivo');
    } catch (err) {
      toast.error('No se pudo cerrar la cuenta. Intentalo de nuevo.');
    } finally {
      setClosingAccount(false);
    }
  }, [currentUserId, logoutAccount, queryClient, navigate]);

  /* ── avatar file pick ──────────────────────────────────────────── */

  const handleAvatarFile = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file && onAvatarChange) onAvatarChange(file);
    },
    [onAvatarChange],
  );

  /* ── share / copy helper ───────────────────────────────────────── */

  const profileUrl = `${window.location.origin}/${user?.username}`;

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

  /* ── highlight handlers ────────────────────────────────────────── */

  const handleHighlightLongPressStart = useCallback((hl) => {
    longPressTimerRef.current = setTimeout(() => {
      setHighlightMenu(hl);
      setHighlightEditMode(null);
    }, 500);
  }, []);

  const handleHighlightLongPressEnd = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
  }, []);

  const handleHighlightSaveName = useCallback(async () => {
    if (!highlightMenu || !highlightEditName.trim()) return;
    setHighlightSavingName(true);
    try {
      const hlId = highlightMenu.highlight_id || highlightMenu.id;
      await apiClient.put(`/users/me/highlights/${hlId}`, {
        title: highlightEditName.trim(),
      });
      toast.success('Nombre actualizado');
      setHighlightMenu(null);
      setHighlightEditMode(null);
      queryClient.invalidateQueries({ queryKey: ['user', 'highlights', user?.user_id || user?.id] });
      onHighlightDeleted?.(); // reuse callback to refresh highlights list
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setHighlightSavingName(false);
    }
  }, [highlightMenu, highlightEditName, onHighlightDeleted, user]);

  const handleHighlightDelete = useCallback(() => {
    if (!highlightMenu) return;
    // Route through confirmation modal instead of deleting directly
    setDeleteConfirmHighlight(highlightMenu);
    setHighlightMenu(null);
    setHighlightEditMode(null);
  }, [highlightMenu]);

  /* 8.1: Open create highlight — fetch archived stories */
  const handleOpenCreateHighlight = useCallback(async () => {
    setCreateHighlightOpen(true);
    setCreateHighlightStep(1);
    setCreateHighlightName('');
    setCreateHighlightSelectedIds([]);
    setArchivedStoriesLoading(true);
    try {
      const res = await apiClient.get('/stories/archive');
      const stories = Array.isArray(res) ? res : res?.stories || res?.data || res?.items || [];
      setArchivedStories(stories);
    } catch {
      setArchivedStories([]);
      toast.error('No se pudieron cargar las historias');
    } finally {
      setArchivedStoriesLoading(false);
    }
  }, []);

  /* 8.1: Toggle story selection */
  const toggleStorySelection = useCallback((storyId) => {
    setCreateHighlightSelectedIds((prev) =>
      prev.includes(storyId) ? prev.filter((id) => id !== storyId) : [...prev, storyId]
    );
  }, []);

  /* 8.1: Save new highlight */
  const handleSaveHighlight = useCallback(async () => {
    if (!createHighlightName.trim() || createHighlightSelectedIds.length === 0) return;
    setCreateHighlightSaving(true);
    try {
      const firstStory = archivedStories.find(
        (s) => (s.story_id || s.id || s._id) === createHighlightSelectedIds[0]
      );
      await apiClient.post('/users/me/highlights', {
        title: createHighlightName.trim(),
        story_ids: createHighlightSelectedIds,
        cover_url: firstStory?.image_url || firstStory?.media_url || firstStory?.thumbnail || null,
      });
      toast.success('Destacado creado');
      setCreateHighlightOpen(false);
      queryClient.invalidateQueries({ queryKey: ['user', 'highlights', user?.user_id || user?.id] });
      onHighlightDeleted?.(); // refresh highlights list
    } catch {
      toast.error('Error al crear el destacado');
    } finally {
      setCreateHighlightSaving(false);
    }
  }, [createHighlightName, createHighlightSelectedIds, archivedStories, onHighlightDeleted, user]);

  /* 8.2: Delete confirmation from highlight menu redirects to mini modal */
  const handleDeleteWithConfirm = useCallback((hl) => {
    setDeleteConfirmHighlight(hl);
    setHighlightEditMode(null);
  }, []);

  const confirmDeleteHighlight = useCallback(async () => {
    if (!deleteConfirmHighlight) return;
    setHighlightDeleting(true);
    try {
      const hlId = deleteConfirmHighlight.highlight_id || deleteConfirmHighlight.id;
      await apiClient.delete(`/users/me/highlights/${hlId}`);
      toast.success('Destacado eliminado');
      setDeleteConfirmHighlight(null);
      setHighlightMenu(null);
      queryClient.invalidateQueries({ queryKey: ['user', 'highlights', user?.user_id || user?.id] });
      onHighlightDeleted?.();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setHighlightDeleting(false);
    }
  }, [deleteConfirmHighlight, onHighlightDeleted, user]);

  /* cleanup long-press timer */
  useEffect(() => {
    return () => clearTimeout(longPressTimerRef.current);
  }, []);

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
              @{user?.username || ''}
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
              @{user?.username || ''}
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
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
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
              className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-2xl bg-white shadow-modal px-5 pb-8 pt-4"
            >
              <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-stone-200" />
              <div className="mb-4 text-base font-semibold">Cuentas</div>

              {accounts.map((acc, idx) => {
                const isActive = String(acc.user_id || acc.id || '') === currentUserId;
                return (
                  <div key={acc.user_id || acc.id || acc.username || idx} className="flex items-center gap-2 py-1.5">
                    <button
                      onClick={async () => {
                        if (!isActive && acc.token) {
                          const switched = await switchAccount(acc);
                          if (!switched?.ok) {
                            setAccountsVersion((v) => v + 1);
                            return;
                          }
                          queryClient.clear();
                          setAccountsVersion((v) => v + 1);
                          toast.success('Cuenta cambiada');
                          navigate(switched.user?.username ? `/${switched.user.username}` : '/');
                          setShowAccountSwitcher(false);
                          return;
                        }
                        setShowAccountSwitcher(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
                    >
                      {acc.avatar_url ? (
                        <img
                          src={acc.avatar_url}
                          alt={acc.username}
                          className="h-11 w-11 rounded-full object-cover"
                          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <InitialsAvatar
                        name={acc.name || acc.full_name || acc.username || 'U'}
                        size={44}
                        style={acc.avatar_url ? { display: 'none' } : {}}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-stone-950">{acc.name || acc.full_name || acc.email?.split('@')[0] || `Cuenta ${idx + 1}`}</div>
                        <div className="text-xs text-stone-500">@{acc.username || acc.email?.split('@')[0] || 'usuario'}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${isActive ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-500'}`}>
                            {isActive ? 'Activa' : 'Guardada'}
                          </span>
                        </div>
                      </div>
                      {acc.role && (
                        <span className="rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-medium uppercase px-2 py-0.5">
                          {ROLE_LABELS[acc.role] || acc.role}
                        </span>
                      )}
                      {isActive && <Check size={18} className="text-stone-950" />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAccountSwitcher(false);
                        setAccountToClose(acc);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600"
                      aria-label={isActive ? 'Cerrar sesion de esta cuenta' : 'Eliminar cuenta de este dispositivo'}
                      title={isActive ? 'Cerrar sesion' : 'Eliminar cuenta'}
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                );
              })}

              <div className="my-3 h-px bg-stone-200" />

              <button
                onClick={() => {
                  // Save current account before adding new one
                  const currentToken = getToken() || '';
                  if (currentToken && user) {
                    let existingAccounts = [];
                    try { existingAccounts = JSON.parse(localStorage.getItem('hsp_accounts') || '[]'); } catch { existingAccounts = []; }
                    const idx = existingAccounts.findIndex(a => String(a.user_id || a.id || '') === String(user.user_id || user.id || ''));
                    const currentAccObj = {
                      token: currentToken,
                      user_id: user.user_id || user.id,
                      username: user.username,
                      name: user.name || user.full_name,
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
                className="w-full rounded-full bg-stone-100 py-3.5 text-center text-sm font-semibold text-stone-950 active:scale-95 transition-all"
              >
                + Agregar cuenta
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 2b. ACCOUNT CLOSE CONFIRMATION ──────────────────────── */}
      <AnimatePresence>
        {accountToClose && (
          <>
            <motion.div
              key="acc-close-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => { if (!closingAccount) setAccountToClose(null); }}
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              key="acc-close-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed left-4 right-4 top-1/2 z-[9999] mx-auto max-w-[340px] -translate-y-1/2 rounded-2xl bg-white p-4 shadow-modal"
            >
              <p className="mb-1 text-center text-[15px] font-semibold text-stone-950">
                {String(accountToClose.user_id || accountToClose.id || '') === currentUserId ? 'Cerrar sesion de esta cuenta?' : 'Eliminar cuenta del dispositivo?'}
              </p>
              <p className="mb-4 text-center text-sm text-stone-500">
                {String(accountToClose.user_id || accountToClose.id || '') === currentUserId
                  ? (hasAlternativeAccount
                      ? 'Se cerrara la sesion y se cambiara automaticamente a otra cuenta guardada.'
                      : 'Se cerrara la sesion de esta cuenta y tendras que iniciar sesion de nuevo.')
                  : 'Solo se elimina del selector de cuentas en este dispositivo.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAccountToClose(null)}
                  disabled={closingAccount}
                  className="flex-1 rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleCloseAccount(accountToClose)}
                  disabled={closingAccount}
                  className="flex-1 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {closingAccount ? 'Procesando...' : (String(accountToClose.user_id || accountToClose.id || '') === currentUserId ? 'Cerrar sesion' : 'Eliminar')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 3. AVATAR + STATS ROW (Instagram layout) ──────────────── */}
      <div className="flex items-center gap-5 px-4 pt-4 pb-2 lg:items-start lg:gap-8 lg:pt-8 lg:pb-4">
        {/* avatar with gradient story ring */}
        <div className="relative h-[86px] w-[86px] shrink-0 lg:h-[150px] lg:w-[150px]">
          {user?.has_active_story && (
            <div
              className="absolute -inset-[3px] rounded-full"
              style={{ background: STORY_RING_GRADIENT }}
            />
          )}
          {(user?.profile_image || user?.avatar_url) ? (
            <img
              src={user?.profile_image || user?.avatar_url}
              alt={user?.name}
              onClick={
                user?.has_active_story
                  ? () => onViewOwnStory ? onViewOwnStory() : navigate(`/stories/${user?.user_id}`)
                  : undefined
              }
              className={`relative h-[86px] w-[86px] rounded-full border-[3px] border-white object-cover lg:h-[150px] lg:w-[150px] ${
                user?.has_active_story ? 'cursor-pointer' : 'ring-1 ring-stone-200'
              }`}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <InitialsAvatar
            name={user?.name || user?.full_name || user?.username || '?'}
            size={86}
            className={`relative border-[3px] border-white lg:!w-[150px] lg:!h-[150px] ${
              user?.has_active_story ? 'cursor-pointer' : 'ring-1 ring-stone-200'
            } ${(user?.profile_image || user?.avatar_url) ? '' : 'lg:text-2xl'}`}
            style={(user?.profile_image || user?.avatar_url) ? { display: 'none' } : {}}
            onClick={user?.has_active_story ? () => onViewOwnStory ? onViewOwnStory() : navigate(`/stories/${user?.user_id}`) : undefined}
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
                onClick={onCreateStory || (() => fileInputRef.current?.click())}
                aria-label={onCreateStory ? 'Crear story' : 'Cambiar foto de perfil'}
                className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-stone-950 shadow-sm"
              >
                <Plus size={14} className="text-white" strokeWidth={3} />
              </button>
            </>
          )}
        </div>

        {/* stats (Instagram: bold number, light label) */}
        <div className="flex flex-1 justify-around text-center lg:justify-start lg:gap-10">
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
              <AnimatedNumber value={stat.value} className="text-[17px] font-bold text-stone-950 leading-tight" />
              <div className="text-[11px] text-stone-500 mt-0.5 xs:text-[13px]">{stat.label}</div>
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
            <span className="ml-1.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-medium uppercase px-2 py-0.5">
              {roleLabel}
            </span>
          )}
        </div>

        {/* bio (Q4: line breaks + linkify) */}
        {user?.bio && (
          <motion.div layout transition={{ duration: 0.2, ease: 'easeOut' }} className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-950">
            <LinkifiedBio text={bioText} />
            {user.bio.length > 150 && !bioExpanded && (
              <button
                onClick={() => setBioExpanded(true)}
                className="ml-0.5 inline-flex items-center min-h-[44px] text-[14px] font-semibold text-stone-600"
              >
                más
              </button>
            )}
            {user.bio.length > 150 && bioExpanded && (
              <button
                onClick={() => setBioExpanded(false)}
                className="ml-0.5 inline-flex items-center min-h-[44px] text-[14px] font-semibold text-stone-600"
              >
                menos
              </button>
            )}
          </motion.div>
        )}

        {/* social links — all roles */}
        {(() => {
          const sl = user?.social_links || {};
          const ig = sl.instagram || user?.instagram;
          const tt = sl.tiktok || user?.tiktok;
          const yt = sl.youtube || user?.youtube;
          const web = sl.website || null;
          if (!ig && !tt && !yt && !web) return null;
          return (
            <div className="mt-2 flex gap-2">
              <SocialIcon href={ig ? `https://instagram.com/${ig.replace(/^@/, '')}` : null} label="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </SocialIcon>
              <SocialIcon href={tt ? `https://tiktok.com/@${tt.replace(/^@/, '')}` : null} label="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.11v-3.5a6.37 6.37 0 00-.82-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.37a8.16 8.16 0 004.76 1.52v-3.45a4.85 4.85 0 01-1-.75z"/></svg>
              </SocialIcon>
              <SocialIcon href={yt ? `https://youtube.com/${yt.startsWith('@') || yt.startsWith('http') ? '' : '@'}${yt}` : null} label="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </SocialIcon>
              <SocialIcon href={web} label="Sitio web">
                <Globe className="h-4 w-4" />
              </SocialIcon>
            </div>
          );
        })()}

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

      {/* ── 5. ACTION BUTTONS (Instagram layout) ────────────────── */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3 lg:flex-nowrap lg:w-auto lg:max-w-[480px]">
        {isOwn ? (
          <>
            <motion.button whileTap={{ scale: 0.96 }} transition={{ type: 'spring', damping: 20, stiffness: 400 }} onClick={onEditProfile} className="min-h-[44px] flex-1 rounded-full bg-stone-100 px-2 py-1.5 text-[13px] font-semibold text-stone-950">
              Editar perfil
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} transition={{ type: 'spring', damping: 20, stiffness: 400 }} onClick={shareProfile} className="min-h-[44px] flex-1 rounded-full bg-stone-100 px-2 py-1.5 text-[13px] font-semibold text-stone-950">
              Compartir perfil
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              onClick={() => navigate('/discover/people')}
              aria-label="Descubrir personas"
              className="flex min-h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-stone-100"
            >
              <UserPlus size={16} className="text-stone-950" />
            </motion.button>
          </>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              animate={user?.is_following ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              onClick={() => { onFollowToggle?.(); trigger('medium'); }}
              aria-label={
                user?.follow_request_pending
                  ? 'Cancelar solicitud'
                  : user?.is_following
                  ? `Dejar de seguir a ${user?.name}`
                  : user?.is_private
                  ? `Solicitar seguir a ${user?.name}`
                  : `Seguir a ${user?.name}`
              }
              className={`min-h-[44px] flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold overflow-hidden ${
                user?.is_following
                  ? 'bg-stone-100 text-stone-950'
                  : user?.follow_request_pending
                  ? 'bg-stone-100 text-stone-500'
                  : 'bg-stone-950 text-white hover:bg-stone-800'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={user?.follow_request_pending ? 'requested' : user?.is_following ? 'following' : 'follow'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {user?.follow_request_pending
                    ? 'Solicitado'
                    : user?.is_following
                    ? 'Siguiendo'
                    : user?.is_private
                    ? 'Solicitar'
                    : 'Seguir'}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              onClick={onMessage}
              aria-label="Enviar mensaje"
              disabled={user?.is_private && !user?.is_following}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-[13px] font-semibold text-stone-950 ${
                user?.is_private && !user?.is_following ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <MessageCircle size={15} />
              {!showStoreButton && 'Mensaje'}
            </motion.button>
            {showStoreButton && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                onClick={() => navigate(`/store/${user?.store_slug || user?.username}`)}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-[13px] font-semibold text-stone-950"
              >
                <Store size={15} />
                Tienda
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              onClick={() => navigate('/discover/people')}
              aria-label="Descubrir personas"
              className="flex min-h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-stone-100"
            >
              <UserPlus size={16} className="text-stone-950" />
            </motion.button>
          </>
        )}
      </div>

      {/* ── 5b. MUTUAL FOLLOWERS (Instagram style) ───────────────── */}
      {!isOwn && user?.mutual_followers?.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="flex -space-x-1.5">
            {user.mutual_followers.slice(0, 3).map((mf) => (
              mf.profile_image ? (
                <img
                  key={mf.user_id}
                  src={mf.profile_image}
                  alt={mf.username}
                  className="h-4 w-4 rounded-full border-[1.5px] border-white object-cover"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <InitialsAvatar key={mf.user_id} name={mf.username} size={16} className="border-[1.5px] border-white" />
              )
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
        <div className="flex gap-4 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none scrollbar-hide snap-x">
          {isOwn && (
            <div className="flex flex-col items-center gap-1.5 snap-start">
              <button
                onClick={onCreateHighlight || handleOpenCreateHighlight}
                aria-label="Crear historia destacada"
                className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border border-stone-200"
              >
                <Plus size={22} className="text-stone-400" />
              </button>
              <span className="text-[11px] text-stone-500">Nuevo</span>
            </div>
          )}

          {highlights.map((hl, i) => (
            <motion.div
              key={hl.highlight_id || hl.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="relative flex shrink-0 flex-col items-center gap-1.5 cursor-pointer snap-start"
              onClick={() => onViewHighlight?.(hl)}
              onPointerDown={isOwn ? () => handleHighlightLongPressStart(hl) : undefined}
              onPointerUp={isOwn ? handleHighlightLongPressEnd : undefined}
              onPointerLeave={isOwn ? handleHighlightLongPressEnd : undefined}
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
            </motion.div>
          ))}
        </div>
      )}

      {/* ── 6b. HIGHLIGHT EDIT/DELETE BOTTOM SHEET ────────────────── */}
      <AnimatePresence>
        {highlightMenu && isOwn && (
          <>
            <motion.div
              key="hl-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => { setHighlightMenu(null); setHighlightEditMode(null); }}
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              key="hl-sheet"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label="Opciones de destacado"
              className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-2xl bg-white shadow-modal pb-8 pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-stone-200" />

              {/* Default menu */}
              {!highlightEditMode && (
                <>
                  <p className="mb-3 px-5 text-center text-[15px] font-semibold text-stone-950">
                    {highlightMenu.title || 'Destacado'}
                  </p>
                  <OptionRow
                    icon={<Pencil size={20} />}
                    label="Editar nombre"
                    onClick={() => {
                      setHighlightEditName(highlightMenu.title || '');
                      setHighlightEditMode('name');
                    }}
                  />
                  <OptionRow
                    icon={<Camera size={20} />}
                    label="Editar portada"
                    onClick={() => setHighlightEditMode('cover')}
                  />
                  <div className="my-2 mx-5 h-px bg-stone-100" />
                  <OptionRow
                    icon={<Trash2 size={20} />}
                    label="Eliminar destacado"
                    muted
                    onClick={() => setHighlightEditMode('delete')}
                  />
                </>
              )}

              {/* Edit name inline */}
              {highlightEditMode === 'name' && (
                <div className="px-5">
                  <p className="mb-3 text-center text-[15px] font-semibold text-stone-950">Editar nombre</p>
                  <input
                    type="text"
                    value={highlightEditName}
                    onChange={(e) => setHighlightEditName(e.target.value.slice(0, 30))}
                    maxLength={30}
                    autoFocus
                    className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-950 outline-none focus:border-stone-950"
                    placeholder="Nombre del destacado"
                  />
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setHighlightEditMode(null)}
                      className="flex-1 rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleHighlightSaveName}
                      disabled={highlightSavingName || !highlightEditName.trim()}
                      className="flex-1 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {highlightSavingName ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Select cover from stories */}
              {highlightEditMode === 'cover' && (
                <div className="px-5">
                  <p className="mb-3 text-center text-[15px] font-semibold text-stone-950">Elegir portada</p>
                  {(highlightMenu.stories?.length > 0 || highlightMenu.items?.length > 0) ? (
                    <div className="grid grid-cols-4 gap-2">
                      {(highlightMenu.stories || highlightMenu.items || []).map((story, si) => {
                        const storyImg = story.image_url || story.media_url || story.thumbnail;
                        return (
                          <button
                            key={story.id || story.story_id || si}
                            onClick={async () => {
                              try {
                                const hlId = highlightMenu.highlight_id || highlightMenu.id;
                                await apiClient.put(`/users/me/highlights/${hlId}`, {
                                  cover_url: storyImg,
                                });
                                toast.success('Portada actualizada');
                                setHighlightMenu(null);
                                setHighlightEditMode(null);
                                queryClient.invalidateQueries({ queryKey: ['user', 'highlights', user?.user_id || user?.id] });
                              } catch {
                                toast.error('Error al actualizar portada');
                              }
                            }}
                            className="aspect-square overflow-hidden rounded-2xl border border-stone-200"
                          >
                            {storyImg ? (
                              <img src={storyImg} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400 text-xs">Sin imagen</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-stone-500">No hay historias en este destacado</p>
                  )}
                  <button
                    onClick={() => setHighlightEditMode(null)}
                    className="mt-4 w-full rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950"
                  >
                    Volver
                  </button>
                </div>
              )}

              {/* Delete confirmation */}
              {highlightEditMode === 'delete' && (
                <div className="px-5 text-center">
                  <p className="mb-1 text-[15px] font-semibold text-stone-950">Eliminar destacado</p>
                  <p className="mb-4 text-sm text-stone-500">
                    Las historias del destacado no se eliminarán, solo la colección.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setHighlightEditMode(null)}
                      className="flex-1 rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (!highlightMenu) return;
                        setHighlightDeleting(true);
                        try {
                          const hlId = highlightMenu.highlight_id || highlightMenu.id;
                          await apiClient.delete(`/users/me/highlights/${hlId}`);
                          toast.success('Destacado eliminado');
                          setHighlightMenu(null);
                          setHighlightEditMode(null);
                          queryClient.invalidateQueries({ queryKey: ['user', 'highlights', user?.user_id || user?.id] });
                          onHighlightDeleted?.();
                        } catch {
                          toast.error('Error al eliminar');
                        } finally {
                          setHighlightDeleting(false);
                        }
                      }}
                      disabled={highlightDeleting}
                      className="flex-1 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {highlightDeleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 6c. CREATE HIGHLIGHT BOTTOM SHEET ─────────────────────── */}
      <AnimatePresence>
        {createHighlightOpen && isOwn && (
          <>
            <motion.div
              key="ch-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setCreateHighlightOpen(false)}
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              key="ch-sheet"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label="Crear historia destacada"
              className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-2xl bg-white shadow-modal pb-8 pt-4 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-stone-200" />

              {/* Step 1: Select stories from archive */}
              {createHighlightStep === 1 && (
                <div className="flex flex-col flex-1 min-h-0 px-5">
                  <p className="mb-3 text-center text-[15px] font-semibold text-stone-950">
                    Seleccionar historias
                  </p>
                  {archivedStoriesLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" />
                    </div>
                  ) : archivedStories.length === 0 ? (
                    <div className="py-10 flex flex-col items-center gap-3">
                      <p className="text-sm text-stone-500 text-center">No hay historias en tu archivo</p>
                      <p className="text-xs text-stone-400 text-center">Publica una historia primero para poder crear un destacado</p>
                      <button
                        onClick={() => {
                          setCreateHighlightOpen(false);
                          window.dispatchEvent(new CustomEvent('open-creator', { detail: { mode: 'story' } }));
                        }}
                        className="bg-stone-950 text-white rounded-full px-5 py-2 text-sm font-semibold"
                      >
                        Crear historia
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 overflow-y-auto flex-1 min-h-0 pb-3">
                      {archivedStories.map((story, si) => {
                        const storyId = story.story_id || story.id || story._id;
                        const storyImg = story.image_url || story.media_url || story.thumbnail;
                        const selected = createHighlightSelectedIds.includes(storyId);
                        return (
                          <button
                            key={storyId || si}
                            onClick={() => toggleStorySelection(storyId)}
                            className={`relative aspect-square overflow-hidden rounded-2xl border-2 ${
                              selected ? 'border-stone-950' : 'border-stone-200'
                            }`}
                          >
                            {storyImg ? (
                              <img src={storyImg} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400 text-xs">
                                Sin imagen
                              </div>
                            )}
                            {selected && (
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-stone-950 flex items-center justify-center">
                                <Check size={12} className="text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => setCreateHighlightOpen(false)}
                      className="flex-1 rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setCreateHighlightStep(2)}
                      disabled={createHighlightSelectedIds.length === 0}
                      className="flex-1 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Siguiente ({createHighlightSelectedIds.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Name the highlight */}
              {createHighlightStep === 2 && (
                <div className="px-5">
                  <p className="mb-3 text-center text-[15px] font-semibold text-stone-950">
                    Nombre del destacado
                  </p>
                  <input
                    type="text"
                    value={createHighlightName}
                    onChange={(e) => setCreateHighlightName(e.target.value.slice(0, 30))}
                    maxLength={30}
                    autoFocus
                    placeholder="Ej: Viajes, Recetas, Favoritos..."
                    className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-950 outline-none focus:border-stone-950"
                  />
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setCreateHighlightStep(1)}
                      className="flex-1 rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950"
                    >
                      Atras
                    </button>
                    <button
                      onClick={handleSaveHighlight}
                      disabled={createHighlightSaving || !createHighlightName.trim()}
                      className="flex-1 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {createHighlightSaving ? 'Creando...' : 'Crear'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 6d. DELETE HIGHLIGHT CONFIRMATION MINI MODAL ──────────── */}
      <AnimatePresence>
        {deleteConfirmHighlight && (
          <>
            <motion.div
              key="dc-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setDeleteConfirmHighlight(null)}
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              key="dc-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[9999] bg-white rounded-2xl p-4 shadow-modal mx-auto max-w-[340px]"
            >
              <p className="mb-1 text-center text-[15px] font-semibold text-stone-950">
                ¿Eliminar este destacado?
              </p>
              <p className="mb-4 text-center text-sm text-stone-500">
                Las historias no se perderan, solo la coleccion.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmHighlight(null)}
                  className="flex-1 rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteHighlight}
                  disabled={highlightDeleting}
                  className="flex-1 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {highlightDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
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
              className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-2xl bg-white shadow-modal pb-8 pt-4"
            >
              <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-stone-200" />

              {showStoreButton && (
                <>
                  <OptionRow icon={<Store size={20} />} label="Visitar tienda" onClick={() => { setShowOptionsSheet(false); navigate(`/store/${user?.store_slug || user?.username}`); }} />
                  <OptionRow icon={<Package size={20} />} label="Ver productos" onClick={() => { setShowOptionsSheet(false); onSwitchTab?.('products'); }} />
                </>
              )}

              <OptionRow icon={<Copy size={20} />} label="Copiar enlace del perfil" onClick={() => { copyProfileLink(); setShowOptionsSheet(false); }} />
              <OptionRow icon={<Send size={20} />} label="Compartir perfil" onClick={() => { shareProfile(); setShowOptionsSheet(false); }} />

              <div className="my-3 h-px bg-stone-200" />

              <OptionRow label={`Bloquear a @${user?.username}`} icon={<ShieldBan size={20} />} muted onClick={async () => {
                setShowOptionsSheet(false);
                try {
                  await apiClient.post(`/users/${user?.user_id}/block`);
                  toast.success(`Has bloqueado a @${user?.username}`);
                  queryClient.invalidateQueries({ queryKey: ['userProfile', String(user?.user_id)] });
                  navigate(-1);
                } catch { toast.error('Error al bloquear'); }
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
      type="button"
      onClick={onClick}
      aria-label={typeof label === 'string' ? label : undefined}
      className={`flex w-full items-center gap-3 px-5 py-3.5 min-h-[44px] text-left text-[15px] font-medium transition-all duration-150 hover:bg-stone-50 ${
        muted ? 'text-stone-500' : 'text-stone-950'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
