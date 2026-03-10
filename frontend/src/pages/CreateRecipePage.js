import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Plus, X, ChefHat, Clock, Users, Loader2, GripVertical, Search, Package } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../utils/api';

function IngredientRow({ ingredient, index, onChange, onRemove, onLinkProduct }) {
  const { t } = useTranslation();
  return (
    <div className="bg-stone-50 rounded-xl p-3 space-y-2" data-testid={`ingredient-${index}`}>
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-stone-300 shrink-0 cursor-grab hidden sm:block" />
        <Input value={ingredient.name} onChange={(e) => onChange(index, 'name', e.target.value)} placeholder={t('recipes.ingredientName')} className="flex-1 h-9 text-sm rounded-lg" />
        <button onClick={() => onLinkProduct(index)} className={`p-1.5 rounded-lg transition-colors shrink-0 ${ingredient.product_id ? 'bg-accent/10 text-accent' : 'bg-stone-100 text-stone-400 hover:text-accent'}`} title={t('recipes.linkProduct')}>
          <Package className="w-4 h-4" />
        </button>
        <button onClick={() => onRemove(index)} className="p-1.5 text-stone-400 hover:text-red-500 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2 pl-0 sm:pl-6">
        <Input value={ingredient.quantity} onChange={(e) => onChange(index, 'quantity', e.target.value)} placeholder={t('recipes.quantity')} className="w-1/2 h-9 text-sm rounded-lg" />
        <Input value={ingredient.unit} onChange={(e) => onChange(index, 'unit', e.target.value)} placeholder={t('recipes.unit')} className="w-1/2 h-9 text-sm rounded-lg" />
      </div>
    </div>
  );
}

function ProductSearchModal({ onSelect, onClose }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/products?search=${query}&limit=10`);
        setResults(res.data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
        <div className="p-4 border-b border-stone-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-stone-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('recipes.linkProduct')} className="border-0 focus-visible:ring-0 h-9" autoFocus />
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}
          {results.map(p => (
            <button key={p.product_id} onClick={() => onSelect(p)} className="w-full text-left flex items-center gap-3 p-3 hover:bg-stone-50 rounded-xl transition-colors" data-testid={`product-link-${p.product_id}`}>
              <div className="w-10 h-10 bg-stone-100 rounded-lg overflow-hidden shrink-0">
                {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-stone-300 m-auto mt-2" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{p.name}</p>
                <p className="text-xs text-stone-500">{p.currency || 'EUR'} {p.price}</p>
              </div>
            </button>
          ))}
          {!loading && query && results.length === 0 && <p className="text-center text-sm text-stone-400 py-4">{t('social.noResults')}</p>}
        </div>
      </div>
    </div>
  );
}

export default function CreateRecipePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [linkingIndex, setLinkingIndex] = useState(null);

  const [recipe, setRecipe] = useState({
    title: '',
    difficulty: 'easy',
    time_minutes: 30,
    servings: 4,
    ingredients: [{ name: '', quantity: '', unit: '', product_id: null }],
    steps: [''],
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  const updateIngredient = (i, field, val) => {
    const updated = [...recipe.ingredients];
    updated[i] = { ...updated[i], [field]: val };
    setRecipe({ ...recipe, ingredients: updated });
  };

  const removeIngredient = (i) => {
    setRecipe({ ...recipe, ingredients: recipe.ingredients.filter((_, idx) => idx !== i) });
  };

  const addIngredient = () => {
    setRecipe({ ...recipe, ingredients: [...recipe.ingredients, { name: '', quantity: '', unit: '', product_id: null }] });
  };

  const updateStep = (i, val) => {
    const updated = [...recipe.steps];
    updated[i] = val;
    setRecipe({ ...recipe, steps: updated });
  };

  const removeStep = (i) => {
    setRecipe({ ...recipe, steps: recipe.steps.filter((_, idx) => idx !== i) });
  };

  const addStep = () => {
    setRecipe({ ...recipe, steps: [...recipe.steps, ''] });
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !recipe.tags.includes(tag)) {
      setRecipe({ ...recipe, tags: [...recipe.tags, tag] });
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setRecipe({ ...recipe, tags: recipe.tags.filter(t => t !== tag) });
  };

  const handleLinkProduct = (product) => {
    if (linkingIndex !== null) {
      updateIngredient(linkingIndex, 'product_id', product.product_id);
      updateIngredient(linkingIndex, 'name', recipe.ingredients[linkingIndex].name || product.name);
      setLinkingIndex(null);
    }
  };

  const handleSubmit = async () => {
    if (!recipe.title.trim()) { toast.error(t('recipes.recipeName')); return; }
    if (recipe.ingredients.filter(i => i.name.trim()).length === 0) { toast.error(t('recipes.ingredients')); return; }
    if (recipe.steps.filter(s => s.trim()).length === 0) { toast.error(t('recipes.steps')); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...recipe,
        ingredients: recipe.ingredients.filter(i => i.name.trim()),
        steps: recipe.steps.filter(s => s.trim()),
      };
      const res = await axios.post(`${API}/recipes`, payload, { withCredentials: true });
      toast.success(t('recipes.published'));
      navigate(`/recipes/${res.data.recipe_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-accent" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-primary">{t('recipes.createRecipe')}</h1>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('recipes.recipeName')} *</Label>
              <Input value={recipe.title} onChange={(e) => setRecipe({ ...recipe, title: e.target.value })} placeholder={t('recipes.recipeName')} className="rounded-xl h-11" data-testid="recipe-title-input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('recipes.difficulty')}</Label>
                <select value={recipe.difficulty} onChange={(e) => setRecipe({ ...recipe, difficulty: e.target.value })} className="w-full h-11 px-3 border border-stone-200 rounded-xl text-sm bg-white" data-testid="recipe-difficulty">
                  <option value="easy">{t('recipes.easy')}</option>
                  <option value="medium">{t('recipes.medium')}</option>
                  <option value="hard">{t('recipes.hard')}</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3" />{t('recipes.time')}</Label>
                <Input type="number" value={recipe.time_minutes} onChange={(e) => setRecipe({ ...recipe, time_minutes: parseInt(e.target.value) || 0 })} className="rounded-xl h-11" data-testid="recipe-time" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Users className="w-3 h-3" />{t('recipes.servings')}</Label>
                <Input type="number" value={recipe.servings} onChange={(e) => setRecipe({ ...recipe, servings: parseInt(e.target.value) || 1 })} className="rounded-xl h-11" data-testid="recipe-servings" />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 block">{t('recipes.ingredients')} *</Label>
            <div className="space-y-2 mb-3">
              {recipe.ingredients.map((ing, i) => (
                <IngredientRow key={i} ingredient={ing} index={i} onChange={updateIngredient} onRemove={removeIngredient} onLinkProduct={(idx) => setLinkingIndex(idx)} />
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addIngredient} className="rounded-xl gap-1.5 text-xs border-dashed" data-testid="add-ingredient-btn">
              <Plus className="w-3.5 h-3.5" /> {t('recipes.addIngredient')}
            </Button>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 block">{t('recipes.steps')} *</Label>
            <div className="space-y-2 mb-3">
              {recipe.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2" data-testid={`step-${i}`}>
                  <span className="w-7 h-7 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">{i + 1}</span>
                  <textarea value={step} onChange={(e) => updateStep(i, e.target.value)} placeholder={t('recipes.stepPlaceholder')} className="flex-1 text-sm border border-stone-200 rounded-xl p-3 resize-none min-h-[60px] focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" />
                  <button onClick={() => removeStep(i)} className="p-1.5 text-stone-400 hover:text-red-500 mt-1 shrink-0"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addStep} className="rounded-xl gap-1.5 text-xs border-dashed" data-testid="add-step-btn">
              <Plus className="w-3.5 h-3.5" /> {t('recipes.addStep')}
            </Button>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 block">{t('recipes.tags')}</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {recipe.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 text-xs px-3 py-1.5 rounded-full">
                  #{tag} <button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder={t('recipes.addTag')} className="rounded-xl h-9 text-sm" />
              <Button variant="outline" size="sm" onClick={addTag} className="rounded-xl shrink-0"><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-xl text-base font-semibold gap-2" data-testid="publish-recipe-btn">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChefHat className="w-5 h-5" />}
            {t('recipes.publish')}
          </Button>
        </div>
      </div>

      {linkingIndex !== null && (
        <ProductSearchModal onSelect={handleLinkProduct} onClose={() => setLinkingIndex(null)} />
      )}
      <Footer />
    </div>
  );
}
