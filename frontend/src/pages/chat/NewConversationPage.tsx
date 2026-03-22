// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useChatContext } from '../../context/chat/ChatProvider';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

const ROLE_LABELS = {
  producer: 'Productor',
  influencer: 'Influencer',
  importer: 'Importador',
};

function getChatType(currentUser, targetUser) {
  if (targetUser.role === 'influencer') return 'collab';
  const b2bRoles = ['producer', 'importer'];
  const b2bPlans = ['pro', 'elite', 'PRO', 'ELITE'];
  if (
    b2bRoles.includes(currentUser.role) &&
    b2bRoles.includes(targetUser.role) &&
    b2bPlans.includes(currentUser.plan) &&
    b2bPlans.includes(targetUser.plan)
  ) {
    return 'b2b';
  }
  if (targetUser.role === 'producer' || targetUser.role === 'importer') return 'b2c';
  return 'c2c';
}

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function AvatarFallback({ name, size = 'h-11 w-11', rounded = 'rounded-full' }) {
  return (
    <div className={`${size} ${rounded} flex shrink-0 items-center justify-center bg-stone-200 text-sm font-semibold text-stone-700`}>
      {getInitial(name)}
    </div>
  );
}

function UserAvatar({ src, name, size = 'h-11 w-11', rounded = 'rounded-full' }) {
  const [error, setError] = useState(false);
  useEffect(() => setError(false), [src]);

  if (!src || error) return <AvatarFallback name={name} size={size} rounded={rounded} />;
  return (
    <img
      src={src}
      alt={`Avatar de ${name || 'usuario'}`}
      className={`${size} ${rounded} shrink-0 object-cover bg-stone-50`}
      onError={() => setError(true)}
    />
  );
}

export default function NewConversationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { conversations, openConversation } = useChatContext();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [followedStores, setFollowedStores] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const debounceRef = useRef(null);
  const handledPrefillRef = useRef(false);

  const recentContacts = useMemo(() => {
    if (!conversations || !user) return [];
    const seen = new Set();
    const contacts = [];
    const currentUserId = user.user_id || user.id;
    for (const conv of conversations) {
      const other = conv.other_user || conv.otherUser;
      if (!other) continue;
      const id = other.id || other.user_id;
      if (id && !seen.has(id) && id !== currentUserId) {
        seen.add(id);
        contacts.push({ ...other, _convId: conv.id });
      }
      if (contacts.length >= 10) break;
    }
    return contacts;
  }, [conversations, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get('/users/followed-stores');
        if (!cancelled) setFollowedStores(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setFollowedStores([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiClient.get(`/users/search?q=${encodeURIComponent(value)}`);
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleSelect = useCallback(async (targetUser) => {
    if (selecting || !user) return;
    setSelecting(true);

    const targetId = targetUser.id || targetUser.user_id;

    const existing = conversations.find((c) => {
      const other = c.other_user || c.otherUser;
      return other && (other.id === targetId || other.user_id === targetId);
    });

    if (existing) {
      navigate(`/messages/${existing.id}`);
      setSelecting(false);
      return;
    }

    const chatType = getChatType(user, targetUser);
    try {
      const newConv = await openConversation(targetId, chatType);
      if (newConv && newConv.id) {
        navigate(`/messages/${newConv.id}`);
      }
    } finally {
      setSelecting(false);
    }
  }, [selecting, user, conversations, openConversation, navigate]);

  useEffect(() => {
    if (handledPrefillRef.current) return;
    const toUserId = searchParams.get('to');
    if (!toUserId || !user || !conversations) return;

    handledPrefillRef.current = true;

    const existing = conversations.find((c) => {
      const other = c.other_user || c.otherUser;
      return other && String(other.id || other.user_id) === String(toUserId);
    });

    if (existing?.id) {
      navigate(`/messages/${existing.id}`, { replace: true });
      return;
    }

    (async () => {
      try {
        const newConv = await openConversation(toUserId, 'c2c');
        if (newConv?.id) {
          navigate(`/messages/${newConv.id}`, { replace: true });
        }
      } catch {
        // best effort — user can still pick manually in the UI
      }
    })();
  }, [searchParams, user, conversations, openConversation, navigate]);

  const showResults = query.length >= 2;

  return (
    <div className="mx-auto flex min-h-screen max-w-[600px] lg:max-w-[600px] flex-col bg-white font-apple lg:my-8 lg:min-h-0 lg:rounded-2xl lg:shadow-sm lg:border lg:border-stone-100">
      {/* TopBar */}
      <div className="sticky top-0 z-30 flex h-14 items-center border-b border-stone-100 bg-white/95 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <button
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-950 active:bg-stone-200"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <ArrowLeft size={22} />
        </button>
        <span className="flex-1 text-center text-[17px] font-semibold text-stone-950">
          Nuevo mensaje
        </span>
        <div className="w-11" />
      </div>

      {/* Search input */}
      <div className="px-4 py-3">
        <label className="flex h-12 items-center gap-2 rounded-full bg-stone-100 px-4">
          <Search size={18} className="shrink-0 text-stone-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar persona o tienda..."
            className="flex-1 bg-transparent text-[15px] text-stone-950 outline-none placeholder:text-stone-400"
          />
        </label>
      </div>

      {showResults ? (
        <div className="flex-1 overflow-y-auto">
          {searchResults.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">Sin resultados</p>
          ) : (
            searchResults.map((u, i) => {
              const uid = u.id || u.user_id;
              const isStore = u.role === 'producer' || u.role === 'importer';
              const badge = ROLE_LABELS[u.role];

              return (
                <button
                  key={uid || i}
                  className="flex w-full items-center gap-3 border-b border-stone-50 px-4 py-3 text-left bg-transparent active:bg-stone-50 disabled:opacity-50"
                  onClick={() => handleSelect(u)}
                  disabled={selecting}
                >
                  <UserAvatar
                    src={u.avatar || u.profile_image}
                    name={u.name || u.username}
                    size="h-11 w-11"
                    rounded={isStore ? 'rounded-2xl' : 'rounded-full'}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-medium text-stone-950">
                        {u.name || u.username || 'Usuario'}
                      </span>
                      {badge && (
                        <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
                          {badge}
                        </span>
                      )}
                    </div>
                    {u.username && u.name && (
                      <p className="mt-0.5 truncate text-[13px] text-stone-500">
                        @{u.username}
                      </p>
                    )}
                    {(u.city || u.description) && (
                      <p className="mt-0.5 truncate text-xs text-stone-400">
                        {u.city || u.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {recentContacts.length > 0 && (
            <div className="py-4">
              <h3 className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                Contactos recientes
              </h3>
              <div className="scrollbar-hide flex gap-4 overflow-x-auto px-4">
                {recentContacts.map((c) => {
                  const cid = c.id || c.user_id;
                  return (
                    <button
                      key={cid}
                      className="flex w-14 shrink-0 flex-col items-center bg-transparent border-none"
                      onClick={() => handleSelect(c)}
                      disabled={selecting}
                    >
                      <UserAvatar
                        src={c.avatar || c.profile_image}
                        name={c.name || c.username}
                        size="h-10 w-10"
                      />
                      <span className="mt-1 w-full truncate text-center text-[11px] text-stone-950">
                        {c.name || c.username || ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {followedStores.length > 0 && (
            <div className="py-4">
              <h3 className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                Tiendas que sigues
              </h3>
              <div className="scrollbar-hide flex gap-4 overflow-x-auto px-4">
                {followedStores.map((s) => {
                  const sid = s.id || s.user_id || s.store_id;
                  return (
                    <button
                      key={sid}
                      className="flex w-14 shrink-0 flex-col items-center bg-transparent border-none"
                      onClick={() => handleSelect(s)}
                      disabled={selecting}
                    >
                      <UserAvatar
                        src={s.avatar || s.profile_image || s.logo}
                        name={s.name || s.store_name}
                        size="h-10 w-10"
                        rounded="rounded-2xl"
                      />
                      <span className="mt-1 w-full truncate text-center text-[11px] text-stone-950">
                        {s.name || s.store_name || ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
