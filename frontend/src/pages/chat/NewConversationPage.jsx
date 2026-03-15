import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useChatContext } from '@/context/chat/ChatProvider';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/services/api/client';

const CSS_VARS = {
  cream: '#F7F6F2',
  black: '#0A0A0A',
  green: '#2E7D52',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  white: '#fff',
};

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

export default function NewConversationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, openConversation } = useChatContext();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [followedStores, setFollowedStores] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const debounceRef = useRef(null);

  // Extract recent contacts from conversations
  const recentContacts = useMemo(() => {
    if (!conversations || !user) return [];
    const seen = new Set();
    const contacts = [];
    for (const conv of conversations) {
      const other = conv.other_user || conv.otherUser;
      if (!other) continue;
      const id = other.id || other.user_id;
      if (id && !seen.has(id) && id !== user.id) {
        seen.add(id);
        contacts.push({ ...other, _convId: conv.id });
      }
      if (contacts.length >= 10) break;
    }
    return contacts;
  }, [conversations, user]);

  // Load followed stores on mount
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

  // Debounced search
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Select a user to start conversation
  const handleSelect = useCallback(async (targetUser) => {
    if (selecting || !user) return;
    setSelecting(true);

    const targetId = targetUser.id || targetUser.user_id;

    // Check if conversation already exists
    const existing = conversations.find((c) => {
      const other = c.other_user || c.otherUser;
      return other && (other.id === targetId || other.user_id === targetId);
    });

    if (existing) {
      navigate(`/messages/${existing.id}`);
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

  const showResults = query.length >= 2;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: CSS_VARS.cream }}>
      {/* TopBar */}
      <div
        className="sticky top-0 z-30 flex items-center px-4"
        style={{
          background: `${CSS_VARS.cream}ee`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          height: 56,
        }}
      >
        <button
          className="flex items-center justify-center"
          style={{ width: 32, height: 32 }}
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <ArrowLeft size={22} style={{ color: CSS_VARS.black }} />
        </button>
        <span
          className="flex-1 text-center"
          style={{ fontSize: 17, fontWeight: 600, color: CSS_VARS.black, fontFamily: 'Inter, sans-serif' }}
        >
          Nuevo mensaje
        </span>
        {/* Spacer to balance back arrow */}
        <div style={{ width: 32 }} />
      </div>

      {/* Search input */}
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-2 px-4"
          style={{
            height: 44,
            background: CSS_VARS.surface,
            borderRadius: 24,
          }}
        >
          <Search size={18} style={{ color: CSS_VARS.stone, flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar persona o tienda..."
            className="flex-1 outline-none"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 15,
              color: CSS_VARS.black,
              fontFamily: 'Inter, sans-serif',
            }}
          />
        </div>
      </div>

      {showResults ? (
        /* Search results */
        <div className="flex-1 overflow-y-auto">
          {searchResults.length === 0 ? (
            <p className="px-4 py-8 text-center" style={{ color: CSS_VARS.stone, fontSize: 14 }}>
              Sin resultados
            </p>
          ) : (
            searchResults.map((u, i) => {
              const uid = u.id || u.user_id;
              const isStore = u.role === 'producer' || u.role === 'importer';
              const badge = ROLE_LABELS[u.role];

              return (
                <button
                  key={uid || i}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left"
                  style={{ background: 'transparent' }}
                  onClick={() => handleSelect(u)}
                  disabled={selecting}
                >
                  {/* Avatar */}
                  <img
                    src={u.avatar || u.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || '')}&size=88&background=E5E2DA&color=0A0A0A`}
                    alt=""
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: isStore ? 12 : '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                      background: CSS_VARS.surface,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="truncate"
                        style={{ fontSize: 15, fontWeight: 500, color: CSS_VARS.black }}
                      >
                        {u.name || u.username || 'Usuario'}
                      </span>
                      {badge && (
                        <span
                          style={{
                            fontSize: 10,
                            color: CSS_VARS.stone,
                            background: CSS_VARS.surface,
                            borderRadius: 6,
                            padding: '2px 6px',
                            flexShrink: 0,
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                    {(u.city || u.description) && (
                      <p
                        className="truncate"
                        style={{ fontSize: 12, color: CSS_VARS.stone, marginTop: 2 }}
                      >
                        {u.city || u.description}
                      </p>
                    )}
                  </div>
                  {/* Divider */}
                  {i < searchResults.length - 1 && (
                    <div
                      className="absolute left-0 right-0 bottom-0"
                      style={{
                        height: 1,
                        background: CSS_VARS.border,
                        marginLeft: 60,
                      }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      ) : (
        /* Recent contacts + followed stores */
        <div className="flex-1 overflow-y-auto">
          {/* Recent contacts */}
          {recentContacts.length > 0 && (
            <div className="py-4">
              <h3
                className="px-4 pb-3"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: CSS_VARS.stone,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Contactos recientes
              </h3>
              <div className="flex gap-4 px-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {recentContacts.map((c) => {
                  const cid = c.id || c.user_id;
                  return (
                    <button
                      key={cid}
                      className="flex flex-col items-center flex-shrink-0"
                      style={{ width: 56 }}
                      onClick={() => handleSelect(c)}
                      disabled={selecting}
                    >
                      <img
                        src={c.avatar || c.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || '')}&size=80&background=E5E2DA&color=0A0A0A`}
                        alt=""
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          background: CSS_VARS.surface,
                        }}
                      />
                      <span
                        className="truncate w-full text-center mt-1"
                        style={{ fontSize: 11, color: CSS_VARS.black }}
                      >
                        {c.name || c.username || ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Followed stores */}
          {followedStores.length > 0 && (
            <div className="py-4">
              <h3
                className="px-4 pb-3"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: CSS_VARS.stone,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Tiendas que sigues
              </h3>
              <div className="flex gap-4 px-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {followedStores.map((s) => {
                  const sid = s.id || s.user_id || s.store_id;
                  return (
                    <button
                      key={sid}
                      className="flex flex-col items-center flex-shrink-0"
                      style={{ width: 56 }}
                      onClick={() => handleSelect(s)}
                      disabled={selecting}
                    >
                      <img
                        src={s.avatar || s.profile_image || s.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || '')}&size=80&background=E5E2DA&color=0A0A0A`}
                        alt=""
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          objectFit: 'cover',
                          background: CSS_VARS.surface,
                        }}
                      />
                      <span
                        className="truncate w-full text-center mt-1"
                        style={{ fontSize: 11, color: CSS_VARS.black }}
                      >
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
