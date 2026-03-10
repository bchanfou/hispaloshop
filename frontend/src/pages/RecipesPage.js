import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Clock, Users, ChefHat, ShoppingCart, Loader2, Star, ChevronRight, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../utils/api';

function RecipeCard({ recipe }) {
  const { t } = useTranslation();
  return (
    <Link to={`/recipes/${recipe.recipe_id}`} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-all group" data-testid={`recipe-${recipe.recipe_id}`}>
      <div className="aspect-video bg-stone-100 overflow-hidden">
        {recipe.image_url ? <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <ChefHat className="w-10 h-10 text-stone-300 m-auto mt-12" />}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-primary text-sm mb-1">{recipe.title}</h3>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.time_minutes} min</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings}</span>
          <span className="capitalize">{recipe.difficulty}</span>
        </div>
        {recipe.tags?.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {recipe.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] bg-stone-100 text-text-muted px-2 py-0.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function RecipesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API}/recipes${search ? `?q=${search}` : ''}`)
      .then(r => setRecipes(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  const filtered = filter === 'all' ? recipes : recipes.filter(r => r.difficulty === filter);
  const filters = [
    { key: 'all', label: t('recipes.all', 'Todas') },
    { key: 'easy', label: t('recipes.easy', 'Fácil') },
    { key: 'medium', label: t('recipes.medium', 'Media') },
    { key: 'hard', label: t('recipes.hard', 'Dificil') },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO title="Recipes | Hispaloshop" description="Discover recipes and buy ingredients with one click" />
      <Header />
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
        <BackButton />
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="font-heading text-2xl md:text-3xl font-semibold text-primary">{t('recipes.title', 'Hispalo Cocina')}</h1>
          {user && (
            <Link to="/recipes/create">
              <Button size="sm" className="bg-primary hover:bg-primary-hover text-white rounded-xl gap-1.5 shrink-0" data-testid="create-recipe-btn">
                <Plus className="w-4 h-4" /> {t('recipes.createRecipe')}
              </Button>
            </Link>
          )}
        </div>
        <p className="text-sm text-text-muted mb-5">{t('recipes.subtitle', 'Discover recipes and buy all ingredients with one click')}</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder={t('recipes.searchPlaceholder', 'Search recipes...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-full border border-stone-200 focus:border-primary outline-none text-sm bg-white"
            data-testid="recipe-search"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${filter === f.key ? 'bg-primary text-white' : 'bg-white border border-stone-200 text-text-muted hover:border-stone-300'}`}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ChefHat className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-text-muted">{t('recipes.empty', 'No recipes yet')}</p>
            {user && <Link to="/recipes/create" className="text-sm text-primary underline mt-2 inline-block">{t('recipes.createFirst', 'Create the first one')}</Link>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(r => <RecipeCard key={r.recipe_id} recipe={r} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
