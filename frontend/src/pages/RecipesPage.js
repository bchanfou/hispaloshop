import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api/client';
import { ChefHat, Clock3, Loader2, Plus, Search, User, Users } from 'lucide-react';
import Header from '../components/Header';
import { asLowerText } from '../utils/safe';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { resolveUserImage } from '../features/user/queries';

const INITIAL_BATCH = 12;
const LOAD_MORE_BATCH = 9;

function RecipeCard({ recipe }) {
  return (
    <Link
      to={`/recipes/${recipe.recipe_id}`}
      className="group overflow-hidden rounded-2xl border border-stone-100 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      data-testid={`recipe-${recipe.recipe_id}`}
    >
      <div className="aspect-square overflow-hidden bg-stone-100">
        {recipe.image_url ? (
          <img
            src={resolveUserImage(recipe.image_url)}
            alt={recipe.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChefHat className="h-10 w-10 text-stone-300" />
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold text-stone-950">{recipe.title}</h3>
          {recipe.author_name ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500">
              <User className="h-3.5 w-3.5" />
              {recipe.author_name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-50 px-2.5 py-1">
            <Clock3 className="h-3.5 w-3.5" />
            {recipe.time_minutes || 0} min
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-50 px-2.5 py-1">
            <Users className="h-3.5 w-3.5" />
            {recipe.servings || 1}
          </span>
          <span className="rounded-full bg-stone-50 px-2.5 py-1 capitalize">{recipe.difficulty || 'easy'}</span>
        </div>
      </div>
    </Link>
  );
}

export default function RecipesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiClient
      .get('/recipes')
      .then((data) => {
        if (active) {
          setRecipes(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (active) {
          setRecipes([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const filters = [
    { key: 'all', label: t('recipes.all', 'Todas') },
    { key: 'easy', label: t('recipes.easy', 'Fácil') },
    { key: 'medium', label: t('recipes.medium', 'Media') },
    { key: 'hard', label: t('recipes.hard', 'Difícil') },
  ];

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = asLowerText(search.trim());
    const visibleRecipes = recipes.filter((recipe) => {
      const matchesSearch =
        !normalizedSearch ||
        asLowerText(recipe.title).includes(normalizedSearch) ||
        asLowerText(recipe.author_name).includes(normalizedSearch) ||
        recipe.tags?.some((tag) => asLowerText(tag).includes(normalizedSearch));
      const matchesFilter = filter === 'all' || recipe.difficulty === filter;
      return matchesSearch && matchesFilter;
    });

    return visibleRecipes;
  }, [filter, recipes, search]);

  const visibleRecipes = filteredRecipes.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [filter, search]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= filteredRecipes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + LOAD_MORE_BATCH, filteredRecipes.length));
        }
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredRecipes.length, visibleCount]);

  const isSpanish = i18n.language?.startsWith('es');

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO title="Recetas | Hispaloshop" description="Descubre recetas y compra los ingredientes en un solo flujo." />
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">
        <BackButton />

        <section className="mt-10 mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
              {isSpanish ? 'Bienvenido a la cocina' : 'Welcome to the kitchen'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              {t('recipes.subtitle', 'Descubre recetas y compra los ingredientes en un solo flujo.')}
            </p>
          </div>

          {user ? (
            <Link
              to="/recipes/create"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-stone-950 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-stone-800"
              data-testid="create-recipe-btn"
            >
              <Plus className="h-4 w-4" />
              {t('recipes.createRecipe', 'Crear receta')}
            </Link>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-stone-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('recipes.searchPlaceholder', 'Buscar recetas…')}
              className="h-12 w-full rounded-full border border-stone-200 bg-stone-50 pl-11 pr-4 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400"
              data-testid="recipe-search"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors duration-150 ${
                  filter === item.key
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
                data-testid={`filter-${item.key}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-stone-200 bg-white px-6 py-16 text-center">
              <ChefHat className="mx-auto h-12 w-12 text-stone-300" />
              <h2 className="mt-4 text-lg font-semibold text-stone-950">{t('recipes.empty', 'Aún no hay recetas')}</h2>
              <p className="mt-2 text-sm text-stone-500">
                {t('recipes.emptySearch', 'Prueba con otra búsqueda o crea una receta nueva.')}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleRecipes.map((recipe) => (
                  <RecipeCard key={recipe.recipe_id} recipe={recipe} />
                ))}
              </div>
              <div ref={sentinelRef} className="h-10" />
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
