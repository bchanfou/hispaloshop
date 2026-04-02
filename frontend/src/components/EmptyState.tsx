import React from 'react';
import { Package, ShoppingBag, Users, Search, Heart, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  icon?: 'product' | 'cart' | 'users' | 'search' | 'heart' | 'inbox';
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const ICONS = {
  product: Package,
  cart: ShoppingBag,
  users: Users,
  search: Search,
  heart: Heart,
  inbox: Inbox,
};

export function EmptyState({
  icon = 'product',
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  const Icon = ICONS[icon];

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-stone-500" />
      </div>
      <h3 className="text-base font-semibold text-stone-950">{title}</h3>
      {description && (
        <p className="text-sm text-stone-500 mt-2 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Variantes predefinidas
export function EmptyProducts({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="product"
      title="No hay productos"
      description=t('empty_state.noEncontramosProductosEnEstaCategor', 'No encontramos productos en esta categoría. Prueba con otra búsqueda.')
      action={onBrowse && (
        <button
          onClick={onBrowse}
          className="px-4 py-2 bg-stone-950 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-colors"
        >
          Ver todos los productos
        </button>
      )}
    />
  );
}

export function EmptyCart({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="cart"
      title={t('cart.empty', 'Tu carrito está vacío')}
      description=t('empty_state.anadeAlgunosProductosArtesanalesPara', 'Añade algunos productos artesanales para comenzar tu compra.')
      action={onBrowse && (
        <button
          onClick={onBrowse}
          className="px-4 py-2 bg-stone-950 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-colors"
        >
          Descubrir productos
        </button>
      )}
    />
  );
}

export function EmptyOrders() {
  return (
    <EmptyState
      icon="inbox"
      title="No tienes pedidos"
      description=t('empty_state.tusPedidosApareceranAquiCuandoReali', 'Tus pedidos aparecerán aquí cuando realices tu primera compra.')
    />
  );
}

export function EmptyFeed() {
  return (
    <EmptyState
      icon="heart"
      title="No hay publicaciones"
      description=t('empty_state.sigueAMasProductoresEInfluencersPa', 'Sigue a más productores e influencers para ver su contenido aquí.')
    />
  );
}

export function EmptySearch({ searchTerm }: { searchTerm?: string }) {
  return (
    <EmptyState
      icon="search"
      title="No encontramos resultados"
      description={searchTerm ? `No hay productos que coincidan con "${searchTerm}".` : t('empty_state.intentaConOtrosTerminosDeBusqueda', 'Intenta con otros términos de búsqueda.')}
    />
  );
}

export function EmptyStores() {
  return (
    <EmptyState
      icon="users"
      title="No hay tiendas disponibles"
      description=t('empty_state.pruebaMasTardeOCambiaLosFiltrosDe', 'Prueba más tarde o cambia los filtros de búsqueda.')
    />
  );
}
