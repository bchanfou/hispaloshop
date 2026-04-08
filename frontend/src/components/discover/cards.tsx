// @ts-nocheck
/**
 * Lightweight card components for Discover sections.
 * Keep them minimal — each card is a link to the detail page.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Clock, ChefHat, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const resolveImage = (item) =>
  item?.images?.[0] || item?.image_url || item?.image || item?.profile_image || item?.picture || '';

// ── Product card (compact, for seasonal + for-you) ──
export function ProductCard({ product }) {
  const img = resolveImage(product);
  const href = `/product/${product.product_id || product.id}`;
  return (
    <Link to={href} className="block w-[140px] lg:w-[160px] no-underline group">
      <div className="aspect-square rounded-2xl overflow-hidden bg-stone-100 mb-2">
        {img ? (
          <img src={img} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-2xl">📦</div>
        )}
      </div>
      <p className="text-xs font-medium text-stone-950 line-clamp-2 leading-tight">{product.name}</p>
      {product.price != null && (
        <p className="text-xs font-bold text-stone-950 mt-0.5">{product.price.toFixed?.(2) ?? product.price} €</p>
      )}
    </Link>
  );
}

// ── Producer card (Airbnb host style) ──
export function ProducerCard({ producer }) {
  const { t } = useTranslation();
  const img = producer.profile_image || producer.picture;
  const name = producer.company_name || producer.name;
  const href = `/store/${producer.username || producer.user_id}`;
  return (
    <Link to={href} className="block w-[200px] lg:w-[220px] rounded-2xl border border-stone-200 bg-white p-3 no-underline group hover:border-stone-300 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-full bg-stone-100 overflow-hidden shrink-0">
          {img ? (
            <img src={img} alt={name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400 text-lg font-bold">
              {(name || '?')[0]}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-950 truncate">{name}</p>
          {producer.country && (
            <p className="text-xs text-stone-500 flex items-center gap-1">
              <MapPin size={10} /> {producer.country}
            </p>
          )}
        </div>
      </div>
      {producer.followers_count > 0 && (
        <p className="text-[11px] text-stone-400">{producer.followers_count} {t('cards.followers', 'seguidores')}</p>
      )}
    </Link>
  );
}

// ── Community card ──
export function CommunityCard({ community }) {
  const { t } = useTranslation();
  const href = `/community/${community.slug}`;
  return (
    <Link to={href} className="block w-[180px] lg:w-[200px] rounded-2xl border border-stone-200 bg-white overflow-hidden no-underline group hover:border-stone-300 transition-colors">
      <div className="h-20 bg-stone-100 flex items-center justify-center">
        {community.cover_image ? (
          <img src={community.cover_image} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <Users className="w-8 h-8 text-stone-300" />
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-stone-950 truncate">{community.name}</p>
        {community.member_count != null && (
          <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
            <Users size={10} /> {community.member_count} {t('cards.members', 'miembros')}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Recipe card ──
export function RecipeCard({ recipe }) {
  const { t } = useTranslation();
  const img = recipe.image_url || resolveImage(recipe);
  const href = `/recipe/${recipe.recipe_id || recipe.id}`;
  return (
    <Link to={href} className="block w-[180px] lg:w-[200px] rounded-2xl overflow-hidden bg-white border border-stone-200 no-underline group hover:border-stone-300 transition-colors">
      <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
        {img ? (
          <img src={img} alt={recipe.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-2xl">🍳</div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-stone-950 line-clamp-2 leading-tight">{recipe.title}</p>
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-stone-400">
          {recipe.time_minutes && (
            <span className="flex items-center gap-0.5"><Clock size={10} /> {recipe.time_minutes} {t('cards.min', 'min')}</span>
          )}
          {recipe.difficulty && (
            <span className="flex items-center gap-0.5"><ChefHat size={10} /> {recipe.difficulty}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Creator / new producer avatar card ──
export function AvatarCard({ user, onFollow }) {
  const { t } = useTranslation();
  const img = user.profile_image || user.picture;
  const name = user.name || user.username;
  const href = `/profile/${user.username || user.user_id}`;
  return (
    <div className="flex flex-col items-center w-[90px] lg:w-[100px]">
      <Link to={href} className="no-underline">
        <div className="w-16 h-16 lg:w-18 lg:h-18 rounded-full bg-stone-100 overflow-hidden ring-2 ring-stone-200 mb-1.5">
          {img ? (
            <img src={img} alt={name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold text-lg">
              {(name || '?')[0]}
            </div>
          )}
        </div>
      </Link>
      <p className="text-[11px] font-medium text-stone-950 text-center truncate w-full">{name}</p>
      {onFollow && (
        <button
          type="button"
          onClick={() => onFollow(user.user_id)}
          className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-stone-950 bg-stone-100 rounded-full px-2.5 py-1 hover:bg-stone-200 transition-colors border-none cursor-pointer"
        >
          <UserPlus size={10} /> {t('cards.follow', 'Seguir')}
        </button>
      )}
    </div>
  );
}
