// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ChevronDown, ChevronUp, Clock, ImagePlus, Loader2, Plus, Users, X, Salad, Flame, IceCreamCone, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import apiClient from '../services/api/client';
import { resolveUserImage } from '../features/user/queries';
import ProductSearchModal from '../components/create/ProductSearchModal';
import HispalAIPanel from '../components/creator/HispalAIPanel';

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

const DIFFICULTY_MAP = {
  easy: { label: 'Fácil', tw: 'text-stone-500' },
  medium: { label: 'Media', tw: 'text-stone-700' },
  hard: { label: 'Difícil', tw: 'text-stone-950' },
};
const DIFFICULTY_KEYS = ['easy', 'medium', 'hard'];

const RECIPE_TEMPLATES = [
  {
    id: 'salad',
    name: 'Ensalada rápida',
    icon: Salad,
    time: 10,
    difficulty: 'easy',
    titlePrefix: 'Ensalada de ',
    ingredients: [
      { name: 'Lechuga', quantity: '1', unit: 'ud' },
      { name: 'Tomate', quantity: '2', unit: 'ud' },
      { name: 'Aceite de oliva', quantity: '2', unit: 'cda' },
    ],
  },
  {
    id: 'stew',
    name: 'Guiso tradicional',
    icon: Flame,
    time: 60,
    difficulty: 'medium',
    titlePrefix: 'Guiso de ',
    ingredients: [
      { name: 'Patatas', quantity: '3', unit: 'ud' },
      { name: 'Cebolla', quantity: '1', unit: 'ud' },
      { name: 'Caldo de verduras', quantity: '500', unit: 'ml' },
    ],
  },
  {
    id: 'dessert',
    name: 'Postre fácil',
    icon: IceCreamCone,
    time: 30,
    difficulty: 'easy',
    titlePrefix: 'Postre de ',
    ingredients: [
      { name: 'Leche', quantity: '500', unit: 'ml' },
      { name: 'Azúcar', quantity: '100', unit: 'g' },
      { name: 'Huevos', quantity: '3', unit: 'ud' },
    ],
  },
  {
    id: 'tapa',
    name: 'Tapa andaluza',
    icon: UtensilsCrossed,
    time: 20,
    difficulty: 'easy',
    titlePrefix: 'Tapa de ',
    ingredients: [
      { name: 'Pan de pueblo', quantity: '4', unit: 'rebanadas' },
      { name: 'Tomate rallado', quantity: '2', unit: 'ud' },
      { name: 'Aceite de oliva virgen extra', quantity: '3', unit: 'cda' },
    ],
  },
];

const KNOWN_ALLERGENS = {
  gluten: ['harina', 'trigo', 'pan', 'pasta', 'cebada', 'centeno', 'avena', 'sémola', 'cuscús', 'espelta'],
  lactosa: ['leche', 'queso', 'nata', 'mantequilla', 'yogur', 'crema', 'requesón'],
  'frutos secos': ['almendra', 'nuez', 'avellana', 'pistacho', 'anacardo', 'cacahuete', 'maní'],
  huevo: ['huevo', 'huevos'],
  soja: ['soja', 'tofu', 'edamame', 'salsa de soja'],
  marisco: ['gamba', 'langostino', 'cangrejo', 'mejillón', 'almeja', 'calamar', 'pulpo', 'sepia'],
  pescado: ['bacalao', 'atún', 'salmón', 'merluza', 'anchoa', 'sardina', 'boquerón'],
  apio: ['apio'],
  mostaza: ['mostaza'],
  sésamo: ['sésamo', 'tahini'],
  sulfitos: ['vino', 'vinagre'],
};

function detectAllergens(ingredients) {
  const detected = new Set();
  for (const ingredient of ingredients) {
    const name = ingredient.name.toLowerCase();
    // Check from product allergen data first
    if (ingredient.product?.allergens?.length) {
      for (const a of ingredient.product.allergens) detected.add(a);
    }
    // Fallback: keyword matching
    for (const [allergen, keywords] of Object.entries(KNOWN_ALLERGENS)) {
      if (keywords.some(kw => name.includes(kw))) {
        detected.add(allergen.charAt(0).toUpperCase() + allergen.slice(1));
      }
    }
  }
  return Array.from(detected);
}

export default function CreateRecipePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const imageInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [manualIngredientInput, setManualIngredientInput] = useState('');
  const [ingredientSuggestions, setIngredientSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

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

  const detectedAllergens = useMemo(
    () => detectAllergens(recipe.ingredients),
    [recipe.ingredients],
  );

  const isFormEmpty = !recipe.title.trim();

  const applyTemplate = (template) => {
    setRecipe((prev) => ({
      ...prev,
      title: template.titlePrefix,
      difficulty: template.difficulty,
      time_minutes: template.time,
      ingredients: template.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        product_id: null,
        product: null,
        source: 'template',
      })),
    }));
  };

  useEffect(() => {
    if (!manualIngredientInput.trim()) {
      setIngredientSuggestions([]);
      return undefined;
    }
    const timeoutId = window.setTimeout(async () => {
      setSuggestionLoading(true);
      try {
        const data = await apiClient.get(`/recipes/ingredient-suggestions?q=${encodeURIComponent(manualIngredientInput.trim())}&limit=3`);
        setIngredientSuggestions(data?.items || []);
      } catch {
        setIngredientSuggestions([]);
      } finally {
        setSuggestionLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [manualIngredientInput]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const updateRecipe = (field, value) => setRecipe((c) => ({ ...c, [field]: value }));

  const handleMainImage = async (file) => {
    if (!file?.type?.startsWith('image/')) { toast.error(t('social.imagesOnly', 'Solo se permiten imagenes')); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t('social.maxSize10', 'El tamano maximo es 10MB')); return; }
    try { updateRecipe('image_url', await fileToDataUrl(file)); } catch { toast.error('No hemos podido cargar la imagen'); }
  };

  const handleDrop = async (e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) await handleMainImage(f); };

  const addManualIngredient = () => {
    const name = normalizeIngredientName(manualIngredientInput);
    if (!name) return;
    if (recipe.ingredients.some((i) => i.name.toLowerCase() === name.toLowerCase())) { setManualIngredientInput(''); return; }
    updateRecipe('ingredients', [...recipe.ingredients, { name, quantity: '', unit: '', product_id: null, product: null, source: 'manual' }]);
    setManualIngredientInput('');
    setIngredientSuggestions([]);
  };

  const removeIngredient = (index) => updateRecipe('ingredients', recipe.ingredients.filter((_, i) => i !== index));
  const updateIngredientField = (index, field, value) => { const n = [...recipe.ingredients]; n[index] = { ...n[index], [field]: value }; updateRecipe('ingredients', n); };

  const addProductIngredient = (product) => {
    if (recipe.ingredients.some((i) => i.product_id === product.product_id)) return;
    updateRecipe('ingredients', [...recipe.ingredients, { name: product.name, quantity: '', unit: '', product_id: product.product_id, product, source: 'catalog' }]);
  };

  const updateStep = (index, field, value) => { const n = [...recipe.steps]; n[index] = { ...n[index], [field]: value }; updateRecipe('steps', n); };
  const addStep = () => updateRecipe('steps', [...recipe.steps, { text: '', image_url: '' }]);
  const removeStep = (index) => updateRecipe('steps', recipe.steps.filter((_, i) => i !== index));

  const handleStepImage = async (index, file) => {
    if (!file?.type?.startsWith('image/')) { toast.error(t('social.imagesOnly', 'Solo se permiten imagenes')); return; }
    try { updateStep(index, 'image_url', await fileToDataUrl(file)); } catch { toast.error('No hemos podido cargar la imagen del paso'); }
  };

  const cycleDifficulty = () => { const idx = DIFFICULTY_KEYS.indexOf(recipe.difficulty); updateRecipe('difficulty', DIFFICULTY_KEYS[(idx + 1) % DIFFICULTY_KEYS.length]); };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    const ci = recipe.ingredients.map((i) => ({ name: normalizeIngredientName(i.name), quantity: i.quantity || '', unit: i.unit || '', product_id: i.product_id || null })).filter((i) => i.name);
    const cs = recipe.steps.map((s) => ({ text: s.text?.trim() || '', image_url: s.image_url || '' })).filter((s) => s.text || s.image_url);
    if (!recipe.title.trim()) { toast.error(t('recipes.missingTitle', 'Añade un título')); return; }
    if (ci.length === 0) { toast.error(t('recipes.missingIngredients', 'Añade al menos un ingrediente')); return; }
    if (cs.length === 0 || !recipe.steps[0]?.text?.trim()) { toast.error(t('recipes.missingSteps', 'Añade al menos un paso')); return; }
    setSubmitting(true);
    try {
      const data = await apiClient.post('/recipes', { ...recipe, title: recipe.title.trim(), description: recipe.description.trim(), ingredients: ci, steps: cs });
      toast.success(t('recipes.published', 'Receta publicada'));
      navigate(`/recipes/${data.recipe_id}`);
    } catch (error) { toast.error(error.message || 'No hemos podido publicar la receta'); }
    finally { setSubmitting(false); }
  };

  const diff = DIFFICULTY_MAP[recipe.difficulty];

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans">
      {/* TopBar */}
      <div className="sticky top-0 z-40 flex h-[52px] items-center justify-between border-b border-stone-200 bg-white px-4">
        <button type="button" onClick={() => navigate(-1)} aria-label="Volver" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-950">
          <ArrowLeft size={20} />
        </button>
        <span className="text-[15px] font-semibold text-stone-950">Nueva receta</span>
        <button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-full bg-stone-950 px-4 py-1.5 text-xs font-semibold text-white border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors">
          {submitting ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      <div className="mx-auto max-w-[480px] px-4 py-4 pb-8">
        {/* Cover photo */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`relative h-[130px] overflow-hidden rounded-2xl ${dragActive ? 'border-2 border-dashed border-stone-400' : ''}`}
          style={{ background: recipe.image_url ? undefined : 'linear-gradient(135deg, #f5f5f4, #fafaf9)' }}
        >
          {recipe.image_url ? (
            <>
              <img src={recipe.image_url} alt="Portada" className="h-full w-full object-cover" />
              <button type="button" onClick={() => updateRecipe('image_url', '')} aria-label="Eliminar imagen" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white border-none cursor-pointer">
                <X size={14} />
              </button>
            </>
          ) : (
            <button type="button" onClick={() => imageInputRef.current?.click()} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl bg-white/90 px-4 py-2.5 text-xs font-medium text-stone-950 border-none cursor-pointer">
              <Camera size={15} /> Foto de portada
            </button>
          )}
        </div>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMainImage(e.target.files?.[0])} />

        {/* Templates — only when form is empty */}
        {isFormEmpty && (
          <div className="mt-4 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-2.5">Plantillas</p>
            <div className="grid grid-cols-2 gap-2">
              {RECIPE_TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="rounded-2xl bg-stone-50 p-3 text-left cursor-pointer border-none hover:bg-stone-100 transition-colors"
                  >
                    <Icon size={18} className="text-stone-400 mb-1.5" />
                    <p className="text-[13px] font-semibold text-stone-950 m-0">{tpl.name}</p>
                    <p className="text-[11px] text-stone-500 m-0 mt-0.5">
                      {tpl.time} min · {DIFFICULTY_MAP[tpl.difficulty].label}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-stone-400 text-center mt-2.5">O empieza desde cero</p>
          </div>
        )}

        {/* Recipe name */}
        <input
          value={recipe.title}
          onChange={(e) => updateRecipe('title', e.target.value)}
          placeholder="Nombre de la receta"
          aria-label="Nombre de la receta"
          data-testid="recipe-title-input"
          className={`w-full bg-transparent py-4 pb-3 text-base font-medium text-stone-950 outline-none placeholder:text-stone-400 ${submitAttempted && !recipe.title.trim() ? 'border-b-2 border-red-500' : 'border-none'}`}
        />

        {/* Metadata grid */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {/* Time */}
          <div className="rounded-2xl border border-stone-200 bg-white p-2.5 text-center">
            <Clock size={14} className="mx-auto mb-1 text-stone-400" />
            <div className="flex items-baseline justify-center gap-0.5">
              <input type="number" value={recipe.time_minutes} onChange={(e) => updateRecipe('time_minutes', Number(e.target.value) || 0)} data-testid="recipe-time" aria-label="Tiempo en minutos" className="w-9 border-none bg-transparent text-center text-[15px] font-semibold text-stone-950 outline-none" />
              <span className="text-[10px] text-stone-400">min</span>
            </div>
          </div>

          {/* Difficulty */}
          <button type="button" onClick={cycleDifficulty} data-testid="recipe-difficulty" aria-label={`Dificultad: ${diff.label}`} className="rounded-2xl border border-stone-200 bg-white p-2.5 text-center cursor-pointer">
            <div className="text-[10px] text-stone-400 mb-1">Dificultad</div>
            <div className={`text-[13px] font-semibold ${diff.tw}`}>{diff.label}</div>
          </button>

          {/* Servings */}
          <div className="rounded-2xl border border-stone-200 bg-white p-2.5 text-center">
            <Users size={14} className="mx-auto mb-1 text-stone-400" />
            <div className="flex items-baseline justify-center gap-0.5">
              <input type="number" value={recipe.servings} onChange={(e) => updateRecipe('servings', Number(e.target.value) || 1)} data-testid="recipe-servings" aria-label="Número de raciones" className="w-7 border-none bg-transparent text-center text-[15px] font-semibold text-stone-950 outline-none" />
              <span className="text-[10px] text-stone-400">personas</span>
            </div>
          </div>
        </div>

        {/* INGREDIENTES */}
        <div className="mb-6">
          <p className={`mb-2.5 text-[10px] font-semibold uppercase tracking-widest ${submitAttempted && recipe.ingredients.length === 0 ? 'text-red-500' : 'text-stone-500'}`}>Ingredientes {submitAttempted && recipe.ingredients.length === 0 && <span className="normal-case tracking-normal font-normal text-red-500">— requerido</span>}</p>

          {recipe.ingredients.map((ingredient, index) => (
            <div key={`${ingredient.name}-${index}`} className={`flex items-center gap-2.5 py-2 ${index < recipe.ingredients.length - 1 ? 'border-b border-stone-200' : ''}`}>
              {ingredient.product_id && (ingredient.product?.images?.[0] || ingredient.product?.image) && (
                <img src={resolveUserImage(ingredient.product.images?.[0] || ingredient.product.image)} alt={ingredient.name} loading="lazy" className="h-7 w-7 shrink-0 rounded-2xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {ingredient.quantity && <span className="text-[10px] font-medium text-stone-950">{ingredient.quantity}{ingredient.unit ? ` ${ingredient.unit}` : ''}</span>}
                  <span className="text-[10px] font-medium text-stone-950">{ingredient.name}</span>
                </div>
                {ingredient.product_id && <p className="mt-0.5 text-[9px] text-stone-400">{ingredient.product?.seller_name || 'Tienda'} &middot; etiquetado &#10003;</p>}
              </div>
              <input value={ingredient.quantity} onChange={(e) => updateIngredientField(index, 'quantity', e.target.value)} placeholder="Cant." aria-label={`Cantidad de ${ingredient.name}`} className="w-[42px] rounded-md border border-stone-200 bg-white px-1.5 py-1 text-[10px] text-stone-950 outline-none" />
              <input value={ingredient.unit} onChange={(e) => updateIngredientField(index, 'unit', e.target.value)} placeholder="Ud." aria-label={`Unidad de ${ingredient.name}`} className="w-[42px] rounded-md border border-stone-200 bg-white px-1.5 py-1 text-[10px] text-stone-950 outline-none" />
              <button type="button" onClick={() => removeIngredient(index)} aria-label={`Eliminar ${ingredient.name}`} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-400 hover:text-stone-700">
                <X size={13} />
              </button>
            </div>
          ))}

          {suggestionLoading && (
            <div className="flex items-center gap-1.5 py-2 text-[11px] text-stone-400">
              <Loader2 size={13} className="animate-spin" /> Buscando coincidencias
            </div>
          )}

          {!suggestionLoading && ingredientSuggestions.length > 0 && (
            <div className="my-1.5">
              {ingredientSuggestions.map((product) => (
                <button key={product.product_id} type="button" onClick={() => addProductIngredient({ ...product, images: product.image ? [product.image] : [] })} className="mb-1 flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-2.5 text-left cursor-pointer hover:bg-stone-100 transition-colors">
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md bg-white">
                    {product.image ? <img src={resolveUserImage(product.image)} alt={product.name} loading="lazy" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-stone-950">{product.name}</p>
                    <p className="text-[9px] text-stone-400">Sugerencia para &ldquo;{manualIngredientInput.trim()}&rdquo;</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Add ingredient input */}
          <div className="mt-2 flex gap-1.5">
            <input
              value={manualIngredientInput}
              onChange={(e) => setManualIngredientInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualIngredient(); } }}
              placeholder="Añadir ingrediente"
              aria-label="Nuevo ingrediente"
              className="flex-1 border-b border-stone-200 bg-transparent py-1.5 text-[11px] text-stone-950 outline-none placeholder:text-stone-400"
            />
            <button type="button" onClick={addManualIngredient} className="flex items-center gap-0.5 whitespace-nowrap border-none bg-transparent py-1.5 text-[11px] font-medium text-stone-500 cursor-pointer hover:text-stone-700">
              <Plus size={13} /> Añadir
            </button>
          </div>

          <button type="button" onClick={() => setProductModalOpen(true)} className="mt-2 flex items-center gap-1 border-none bg-transparent text-[11px] font-medium text-stone-500 cursor-pointer hover:text-stone-700 p-0">
            <Plus size={13} /> Etiquetar producto
          </button>

          {/* Allergen auto-detection */}
          {detectedAllergens.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3">
              <AlertTriangle size={14} className="text-amber-700 shrink-0 mt-px" />
              <p className="text-xs text-amber-700 m-0">
                Contiene: {detectedAllergens.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* PASOS */}
        <div className="mb-6">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500">Pasos</p>

          {recipe.steps.map((step, index) => (
            <div key={`step-${index}`} className="relative mb-3 flex gap-2.5">
              <div className="flex shrink-0 flex-col items-center">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-stone-950 text-[11px] font-semibold text-white">{index + 1}</div>
                {index < recipe.steps.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-stone-200" style={{ minHeight: 20 }} />}
              </div>
              <div className="min-w-0 flex-1">
                <textarea
                  value={step.text}
                  onChange={(e) => updateStep(index, 'text', e.target.value)}
                  placeholder={t('recipes.stepPlaceholder', 'Describe este paso')}
                  aria-label={`Paso ${index + 1}`}
                  className={`w-full min-h-[70px] resize-none rounded-2xl border bg-white px-3 py-2.5 text-xs text-stone-950 outline-none placeholder:text-stone-400 focus:border-stone-400 box-border ${submitAttempted && index === 0 && !step.text?.trim() ? 'border-red-500' : 'border-stone-200'}`}
                />
                {step.image_url ? (
                  <div className="relative mt-1.5 overflow-hidden rounded-2xl">
                    <img src={step.image_url} alt={`Paso ${index + 1}`} className="h-[120px] w-full object-cover" />
                    <button type="button" onClick={() => updateStep(index, 'image_url', '')} aria-label={`Eliminar imagen del paso ${index + 1}`} className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white border-none cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-600">
                    <ImagePlus size={13} /> Imagen opcional
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleStepImage(index, e.target.files?.[0])} />
                  </label>
                )}
              </div>
              {recipe.steps.length > 1 && (
                <button type="button" onClick={() => removeStep(index)} aria-label={`Eliminar paso ${index + 1}`} className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center self-start rounded-full bg-transparent border-none cursor-pointer text-stone-400 hover:text-stone-700">
                  <X size={13} />
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={addStep} className="flex items-center gap-1 border-none bg-transparent py-1 text-[11px] font-medium text-stone-500 cursor-pointer hover:text-stone-700">
            <Plus size={13} /> {t('recipes.addStep', 'Añadir paso')}
          </button>
        </div>

        {/* Description (optional collapsible) */}
        <div className="mb-6">
          <button type="button" onClick={() => setDescriptionOpen(!descriptionOpen)} className="flex items-center gap-1.5 border-none bg-transparent text-[11px] font-medium text-stone-500 cursor-pointer p-0 hover:text-stone-700">
            {descriptionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Descripción (opcional)
          </button>
          {descriptionOpen && (
            <textarea
              value={recipe.description}
              onChange={(e) => updateRecipe('description', e.target.value)}
              placeholder="Cuenta qué hace especial esta receta..."
              aria-label="Descripción de la receta"
              className="mt-2 w-full min-h-[90px] resize-none rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-950 outline-none placeholder:text-stone-400 focus:border-stone-400 box-border"
            />
          )}
        </div>

        {/* David AI card */}
        <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <p className="mb-2 text-sm text-stone-950 leading-relaxed">✨ David AI puede ayudarte con:</p>
          <ul className="mb-3 pl-4 text-sm text-stone-500 leading-relaxed">
            <li>Una introducción para tu receta</li>
            <li>Hashtags relevantes</li>
          </ul>
          <button type="button" onClick={() => setShowAIPanel(true)} className="rounded-full bg-stone-950 px-3.5 py-1.5 text-sm font-medium text-white border-none cursor-pointer hover:bg-stone-800 transition-colors">
            Sugerir con IA
          </button>
        </div>

        {/* Publish button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          data-testid="publish-recipe-btn"
          className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-full border-none text-sm font-semibold text-white cursor-pointer transition-colors ${submitting ? 'bg-stone-500 opacity-50 cursor-not-allowed' : 'bg-stone-950 hover:bg-stone-800'}`}
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Publicar receta
        </button>
      </div>

      <ProductSearchModal isOpen={productModalOpen} onClose={() => setProductModalOpen(false)} onSelect={addProductIngredient} />
      <HispalAIPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        contentType="recipe"
        currentText={recipe.description || recipe.title}
        productIds={selectedProducts.map(p => p.product_id)}
        onUseCaption={(text) => { setRecipe(prev => ({ ...prev, description: text })); setShowAIPanel(false); }}
        onAddHashtags={(tags) => { setRecipe(prev => ({ ...prev, description: (prev.description || '') + ' ' + tags })); setShowAIPanel(false); }}
      />
    </div>
  );
}
