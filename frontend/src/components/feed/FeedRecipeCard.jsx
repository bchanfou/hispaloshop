import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

/**
 * Recipe preview card inserted into the feed at intervals.
 * Props: recipe ({ id, title, name, image_url, images, prep_time, cooking_time })
 */
export default function FeedRecipeCard({ recipe }) {
  if (!recipe) return null;

  const image = recipe.image_url || recipe.images?.[0]?.url || recipe.images?.[0] || '';
  const title = recipe.title || recipe.name || 'Receta';
  const prepTime = recipe.prep_time || recipe.cooking_time;

  return (
    <div className="mx-4 my-2 rounded-2xl border border-stone-100 bg-white overflow-hidden">
      <Link to={`/recipes/${recipe.id}`} className="block">
        {/* Recipe image */}
        {image ? (
          <div className="aspect-[3/4] w-full overflow-hidden relative">
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
            {/* Prep time badge */}
            {prepTime && (
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-stone-700">
                <Clock className="h-3 w-3" />
                {prepTime} min
              </span>
            )}
          </div>
        ) : (
          <div className="aspect-[3/4] w-full bg-stone-50 flex items-center justify-center">
            <span className="text-stone-300 text-sm">Sin imagen</span>
          </div>
        )}

        {/* Info */}
        <div className="p-3.5">
          <p className="text-[14px] font-semibold text-stone-950 leading-tight line-clamp-2">
            {title}
          </p>
          <div className="mt-2.5">
            <span className="rounded-full bg-stone-950 px-4 py-1.5 text-[12px] font-semibold text-white">
              Ver receta
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
