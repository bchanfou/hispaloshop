import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, MapPin, Package, Users, Heart, ExternalLink,
  Loader2, Bell, BellOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';

function FollowedStoreCard({ store, onUnfollow }) {
    const storeSlug = store.slug || store.store_slug || null;

  const { t } = useTranslation();
  const [unfollowing, setUnfollowing] = useState(false);

  const handleUnfollow = async () => {
    setUnfollowing(true);
    try {
      await apiClient.post(`/store/${store.store_id}/follow`, {});
      toast.success(t('followedStores.unfollowed', 'Has dejado de seguir esta tienda'));
      onUnfollow(store.store_id);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setUnfollowing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Hero Image */}
      <div className="h-24 bg-gradient-to-br from-stone-100 to-stone-200 relative">
        {store.hero_image_url && (
          <img
            src={store.hero_image_url}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        )}
        {/* Logo */}
        {store.logo_url && (
          <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-[3px] border-white bg-white overflow-hidden shadow-sm">
            <img loading="lazy" src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pt-8">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-950 truncate">{store.name}</h3>
            {store.tagline && (
              <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{store.tagline}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-3 text-xs text-stone-500">
          {store.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {store.location}
            </span>
          )}
          {store.product_count > 0 && (
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {store.product_count}
            </span>
          )}
          {store.follower_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {store.follower_count}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          {storeSlug ? (
            <Link to={`/store/${storeSlug}`} className="flex-1 px-3 py-2.5 min-h-[44px] border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors text-xs flex items-center justify-center no-underline">
              <ExternalLink className="w-3 h-3 mr-1" />
              {t('followedStores.visitStore', 'Ver tienda')}
            </Link>
          ) : (
            <span className="flex-1 px-3 py-2.5 min-h-[44px] border border-stone-200 text-stone-600 rounded-2xl text-xs flex items-center justify-center opacity-50">
              <ExternalLink className="w-3 h-3 mr-1" />
              {t('followedStores.visitStore', 'Ver tienda')}
            </span>
          )}
          <button
            onClick={handleUnfollow}
            disabled={unfollowing}
            aria-label={`Dejar de seguir ${store.name}`}
            className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded-2xl transition-colors disabled:opacity-50"
          >
            {unfollowing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Followed since */}
        {store.followed_at && (
          <p className="text-xs text-stone-500 mt-3">
            {t('followedStores.followedSince', 'Siguiendo desde')} {new Date(store.followed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CustomerFollowedStores() {
  const { t } = useTranslation();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient.get('/customer/followed-stores')
      .then(data => { if (active) setStores(data || []); })
      .catch(() => { if (active) toast.error(t('common.error')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  const handleUnfollow = (storeId) => {
    setStores(prev => prev.filter(s => s.store_id !== storeId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div data-testid="followed-stores-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-950 tracking-[0.02em]">
          {t('followedStores.title', 'Tiendas Seguidas')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('followedStores.subtitle', 'Recibe notificaciones cuando tus tiendas favoritas añadan nuevos productos')}
        </p>
      </div>

      {stores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200">
          <div className="py-12 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-stone-300" />
            </div>
            <h3 className="font-semibold text-stone-950 mb-2">
              {t('followedStores.noStores', 'No sigues ninguna tienda')}
            </h3>
            <p className="text-sm text-stone-500 mb-6 max-w-sm mx-auto">
              {t('followedStores.noStoresDesc', 'Explora nuestras tiendas y sigue a tus favoritas para recibir notificaciones de nuevos productos.')}
            </p>
            <Link to="/stores" className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-stone-950 hover:bg-stone-800 text-white rounded-2xl transition-colors mx-auto no-underline">
              <Store className="w-4 h-4" />
              {t('followedStores.exploreStores', 'Explorar tiendas')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-6 bg-white rounded-2xl border border-stone-200">
            <div className="py-4 px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-stone-950" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-950">
                      {stores.length} {stores.length === 1 ? t('followedStores.store', 'tienda') : t('followedStores.storesPlural', 'tiendas')}
                    </p>
                    <p className="text-xs text-stone-500">
                      {t('followedStores.notificationsActive', 'Recibirás notificaciones de nuevos productos')}
                    </p>
                  </div>
                </div>
                <Link to="/stores" className="inline-flex items-center px-4 py-2.5 min-h-[44px] border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors text-sm no-underline">
                  {t('followedStores.discoverMore', 'Descubrir más')}
                </Link>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <FollowedStoreCard
                key={store.store_id}
                store={store}
                onUnfollow={handleUnfollow}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
