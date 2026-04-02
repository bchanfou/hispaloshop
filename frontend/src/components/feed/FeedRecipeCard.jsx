import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShoppingCart, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const RecipeOverlay = lazy(() => import('../recipes/RecipeOverlay'));

/**
 * Recipe preview card inserted into the feed at intervals.
 * P-09: "Comprar ingredientes" expandable section with search links.
 * R-10: Opens RecipeOverlay on click instead of navigating.
 */
export default function FeedRecipeCard({ recipe }) {
  const [showIngredients, setShowIngredients] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const navigate = useNavigate();

  if (!recipe) return null;

  const image = recipe.image_url || recipe.images?.[0]?.url || recipe.images?.[0] || '';
  const title = recipe.title || recipe.name || 'Receta';
  const prepTime = recipe.prep_time || recipe.cooking_time || recipe.time_minutes;
  const ingredients = recipe.ingredients || [];
  const authorName = recipe.author_name || '';
  const difficulty = recipe.difficulty;
  const DIFF_LABELS = { easy: 'Fácil', medium: 'Media', hard: t('recipes.hard', 'Difícil') };

  return (
    <div className="mx-3 my-3 rounded-2xl shadow-sm bg-white overflow-hidden lg:hover:shadow-md lg:hover:-translate-y-0.5 transition-all duration-200">
      <div className="cursor-pointer" onClick={() => setShowOverlay(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setShowOverlay(true); }}>
        {/* Recipe image */}
        {image ? (
          <div className="aspect-[3/4] w-full overflow-hidden relative">
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
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
          {(authorName || difficulty) && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {authorName && <span className="text-xs text-stone-500 truncate max-w-[140px]">{authorName}</span>}
              {difficulty && DIFF_LABELS[difficulty] && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  difficulty === 'hard' ? 'bg-stone-950 text-stone-50' : 'bg-stone-100 text-stone-600'
                }`}>
                  {DIFF_LABELS[difficulty]}
                </span>
              )}
            </div>
          )}
          <div className="mt-2.5">
            <span className="rounded-full bg-stone-950 px-4 py-1.5 text-[12px] font-semibold text-white">
              Ver receta
            </span>
          </div>
        </div>
      </div>

      {/* R-10: Recipe overlay */}
      {showOverlay && (
        <Suspense fallback={null}>
          <RecipeOverlay recipe={recipe} onClose={() => setShowOverlay(false)} />
        </Suspense>
      )}

      {/* P-09: Ingredient shopping section */}
      {ingredients.length > 0 && (
        <div className="border-t border-stone-100">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setShowIngredients(prev => !prev); }}
            className="flex items-center justify-between w-full px-3.5 py-2.5 text-left bg-transparent border-none cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-950">
              <ShoppingCart size={14} />
              Comprar ingredientes ({ingredients.length})
            </span>
            {showIngredients ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
          </button>

          <AnimatePresence>
            {showIngredients && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3 space-y-1.5">
                  {ingredients.map((ing, idx) => {
                    const name = typeof ing === 'string' ? ing : ing.name || ing.ingredient || '';
                    if (!name) return null;
                    return (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <span className="text-[13px] text-stone-700 flex-1 min-w-0 truncate">{name}</span>
                        <button
                          type="button"
                          onClick={() => navigate(`/search?q=${encodeURIComponent(name)}`)}
                          className="flex items-center gap-1 shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600 border-none cursor-pointer hover:bg-stone-200 transition-colors"
                        >
                          <Search size={10} />
                          Buscar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
