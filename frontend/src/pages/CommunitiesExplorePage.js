import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, ChevronRight, Users, X } from 'lucide-react';
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

const STONE_BG = ['bg-stone-300','bg-stone-400','bg-stone-500','bg-stone-600','bg-stone-700'];
function stoneBg(name) { return STONE_BG[((name || 'C').charCodeAt(0)) % 5]; }

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

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex p-1" aria-label="Volver">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="flex-1 text-[17px] font-bold text-stone-950">Comunidades</span>
        {canCreate && (
          <Link to="/communities/new" className="rounded-full bg-stone-950 px-3.5 py-1.5 text-[13px] font-semibold text-white no-underline">
            + Crear
          </Link>
        )}
      </div>

      {/* ── Search ── */}
      <div role="search" aria-label="Buscar comunidades" className="mx-auto max-w-[600px] px-4 pt-3">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar comunidades..."
            className="h-11 w-full rounded-full border border-stone-200 bg-white py-0 pl-10 pr-3.5 text-sm text-stone-950 outline-none"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 flex h-5.5 w-5.5 -translate-y-1/2 items-center justify-center rounded-full bg-stone-100"
              aria-label="Limpiar búsqueda"
            >
              <X size={13} className="text-stone-500" />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className="mx-auto flex max-w-[600px] gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? 'border-stone-950 bg-stone-950 text-white'
                  : 'border-stone-200 bg-white text-stone-950'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mx-auto max-w-[600px] px-4 pb-24">

        {/* ── Mis comunidades (horizontal scroll) ── */}
        {user && myCommunities.length > 0 && filter !== 'joined' && !searchInput && (
          <section className="mb-6">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-base font-bold uppercase tracking-wide text-stone-950">Mis comunidades</h2>
              <button onClick={() => setFilter('joined')} className="flex items-center gap-0.5 text-[13px] font-semibold text-stone-500">
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {myCommunities.slice(0, 8).map(c => (
                <MyCommunityPill key={c.id || c._id} community={c} />
              ))}
            </div>
          </section>
        )}

        {/* ── "Mis comunidades" full list (when filter=joined) ── */}
        {filter === 'joined' && (
          <section className="mb-5">
            <h2 className="mb-2.5 text-base font-bold uppercase tracking-wide text-stone-950">Mis comunidades</h2>
            {myCommunities.length === 0 ? (
              <div className="py-10 text-center text-stone-500">
                <Users size={48} className="mx-auto text-stone-500" strokeWidth={1} />
                <p className="mt-3 text-[15px]">No te has unido a ninguna comunidad</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {myCommunities.map(c => (
                  <CommunityRow key={c.id || c._id} community={c} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Section label ── */}
        {filter !== 'joined' && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold uppercase tracking-wide text-stone-950">
              {filter === 'popular' ? 'Comunidades populares' : 'Comunidades'}
            </h2>
            {!isLoading && (
              <span className="text-xs text-stone-500">{communities.length} resultados</span>
            )}
          </div>
        )}

        {/* ── Grid ── */}
        {filter !== 'joined' && (
          isLoading ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-[200px] animate-pulse rounded-xl bg-stone-100" />
              ))}
            </div>
          ) : communities.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Users size={56} className="text-stone-500" strokeWidth={1} />
              <p className="text-center text-[15px] text-stone-500">
                {searchInput ? 'Sin resultados' : 'Sin comunidades todavía'}
              </p>
              {canCreate && !searchInput && (
                <Link to="/communities/new" className="rounded-lg bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white no-underline">
                  Crea la primera
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
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
          <div className="mt-5 rounded-xl border border-stone-200 bg-stone-100 p-4 text-center">
            <p className="mb-1 text-sm font-bold text-stone-950">¿Quieres crear tu comunidad?</p>
            <p className="mb-1 text-[13px] text-stone-500">Consigue 100 seguidores o verifica tu cuenta de vendedor</p>
            <p className="text-xs text-stone-500">Tienes {user?.follower_count || 0}/100 seguidores</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── My Community Pill (horizontal scroll) ── */
const MyCommunityPill = ({ community }) => (
  <Link to={`/communities/${community.slug}`} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 no-underline">
    <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-stone-200 ${
      community.cover_image ? 'bg-stone-100' : stoneBg(community.name)
    }`}>
      {community.cover_image ? (
        <img src={community.cover_image} alt={community.name || ''} className="h-full w-full object-cover" />
      ) : (
        <span className="text-2xl">{community.emoji || '🌿'}</span>
      )}
    </div>
    <span className="max-w-[72px] truncate text-center text-[11px] font-medium text-stone-950">
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
    <Link to={`/communities/${community.slug}`} className="block no-underline">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white transition-colors">
        {/* Cover */}
        <div className="relative aspect-[16/7] overflow-hidden">
          {community.cover_image ? (
            <img src={community.cover_image} alt={community.name || ''} className="block h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center text-[32px] ${stoneBg(community.name)}`}>
              {community.emoji || '🌿'}
            </div>
          )}
          {community.category && (
            <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
              {community.category}
            </span>
          )}
        </div>

        <div className="p-2.5">
          <p className="truncate text-[13px] font-semibold leading-tight text-stone-950">
            {community.name}
          </p>
          {community.description && (
            <p className="mb-1.5 truncate text-[11px] text-stone-500">
              {community.description}
            </p>
          )}
          <p className="mb-2 flex items-center gap-1 text-[10px] text-stone-500">
            <Users size={10} />
            {community.member_count?.toLocaleString()} miembros
          </p>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggle}
            disabled={isToggling}
            className={`w-full rounded-full border py-1.5 text-xs font-semibold transition-colors ${
              joined
                ? 'border-stone-200 bg-white text-stone-500'
                : 'border-stone-950 bg-stone-950 text-white'
            }`}
          >
            {isToggling ? '...' : joined ? 'Unida' : 'Unirse'}
          </motion.button>
        </div>
      </div>
    </Link>
  );
};

/* ── Row for "my communities" list ── */
const CommunityRow = ({ community }) => (
  <Link to={`/communities/${community.slug}`} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3.5 no-underline">
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-[22px] ${
      community.cover_image ? 'bg-stone-100' : stoneBg(community.name)
    }`}>
      {community.cover_image ? (
        <img src={community.cover_image} alt={community.name || ''} className="h-full w-full object-cover" />
      ) : (community.emoji || '🌿')}
    </div>
    <div className="min-w-0 flex-1">
      <p className="mb-0.5 text-[15px] font-semibold text-stone-950">{community.name}</p>
      <p className="text-xs text-stone-500">
        {community.member_count?.toLocaleString()} miembros
        {community.unread_posts > 0 && (
          <span className="ml-2 font-bold text-stone-950">· {community.unread_posts} nuevos</span>
        )}
      </p>
    </div>
    <ChevronRight size={16} className="text-stone-500" />
  </Link>
);
