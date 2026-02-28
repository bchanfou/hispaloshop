import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Button } from '../components/ui/button';
import { Clock, Users, ShoppingCart, Check, Loader2, ChefHat } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../utils/api';
import { useTranslation } from 'react-i18next';

export default function RecipeDetailPage() {
  const { recipeId } = useParams();
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    axios.get(`${API}/recipes/${recipeId}`)
      .then(r => setRecipe(r.data))
      .catch(() => toast.error(t('recipes.notFound', 'Recipe not found')))
      .finally(() => setLoading(false));
  }, [recipeId, t]);

  const handleAddAllToCart = async () => {
    setAdding(true);
    try {
      const res = await axios.post(`${API}/recipes/${recipeId}/shopping-list`, {}, { withCredentials: true });
      toast.success(t('recipes.addedToCart', { count: res.data.added, total: res.data.total }));
    } catch (err) {
      toast.error(err.response?.data?.detail || t('errors.loginRequired', 'Login required'));
    } finally { setAdding(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF7F2]"><Header /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div></div>;
  if (!recipe) return null;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
        <BackButton />
        
        {recipe.image_url && (
          <div className="aspect-video rounded-2xl overflow-hidden mb-6">
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
          </div>
        )}

        <h1 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-2">{recipe.title}</h1>
        
        <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {recipe.time_minutes} min</span>
          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {recipe.servings} {t('recipes.servings', 'servings')}</span>
          <span className="capitalize bg-stone-100 px-2 py-0.5 rounded-full text-xs">{recipe.difficulty}</span>
        </div>

        {recipe.tags?.length > 0 && (
          <div className="flex gap-1 mb-6 flex-wrap">
            {recipe.tags.map(tag => <span key={tag} className="text-xs bg-[#2D5A27]/10 text-[#2D5A27] px-2.5 py-1 rounded-full">#{tag}</span>)}
          </div>
        )}

        {/* Ingredients with product links */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">{t('recipes.ingredients', 'Ingredients')}</h2>
            <Button onClick={handleAddAllToCart} disabled={adding} size="sm" className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4 mr-1" /> {t('recipes.buyAll', 'Buy all')}</>}
            </Button>
          </div>
          <div className="space-y-3">
            {recipe.ingredients?.map((ing, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-stone-200 flex items-center justify-center shrink-0">
                  {ing.product ? <Check className="w-3 h-3 text-[#2D5A27]" /> : <span className="w-2 h-2 rounded-full bg-stone-300" />}
                </div>
                <div className="flex-1">
                  <span className="text-sm text-[#1C1C1C]">{ing.quantity} {ing.unit} {ing.name}</span>
                  {ing.product && (
                    <Link to={`/products/${ing.product.product_id}`} className="block text-xs text-[#2D5A27] hover:underline mt-0.5">
                      {ing.product.name} — ${ing.product.price?.toFixed(2)}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h2 className="font-heading text-lg font-semibold mb-4">{t('recipes.steps', 'Steps')}</h2>
          <div className="space-y-4">
            {recipe.steps?.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#2D5A27] text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                <p className="text-sm text-[#444] pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
