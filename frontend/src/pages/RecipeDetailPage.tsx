import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Clock, Users, ChefHat, ArrowLeft, ShoppingCart,
  Heart, Share2, Star, CheckCircle, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';
import Button from 'components/ui/Button';
import { useAuth } from '../context/AuthContext';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  product_id?: string;
  is_generic: boolean;
  is_optional: boolean;
  product?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    image: string;
    stock: number;
    slug: string;
  };
  alternatives?: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
}

interface Recipe {
  _id: string;
  title: string;
  description: string;
  cover_image: string;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  ingredients: Ingredient[];
  instructions: Array<{
    step: number;
    text: string;
    image_url?: string;
  }>;
  nutrition?: Record<string, any>;
  ratings: { avg: number; count: number };
  author?: {
    name: string;
    username?: string;
    profile_image?: string;
  };
  is_saved?: boolean;
}

export default function RecipeDetailPage() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartResult, setCartResult] = useState<any>(null);

  useEffect(() => {
    if (recipeId) {
      loadRecipe();
    }
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/recipes/${recipeId}`);
      setRecipe(response);
    } catch (err) {
      setError(t('recipe.notFound', 'Receta no encontrada'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllToCart = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = `/login?redirect=/recipes/${recipeId}`;
      return;
    }

    setAddingToCart(true);
    try {
      const result = await apiClient.post(`/recipes/${recipeId}/add-to-cart`, {
        servings_multiplier: 1
      });
      setCartResult(result);
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      if (recipe?.is_saved) {
        await apiClient.delete(`/recipes/${recipeId}/save`);
        setRecipe(prev => prev ? { ...prev, is_saved: false } : null);
      } else {
        await apiClient.post(`/recipes/${recipeId}/save`);
        setRecipe(prev => prev ? { ...prev, is_saved: true } : null);
      }
    } catch (err) {
      console.error('Error saving recipe:', err);
    }
  };

  const getDifficultyLabel = (diff: string) => {
    const labels: Record<string, string> = {
      easy: t('recipe.difficulty.easy', 'Fácil'),
      medium: t('recipe.difficulty.medium', 'Medio'),
      hard: t('recipe.difficulty.hard', 'Difícil')
    };
    return labels[diff] || diff;
  };

  const totalTime = (recipe?.prep_time_minutes || 0) + (recipe?.cook_time_minutes || 0);
  
  // Calcular precio total estimado
  const estimatedTotal = recipe?.ingredients.reduce((sum, ing) => {
    if (ing.product && !ing.is_generic) {
      return sum + (ing.product.price || 0);
    }
    return sum;
  }, 0) || 0;

  const buyableCount = recipe?.ingredients.filter(ing => ing.product_id && !ing.is_generic).length || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-stone-300 mb-4" />
        <h1 className="text-xl font-semibold mb-2">{error}</h1>
        <Link to="/recipes" className="text-stone-600 hover:underline">
          {t('recipe.backToRecipes', 'Volver a recetas')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header Image */}
      <div className="relative h-72 md:h-96">
        <img
          src={recipe.cover_image}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back button */}
        <Link
          to="/recipes"
          className="absolute top-4 left-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Save/Share */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleSave}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
              recipe.is_saved ? 'bg-red-500 text-white' : 'bg-white/90'
            }`}
          >
            <Heart className={`w-5 h-5 ${recipe.is_saved ? 'fill-current' : ''}`} />
          </button>
          <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{recipe.title}</h1>
          {recipe.author && (
            <p className="text-white/80">
              {t('recipe.by', 'Por')} {recipe.author.name}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Meta info */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <Clock className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-medium">{totalTime} min</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <Users className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-medium">{recipe.servings} {t('recipe.servings', 'pers.')}</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <ChefHat className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-medium">{getDifficultyLabel(recipe.difficulty)}</span>
          </div>
          {recipe.ratings.count > 0 && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Star className="w-4 h-4 text-amber-400 fill-current" />
              <span className="text-sm font-medium">
                {recipe.ratings.avg.toFixed(1)} ({recipe.ratings.count})
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {recipe.tags.map((tag, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-sm"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-stone-600 text-lg mb-8">{recipe.description}</p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Ingredients */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('recipe.ingredients', 'Ingredientes')}
            </h2>

            {/* Buy All Button */}
            {buyableCount > 0 && (
              <div className="mb-6 p-4 bg-stone-900 text-white rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-stone-300">
                    {buyableCount} {t('recipe.buyableIngredients', 'ingredientes disponibles')}
                  </span>
                  <span className="font-bold text-lg">
                    ~{estimatedTotal.toFixed(2)}€
                  </span>
                </div>
                <Button
                  onClick={handleAddAllToCart}
                  loading={addingToCart}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {t('recipe.addAllToCart', 'Añadir todos al carrito')}
                </Button>
                
                {cartResult && (
                  <div className="mt-3 p-3 bg-white/10 rounded-lg text-sm">
                    <p className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {cartResult.added_count} {t('recipe.addedToCart', 'añadidos')}
                    </p>
                    {cartResult.failed_count > 0 && (
                      <p className="text-stone-300 mt-1">
                        {cartResult.failed_count} {t('recipe.notAvailable', 'no disponibles')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ingredients List */}
            <div className="space-y-3">
              {recipe.ingredients.map((ingredient, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    ingredient.product_id && !ingredient.is_generic
                      ? 'border-stone-200 bg-white'
                      : 'border-stone-100 bg-stone-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ingredient.name}</span>
                        {ingredient.is_optional && (
                          <span className="text-xs text-stone-400">
                            ({t('recipe.optional', 'opcional')})
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-stone-500">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>

                    {/* Product link if available */}
                    {ingredient.product && !ingredient.is_generic ? (
                      <Link
                        to={`/products/${ingredient.product.slug || ingredient.product.id}`}
                        className="flex items-center gap-2 text-right"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100">
                          {ingredient.product.image ? (
                            <img
                              src={ingredient.product.image}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingCart className="w-full h-full p-3 text-stone-300" />
                          )}
                        </div>
                        <div className="hidden sm:block">
                          <p className="text-xs text-stone-500">{ingredient.product.name}</p>
                          <p className="text-sm font-medium">{ingredient.product.price}€</p>
                        </div>
                      </Link>
                    ) : (
                      <span className="text-xs text-stone-400 px-2 py-1 bg-stone-100 rounded">
                        {t('recipe.generic', 'Básico')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">
              {t('recipe.instructions', 'Preparación')}
            </h2>
            <div className="space-y-6">
              {recipe.instructions.map((step) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-stone-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-stone-700 leading-relaxed">{step.text}</p>
                    {step.image_url && (
                      <img
                        src={step.image_url}
                        alt={`Step ${step.step}`}
                        className="mt-3 rounded-lg w-full"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
