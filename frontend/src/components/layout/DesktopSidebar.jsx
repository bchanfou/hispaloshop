import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Sparkles, Store, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

export default function DesktopSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const { data: storesData, isLoading: loadingStores } = useQuery({
    queryKey: ['sidebar-suggested-stores'],
    queryFn: async () => {
      try {
        return await apiClient.get('/stores?limit=3');
      } catch {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: influencersData, isLoading: loadingInfluencers } = useQuery({
    queryKey: ['sidebar-suggested-influencers'],
    queryFn: async () => {
      try {
        const data = await apiClient.get('/discovery/suggested-users?limit=3');
        return data?.users || [];
      } catch {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: communitiesData, isLoading: loadingCommunities } = useQuery({
    queryKey: ['sidebar-suggested-communities'],
    queryFn: () => apiClient.get('/communities?sort=active&limit=3'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const stores = storesData?.stores || storesData?.data || storesData?.users || [];
  const influencers = influencersData?.users || influencersData?.data || [];
  const communities = communitiesData?.communities || communitiesData?.data || [];

  // Contextual logic: show different content based on current page
  const isStore = path.startsWith('/store/');
  const isCommunities = path.startsWith('/communities');
  const isProfile = path.startsWith('/profile') || (path.match(/^\/[a-zA-Z0-9_]+$/) && path !== '/');

  return (
    <aside style={{
      width: '320px',
      position: 'sticky',
      top: 16,
      height: 'fit-content',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      padding: '0',
      fontFamily: 'inherit',
      scrollbarWidth: 'none',
    }}>
      {/* Contextual: On store pages, prioritize communities. On communities, show stores. Default: mix */}
      {!isCommunities && (loadingStores ? (
        <SidebarSection title="Tiendas sugeridas" viewAllTo="/stores">
          <SkeletonItems count={3} />
        </SidebarSection>
      ) : stores.length > 0 ? (
        <SidebarSection title="Tiendas sugeridas" viewAllTo="/stores">
          {stores.slice(0, 3).map(store => (
            <StoreItem key={store.id || store._id || store.user_id} store={store} />
          ))}
        </SidebarSection>
      ) : null)}

      {/* Suggested people — show on feed and profiles */}
      {!isStore && (loadingInfluencers ? (
        <SidebarSection title="Sugerencias para ti" viewAllTo="/discover?scope=profiles">
          <SkeletonItems count={3} />
        </SidebarSection>
      ) : influencers.length > 0 ? (
        <SidebarSection title="Sugerencias para ti" viewAllTo="/discover?scope=profiles">
          {influencers.slice(0, 3).map(inf => (
            <InfluencerItem key={inf.id || inf._id || inf.user_id} influencer={inf} />
          ))}
        </SidebarSection>
      ) : null)}

      {/* Communities — show on feed and store pages */}
      {!isCommunities && (loadingCommunities ? null : communities.length > 0 ? (
        <SidebarSection title="Comunidades activas" viewAllTo="/communities">
          {communities.slice(0, 2).map(community => (
            <CommunityItem key={community.id || community._id} community={community} />
          ))}
        </SidebarSection>
      ) : null)}

      {/* David AI Card — ALWAYS visible */}
      <div style={{
        margin: '0 0 16px',
        padding: 16,
        background: '#f5f5f4',
        borderRadius: '16px',
        border: '1px solid #e7e5e4',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '12px',
            background: '#0c0a09',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={14} color="#ffffff" />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0c0a09' }}>
            ✨ David
          </span>
        </div>
        <p style={{ fontSize: '11px', color: '#78716c', margin: '0 0 10px', lineHeight: 1.5 }}>
          Pregúntame sobre cualquier producto o productor
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-hispal-ai'))}
          style={{
            width: '100%', height: 34,
            border: 'none',
            borderRadius: '9999px',
            background: '#0c0a09',
            fontSize: '11px', fontWeight: 600,
            color: '#fff', cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background all 0.15s ease',
          }}
        >
          Preguntar →
        </button>
      </div>

      {/* Legal links */}
      <div style={{ padding: '12px 0', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
        {[
          { label: 'Acerca de', to: '/que-es' },
          { label: 'Privacidad', to: '/privacy' },
          { label: 'Términos', to: '/terms' },
          { label: 'Contacto', to: '/contacto' },
        ].map(link => (
          <Link key={link.to} to={link.to} style={{ fontSize: 10, color: '#78716c', textDecoration: 'none', lineHeight: 2 }}>
            {link.label}
          </Link>
        ))}
        <span style={{ fontSize: 11, color: '#78716c', lineHeight: 2, width: '100%' }}>
          © {new Date().getFullYear()} Hispaloshop
        </span>
      </div>
    </aside>
  );
}

/* ── Skeleton items ── */
function SkeletonItems({ count = 3 }) {
  return Array(count).fill(0).map((_, i) => (
    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
      <div className="hs-skeleton" style={{ width: 36, height: 36, borderRadius: '12px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="hs-skeleton" style={{ height: 12, width: '70%', marginBottom: 4 }} />
        <div className="hs-skeleton" style={{ height: 10, width: '40%' }} />
      </div>
    </div>
  ));
}

/* ── Section wrapper ── */
function SidebarSection({ title, viewAllTo, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0c0a09' }}>{title}</span>
        {viewAllTo && (
          <Link to={viewAllTo} style={{ fontSize: '11px', fontWeight: 600, color: '#78716c', textDecoration: 'none' }}>
            Ver todo
          </Link>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  );
}

/* ── Row items ── */
const itemStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 10px', borderRadius: '12px',
  textDecoration: 'none', transition: 'background 0.1s ease',
};

function StoreItem({ store }) {
  const slug = store.slug || store.id || store._id;
  const name = store.name || store.store_name || 'Tienda';
  const image = store.logo || store.image || store.profile_image || null;
  return (
    <Link to={`/store/${slug}`} style={itemStyle}
      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f4'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {image ? (
        <img src={image} alt="" style={{ width: 36, height: 36, borderRadius: '12px', objectFit: 'cover', border: '1px solid #e7e5e4' }} />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: '12px', background: '#f5f5f4', border: '1px solid #e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Store size={16} color="#78716c" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c0a09', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        {store.category && <p style={{ fontSize: 11, color: '#78716c', margin: '1px 0 0' }}>{store.category}</p>}
      </div>
      <ChevronRight size={14} color="#78716c" style={{ flexShrink: 0 }} />
    </Link>
  );
}

function InfluencerItem({ influencer }) {
  const userId = influencer.user_id || influencer.id || influencer._id;
  const name = influencer.name || influencer.full_name || influencer.username || 'Influencer';
  const image = influencer.profile_image || influencer.avatar_url || null;
  const followers = influencer.follower_count;
  return (
    <Link to={`/user/${userId}`} style={itemStyle}
      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f4'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {image ? (
        <img src={image} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#78716c', fontWeight: 600 }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c0a09', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        {followers != null && <p style={{ fontSize: 11, color: '#78716c', margin: '1px 0 0' }}>{followers.toLocaleString()} seguidores</p>}
      </div>
      <ChevronRight size={14} color="#78716c" style={{ flexShrink: 0 }} />
    </Link>
  );
}

function CommunityItem({ community }) {
  const slug = community.slug || community.id || community._id;
  const name = community.name || 'Comunidad';
  return (
    <Link to={`/communities/${slug}`} style={itemStyle}
      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f4'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ width: 36, height: 36, borderRadius: '12px', background: ['#d6d3d1','#a8a29e','#78716c','#57534e','#44403c'][name.charCodeAt(0) % 5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>
        {community.cover_image ? (
          <img src={community.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (community.emoji || '🌿')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c0a09', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <p style={{ fontSize: 11, color: '#78716c', margin: '1px 0 0' }}>{community.member_count?.toLocaleString() || 0} miembros</p>
      </div>
      <ChevronRight size={14} color="#78716c" style={{ flexShrink: 0 }} />
    </Link>
  );
}
