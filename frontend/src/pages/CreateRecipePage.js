import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChefHat, ImagePlus, Loader2, Package, Plus, Search, UploadCloud, X } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { API } from '../utils/api';
import { resolveUserImage } from '../features/user/queries';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeIngredientName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export default function CreateRecipePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const imageInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [manualIngredientInput, setManualIngredientInput] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productLoading, setProductLoading] = useState(false);

  const [recipe, setRecipe] = useState({
    image_url: '',
    title: '',
    description: '',
    difficulty: 'easy',
    time_minutes: 30,
    servings: 4,
    ingredients: [],
    steps: [{ text: '', image_url: '' }],
    tags: [],
  });

  const selectedProducts = useMemo(
    () => recipe.ingredients.filter((ingredient) => ingredient.product_id),
    [recipe.ingredients],
  );

  if (!user) {
    navigate('/login');
    return null;
  }

  const updateRecipe = (field, value) => {
    setRecipe((current) => ({ ...current, [field]: value }));
  };

  const handleMainImage = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error(t('social.imagesOnly', 'Solo se permiten imágenes'));
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error(t('social.maxSize10', 'El tamaño máximo es 10MB'));
      return;
    }

    try {
      const imageUrl = await fileToDataUrl(file);
      updateRecipe('image_url', imageUrl);
    } catch {
      toast.error('No hemos podido cargar la imagen');
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await handleMainImage(file);
    }
  };

  const addManualIngredient = () => {
    const name = normalizeIngredientName(manualIngredientInput);
    if (!name) return;
    if (recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase() === name.toLowerCase())) {
      setManualIngredientInput('');
      return;
    }

    updateRecipe('ingredients', [
      ...recipe.ingredients,
      { name, quantity: '', unit: '', product_id: null, product: null, source: 'manual' },
    ]);
    setManualIngredientInput('');
  };

  const removeIngredient = (index) => {
    updateRecipe(
      'ingredients',
      recipe.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    );
  };

  const updateIngredientField = (index, field, value) => {
    const nextIngredients = [...recipe.ingredients];
    nextIngredients[index] = { ...nextIngredients[index], [field]: value };
    updateRecipe('ingredients', nextIngredients);
  };

  const searchProducts = async (value) => {
    setProductQuery(value);
    if (!value.trim()) {
      setProductResults([]);
      return;
    }

    setProductLoading(true);
    try {
      const response = await axios.get(`${API}/products?search=${encodeURIComponent(value)}&limit=8`);
      const results = response.data?.products || response.data || [];
      setProductResults(Array.isArray(results) ? results : []);
    } catch {
      setProductResults([]);
    } finally {
      setProductLoading(false);
    }
  };

  const addProductIngredient = (product) => {
    if (recipe.ingredients.some((ingredient) => ingredient.product_id === product.product_id)) {
      setProductQuery('');
      setProductResults([]);
      return;
    }

    updateRecipe('ingredients', [
      ...recipe.ingredients,
      {
        name: product.name,
        quantity: '',
        unit: '',
        product_id: product.product_id,
        product,
        source: 'catalog',
      },
    ]);
    setProductQuery('');
    setProductResults([]);
  };

  const updateStep = (index, field, value) => {
    const nextSteps = [...recipe.steps];
    nextSteps[index] = { ...nextSteps[index], [field]: value };
    updateRecipe('steps', nextSteps);
  };

  const addStep = () => {
    updateRecipe('steps', [...recipe.steps, { text: '', image_url: '' }]);
  };

  const removeStep = (index) => {
    updateRecipe(
      'steps',
      recipe.steps.filter((_, stepIndex) => stepIndex !== index),
    );
  };

  const handleStepImage = async (index, file) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error(t('social.imagesOnly', 'Solo se permiten imágenes'));
      return;
    }

    try {
      const imageUrl = await fileToDataUrl(file);
      updateStep(index, 'image_url', imageUrl);
    } catch {
      toast.error('No hemos podido cargar la imagen del paso');
    }
  };

  const handleSubmit = async () => {
    const cleanedIngredients = recipe.ingredients
      .map((ingredient) => ({
        name: normalizeIngredientName(ingredient.name),
        quantity: ingredient.quantity || '',
        unit: ingredient.unit || '',
        product_id: ingredient.product_id || null,
      }))
      .filter((ingredient) => ingredient.name);

    const cleanedSteps = recipe.steps
      .map((step) => ({
        text: step.text?.trim() || '',
        image_url: step.image_url || '',
      }))
      .filter((step) => step.text || step.image_url);

    if (!recipe.title.trim()) {
      toast.error(t('recipes.recipeName', 'Nombre de la receta'));
      return;
    }

    if (!recipe.description.trim()) {
      toast.error('Añade una descripción');
      return;
    }

    if (cleanedIngredients.length === 0) {
      toast.error(t('recipes.ingredients', 'Ingredientes'));
      return;
    }

    if (cleanedSteps.length === 0) {
      toast.error(t('recipes.steps', 'Pasos'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...recipe,
        title: recipe.title.trim(),
        description: recipe.description.trim(),
        ingredients: cleanedIngredients,
        steps: cleanedSteps,
      };

      const response = await axios.post(`${API}/recipes`, payload, { withCredentials: true });
      toast.success(t('recipes.published', 'Receta publicada'));
      navigate(`/recipes/${response.data.recipe_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No hemos podido publicar la receta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <main className="mx-auto max-w-[700px] px-4 py-6">
        <BackButton />

        <div className="mt-8 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">{t('recipes.createRecipe', 'Crear receta')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Organiza la receta como una publicación limpia: imagen principal, historia, ingredientes y pasos.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-stone-100 bg-white p-5 sm:p-6">
            <Label className="text-sm font-medium text-stone-900">1. Imagen principal</Label>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`mt-4 overflow-hidden rounded-2xl border border-dashed bg-stone-50 transition-colors ${
                dragActive ? 'border-stone-500' : 'border-stone-300'
              }`}
            >
              {recipe.image_url ? (
                <div className="relative">
                  <img src={recipe.image_url} alt="Vista previa" className="aspect-[4/3] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => updateRecipe('image_url', '')}
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white"
                    aria-label="Eliminar imagen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-3 px-6 py-16 text-center"
                >
                  <UploadCloud className="h-8 w-8 text-stone-400" />
                  <div>
                    <p className="text-sm font-medium text-stone-900">Arrastra una imagen o súbela desde tu equipo</p>
                    <p className="mt-1 text-sm text-stone-500">Formato cuadrado o vertical recomendado.</p>
                  </div>
                </button>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleMainImage(event.target.files?.[0])}
            />
          </section>

          <section className="rounded-[28px] border border-stone-100 bg-white p-5 sm:p-6">
            <Label className="text-sm font-medium text-stone-900">2. {t('recipes.recipeName', 'Título')}</Label>
            <Input
              value={recipe.title}
              onChange={(event) => updateRecipe('title', event.target.value)}
              placeholder={t('recipes.recipeName', 'Título de la receta')}
              className="mt-4 h-12 rounded-full border-stone-200"
              data-testid="recipe-title-input"
            />
          </section>

          <section className="rounded-[28px] border border-stone-100 bg-white p-5 sm:p-6">
            <Label className="text-sm font-medium text-stone-900">3. Descripción</Label>
            <textarea
              value={recipe.description}
              onChange={(event) => updateRecipe('description', event.target.value)}
              placeholder="Cuenta qué hace especial esta receta."
              className="mt-4 min-h-[140px] w-full resize-none rounded-[24px] border border-stone-200 px-4 py-4 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs uppercase tracking-[0.22em] text-stone-500">Dificultad</Label>
                <select
                  value={recipe.difficulty}
                  onChange={(event) => updateRecipe('difficulty', event.target.value)}
                  className="mt-2 h-11 w-full rounded-full border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none"
                  data-testid="recipe-difficulty"
                >
                  <option value="easy">{t('recipes.easy', 'Fácil')}</option>
                  <option value="medium">{t('recipes.medium', 'Media')}</option>
                  <option value="hard">{t('recipes.hard', 'Difícil')}</option>
                </select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.22em] text-stone-500">Tiempo</Label>
                <Input
                  type="number"
                  value={recipe.time_minutes}
                  onChange={(event) => updateRecipe('time_minutes', Number(event.target.value) || 0)}
                  className="mt-2 h-11 rounded-full border-stone-200"
                  data-testid="recipe-time"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.22em] text-stone-500">Raciones</Label>
                <Input
                  type="number"
                  value={recipe.servings}
                  onChange={(event) => updateRecipe('servings', Number(event.target.value) || 1)}
                  className="mt-2 h-11 rounded-full border-stone-200"
                  data-testid="recipe-servings"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-stone-100 bg-white p-5 sm:p-6">
            <Label className="text-sm font-medium text-stone-900">4. Ingredientes</Label>
            <div className="mt-4 flex gap-2">
              <Input
                value={manualIngredientInput}
                onChange={(event) => setManualIngredientInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addManualIngredient();
                  }
                }}
                placeholder="Añadir ingrediente manual"
                className="h-11 rounded-full border-stone-200 bg-white"
              />
              <Button type="button" variant="outline" className="h-11 rounded-full" onClick={addManualIngredient}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {recipe.ingredients.map((ingredient, index) => (
                <div key={`${ingredient.name}-${index}`} className="rounded-full border border-stone-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-900">{ingredient.name}</span>
                    <button type="button" onClick={() => removeIngredient(index)} className="text-stone-400 hover:text-stone-800">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {recipe.ingredients.length > 0 ? (
              <div className="mt-5 space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={`details-${ingredient.name}-${index}`} className="grid gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-4 sm:grid-cols-[1.6fr_0.7fr_0.7fr]">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{ingredient.name}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {ingredient.product_id ? 'Conectado con producto de Hispaloshop' : 'Ingrediente personalizado'}
                      </p>
                    </div>
                    <Input
                      value={ingredient.quantity}
                      onChange={(event) => updateIngredientField(index, 'quantity', event.target.value)}
                      placeholder="Cantidad"
                      className="h-10 rounded-full border-stone-200 bg-white"
                    />
                    <Input
                      value={ingredient.unit}
                      onChange={(event) => updateIngredientField(index, 'unit', event.target.value)}
                      placeholder="Unidad"
                      className="h-10 rounded-full border-stone-200 bg-white"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-stone-100 bg-white p-5 sm:p-6">
            <Label className="text-sm font-medium text-stone-900">5. Pasos</Label>
            <div className="mt-4 space-y-4">
              {recipe.steps.map((step, index) => (
                <div key={`step-${index}`} className="rounded-xl border border-stone-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <textarea
                        value={step.text}
                        onChange={(event) => updateStep(index, 'text', event.target.value)}
                        placeholder={t('recipes.stepPlaceholder', 'Describe este paso')}
                        className="min-h-[110px] w-full resize-none rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-400"
                      />
                      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4">
                        {step.image_url ? (
                          <div className="relative overflow-hidden rounded-2xl">
                            <img src={step.image_url} alt={`Paso ${index + 1}`} className="h-44 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => updateStep(index, 'image_url', '')}
                              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600">
                            <ImagePlus className="h-4 w-4" />
                            Añadir imagen opcional del paso
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => handleStepImage(index, event.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    {recipe.steps.length > 1 ? (
                      <button type="button" onClick={() => removeStep(index)} className="text-stone-400 hover:text-stone-800">
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addStep} className="mt-4 rounded-full border-stone-200">
              <Plus className="h-4 w-4" />
              {t('recipes.addStep', 'Añadir paso')}
            </Button>
          </section>

          <section className="rounded-[28px] border border-stone-100 bg-white p-5 sm:p-6">
            <Label className="text-sm font-medium text-stone-900">6. Ingredientes desde la plataforma</Label>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={productQuery}
                onChange={(event) => searchProducts(event.target.value)}
                placeholder="Buscar productos de Hispaloshop"
                className="h-11 rounded-full border-stone-200 bg-white pl-11"
              />
            </div>

            {selectedProducts.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedProducts.map((ingredient, index) => (
                  <div key={`${ingredient.product_id}-${index}`} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                    {ingredient.name}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {productLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-stone-500" />
                </div>
              ) : (
                productResults.map((product) => (
                  <button
                    key={product.product_id}
                    type="button"
                    onClick={() => addProductIngredient(product)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm"
                    data-testid={`product-link-${product.product_id}`}
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-white">
                      {product.images?.[0] ? (
                        <img
                          src={resolveUserImage(product.images[0])}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-stone-300">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-950">{product.name}</p>
                      <p className="mt-1 text-xs text-stone-500">Usar como ingrediente conectado</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 w-full rounded-full bg-stone-950 text-white hover:bg-stone-800"
            data-testid="publish-recipe-btn"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChefHat className="h-4 w-4" />}
            {t('recipes.publish', 'Publicar receta')}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
