import React, { useEffect, useMemo, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Loader2, ShoppingCart, User, Users, X } from 'lucide-react';
import ProductDetailOverlay from '../store/ProductDetailOverlay';
import RecipeShoppingListOverlay from './RecipeShoppingListOverlay';
import ContextualProductSuggestions from '../intelligence/ContextualProductSuggestions';
import apiClient from '../../services/api/client';
import { resolveUserImage } from '../../features/user/queries';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
function normalizeStep(step) {
  if (typeof step === 'string') {
    return {
      text: step,
      image_url: null
    };
  }
  return {
    text: step?.text || step?.description || '',
    image_url: step?.image_url || null
  };
}
export default function RecipeOverlay({
  recipe,
  onClose,
  onNavigate,
  hasPrev = false,
  hasNext = false,
  showNavigation = false
}) {
  const [recipeDetail, setRecipeDetail] = useState(recipe);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
      if (showNavigation && event.key === 'ArrowLeft' && hasPrev) onNavigate?.('prev');
      if (showNavigation && event.key === 'ArrowRight' && hasNext) onNavigate?.('next');
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasNext, hasPrev, onClose, onNavigate, showNavigation]);
  useEffect(() => {
    let active = true;
    setRecipeDetail(recipe);
    const loadRecipe = async () => {
      setLoadingDetail(true);
      try {
        const data = await apiClient.get(`/recipes/${recipe.recipe_id}`);
        if (active) {
          setRecipeDetail(data || recipe);
        }
      } catch {
        if (active) {
          setRecipeDetail(recipe);
        }
      } finally {
        if (active) {
          setLoadingDetail(false);
        }
      }
    };
    loadRecipe();
    return () => {
      active = false;
    };
  }, [recipe]);
  const steps = useMemo(() => (recipeDetail?.steps || []).map(step => normalizeStep(step)).filter(step => step.text || step.image_url), [recipeDetail?.steps]);
  return <>
      <FocusTrap focusTrapOptions={{
      escapeDeactivates: false,
      allowOutsideClick: true,
      returnFocusOnDeactivate: true
    }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
        <button type="button" className="absolute inset-0 bg-black/75 transition-opacity duration-200" onClick={onClose} aria-label="Cerrar receta" />

        {showNavigation && hasPrev ? <button type="button" onClick={() => onNavigate?.('prev')} className="absolute left-3 top-1/2 z-[60] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition-all duration-150 hover:-translate-y-[52%] hover:bg-white" aria-label="Receta anterior">
            <ChevronLeft className="h-5 w-5" />
          </button> : null}

        {showNavigation && hasNext ? <button type="button" onClick={() => onNavigate?.('next')} className="absolute right-3 top-1/2 z-[60] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition-all duration-150 hover:-translate-y-[52%] hover:bg-white" aria-label="Siguiente receta">
            <ChevronRight className="h-5 w-5" />
          </button> : null}

        <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-400">Receta</p>
              <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-stone-950">{recipeDetail?.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors duration-150 hover:bg-stone-50 hover:text-stone-950" aria-label="Cerrar receta">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-5 md:px-6">
            {loadingDetail ? <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-stone-500" />
              </div> : <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl bg-stone-100">
                    <div className="aspect-square">
                      {recipeDetail?.image_url ? <img src={resolveUserImage(recipeDetail.image_url)} alt={recipeDetail.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-stone-400">Sin imagen</div>}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-100 bg-stone-50 p-5">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                        <Clock className="h-4 w-4" />
                        {recipeDetail?.time_minutes || 0} min
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                        <Users className="h-4 w-4" />
                        {recipeDetail?.servings || 1}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1.5 capitalize">{recipeDetail?.difficulty || 'easy'}</span>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-stone-500">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Autor</p>
                        {recipeDetail?.author_id ? <Link to={`/user/${recipeDetail.author_id}`} onClick={onClose} className="truncate text-sm font-medium text-stone-950 hover:underline">
                            {recipeDetail.author_name || 'Usuario'}
                          </Link> : <p className="truncate text-sm font-medium text-stone-950">{recipeDetail?.author_name || 'Usuario'}</p>}
                      </div>
                    </div>

                    {recipeDetail?.description ? <p className="mt-4 text-sm leading-relaxed text-stone-700">{recipeDetail.description}</p> : null}

                    <button type="button" onClick={() => setShowShoppingList(true)} className="mt-5 h-11 w-full rounded-full bg-stone-950 text-white hover:bg-stone-800 flex items-center justify-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Comprar ingredientes
                    </button>
                  </div>
                </div>

                <div className="space-y-5">
                  <section className="rounded-3xl border border-stone-100 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-stone-950">Ingredientes</h3>
                        <p className="mt-1 text-sm text-stone-500">{i18n.t('recipe_overlay.manualOConectadosConProductosDeLa', 'Manual o conectados con productos de la plataforma.')}</p>
                      </div>
                      <span className="text-sm text-stone-400">{recipeDetail?.ingredients?.length || 0}</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {(recipeDetail?.ingredients || []).map((ingredient, index) => <div key={`${ingredient.name}-${index}`} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                          <p className="text-sm font-medium text-stone-900">
                            {[ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ')}
                          </p>
                          {ingredient.product ? <button type="button" onClick={() => setSelectedProduct(ingredient.product)} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                              <div className="h-14 w-14 overflow-hidden rounded-2xl bg-stone-100">
                                {ingredient.product.images?.[0] ? <img src={resolveUserImage(ingredient.product.images[0])} alt={ingredient.product.name} loading="lazy" className="h-full w-full object-cover" /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-stone-950">{ingredient.product.name}</p>
                                <p className="mt-1 text-xs text-stone-500">Abrir producto</p>
                              </div>
                            </button> : null}
                        </div>)}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-stone-100 p-5">
                    <h3 className="text-base font-semibold text-stone-950">Pasos</h3>
                    <div className="mt-4 space-y-4">
                      {steps.map((step, index) => <div key={`step-${index}`} className="rounded-2xl border border-stone-100 bg-white p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-relaxed text-stone-700">{step.text}</p>
                              {step.image_url ? <div className="mt-3 overflow-hidden rounded-2xl bg-stone-100">
                                  <img src={resolveUserImage(step.image_url)} alt={`Paso ${index + 1}`} loading="lazy" className="h-48 w-full object-cover transition-transform duration-200 hover:scale-[1.02]" />
                                </div> : null}
                            </div>
                          </div>
                        </div>)}
                    </div>
                  </section>

                  {recipe?.recipe_id ? <ContextualProductSuggestions contentType="recipe" contentId={recipe.recipe_id} /> : null}
                </div>
              </div>}
          </div>
        </div>
      </div>
      </FocusTrap>

      {selectedProduct ? <ProductDetailOverlay product={selectedProduct} store={selectedProduct.store || null} onClose={() => setSelectedProduct(null)} /> : null}
      {showShoppingList && recipe?.recipe_id ? <RecipeShoppingListOverlay recipeId={recipe.recipe_id} defaultServings={recipeDetail?.servings || 1} onClose={() => setShowShoppingList(false)} /> : null}
    </>;
}