import BackButton from '../components/BackButton';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  Search, UserPlus, UserMinus, MessageCircle, Star, Store, 
  Sparkles, ShoppingBag, Users, MapPin, Loader2, Filter
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

import { API } from '../utils/api'; // Centralized API URL

function getRoleConfig(role, t) {
  const configs = {
    influencer: { label: 'Influencer', color: 'bg-purple-100 text-purple-700', icon: Sparkles },
    producer: { label: t('directory.seller', 'Vendedor'), color: 'bg-emerald-100 text-emerald-700', icon: Store },
    customer: { label: t('directory.customer', 'Comprador'), color: 'bg-sky-100 text-sky-700', icon: ShoppingBag },
  };
  return configs[role] || configs.customer;
}

function ProfileCard({ profile, currentUser, onFollowToggle }) {
  const { t } = useTranslation();
  const [following, setFollowing] = useState(profile.is_following);
  const [loading, setLoading] = useState(false);
  const roleConf = getRoleConfig(profile.role, t);

  const handleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) { toast.error('Inicia sesión para seguir usuarios'); return; }
    if (currentUser.user_id === profile.user_id) return;
    setLoading(true);
    try {
      if (following) {
        await axios.delete(`${API}/users/${profile.user_id}/follow`, { withCredentials: true });
        setFollowing(false);
      } else {
        await axios.post(`${API}/users/${profile.user_id}/follow`, {}, { withCredentials: true });
        setFollowing(true);
      }
      if (onFollowToggle) onFollowToggle(profile.user_id, !following);
    } catch {
      toast.error('Error al actualizar seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) { toast.error('Inicia sesión para enviar mensajes'); return; }
    window.dispatchEvent(new CustomEvent('open-chat-with-user', { detail: { userId: profile.user_id } }));
  };

  return (
    <Link
      to={`/user/${profile.user_id}`}
      className="group block bg-white rounded-xl border border-stone-200 hover:shadow-md transition-all overflow-hidden"
      data-testid={`discover-profile-${profile.user_id}`}
    >
      <div className="p-3 flex items-center gap-3">
        {/* Avatar — compact */}
        <div className="w-12 h-12 rounded-full bg-stone-200 overflow-hidden shrink-0 border-2 border-white shadow-sm">
          {profile.profile_image ? (
            <img src={profile.profile_image.startsWith('http') ? profile.profile_image : profile.profile_image} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400 text-lg font-bold">
              {(profile.name || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Info — compact */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-[#1C1C1C] truncate">{profile.name}</p>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${roleConf.color}`}>
              {roleConf.label}
            </span>
          </div>
          {profile.bio && <p className="text-[11px] text-text-muted truncate mt-0.5">{profile.bio}</p>}
          <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
            <span>{profile.followers_count} {t('discover.followers', 'followers')}</span>
            <span>{profile.posts_count} {t('discover.posts', 'posts')}</span>
          </div>
        </div>

        {/* Follow button */}
        <Button
          size="sm"
          variant={profile.is_following ? 'outline' : 'default'}
          className={`shrink-0 rounded-full text-xs h-8 px-3 ${!profile.is_following ? 'bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white' : ''}`}
        >
          {profile.is_following ? t('actions.following') : t('actions.follow')}
        </Button>
      </div>
    </Link>
  );
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(0);
  const LIMIT = 24;

  const fetchProfiles = async (reset = false, filterOverride = null, searchOverride = null) => {
    setLoading(true);
    try {
      const currentFilter = filterOverride ?? activeFilter;
      const currentSearch = searchOverride ?? search;
      const skip = reset ? 0 : page * LIMIT;
      const params = new URLSearchParams({ skip: String(skip), limit: String(LIMIT) });
      if (currentFilter && currentFilter !== 'all') params.append('role', currentFilter);
      if (currentSearch && currentSearch.trim()) params.append('search', currentSearch.trim());
      
      const res = await axios.get(`${API}/discover/profiles?${params}`, { withCredentials: true });
      if (reset) {
        setProfiles(res.data.profiles || []);
      } else {
        setProfiles(prev => [...prev, ...(res.data.profiles || [])]);
      }
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      toast.error('Error cargando perfiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchProfiles(true, activeFilter, search);
  }, [activeFilter, search]);

  useEffect(() => {
    if (page > 0) fetchProfiles(false);
  }, [page]);

  const filters = [
    { key: 'all', label: t('discover.all', 'Todos'), icon: Users },
    { key: 'producer', label: t('discover.stores', 'Tiendas'), icon: Store },
    { key: 'influencer', label: t('discover.creators', 'Creadores'), icon: Sparkles },
    { key: 'customer', label: t('discover.buyers', 'Compradores'), icon: ShoppingBag },
  ];

  const trendingTags = ['organico', 'sin gluten', 'aceites', 'vegano', 'artesanal', 'local', 'bio'];

  const hasMore = profiles.length < total;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-16">
        <BackButton />
        
        {/* Search — Big and prominent */}
        <div className="relative mb-5" data-testid="discover-search">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <Input
            type="text"
            placeholder={t('search.placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-12 h-12 rounded-full border-2 border-stone-200 focus:border-[#2D5A27] text-sm"
          />
        </div>

        {/* Trending Tags */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {trendingTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSearch(tag)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white border border-stone-200 text-text-secondary hover:border-[#2D5A27] hover:text-[#2D5A27] transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Filter Tabs — Clean, pill style */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {filters.map(f => {
            const Icon = f.icon;
            const active = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active ? 'bg-[#1C1C1C] text-white' : 'bg-white border border-stone-200 text-text-secondary hover:border-stone-300'
                }`}
                data-testid={`filter-${f.key}`}
              >
                <Icon className="w-4 h-4" />
                {f.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-text-muted mb-4">{total} perfiles encontrados</p>

        {/* Grid */}
        {loading && profiles.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#7A7A7A]" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#1C1C1C] mb-2">No se encontraron perfiles</h3>
            <p className="text-[#7A7A7A]">Intenta con otro filtro o término de búsqueda</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {profiles.map((p) => (
                <ProfileCard key={p.user_id} profile={p} currentUser={user} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={loading}
                  className="rounded-xl px-8"
                  data-testid="load-more-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Ver más perfiles
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
