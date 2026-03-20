import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChefHat, Clock, Loader2, Plus, X, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { resolveUserImage } from '../features/user/queries';
import SEO from '../components/SEO';

const DIFFICULTY_PILLS = [
  { id: 'all', label: 'Todas' },
  { id: 'easy', label: 'Fácil' },
  { id: 'medium', label: 'Media' },
  { id: 'hard', label: 'Difícil' },
];

const TIME_PILLS = [
  { id: 'all', label: 'Cualquier' },
  { id: '15', label: '<15 min' },
  { id: '30', label: '<30 min' },
  { id: '60', label: '<60 min' },
];

const DIET_PILLS = [
  { id: 'all', label: 'Todas' },
  { id: 'vegano', label: 'Vegano' },
  { id: 'sin_gluten', label: 'Sin gluten' },
  { id: 'vegetariano', label: 'Vegetariano' },
];

const DIFFICULTY_CLASSES = {
  easy: { pill: 'bg-stone-100 text-stone-600', label: 'Fácil' },
  medium: { pill: 'bg-stone-100 text-stone-700', label: 'Medio' },
  hard: { pill: 'bg-stone-950 text-stone-50', label: 'Difícil' },
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── RecipeCard ── */
function RecipeCard({ recipe }) {
  const cookTime = recipe.cook_time || recipe.time_minutes || 0;

  return (
    <Link to={`/recipes/${recipe.recipe_id}`} className="block no-underline">
      <div className="overflow-hidden rounded-2xl bg-white">
        {/* Image 4:5 */}
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
          {recipe.image_url ? (
            <img
              src={resolveUserImage(recipe.image_url)}
              alt={recipe.title}
              loading="lazy"
              className="block h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ChefHat size={32} className="text-stone-300" />
            </div>
          )}
          {recipe.is_saved && (
            <span className="absolute right-2 top-2 flex items-center justify-center rounded-full bg-white/90 p-1 shadow-sm">
              <Bookmark size={12} className="text-stone-950" fill="currentColor" />
            </span>
          )}
        </div>
        {/* Info */}
        <div className="px-1 pt-2 pb-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-950">
            {recipe.title}
          </p>
          {cookTime > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
              <Clock size={11} /> {cookTime} min
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── FilterSection (single horizontal scroll row) ── */
function FilterSection({ pills, active, onSelect }) {
  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto">
      {pills.map(p => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            aria-pressed={isActive}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-stone-950 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════ */
/*  MAIN COMPONENT                           */
/* ══════════════════════════════════════════ */
export default function RecipesPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [dietFilter, setDietFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef(null);

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFetchError(false);
    apiClient.get('/recipes')
      .then(data => { if (active) { setRecipes(Array.isArray(data) ? data : []); setFetchError(false); } })
      .catch(() => { if (active) { setRecipes([]); setFetchError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.toLowerCase().trim();
    return recipes.filter(r => {
      if (needle && !(r.title || '').toLowerCase().includes(needle)
        && !(r.author_name || '').toLowerCase().includes(needle)
        && !r.tags?.some(t => t.toLowerCase().includes(needle))) return false;
      if (difficulty !== 'all' && r.difficulty !== difficulty) return false;
      if (timeFilter !== 'all') {
        const max = parseInt(timeFilter, 10);
        if ((r.time_minutes || 999) > max) return false;
      }
      if (dietFilter !== 'all') {
        const tags = (r.tags || []).map(t => t.toLowerCase());
        const diet = (r.diet || '').toLowerCase();
        if (!tags.includes(dietFilter) && diet !== dietFilter) return false;
      }
      return true;
    });
  }, [recipes, debouncedSearch, difficulty, timeFilter, dietFilter]);

  useEffect(() => { setVisibleCount(12); }, [debouncedSearch, difficulty, timeFilter, dietFilter]);

  /* Infinite scroll */
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= filtered.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(p => p + 12); },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length, visibleCount]);

  const hasFilters = difficulty !== 'all' || timeFilter !== 'all' || dietFilter !== 'all' || searchInput;

  const handleRetry = () => {
    setLoading(true);
    setFetchError(false);
    apiClient.get('/recipes')
      .then(data => setRecipes(Array.isArray(data) ? data : []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  };

  const clearFilters = () => {
    setSearchInput('');
    setDifficulty('all');
    setTimeFilter('all');
    setDietFilter('all');
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <SEO title="Recetas — Hispaloshop" description="Descubre recetas saludables con productos artesanales locales. Filtra por dificultad, tiempo y dieta." />

      {/* ── Title bar ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h1 className="text-xl font-bold text-stone-950">Recetas</h1>
        {user && (
          <Link
            to="/recipes/create"
            className="flex items-center gap-1 rounded-full bg-stone-950 px-3.5 py-2 text-[13px] font-semibold text-white no-underline hover:bg-stone-800 transition-colors"
          >
            <Plus size={14} /> Crear
          </Link>
        )}
      </div>

      {/* ── Search ── */}
      <div className="px-4 pt-2">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar recetas..."
            aria-label="Buscar recetas"
            className="h-10 w-full rounded-full bg-stone-100 pl-10 pr-3.5 text-sm text-stone-950 outline-none border-none placeholder:text-stone-400"
            style={{ paddingRight: searchInput ? 48 : 14 }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Borrar búsqueda"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-none bg-stone-200 cursor-pointer text-stone-500"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pt-3 pb-2">
        <FilterSection pills={DIFFICULTY_PILLS} active={difficulty} onSelect={setDifficulty} />
        <div className="w-px shrink-0 bg-stone-200" />
        <FilterSection pills={TIME_PILLS} active={timeFilter} onSelect={setTimeFilter} />
        <div className="w-px shrink-0 bg-stone-200" />
        <FilterSection pills={DIET_PILLS} active={dietFilter} onSelect={setDietFilter} />
      </div>

      <div className="px-4 pb-24 pt-1">
        {/* Results header */}
        <div className="mb-2 flex items-center justify-between">
          {!loading && (
            <span className="text-xs text-stone-500">
              {filtered.length} receta{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="border-none bg-transparent text-xs font-semibold text-stone-500 cursor-pointer hover:text-stone-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div aria-busy="true" aria-label="Cargando recetas" className="grid grid-cols-2 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} aria-hidden="true" className="aspect-[4/5] animate-pulse rounded-2xl bg-stone-100" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <ChefHat size={56} className="text-stone-300" strokeWidth={1} />
            <p className="text-[15px] text-stone-500">No pudimos cargar las recetas</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white border-none cursor-pointer hover:bg-stone-800 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <ChefHat size={56} className="text-stone-300" strokeWidth={1} />
            <p className="text-[15px] text-stone-500">No se encontraron recetas</p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white border-none cursor-pointer hover:bg-stone-800 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {filtered.slice(0, visibleCount).map((recipe, i) => (
                <motion.div
                  key={recipe.recipe_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <RecipeCard recipe={recipe} />
                </motion.div>
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div ref={sentinelRef} className="flex justify-center p-6">
                <Loader2 size={24} className="animate-spin text-stone-400" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
