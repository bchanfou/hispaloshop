import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, ChevronRight, Users, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

const FILTERS = [
  { id: 'all',       label: 'Todas' },
  { id: 'joined',    label: 'Mis comunidades' },
  { id: 'popular',   label: 'Populares' },
  { id: 'food',      label: 'Alimentación' },
  { id: 'recipes',   label: 'Recetas' },
  { id: 'producers', label: 'Productores' },
  { id: 'diet',      label: 'Dieta' },
  { id: 'local',     label: 'Local' },
];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CommunitiesExplorePage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();
  const debouncedSearch = useDebounce(searchInput, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['communities-explore', debouncedSearch, filter],
    queryFn: () => apiClient.get(`/communities?q=${encodeURIComponent(debouncedSearch)}&filter=${filter}&limit=24`),
  });

  const { data: myData } = useQuery({
    queryKey: ['my-communities'],
    queryFn: () => apiClient.get('/communities/me'),
    enabled: !!user,
  });

  const canCreate = (user?.follower_count >= 100) || user?.is_verified_seller;
  const communities = data?.communities || [];
  const myCommunities = myData?.communities || [];

  const font = { fontFamily: 'var(--font-sans)' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      {/* ── Topbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver"
        >
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)', flex: 1 }}>Comunidades</span>
        {canCreate && (
          <Link to="/communities/new" style={{
            padding: '6px 14px', borderRadius: 'var(--radius-full, 999px)',
            background: 'var(--color-black)', color: 'var(--color-white)',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            + Crear
          </Link>
        )}
      </div>

      {/* ── Search ── */}
      <div style={{ padding: '12px 16px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--color-stone)"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar comunidades..."
            style={{
              width: '100%', height: 44, paddingLeft: 42,
              paddingRight: searchInput ? 36 : 14,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full, 999px)',
              background: 'var(--color-white)',
              fontSize: 14, color: 'var(--color-black)',
              outline: 'none', boxSizing: 'border-box', ...font,
            }}
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
                borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Limpiar búsqueda"
            >
              <X size={13} color="var(--color-stone)" />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 16px',
        overflowX: 'auto', maxWidth: 600, margin: '0 auto',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: 'var(--radius-full, 999px)',
                border: active ? '1px solid var(--color-black)' : '1px solid var(--color-border)',
                background: active ? 'var(--color-black)' : 'var(--color-white)',
                color: active ? 'var(--color-white)' : 'var(--color-black)',
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap', ...font,
              }}>
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 100px' }}>

        {/* ── Mis comunidades (horizontal scroll) ── */}
        {user && myCommunities.length > 0 && filter !== 'joined' && !searchInput && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', margin: 0, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                Mis comunidades
              </h2>
              <button onClick={() => setFilter('joined')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: 'var(--color-stone)',
                  display: 'flex', alignItems: 'center', gap: 2, ...font,
                }}>
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            <div style={{
              display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none', scrollbarWidth: 'none',
            }}>
              {myCommunities.slice(0, 8).map(c => (
                <MyCommunityPill key={c.id || c._id} community={c} />
              ))}
            </div>
          </section>
        )}

        {/* ── "Mis comunidades" full list (when filter=joined) ── */}
        {filter === 'joined' && (
          <section style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--color-black)', margin: '0 0 10px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              Mis comunidades
            </h2>
            {myCommunities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-stone)' }}>
                <Users size={48} color="var(--color-stone)" strokeWidth={1} />
                <p style={{ fontSize: 15, marginTop: 12 }}>No te has unido a ninguna comunidad</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myCommunities.map(c => (
                  <CommunityRow key={c.id || c._id} community={c} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Section label ── */}
        {filter !== 'joined' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', margin: 0, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {filter === 'popular' ? 'Comunidades populares' : 'Comunidades'}
            </h2>
            {!isLoading && (
              <span style={{ fontSize: 12, color: 'var(--color-stone)' }}>{communities.length} resultados</span>
            )}
          </div>
        )}

        {/* ── Grid ── */}
        {filter !== 'joined' && (
          isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {Array(6).fill(0).map((_, i) => (
                <div key={i} style={{
                  height: 200, borderRadius: 'var(--radius-xl)',
                  background: 'var(--color-surface)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              ))}
            </div>
          ) : communities.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 12, padding: '60px 0',
            }}>
              <Users size={56} color="var(--color-stone)" strokeWidth={1} />
              <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center', margin: 0 }}>
                {searchInput ? 'Sin resultados' : 'Sin comunidades todavía'}
              </p>
              {canCreate && !searchInput && (
                <Link to="/communities/new" style={{
                  padding: '10px 24px', background: 'var(--color-black)',
                  color: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
                  fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}>
                  Crea la primera
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {communities.map((c, i) => (
                <motion.div
                  key={c.id || c._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <CommunityCard community={c} />
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* ── CTA if can't create ── */}
        {!canCreate && filter !== 'joined' && communities.length > 0 && (
          <div style={{
            marginTop: 20, padding: 16,
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--color-black)', margin: '0 0 4px' }}>
              ¿Quieres crear tu comunidad?
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-stone)', margin: '0 0 4px' }}>
              Consigue 100 seguidores o verifica tu cuenta de vendedor
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: 0 }}>
              Tienes {user?.follower_count || 0}/100 seguidores
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
}

/* ── My Community Pill (horizontal scroll) ── */
const MyCommunityPill = ({ community }) => (
  <Link to={`/communities/${community.slug}`}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      width: 72, flexShrink: 0, textDecoration: 'none',
    }}>
    <div style={{
      width: 56, height: 56, borderRadius: 'var(--radius-full, 999px)',
      overflow: 'hidden', border: '2px solid var(--color-border)',
      background: community.cover_image
        ? 'var(--color-surface)'
        : ['#d6d3d1','#a8a29e','#78716c','#57534e','#44403c'][community.name.charCodeAt(0) % 5],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {community.cover_image ? (
        <img src={community.cover_image} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 24 }}>{community.emoji || '🌿'}</span>
      )}
    </div>
    <span style={{
      fontSize: 11, color: 'var(--color-black)', fontWeight: 500,
      maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      textAlign: 'center',
      fontFamily: 'var(--font-sans)',
    }}>
      {community.name}
    </span>
  </Link>
);

/* ── Card for 2-column grid ── */
const CommunityCard = ({ community }) => {
  const [joined, setJoined] = useState(community.is_member);
  const [isToggling, setIsToggling] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsToggling(true);
    try {
      if (joined) {
        await apiClient.delete(`/communities/${community.id || community._id}/join`);
      } else {
        await apiClient.post(`/communities/${community.id || community._id}/join`);
      }
      setJoined(!joined);
    } catch {
      toast.error('Error al actualizar membresía');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Link to={`/communities/${community.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        transition: 'var(--transition-fast)',
      }}>
        {/* Cover */}
        <div style={{ aspectRatio: '16/7', position: 'relative', overflow: 'hidden' }}>
          {community.cover_image ? (
            <img src={community.cover_image} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: ['#d6d3d1','#a8a29e','#78716c','#57534e','#44403c'][community.name.charCodeAt(0) % 5],
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
            }}>
              {community.emoji || '🌿'}
            </div>
          )}
          {community.category && (
            <span style={{
              position: 'absolute', top: 6, left: 6,
              fontSize: 9, fontWeight: 800,
              background: 'rgba(0,0,0,0.6)', color: 'var(--color-white)',
              padding: '2px 7px', borderRadius: 4,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              fontFamily: 'var(--font-sans)',
            }}>
              {community.category}
            </span>
          )}
        </div>

        <div style={{ padding: 10 }}>
          <p style={{
            fontSize: 13, fontWeight: 600, margin: '0 0 2px',
            lineHeight: 1.3, color: 'var(--color-black)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: 'var(--font-sans)',
          }}>
            {community.name}
          </p>
          {community.description && (
            <p style={{
              fontSize: 11, color: 'var(--color-stone)', margin: '0 0 6px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)',
            }}>
              {community.description}
            </p>
          )}
          <p style={{ fontSize: 10, color: 'var(--color-stone)', margin: '0 0 8px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={10} />
            {community.member_count?.toLocaleString()} miembros
          </p>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggle}
            disabled={isToggling}
            style={{
              width: '100%', padding: 6,
              borderRadius: 'var(--radius-full, 999px)',
              border: joined ? '1px solid var(--color-border)' : '1px solid var(--color-black)',
              background: joined ? 'var(--color-white)' : 'var(--color-black)',
              color: joined ? 'var(--color-stone)' : 'var(--color-white)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'var(--transition-fast)',
              fontFamily: 'var(--font-sans)',
            }}>
            {isToggling ? '...' : joined ? 'Unida' : 'Unirse'}
          </motion.button>
        </div>
      </div>
    </Link>
  );
};

/* ── Row for "my communities" list ── */
const CommunityRow = ({ community }) => (
  <Link to={`/communities/${community.slug}`}
    style={{
      display: 'flex', gap: 12, alignItems: 'center',
      padding: 14, background: 'var(--color-white)',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--color-border)',
      textDecoration: 'none', color: 'inherit',
    }}>
    <div style={{
      width: 48, height: 48, borderRadius: 'var(--radius-full, 999px)',
      overflow: 'hidden', flexShrink: 0,
      background: community.cover_image
        ? 'var(--color-surface)'
        : ['#d6d3d1','#a8a29e','#78716c','#57534e','#44403c'][community.name.charCodeAt(0) % 5],
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
    }}>
      {community.cover_image ? (
        <img src={community.cover_image} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (community.emoji || '🌿')}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 2px', color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
        {community.name}
      </p>
      <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: 0, fontFamily: 'var(--font-sans)' }}>
        {community.member_count?.toLocaleString()} miembros
        {community.unread_posts > 0 && (
          <span style={{ marginLeft: 8, color: 'var(--color-black)', fontWeight: 700 }}>
            · {community.unread_posts} nuevos
          </span>
        )}
      </p>
    </div>
    <ChevronRight size={16} color="var(--color-stone)" />
  </Link>
);
