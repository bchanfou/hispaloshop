import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Sparkles, Store, Users, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

export default function DesktopSidebar() {
  const { user } = useAuth();

  const { data: suggestedStores } = useQuery({
    queryKey: ['sidebar-suggested-stores'],
    queryFn: () => apiClient.get('/stores/suggested?limit=4'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: suggestedCommunities } = useQuery({
    queryKey: ['sidebar-suggested-communities'],
    queryFn: () => apiClient.get('/communities?limit=3&filter=all'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const stores = suggestedStores?.stores || suggestedStores?.data || [];
  const communities = suggestedCommunities?.communities || [];

  return (
    <aside className="hidden xl:block" style={{
      width: 320,
      position: 'sticky',
      top: 72,
      height: 'fit-content',
      maxHeight: 'calc(100vh - 80px)',
      overflowY: 'auto',
      padding: 'var(--space-4) 0',
      fontFamily: 'var(--font-sans)',
      scrollbarWidth: 'none',
    }}>
      {/* Suggested Stores */}
      {stores.length > 0 && (
        <SidebarSection title="Tiendas sugeridas" viewAllTo="/stores">
          {stores.slice(0, 4).map(store => (
            <StoreItem key={store.id || store._id} store={store} />
          ))}
        </SidebarSection>
      )}

      {/* Suggested Communities */}
      {communities.length > 0 && (
        <SidebarSection title="Comunidades" viewAllTo="/communities">
          {communities.slice(0, 3).map(community => (
            <CommunityItem key={community.id || community._id} community={community} />
          ))}
        </SidebarSection>
      )}

      {/* Hispal AI Card */}
      <div style={{
        margin: '0 0 16px',
        padding: 16,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-black)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={14} color="var(--color-white)" />
          </div>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-black)' }}>
            Hispal AI
          </span>
        </div>
        <p style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-stone)',
          margin: '0 0 10px',
          lineHeight: 1.5,
        }}>
          Tu asistente de alimentación. Pregúntale por recetas, productos o dietas.
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-hispal-ai'))}
          style={{
            width: '100%',
            height: 34,
            border: '1px solid var(--color-black)',
            borderRadius: 'var(--radius-full)',
            background: 'transparent',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-black)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-white)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Probar Hispal AI
        </button>
      </div>

      {/* Legal links */}
      <div style={{
        padding: '12px 0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 12px',
      }}>
        {[
          { label: 'Acerca de', to: '/about' },
          { label: 'Ayuda', to: '/help' },
          { label: 'Prensa', to: '/press' },
          { label: 'Empleo', to: '/careers' },
          { label: 'Privacidad', to: '/privacy' },
          { label: 'Términos', to: '/terms' },
          { label: 'Contacto', to: '/contact' },
        ].map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              fontSize: 11,
              color: 'var(--color-stone)',
              textDecoration: 'none',
              lineHeight: 2,
            }}
          >
            {link.label}
          </Link>
        ))}
        <span style={{ fontSize: 11, color: 'var(--color-stone)', lineHeight: 2, width: '100%' }}>
          © {new Date().getFullYear()} Hispaloshop
        </span>
      </div>
    </aside>
  );
}

/* ── Section wrapper ── */
function SidebarSection({ title, viewAllTo, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 700,
          color: 'var(--color-black)',
        }}>
          {title}
        </span>
        {viewAllTo && (
          <Link to={viewAllTo} style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-stone)',
            textDecoration: 'none',
          }}>
            Ver todo
          </Link>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Store item ── */
function StoreItem({ store }) {
  const slug = store.slug || store.id || store._id;
  const name = store.name || store.store_name || 'Tienda';
  const image = store.logo || store.image || store.profile_image || null;

  return (
    <Link
      to={`/store/${slug}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {image ? (
        <img src={image} alt="" style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          objectFit: 'cover', border: '1px solid var(--color-border)',
        }} />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Store size={16} color="var(--color-stone)" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-black)',
          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </p>
        {store.category && (
          <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: '1px 0 0' }}>
            {store.category}
          </p>
        )}
      </div>
      <ChevronRight size={14} color="var(--color-stone)" style={{ flexShrink: 0 }} />
    </Link>
  );
}

/* ── Community item ── */
function CommunityItem({ community }) {
  const slug = community.slug || community.id || community._id;
  const name = community.name || 'Comunidad';

  return (
    <Link
      to={`/communities/${slug}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 'var(--radius-md)',
        background: `hsl(${(name.charCodeAt(0) * 7) % 360}, 40%, 70%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, overflow: 'hidden',
      }}>
        {community.cover_image ? (
          <img src={community.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          community.emoji || '🌿'
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-black)',
          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: '1px 0 0' }}>
          {community.member_count?.toLocaleString() || 0} miembros
        </p>
      </div>
      <ChevronRight size={14} color="var(--color-stone)" style={{ flexShrink: 0 }} />
    </Link>
  );
}
