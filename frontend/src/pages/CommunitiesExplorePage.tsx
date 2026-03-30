// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, ChevronRight, Users, X, AlertTriangle } from 'lucide-react';
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

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['communities-explore', debouncedSearch, filter],
    queryFn: () => apiClient.get(`/communities?q=${encodeURIComponent(debouncedSearch)}&filter=${filter}&limit=24`),
  });

  const { data: myData } = useQuery({
    queryKey: ['my-communities'],
    queryFn: () => apiClient.get('/communities/me'),
    enabled: !!user,
  });

  const invalidateCommunities = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['communities-explore'] });
    queryClient.invalidateQueries({ queryKey: ['my-communities'] });
  }, [queryClient]);

  const { data: featuredData } = useQuery({
    queryKey: ['communities-featured'],
    queryFn: () => apiClient.get('/communities?featured=true&limit=4'),
  });

  const canCreate = (user?.followers_count >= 100) || (user?.role === 'producer' || user?.role === 'importer');
  const communities = data?.communities || [];
  const myCommunities = myData?.communities || [];
  const featuredCommunities = featuredData?.communities || [];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-[975px] items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center" aria-label="Volver">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="flex-1 text-[17px] font-bold text-stone-950">Comunidades</span>
        {canCreate && (
          <Link to="/communities/new" className="rounded-full bg-stone-950 px-3.5 py-1.5 text-[13px] font-semibold text-white no-underline">
            + Crear
          </Link>
        )}
      </div>
      </div>

      {/* ── Featured Communities Carousel ── */}
      {featuredCommunities.length > 0 && !searchInput && (
        <section className="mx-auto max-w-[975px] px-4 pt-4">
          <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-stone-950">Comunidades destacadas</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {featuredCommunities.map((c) => (
              <FeaturedCard key={c.id || c._id} community={c} />
            ))}
          </div>
        </section>
      )}

      {/* ── Search ── */}
      <div role="search" aria-label="Buscar comunidades" className="mx-auto max-w-[975px] px-4 pt-3">
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
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center"
              aria-label="Limpiar búsqueda"
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-stone-100">
                <X size={13} className="text-stone-500" />
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className="mx-auto flex max-w-[975px] gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-label={`Filtrar: ${f.label}`}
              aria-pressed={active}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors active:scale-95 ${
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

      <div className="mx-auto max-w-[975px] px-4 pb-24">

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
            {!user ? (
              <div className="py-10 text-center text-stone-500">
                <Users size={48} className="mx-auto text-stone-300" strokeWidth={1} />
                <p className="mt-3 text-[15px]">Inicia sesión para ver tus comunidades</p>
                <button onClick={() => navigate('/login')} className="mt-3 rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white border-none cursor-pointer">Entrar</button>
              </div>
            ) : myCommunities.length === 0 ? (
              <div className="py-10 text-center text-stone-500">
                <Users size={48} className="mx-auto text-stone-300" strokeWidth={1} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" aria-busy="true" aria-label="Cargando comunidades">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} aria-hidden="true" className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
                  {/* Cover placeholder */}
                  <div className="aspect-[16/7] animate-pulse bg-stone-100" />
                  <div className="p-2.5 flex flex-col gap-2">
                    <div className="h-3 w-3/4 animate-pulse rounded-full bg-stone-100" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-stone-100" />
                    <div className="h-7 w-full animate-pulse rounded-full bg-stone-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <AlertTriangle className="w-10 h-10 text-stone-300" />
              <p className="text-base font-semibold text-stone-950">Error al cargar</p>
              <p className="text-sm text-stone-500">Comprueba tu conexión e inténtalo de nuevo</p>
              <button
                onClick={() => refetch()}
                className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors"
                aria-label="Reintentar carga"
              >
                Reintentar
              </button>
            </div>
          ) : communities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Users size={48} className="text-stone-300" strokeWidth={1.5} />
              <p className="text-base font-semibold text-stone-950">
                {filter !== 'all' && !searchInput
                  ? 'No hay comunidades en esta categoría'
                  : searchInput
                  ? 'Sin resultados para tu búsqueda'
                  : 'Aún no hay comunidades'}
              </p>
              <p className="text-sm text-stone-500">
                {filter !== 'all' && !searchInput
                  ? 'Crea la primera comunidad de esta categoría'
                  : searchInput
                  ? 'Prueba con otros términos'
                  : 'Sé el primero en crear una y conectar con la comunidad'}
              </p>
              {canCreate && (
                <button
                  onClick={() => navigate('/communities/create')}
                  className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors"
                >
                  Crear comunidad
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {communities.map((c, i) => (
                <motion.div
                  key={c.id || c._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <CommunityCard community={c} onToggled={invalidateCommunities} />
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* ── CTA if can't create ── */}
        {!canCreate && filter !== 'joined' && communities.length > 0 && (
          <div className="mt-5 rounded-2xl shadow-sm bg-stone-100 p-4 text-center">
            <p className="mb-1 text-sm font-bold text-stone-950">¿Quieres crear tu comunidad?</p>
            <p className="mb-1 text-[13px] text-stone-500">Consigue 100 seguidores o verifica tu cuenta de vendedor</p>
            <p className="text-xs text-stone-500">Tienes {user?.followers_count || 0}/100 seguidores</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── My Community Pill (horizontal scroll) ── */
const MyCommunityPill = ({ community }) => (
  <Link to={`/communities/${community.slug || community.id || community._id}`} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 no-underline">
    <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-stone-200 ${
      community.cover_image ? 'bg-stone-100' : stoneBg(community.name)
    }`}>
      {community.cover_image ? (
        <img src={community.cover_image} alt={community.name || ''} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="text-2xl">{community.emoji || '🌿'}</span>
      )}
    </div>
    <span className="max-w-[72px] truncate text-center text-[11px] font-medium text-stone-950">
      {community.name}
    </span>
  </Link>
);

/* ── Member Preview Avatars ── */
const MemberAvatars = ({ community }) => {
  const members = community.recent_members || community.top_members || [];
  const total = community.member_count || 0;
  const shown = members.slice(0, 3);
  if (total === 0 && shown.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {shown.map((m, i) => (
          <img
            key={m.id || m._id || i}
            src={m.avatar_url || m.avatar || m.profile_image}
            alt=""
            className={`w-6 h-6 rounded-full border-2 border-white object-cover ${i > 0 ? '-ml-2' : ''}`}
            loading="lazy"
          />
        ))}
      </div>
      {total > shown.length && (
        <span className="text-[10px] text-stone-500">+ {(total - shown.length).toLocaleString()} miembros</span>
      )}
    </div>
  );
};

/* ── Featured Community Card (dark, horizontal scroll) ── */
const FeaturedCard = ({ community }) => {
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (joining) return;
    setJoining(true);
    try {
      await apiClient.post(`/communities/${community.id || community._id}/join`);
      toast.success(`Te uniste a ${community.name}`);
    } catch {
      toast.error('Error al unirse');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/communities/${community.slug || community.id || community._id}`)}
      className="w-[280px] shrink-0 cursor-pointer rounded-2xl bg-stone-950 p-4 text-white"
    >
      <div className="mb-3 text-[28px]">{community.emoji || '🌿'}</div>
      <p className="mb-1 truncate text-[15px] font-bold">{community.name}</p>
      <p className="mb-3 flex items-center gap-1 text-[12px] text-white/60">
        <Users size={12} />
        {(community.member_count || 0).toLocaleString()} miembros
      </p>
      <button
        onClick={handleJoin}
        disabled={joining}
        className="rounded-full border border-white/30 bg-transparent px-4 py-1.5 text-[13px] font-semibold text-white cursor-pointer hover:bg-white/10 transition-colors disabled:opacity-50"
      >
        {joining ? '...' : 'Unirse'}
      </button>
    </div>
  );
};

/* ── Card for 2-column grid ── */
const CommunityCard = React.memo(({ community, onToggled }) => {
  const [joined, setJoined] = useState(!!community.is_member);
  const [memberCount, setMemberCount] = useState(community.member_count || 0);
  const [isToggling, setIsToggling] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isToggling) return;
    // Optimistic update
    const wasJoined = joined;
    setJoined(!wasJoined);
    setMemberCount(c => wasJoined ? Math.max(0, c - 1) : c + 1);
    setIsToggling(true);
    try {
      if (wasJoined) {
        await apiClient.delete(`/communities/${community.id || community._id}/join`);
      } else {
        await apiClient.post(`/communities/${community.id || community._id}/join`);
      }
      onToggled?.();
    } catch {
      // Rollback
      setJoined(wasJoined);
      setMemberCount(community.member_count || 0);
      toast.error('Error al actualizar membresía');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Link to={`/communities/${community.slug || community.id || community._id}`} className="block no-underline">
      <div className="overflow-hidden rounded-2xl shadow-sm bg-white transition-transform duration-200 hover:scale-[1.02]">
        {/* Cover */}
        <div className="relative aspect-[16/7] overflow-hidden">
          {community.cover_image ? (
            <img src={community.cover_image} alt={community.name || ''} loading="lazy" className="block h-full w-full object-cover" />
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
          <p className="mb-1 flex items-center gap-1 text-[10px] text-stone-500">
            <Users size={10} />
            {memberCount?.toLocaleString()} miembros
          </p>
          <div className="mb-2">
            <MemberAvatars community={community} />
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggle}
            disabled={isToggling}
            aria-label={joined ? `Salir de ${community.name || 'comunidad'}` : `Unirse a ${community.name || 'comunidad'}`}
            className={`w-full cursor-pointer rounded-full border py-1.5 text-xs font-semibold transition-colors ${
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
});

/* ── Row for "my communities" list ── */
const CommunityRow = ({ community }) => (
  <Link to={`/communities/${community.slug || community.id || community._id}`} className="flex items-center gap-3 rounded-2xl shadow-sm bg-white p-3.5 no-underline">
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-[22px] ${
      community.cover_image ? 'bg-stone-100' : stoneBg(community.name)
    }`}>
      {community.cover_image ? (
        <img src={community.cover_image} alt={community.name || ''} loading="lazy" className="h-full w-full object-cover" />
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
