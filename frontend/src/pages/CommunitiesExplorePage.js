import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

const FILTERS = [
  { id: 'all',       label: 'Todas'        },
  { id: 'joined',    label: 'Mis comunidades' },
  { id: 'food',      label: 'Alimentación' },
  { id: 'recipes',   label: 'Recetas'      },
  { id: 'producers', label: 'Productores'  },
  { id: 'diet',      label: 'Dieta'        },
  { id: 'local',     label: 'Local'        },
];

export default function CommunitiesExplorePage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['communities-explore', search, filter],
    queryFn: () => apiClient.get(`/communities?q=${encodeURIComponent(search)}&filter=${filter}&limit=24`),
  });

  const { data: myData } = useQuery({
    queryKey: ['my-communities'],
    queryFn: () => apiClient.get('/communities/me'),
    enabled: !!user,
  });

  const canCreate = (user?.follower_count >= 100) || user?.is_verified_seller;
  const communities = data?.communities || [];
  const myCommunities = myData?.communities || [];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        padding: 16,
        background: 'var(--hs-surface)',
        borderBottom: '0.5px solid var(--hs-border)',
        position: 'sticky', top: 'var(--hs-topbar-h)', zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Comunidades</h1>
          {canCreate && (
            <Link to="/communities/new"
              style={{
                padding: '6px 14px', borderRadius: 'var(--hs-r-full)',
                background: 'var(--hs-black)', color: 'white',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>
              + Crear
            </Link>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={15} color="var(--hs-text-3)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="hs-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar comunidades..."
            style={{ paddingLeft: 36, height: 38, fontSize: 13 }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                padding: '6px 12px', borderRadius: 'var(--hs-r-full)',
                border: 'none', cursor: 'pointer', fontSize: 12,
                fontWeight: filter === f.id ? 700 : 400,
                background: filter === f.id ? 'var(--hs-black)' : 'var(--hs-surface-2)',
                color: filter === f.id ? 'white' : 'var(--hs-text-2)',
                flexShrink: 0, transition: 'var(--hs-transition)',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>

        {/* My communities (joined filter) */}
        {filter === 'joined' && myCommunities.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Mis comunidades</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myCommunities.map(c => (
                <CommunityRow key={c.id || c._id} community={c} />
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="hs-skeleton" style={{ height: 160, borderRadius: 12 }} />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--hs-text-2)' }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>🌿</p>
            <p style={{ fontSize: 15, fontWeight: 600 }}>
              {search ? 'Sin resultados' : 'Sin comunidades todavía'}
            </p>
            {canCreate && !search && (
              <Link to="/communities/new"
                style={{
                  display: 'inline-flex', marginTop: 12,
                  padding: '8px 16px', borderRadius: 'var(--hs-r-full)',
                  background: 'var(--hs-black)', color: 'white',
                  fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}>
                Crea la primera →
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {communities.map(c => (
              <CommunityCard key={c.id || c._id} community={c} />
            ))}
          </div>
        )}

        {/* CTA if can't create */}
        {!canCreate && filter !== 'joined' && (
          <div style={{
            marginTop: 20, padding: 16,
            background: 'var(--hs-surface)',
            borderRadius: 'var(--hs-r-lg)',
            border: '0.5px solid var(--hs-border)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
              ¿Quieres crear tu comunidad?
            </p>
            <p style={{ fontSize: 13, color: 'var(--hs-text-2)', marginBottom: 0 }}>
              Consigue 100 seguidores o verifica tu cuenta de vendedor
            </p>
            <p style={{ fontSize: 12, color: 'var(--hs-text-3)', marginTop: 4 }}>
              Tienes {user?.follower_count || 0}/100 seguidores
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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

  const cId = community.id || community._id;

  return (
    <Link to={`/communities/${community.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--hs-surface)',
        borderRadius: 'var(--hs-r-lg)',
        border: '0.5px solid var(--hs-border)',
        overflow: 'hidden',
        transition: 'var(--hs-transition)',
      }}>
        {/* Cover */}
        <div style={{ aspectRatio: '16/7', position: 'relative', overflow: 'hidden' }}>
          {community.cover_image ? (
            <img src={community.cover_image} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `hsl(${(community.name.charCodeAt(0) * 7) % 360}, 40%, 70%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
            }}>
              {community.emoji || '🌿'}
            </div>
          )}
          {community.category && (
            <span style={{
              position: 'absolute', top: 6, left: 6,
              fontSize: 9, fontWeight: 800,
              background: 'rgba(0,0,0,0.6)', color: 'white',
              padding: '2px 7px', borderRadius: 4,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {community.category}
            </span>
          )}
        </div>

        <div style={{ padding: 10 }}>
          <p style={{
            fontSize: 13, fontWeight: 700, margin: '0 0 2px',
            lineHeight: 1.3, color: 'var(--hs-text-1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {community.name}
          </p>
          <p style={{ fontSize: 11, color: 'var(--hs-text-3)', margin: '0 0 8px' }}>
            {community.member_count?.toLocaleString()} miembros
          </p>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggle}
            disabled={isToggling}
            style={{
              width: '100%', padding: 6,
              borderRadius: 'var(--hs-r-full)',
              border: joined ? '1.5px solid var(--hs-border)' : '1.5px solid var(--hs-black)',
              background: joined ? 'var(--hs-surface-2)' : 'var(--hs-black)',
              color: joined ? 'var(--hs-text-2)' : 'white',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'var(--hs-transition)',
            }}>
            {isToggling ? '...' : joined ? 'Unida ✓' : 'Unirse'}
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
      padding: 12, background: 'var(--hs-surface)',
      borderRadius: 'var(--hs-r-md)',
      border: '0.5px solid var(--hs-border)',
      textDecoration: 'none', color: 'inherit',
    }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      overflow: 'hidden', flexShrink: 0,
      background: `hsl(${(community.name.charCodeAt(0) * 7) % 360},40%,70%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
    }}>
      {community.cover_image ? (
        <img src={community.cover_image} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (community.emoji || '🌿')}
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 2px' }}>
        {community.name}
      </p>
      <p style={{ fontSize: 12, color: 'var(--hs-text-2)', margin: 0 }}>
        {community.member_count?.toLocaleString()} miembros
        {community.unread_posts > 0 && (
          <span style={{ marginLeft: 8, color: 'var(--hs-blue)', fontWeight: 700 }}>
            · {community.unread_posts} nuevos
          </span>
        )}
      </p>
    </div>
    <ChevronRight size={16} color="var(--hs-text-3)" />
  </Link>
);
