import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Sparkles, Store, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
export default function DesktopSidebar() {
  const {
    user
  } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const {
    data: storesData,
    isLoading: loadingStores
  } = useQuery({
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
    retry: false
  });
  const {
    data: influencersData,
    isLoading: loadingInfluencers
  } = useQuery({
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
    retry: false
  });
  const {
    data: communitiesData,
    isLoading: loadingCommunities
  } = useQuery({
    queryKey: ['sidebar-suggested-communities'],
    queryFn: () => apiClient.get('/communities?sort=active&limit=3'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  const stores = storesData?.stores || storesData?.data || storesData?.users || [];
  const influencers = influencersData?.users || influencersData?.data || [];
  const communities = communitiesData?.communities || communitiesData?.data || [];

  // Contextual logic: show different content based on current page
  const isStore = path.startsWith('/store/');
  const isCommunities = path.startsWith('/communities');
  const isProfile = path.startsWith('/profile') || path.match(/^\/[a-zA-Z0-9_]+$/) && path !== '/';
  return <aside className="w-[320px] sticky top-4 h-fit max-h-[calc(100vh-32px)] overflow-y-auto scrollbar-none">
      {/* Contextual: On store pages, prioritize communities. On communities, show stores. Default: mix */}
      {!isCommunities && (loadingStores ? <SidebarSection title="Tiendas sugeridas" viewAllTo="/stores">
          <SkeletonItems count={3} />
        </SidebarSection> : stores.length > 0 ? <SidebarSection title="Tiendas sugeridas" viewAllTo="/stores">
          {stores.slice(0, 3).map(store => <StoreItem key={store.id || store._id || store.user_id} store={store} />)}
        </SidebarSection> : null)}

      {/* Suggested people — show on feed and profiles */}
      {!isStore && (loadingInfluencers ? <SidebarSection title="Sugerencias para ti" viewAllTo="/discover?scope=profiles">
          <SkeletonItems count={3} />
        </SidebarSection> : influencers.length > 0 ? <SidebarSection title="Sugerencias para ti" viewAllTo="/discover?scope=profiles">
          {influencers.slice(0, 3).map(inf => <InfluencerItem key={inf.id || inf._id || inf.user_id} influencer={inf} />)}
        </SidebarSection> : null)}

      {/* Communities — show on feed and store pages */}
      {!isCommunities && (loadingCommunities ? null : communities.length > 0 ? <SidebarSection title="Comunidades activas" viewAllTo="/communities">
          {communities.slice(0, 2).map(community => <CommunityItem key={community.id || community._id} community={community} />)}
        </SidebarSection> : null)}

      {/* David AI Card — ALWAYS visible */}
      <div className="mb-4 p-4 bg-stone-100 rounded-2xl border border-stone-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-xl bg-stone-950 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-stone-950">
            ✨ David
          </span>
        </div>
        <p className="text-[11px] text-stone-500 mb-2.5 leading-relaxed">
          Pregúntame sobre cualquier producto o productor
        </p>
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-hispal-ai'))} className="w-full h-[34px] border-none rounded-full bg-stone-950 text-[11px] font-semibold text-white cursor-pointer transition-all duration-150">
          Preguntar →
        </button>
      </div>

      {/* Legal links */}
      <div className="py-3 flex flex-wrap gap-x-2.5 gap-y-1">
        {[{
        label: 'Acerca de',
        to: '/que-es'
      }, {
        label: 'Privacidad',
        to: '/privacy'
      }, {
        label: i18n.t('desktop_sidebar.terminos', 'Términos'),
        to: '/terms'
      }, {
        label: 'Contacto',
        to: '/contacto'
      }].map(link => <Link key={link.to} to={link.to} className="text-[10px] text-stone-500 no-underline leading-8">
            {link.label}
          </Link>)}
        <span className="text-[11px] text-stone-500 leading-8 w-full">
          © {new Date().getFullYear()} Hispaloshop
        </span>
      </div>
    </aside>;
}

/* ── Skeleton items ── */
function SkeletonItems({
  count = 3
}) {
  return Array(count).fill(0).map((_, i) => <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
      <div className="hs-skeleton w-9 h-9 rounded-xl shrink-0" />
      <div className="flex-1">
        <div className="hs-skeleton h-3 w-[70%] mb-1" />
        <div className="hs-skeleton h-2.5 w-[40%]" />
      </div>
    </div>);
}

/* ── Section wrapper ── */
function SidebarSection({
  title,
  viewAllTo,
  children
}) {
  return <div className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-bold text-stone-950">{title}</span>
        {viewAllTo && <Link to={viewAllTo} className="text-[11px] font-semibold text-stone-500 no-underline">
            Ver todo
          </Link>}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>;
}

/* ── Row items ── */
function StoreItem({
  store
}) {
  const slug = store.slug || store.id || store._id;
  const name = store.name || store.store_name || 'Tienda';
  const image = store.logo || store.image || store.profile_image || null;
  return <Link to={`/store/${slug}`} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl no-underline transition-colors hover:bg-stone-100 active:bg-stone-200">
      {image ? <img src={image} alt="" className="w-9 h-9 rounded-xl object-cover border border-stone-200" /> : <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center">
          <Store size={16} className="text-stone-500" />
        </div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-950 m-0 overflow-hidden text-ellipsis whitespace-nowrap">{name}</p>
        {store.category && <p className="text-[11px] text-stone-500 mt-px mb-0">{store.category}</p>}
      </div>
      <ChevronRight size={14} className="text-stone-500 shrink-0" />
    </Link>;
}
function InfluencerItem({
  influencer
}) {
  const userId = influencer.user_id || influencer.id || influencer._id;
  const name = influencer.name || influencer.full_name || influencer.username || 'Influencer';
  const image = influencer.profile_image || influencer.avatar_url || null;
  const followers = influencer.follower_count;
  return <Link to={`/user/${userId}`} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl no-underline transition-colors hover:bg-stone-100 active:bg-stone-200">
      {image ? <img src={image} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-sm text-stone-500 font-semibold">
          {name.charAt(0).toUpperCase()}
        </div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-950 m-0 overflow-hidden text-ellipsis whitespace-nowrap">{name}</p>
        {followers != null && <p className="text-[11px] text-stone-500 mt-px mb-0">{followers.toLocaleString()} seguidores</p>}
      </div>
      <ChevronRight size={14} className="text-stone-500 shrink-0" />
    </Link>;
}
function CommunityItem({
  community
}) {
  const slug = community.slug || community.id || community._id;
  const name = community.name || 'Comunidad';
  const bgColors = ['bg-stone-300', 'bg-stone-400', 'bg-stone-500', 'bg-stone-600', 'bg-stone-700'];
  const bgColor = bgColors[name.charCodeAt(0) % 5];
  return <Link to={`/communities/${slug}`} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl no-underline transition-colors hover:bg-stone-100 active:bg-stone-200">
      <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center text-lg overflow-hidden`}>
        {community.cover_image ? <img src={community.cover_image} alt="" className="w-full h-full object-cover" /> : community.emoji || '🌿'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-950 m-0 overflow-hidden text-ellipsis whitespace-nowrap">{name}</p>
        <p className="text-[11px] text-stone-500 mt-px mb-0">{community.member_count?.toLocaleString() || 0} miembros</p>
      </div>
      <ChevronRight size={14} className="text-stone-500 shrink-0" />
    </Link>;
}