import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ChevronDown, ChevronUp, Clock, ImagePlus, Loader2, Plus, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import apiClient from '../services/api/client';
import { resolveUserImage } from '../features/user/queries';
import ProductSearchModal from '../components/create/ProductSearchModal';

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
  easy: { label: 'Facil', color: 'var(--color-green)' },
  medium: { label: 'Media', color: 'var(--color-amber)' },
  hard: { label: 'Dificil', color: 'var(--color-red)' },
};
const DIFFICULTY_KEYS = ['easy', 'medium', 'hard'];

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

  const updateRecipe = (field, value) => {
    setRecipe((current) => ({ ...current, [field]: value }));
  };

  const handleMainImage = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error(t('social.imagesOnly', 'Solo se permiten imagenes'));
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error(t('social.maxSize10', 'El tamano maximo es 10MB'));
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
    setIngredientSuggestions([]);
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

  const addProductIngredient = (product) => {
    if (recipe.ingredients.some((ingredient) => ingredient.product_id === product.product_id)) {
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
      toast.error(t('social.imagesOnly', 'Solo se permiten imagenes'));
      return;
    }

    try {
      const imageUrl = await fileToDataUrl(file);
      updateStep(index, 'image_url', imageUrl);
    } catch {
      toast.error('No hemos podido cargar la imagen del paso');
    }
  };

  const cycleDifficulty = () => {
    const idx = DIFFICULTY_KEYS.indexOf(recipe.difficulty);
    const next = DIFFICULTY_KEYS[(idx + 1) % DIFFICULTY_KEYS.length];
    updateRecipe('difficulty', next);
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
      toast.error(t('recipes.missingTitle', 'Anade un titulo a la receta'));
      return;
    }

    if (cleanedIngredients.length === 0) {
      toast.error(t('recipes.missingIngredients', 'Anade al menos un ingrediente'));
      return;
    }

    if (cleanedSteps.length === 0) {
      toast.error(t('recipes.missingSteps', 'Anade al menos un paso de preparacion'));
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

      const data = await apiClient.post('/recipes', payload);
      toast.success(t('recipes.published', 'Receta publicada'));
      navigate(`/recipes/${data.recipe_id}`);
    } catch (error) {
      toast.error(error.message || 'No hemos podido publicar la receta');
    } finally {
      setSubmitting(false);
    }
  };

  const diff = DIFFICULTY_MAP[recipe.difficulty];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-cream)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* TopBar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 52,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--color-black)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-black)' }}>
          Nueva receta
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: 'var(--color-black)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '7px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.5 : 1,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {submitting ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 32px' }}>
        {/* Cover photo */}
        <div
          onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          style={{
            height: 130,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            position: 'relative',
            background: recipe.image_url
              ? undefined
              : 'linear-gradient(135deg, var(--color-surface), var(--color-cream))',
            border: dragActive ? '2px dashed var(--color-stone)' : 'none',
          }}
        >
          {recipe.image_url ? (
            <>
              <img
                src={recipe.image_url}
                alt="Portada"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => updateRecipe('image_url', '')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 10,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.55)',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Eliminar imagen"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 10,
                border: 'none',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-black)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Camera size={15} />
              Foto de portada
            </button>
          )}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(event) => handleMainImage(event.target.files?.[0])}
        />

        {/* Recipe name */}
        <input
          value={recipe.title}
          onChange={(event) => updateRecipe('title', event.target.value)}
          placeholder="Nombre de la receta"
          data-testid="recipe-title-input"
          style={{
            width: '100%',
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--color-black)',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            padding: '16px 0 12px',
            fontFamily: 'var(--font-sans)',
            boxSizing: 'border-box',
          }}
        />

        {/* Metadata grid */}
        <div className="grid grid-cols-3" style={{ gap: 8, marginBottom: 20 }}>
          {/* Time */}
          <div
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              textAlign: 'center',
            }}
          >
            <Clock size={14} style={{ color: 'var(--color-stone)', margin: '0 auto 4px' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
              <input
                type="number"
                value={recipe.time_minutes}
                onChange={(event) => updateRecipe('time_minutes', Number(event.target.value) || 0)}
                data-testid="recipe-time"
                style={{
                  width: 36,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--color-black)',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--color-stone)' }}>min</span>
            </div>
          </div>

          {/* Difficulty */}
          <button
            type="button"
            onClick={cycleDifficulty}
            data-testid="recipe-difficulty"
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--color-stone)', marginBottom: 4 }}>Dificultad</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: diff.color }}>{diff.label}</div>
          </button>

          {/* Servings */}
          <div
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              textAlign: 'center',
            }}
          >
            <Users size={14} style={{ color: 'var(--color-stone)', margin: '0 auto 4px' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
              <input
                type="number"
                value={recipe.servings}
                onChange={(event) => updateRecipe('servings', Number(event.target.value) || 1)}
                data-testid="recipe-servings"
                style={{
                  width: 28,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--color-black)',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--color-stone)' }}>personas</span>
            </div>
          </div>
        </div>

        {/* INGREDIENTES */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-stone)',
            marginBottom: 10,
          }}>
            Ingredientes
          </div>

          {/* Ingredient cards */}
          {recipe.ingredients.map((ingredient, index) => (
            <div
              key={`${ingredient.name}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: index < recipe.ingredients.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {ingredient.product_id && ingredient.product?.images?.[0] ? (
                <img
                  src={resolveUserImage(ingredient.product.images[0])}
                  alt={ingredient.name}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : ingredient.product_id && ingredient.product?.image ? (
                <img
                  src={resolveUserImage(ingredient.product.image)}
                  alt={ingredient.name}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : null}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ingredient.quantity && (
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-black)' }}>
                      {ingredient.quantity}{ingredient.unit ? ` ${ingredient.unit}` : ''}
                    </span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-black)' }}>
                    {ingredient.name}
                  </span>
                </div>
                {ingredient.product_id && (
                  <div style={{ fontSize: 9, color: 'var(--color-green)', marginTop: 1 }}>
                    {ingredient.product?.seller_name || 'Tienda'} &middot; etiquetado &#10003;
                  </div>
                )}
              </div>

              {/* Quantity / unit inline edits */}
              <input
                value={ingredient.quantity}
                onChange={(e) => updateIngredientField(index, 'quantity', e.target.value)}
                placeholder="Cant."
                style={{
                  width: 42,
                  fontSize: 10,
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '4px 6px',
                  outline: 'none',
                  color: 'var(--color-black)',
                  background: 'var(--color-white)',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <input
                value={ingredient.unit}
                onChange={(e) => updateIngredientField(index, 'unit', e.target.value)}
                placeholder="Ud."
                style={{
                  width: 42,
                  fontSize: 10,
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '4px 6px',
                  outline: 'none',
                  color: 'var(--color-black)',
                  background: 'var(--color-white)',
                  fontFamily: 'var(--font-sans)',
                }}
              />

              <button
                type="button"
                onClick={() => removeIngredient(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-stone)',
                  padding: 2,
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}

          {/* Suggestion loading */}
          {suggestionLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', fontSize: 11, color: 'var(--color-stone)' }}>
              <Loader2 size={13} className="animate-spin" />
              Buscando coincidencias
            </div>
          )}

          {/* Ingredient suggestions */}
          {!suggestionLoading && ingredientSuggestions.length > 0 && (
            <div style={{ marginTop: 6, marginBottom: 6 }}>
              {ingredientSuggestions.map((product) => (
                <button
                  key={product.product_id}
                  type="button"
                  onClick={() => addProductIngredient({ ...product, images: product.image ? [product.image] : [] })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 10px',
                    marginBottom: 4,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', background: 'var(--color-white)', flexShrink: 0 }}>
                    {product.image ? <img src={resolveUserImage(product.image)} alt={product.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-black)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                    <p style={{ fontSize: 9, color: 'var(--color-stone)', margin: '1px 0 0' }}>Sugerencia para "{manualIngredientInput.trim()}"</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Add ingredient input */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              value={manualIngredientInput}
              onChange={(event) => setManualIngredientInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addManualIngredient();
                }
              }}
              placeholder="Anadir ingrediente"
              style={{
                flex: 1,
                fontSize: 11,
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                background: 'transparent',
                padding: '6px 0',
                outline: 'none',
                color: 'var(--color-black)',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <button
              type="button"
              onClick={addManualIngredient}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-stone)',
                fontSize: 11,
                fontWeight: 500,
                padding: '6px 0',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 2 }} />
              Anadir ingrediente
            </button>
          </div>

          {/* Tag product */}
          <button
            type="button"
            onClick={() => setProductModalOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-green)',
              fontSize: 11,
              fontWeight: 500,
              padding: '8px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Plus size={13} />
            Etiquetar producto
          </button>
        </div>

        {/* PASOS */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-stone)',
            marginBottom: 10,
          }}>
            Pasos
          </div>

          {recipe.steps.map((step, index) => (
            <div key={`step-${index}`} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {/* Step number */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--color-black)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {index + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <textarea
                  value={step.text}
                  onChange={(event) => updateStep(index, 'text', event.target.value)}
                  placeholder={t('recipes.stepPlaceholder', 'Describe este paso')}
                  style={{
                    width: '100%',
                    minHeight: 70,
                    resize: 'none',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    fontSize: 12,
                    color: 'var(--color-black)',
                    background: 'var(--color-white)',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Step image */}
                {step.image_url ? (
                  <div style={{ position: 'relative', marginTop: 6, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <img src={step.image_url} alt={`Paso ${index + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => updateStep(index, 'image_url', '')}
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: 6,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 6,
                    fontSize: 10,
                    color: 'var(--color-stone)',
                    cursor: 'pointer',
                  }}>
                    <ImagePlus size={13} />
                    Imagen opcional
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(event) => handleStepImage(index, event.target.files?.[0])}
                    />
                  </label>
                )}
              </div>

              {recipe.steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-stone)',
                    padding: 2,
                    display: 'flex',
                    alignSelf: 'flex-start',
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addStep}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-stone)',
              fontSize: 11,
              fontWeight: 500,
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Plus size={13} />
            {t('recipes.addStep', 'Anadir paso')}
          </button>
        </div>

        {/* Description (optional collapsible) */}
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setDescriptionOpen(!descriptionOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--color-stone)',
              fontWeight: 500,
              padding: 0,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {descriptionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Descripcion (opcional)
          </button>
          {descriptionOpen && (
            <textarea
              value={recipe.description}
              onChange={(event) => updateRecipe('description', event.target.value)}
              placeholder="Cuenta que hace especial esta receta..."
              style={{
                width: '100%',
                minHeight: 90,
                resize: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                fontSize: 12,
                color: 'var(--color-black)',
                background: 'var(--color-white)',
                outline: 'none',
                marginTop: 8,
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>

        {/* Publish button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          data-testid="publish-recipe-btn"
          style={{
            width: '100%',
            height: 44,
            background: 'var(--color-black)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            fontSize: 13,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Publicar receta
        </button>
      </div>

      {/* Product Search Modal */}
      <ProductSearchModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSelect={addProductIngredient}
      />
    </div>
  );
}
