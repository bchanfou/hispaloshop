import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { useFollowers, useFollowing } from '../../hooks/useFollowList';
import { useToggleUserFollowMutation } from '../../features/user/queries';
import { getCloudinarySrcSet } from '../../utils/cloudinary';
import { resolveUserImage } from '../../features/user/queries';
import { useTranslation } from 'react-i18next';

// ── Fila de usuario ──────────────────────────────────────
import i18n from "../../locales/i18n";
function UserRow({
  user,
  onToggleFollow,
  isMutating,
  currentUserId
}) {
  const isMe = user.id === currentUserId;
  const avatarSrc = resolveUserImage(user.avatar_url);
  return <div className="flex items-center gap-3 px-5 py-2.5">
      {/* Avatar */}
      <Link to={`/user/${user.id}`} className="relative shrink-0">
        <div className="h-11 w-11 overflow-hidden rounded-full bg-stone-100">
          {avatarSrc ? <img src={avatarSrc} srcSet={getCloudinarySrcSet(avatarSrc, [44, 88, 132])} sizes="44px" alt={user.username} loading="lazy" className="h-full w-full object-cover" onError={e => {
          e.currentTarget.style.display = 'none';
        }} /> : <div className="flex h-full w-full items-center justify-center text-[14px] font-semibold text-stone-400">
              {(user.username?.[0] || user.full_name?.[0] || '?').toUpperCase()}
            </div>}
        </div>
        {user.is_verified ? <span className="absolute -bottom-0.5 -right-0.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#0c0a09] text-[7px] font-bold text-white ring-2 ring-white">
            ✓
          </span> : null}
      </Link>

      {/* Info */}
      <Link to={`/user/${user.id}`} className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-stone-950">
          {user.username || user.full_name}
        </p>
        {user.full_name && user.username ? <p className="truncate text-[12px] text-stone-500">{user.full_name}</p> : null}
      </Link>

      {/* Follow button — hide for self */}
      {!isMe ? <motion.button type="button" whileTap={{
      scale: 0.95
    }} disabled={isMutating} onClick={() => onToggleFollow(user.id, user.is_following)} className={`shrink-0 rounded-full px-4 py-[7px] text-[13px] font-medium transition-all ${user.is_following ? 'border border-stone-200 bg-white text-stone-950 hover:bg-stone-50' : 'bg-stone-950 text-white hover:bg-stone-800'} ${isMutating ? 'opacity-60' : ''}`}>
          {user.is_following ? 'Siguiendo' : 'Seguir'}
        </motion.button> : null}
    </div>;
}

// ── Modal principal ──────────────────────────────────────
export default function FollowersModal({
  isOpen,
  onClose,
  userId,
  currentUserId,
  initialTab = 'followers',
  followersCount,
  followingCount
}) {
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setSearch('');
    }
  }, [isOpen, initialTab]);
  const followersQuery = useFollowers(isOpen && tab === 'followers' ? userId : null, search);
  const followingQuery = useFollowing(isOpen && tab === 'following' ? userId : null, search);
  const followMutation = useToggleUserFollowMutation();
  const activeQuery = tab === 'followers' ? followersQuery : followingQuery;
  const users = activeQuery.data?.pages?.flatMap(p => p.users) ?? [];
  const handleToggleFollow = useCallback((targetId, isFollowing) => {
    followMutation.mutate({
      userId: targetId,
      isFollowing
    });
  }, [followMutation]);
  const loadMore = useCallback(() => {
    if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
      activeQuery.fetchNextPage();
    }
  }, [activeQuery]);
  return <AnimatePresence>
      {isOpen ? <>
          {/* Backdrop */}
          <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} transition={{
        duration: 0.2
      }} onClick={onClose} className="fixed inset-0 z-[100] bg-black/45" />

          {/* Sheet */}
          <motion.div initial={{
        y: '100%'
      }} animate={{
        y: 0
      }} exit={{
        y: '100%'
      }} transition={{
        type: 'spring',
        stiffness: 380,
        damping: 38,
        mass: 0.8
      }} className="fixed bottom-0 left-0 right-0 z-[101] flex h-[85vh] flex-col overflow-hidden rounded-t-[20px] bg-white md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:h-[80vh] md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]">
            {/* Handle */}
            <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-stone-200 md:hidden" />

            {/* Header con tabs */}
            <div className="flex shrink-0 items-center px-5 pt-3">
              <div className="flex flex-1 gap-0">
                {['followers', 'following'].map(t => <button key={t} type="button" onClick={() => {
              setTab(t);
              setSearch('');
            }} className={`flex-1 border-b-2 pb-3 pt-1 text-[14px] transition-colors ${tab === t ? 'border-stone-950 font-semibold text-stone-950' : 'border-transparent font-normal text-stone-400'}`}>
                    {t === 'followers' ? `${(followersCount ?? 0).toLocaleString('es-ES')} seguidores` : `${(followingCount ?? 0).toLocaleString('es-ES')} siguiendo`}
                  </button>)}
              </div>

              <button type="button" onClick={onClose} className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="shrink-0 px-4 py-3">
              <div className="flex items-center gap-2 rounded-2xl bg-stone-100 px-3.5 py-2.5">
                <Search className="h-[15px] w-[15px] shrink-0 text-stone-400" />
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar" className="flex-1 border-none bg-transparent text-[14px] text-stone-950 outline-none placeholder:text-stone-400" />
                {search ? <button type="button" onClick={() => {
              setSearch('');
              searchRef.current?.focus();
            }} className="shrink-0 text-stone-400">
                    <X className="h-3.5 w-3.5" />
                  </button> : null}
              </div>
            </div>

            {/* List */}
            {activeQuery.isLoading ? <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-stone-400" />
              </div> : users.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center gap-2 text-stone-500">
                <p className="text-[15px] font-medium">
                  {search ? 'Sin resultados' : tab === 'followers' ? i18n.t('followers.sinSeguidoresAun', 'Sin seguidores aún') : i18n.t('followers.noSigueANadieAun', 'No sigue a nadie aún')}
                </p>
                {search ? <p className="text-[13px]">Prueba con otro nombre</p> : null}
              </div> : <Virtuoso data={users} defaultItemHeight={64} style={{
          flex: 1
        }} itemContent={(_, user) => <UserRow key={user.id} user={user} onToggleFollow={handleToggleFollow} isMutating={followMutation.isPending} currentUserId={currentUserId} />} endReached={loadMore} components={{
          Footer: () => activeQuery.isFetchingNextPage ? <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                      </div> : <div className="h-5" />
        }} />}
          </motion.div>
        </> : null}
    </AnimatePresence>;
}