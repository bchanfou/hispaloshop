import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChefHat, Clock3, Loader2, ShoppingCart, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Button } from '../components/ui/button';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import RecipeShoppingListOverlay from '../components/recipes/RecipeShoppingListOverlay';
import ContextualProductSuggestions from '../components/intelligence/ContextualProductSuggestions';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/client';
import { resolveUserImage } from '../features/user/queries';

function normalizeStep(step) {
  if (typeof step === 'string') {
    return { text: step, image_url: '' };
  }

  return {
    text: step?.text || step?.description || '',
    image_url: step?.image_url || '',
  };
}

export default function RecipeDetailPage() {
  const { recipeId } = useParams();
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showShoppingList, setShowShoppingList] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiClient
      .get(`/recipes/${recipeId}`)
      .then((data) => {
        if (active) {
          setRecipe(data || null);
        }
      })
      .catch(() => {
        if (active) {
          setRecipe(null);
          toast.error(t('recipes.notFound', 'Receta no encontrada'));
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
  }, [recipeId, t]);

  const steps = useMemo(() => (recipe?.steps || []).map(normalizeStep), [recipe?.steps]);

  const handleAddAllToCart = async () => {
    setShowShoppingList(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <BackButton />
          <div className="mt-6 rounded-[28px] border border-stone-100 bg-white p-10 text-center">
            <ChefHat className="mx-auto h-10 w-10 text-stone-300" />
            <h1 className="mt-4 text-xl font-semibold text-stone-950">{t('recipes.notFound', 'Receta no encontrada')}</h1>
            <p className="mt-2 text-sm text-stone-500">{t('recipes.tryAnother', 'Prueba con otra receta de nuestro catálogo.')}</p>
            <Link to="/recipes" className="mt-5 inline-flex rounded-full bg-stone-950 px-5 py-2.5 text-sm text-white">
              {t('recipes.backToList', 'Ver recetas')}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <BackButton />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="space-y-5">
            <div className="overflow-hidden rounded-[32px] border border-stone-100 bg-white">
              <div className="aspect-square bg-stone-100">
                {recipe.image_url ? (
                  <img
                    src={resolveUserImage(recipe.image_url)}
                    alt={recipe.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ChefHat className="h-10 w-10 text-stone-300" />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-stone-100 bg-white p-6">
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950">{recipe.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-3 py-1.5">
                  <Clock3 className="h-4 w-4" />
                  {recipe.time_minutes || 0} min
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-3 py-1.5">
                  <Users className="h-4 w-4" />
                  {recipe.servings || 1}
                </span>
                <span className="rounded-full bg-stone-50 px-3 py-1.5 capitalize">{recipe.difficulty || 'easy'}</span>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Autor</p>
                  {recipe.author_id ? (
                    <Link to={`/user/${recipe.author_id}`} className="text-sm font-medium text-stone-950 hover:underline">
                      {recipe.author_name || 'Usuario'}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-stone-950">{recipe.author_name || 'Usuario'}</p>
                  )}
                </div>
              </div>

              {recipe.description ? (
                <p className="mt-5 text-sm leading-relaxed text-stone-700">{recipe.description}</p>
              ) : null}

              <Button
                onClick={handleAddAllToCart}
                className="mt-6 h-11 rounded-full bg-stone-950 px-5 text-white hover:bg-stone-800"
              >
                <ShoppingCart className="h-4 w-4" />
                {t('recipes.buyAll', 'Comprar ingredientes')}
              </Button>
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-[32px] border border-stone-100 bg-white p-6">
              <h2 className="text-lg font-semibold text-stone-950">{t('recipes.ingredients', 'Ingredientes')}</h2>
              <div className="mt-4 space-y-3">
                {(recipe.ingredients || []).map((ingredient, index) => (
                  <div key={`${ingredient.name}-${index}`} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                    <p className="text-sm font-medium text-stone-950">
                      {[ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ')}
                    </p>
                    {ingredient.product ? (
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(ingredient.product)}
                        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="h-14 w-14 overflow-hidden rounded-xl bg-stone-100">
                          {ingredient.product.images?.[0] ? (
                            <img
                              src={resolveUserImage(ingredient.product.images[0])}
                              alt={ingredient.product.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-stone-950">{ingredient.product.name}</p>
                          <p className="mt-1 text-xs text-stone-500">Abrir producto</p>
                        </div>
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-stone-100 bg-white p-6">
              <h2 className="text-lg font-semibold text-stone-950">{t('recipes.steps', 'Pasos')}</h2>
              <div className="mt-4 space-y-4">
                {steps.map((step, index) => (
                  <div key={`step-${index}`} className="rounded-xl border border-stone-100 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        {step.text ? <p className="text-sm leading-relaxed text-stone-700">{step.text}</p> : null}
                        {step.image_url ? (
                          <div className="mt-3 overflow-hidden rounded-2xl bg-stone-100">
                            <img
                              src={resolveUserImage(step.image_url)}
                              alt={`Paso ${index + 1}`}
                              loading="lazy"
                              className="h-48 w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ContextualProductSuggestions contentType="recipe" contentId={recipeId} />
          </section>
        </div>
      </main>
      <Footer />

      {selectedProduct ? <ProductDetailOverlay product={selectedProduct} store={selectedProduct.store || null} onClose={() => setSelectedProduct(null)} /> : null}
      {showShoppingList ? <RecipeShoppingListOverlay recipeId={recipeId} defaultServings={recipe?.servings || 1} onClose={() => setShowShoppingList(false)} /> : null}
    </div>
  );
}
