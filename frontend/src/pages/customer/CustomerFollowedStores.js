import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Store, MapPin, Package, Users, Heart, ExternalLink, 
  Loader2, Bell, BellOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { API } from '../../utils/api';

function FollowedStoreCard({ store, onUnfollow }) {
  const { t } = useTranslation();
  const [unfollowing, setUnfollowing] = useState(false);

  const handleUnfollow = async () => {
    setUnfollowing(true);
    try {
      await axios.post(`${API}/store/${store.store_id}/follow`, {}, { withCredentials: true });
      toast.success(t('followedStores.unfollowed', 'Has dejado de seguir esta tienda'));
      onUnfollow(store.store_id);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setUnfollowing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
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
          <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-3 border-white bg-white overflow-hidden shadow-sm">
            <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 pt-8">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-primary truncate">{store.name}</h3>
            {store.tagline && (
              <p className="text-xs text-text-muted mt-0.5 line-clamp-1 font-body">{store.tagline}</p>
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-3 mt-3 text-xs text-text-muted font-body">
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
          <Link to={`/store/${store.slug}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <ExternalLink className="w-3 h-3 mr-1" />
              {t('followedStores.visitStore', 'Ver tienda')}
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleUnfollow}
            disabled={unfollowing}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            {unfollowing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Followed since */}
        {store.followed_at && (
          <p className="text-xs text-text-muted mt-3 font-body">
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
    fetchFollowedStores();
  }, []);

  const fetchFollowedStores = async () => {
    try {
      const response = await axios.get(`${API}/customer/followed-stores`, { withCredentials: true });
      setStores(response.data || []);
    } catch (error) {
      console.error('Error fetching followed stores:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = (storeId) => {
    setStores(prev => prev.filter(s => s.store_id !== storeId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div data-testid="followed-stores-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-primary tracking-[0.02em]">
          {t('followedStores.title', 'Tiendas Seguidas')}
        </h1>
        <p className="font-body text-sm text-text-muted mt-1">
          {t('followedStores.subtitle', 'Recibe notificaciones cuando tus tiendas favoritas añadan nuevos productos')}
        </p>
      </div>

      {stores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-stone-300" />
            </div>
            <h3 className="font-heading font-semibold text-primary mb-2">
              {t('followedStores.noStores', 'No sigues ninguna tienda')}
            </h3>
            <p className="text-sm text-text-muted font-body mb-6 max-w-sm mx-auto">
              {t('followedStores.noStoresDesc', 'Explora nuestras tiendas y sigue a tus favoritas para recibir notificaciones de nuevos productos.')}
            </p>
            <Link to="/stores">
              <Button className="bg-primary hover:bg-primary-hover">
                <Store className="w-4 h-4 mr-2" />
                {t('followedStores.exploreStores', 'Explorar tiendas')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-primary">
                      {stores.length} {stores.length === 1 ? t('followedStores.store', 'tienda') : t('followedStores.storesPlural', 'tiendas')}
                    </p>
                    <p className="text-xs text-text-muted font-body">
                      {t('followedStores.notificationsActive', 'Recibirás notificaciones de nuevos productos')}
                    </p>
                  </div>
                </div>
                <Link to="/stores">
                  <Button variant="outline" size="sm">
                    {t('followedStores.discoverMore', 'Descubrir más')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

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
