import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChefHat, Clock3, Users, ShoppingCart, Minus, Plus, Bookmark, Loader2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { resolveUserImage } from '../features/user/queries';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import RecipeShoppingListOverlay from '../components/recipes/RecipeShoppingListOverlay';
import SEO from '../components/SEO';

const DIFFICULTY_CLASSES = {
  easy: { pill: 'bg-stone-200/50 text-stone-600', label: 'Fácil' },
  medium: { pill: 'bg-stone-300/40 text-stone-700', label: 'Media' },
  hard: { pill: 'bg-stone-950 text-stone-50', label: 'Difícil' },
};

function normalizeStep(step) {
  if (typeof step === 'string') return { text: step, image_url: '' };
  return { text: step?.text || step?.description || '', image_url: step?.image_url || '' };
}

/* ── Shared topbar used in loading / not-found / main ── */
function Topbar({ title, onBack, right }) {
  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-950"
      >
        <ArrowLeft size={22} />
      </button>
      <span className="flex-1 truncate text-[17px] font-bold text-stone-950">{title}</span>
      {right}
    </div>
  );
}

export default function RecipeDetailPage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portions, setPortions] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingAll, setAddingAll] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.get(`/recipes/${recipeId}`)
      .then(data => { if (active) { setRecipe(data || null); setPortions(data?.servings || 1); } })
      .catch(() => { if (active) { setRecipe(null); toast.error('Receta no encontrada'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recipeId]);

  const steps = useMemo(() => (recipe?.steps || []).map(normalizeStep), [recipe?.steps]);
  const baseServings = recipe?.servings || 1;
  const ratio = portions / baseServings;

  const taggedIngredients = useMemo(() =>
    (recipe?.ingredients || []).filter(i => i.product || i.product_id),
    [recipe?.ingredients]
  );

  const handleAddAllToCart = async () => {
    if (taggedIngredients.length >= 2) {
      setAddingAll(true);
      try {
        for (const ing of taggedIngredients) {
          const productId = ing.product?.product_id || ing.product_id;
          if (productId) await addToCart(productId, 1);
        }
        toast.success(`${taggedIngredients.length} ingredientes añadidos al carrito`);
      } catch {
        toast.error('Error al añadir productos');
      } finally {
        setAddingAll(false);
      }
    } else {
      setShowShoppingList(true);
    }
  };

  const handleAddSingle = async (ingredient) => {
    const productId = ingredient.product?.product_id || ingredient.product_id;
    if (!productId) return;
    try {
      await addToCart(productId, 1);
      toast.success('Añadido al carrito');
    } catch {
      toast.error('Error al añadir');
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] font-sans">
        <Topbar title="Receta" onBack={() => navigate(-1)} />
        <div className="flex justify-center p-12">
          <Loader2 size={28} className="animate-spin text-stone-400" />
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!recipe) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] font-sans">
        <Topbar title="Receta" onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center gap-3 px-4 py-16">
          <ChefHat size={56} className="text-stone-300" strokeWidth={1} />
          <p className="text-[15px] text-stone-500">Receta no encontrada</p>
          <Link to="/recipes" className="rounded-full bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white no-underline hover:bg-stone-800 transition-colors">
            Ver recetas
          </Link>
        </div>
      </div>
    );
  }

  const diff = DIFFICULTY_CLASSES[recipe.difficulty] || DIFFICULTY_CLASSES.easy;

  return (
    <div className="min-h-screen bg-[var(--color-cream)] font-sans">
      {/* ── Topbar ── */}
      <Topbar
        title={recipe.title}
        onBack={() => navigate(-1)}
        right={
          <button
            type="button"
            onClick={async () => {
              const next = !saved;
              setSaved(next);
              try {
                if (next) await apiClient.post(`/recipes/${recipeId}/save`);
                else await apiClient.delete(`/recipes/${recipeId}/save`);
              } catch {
                setSaved(!next);
                toast.error('Error al guardar');
              }
            }}
            aria-label={saved ? 'Quitar guardado' : 'Guardar receta'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-950"
          >
            <Bookmark size={22} fill={saved ? 'currentColor' : 'none'} />
          </button>
        }
      />

      <SEO
        title={`${recipe.title} — Receta en Hispaloshop`}
        description={recipe.description?.slice(0, 160) || `Receta de ${recipe.title} con ingredientes artesanales locales`}
        image={recipe.image_url}
      />

      {/* ── Hero Image ── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        {recipe.image_url ? (
          <img src={resolveUserImage(recipe.image_url)} alt={recipe.title} loading="lazy" className="block h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ChefHat size={48} className="text-stone-400" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-[600px] px-4 pb-24">
        {/* ── Title + Meta ── */}
        <div className="py-4">
          <h1 className="mb-2.5 text-[22px] font-bold leading-tight text-stone-950">{recipe.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${diff.pill}`}>{diff.label}</span>
            <span className="flex items-center gap-1 text-xs text-stone-500"><Clock3 size={13} /> {recipe.time_minutes || 0} min</span>
            <span className="flex items-center gap-1 text-xs text-stone-500"><Users size={13} /> {recipe.servings || 1} porciones</span>
          </div>

          {recipe.author_name && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-stone-100">
                {recipe.author_avatar ? (
                  <img src={recipe.author_avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={16} className="text-stone-400" />
                )}
              </div>
              <p className="text-[13px] font-semibold text-stone-950">{recipe.author_name}</p>
            </div>
          )}

          {recipe.description && (
            <p className="mt-3 text-sm leading-relaxed text-stone-500">{recipe.description}</p>
          )}
        </div>

        {/* ── Portion Selector ── */}
        <div className="mb-4 flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3.5">
          <span className="text-sm font-semibold text-stone-950">Porciones</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPortions(p => Math.max(1, p - 1))}
              disabled={portions <= 1}
              aria-label="Menos porciones"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-950 disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >
              <Minus size={16} />
            </button>
            <span className="min-w-[24px] text-center text-lg font-bold text-stone-950">{portions}</span>
            <button
              type="button"
              onClick={() => setPortions(p => p + 1)}
              aria-label="Más porciones"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-950 cursor-pointer"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* ── Ingredients ── */}
        <section className="mb-5">
          <h2 className="mb-2.5 text-base font-bold uppercase tracking-wide text-stone-950">Ingredientes</h2>
          <div className="flex flex-col gap-2">
            {(recipe.ingredients || []).map((ing, i) => {
              const hasProduct = ing.product || ing.product_id;
              const rawQty = parseFloat(ing.quantity);
              const quantity = ing.quantity && !isNaN(rawQty) ? (rawQty * ratio).toFixed(rawQty % 1 === 0 && ratio === Math.round(ratio) ? 0 : 1) : (ing.quantity || '');
              const displayQty = [quantity, ing.unit, ing.name].filter(Boolean).join(' ');

              return (
                <div key={i} className={`rounded-xl border p-3 ${hasProduct ? 'border-stone-200 bg-stone-50' : 'border-stone-200 bg-white'}`}>
                  <p className="text-sm font-medium text-stone-950">{displayQty}</p>

                  {ing.product && (
                    <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white p-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(ing.product)}
                        className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-stone-100 border-none cursor-pointer p-0"
                      >
                        {ing.product.images?.[0] && (
                          <img src={resolveUserImage(ing.product.images[0])} alt="" className="h-full w-full object-cover" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-stone-950">{ing.product.name}</p>
                        {ing.product.price != null && (
                          <p className="mt-0.5 text-xs text-stone-500">{Number(ing.product.price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSingle(ing)}
                        aria-label={`Añadir ${ing.product?.name || 'producto'} al carrito`}
                        className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-full bg-stone-950 px-3.5 text-xs font-semibold text-white border-none cursor-pointer hover:bg-stone-800 transition-colors"
                      >
                        <ShoppingCart size={12} /> Añadir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {taggedIngredients.length >= 2 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddAllToCart}
              disabled={addingAll}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full border-none bg-stone-950 p-3.5 text-sm font-semibold text-white cursor-pointer transition-opacity ${addingAll ? 'opacity-60' : 'hover:bg-stone-800'}`}
            >
              <ShoppingCart size={18} />
              {addingAll ? 'Añadiendo...' : `Añadir todos al carrito (${taggedIngredients.length})`}
            </motion.button>
          )}
        </section>

        {/* ── Steps ── */}
        <section className="mb-5">
          <h2 className="mb-2.5 text-base font-bold uppercase tracking-wide text-stone-950">Preparación</h2>
          <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-stone-200 bg-white p-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    {step.text && <p className="text-sm leading-relaxed text-stone-950">{step.text}</p>}
                    {step.image_url && (
                      <div className="mt-2.5 overflow-hidden rounded-xl">
                        <img src={resolveUserImage(step.image_url)} alt={`Paso ${i + 1}`} loading="lazy" className="block h-[180px] w-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Nutritional Info ── */}
        {recipe.nutrition && (
          <section className="mb-5">
            <h2 className="mb-2.5 text-base font-bold uppercase tracking-wide text-stone-950">Información nutricional</h2>
            <p className="mb-2 text-[11px] text-stone-400">Por ración</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'calories', label: 'Calorías', unit: 'kcal' },
                { key: 'protein', label: 'Proteína', unit: 'g' },
                { key: 'carbs', label: 'Carbohidratos', unit: 'g' },
                { key: 'fat', label: 'Grasa', unit: 'g' },
              ].map(({ key, label, unit }) => {
                const val = recipe.nutrition?.[key];
                if (val == null) return null;
                return (
                  <div key={key} className="rounded-xl border border-stone-200 bg-white p-2.5 text-center">
                    <p className="text-[15px] font-bold text-stone-950">{val}</p>
                    <p className="text-[10px] text-stone-400">{unit}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-stone-500">{label}</p>
                  </div>
                );
              })}
            </div>
            {recipe.nutrition?.fiber != null && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { key: 'fiber', label: 'Fibra', unit: 'g' },
                  { key: 'sugar', label: 'Azúcar', unit: 'g' },
                  { key: 'sodium', label: 'Sodio', unit: 'mg' },
                ].map(({ key, label, unit }) => {
                  const val = recipe.nutrition?.[key];
                  if (val == null) return null;
                  return (
                    <div key={key} className="rounded-xl border border-stone-200 bg-white p-2 text-center">
                      <p className="text-[13px] font-semibold text-stone-950">{val}{unit}</p>
                      <p className="text-[10px] text-stone-400">{label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Chef Tips ── */}
        {recipe.tips && (
          <section className="mb-5">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <ChefHat size={18} className="text-stone-950" />
                <span className="text-sm font-bold text-stone-950">Consejos del chef</span>
              </div>
              <p className="text-[13px] leading-relaxed text-stone-500">{recipe.tips}</p>
            </div>
          </section>
        )}

        {/* ── Tags ── */}
        {recipe.tags?.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {recipe.tags.map(tag => (
              <span key={tag} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-500">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductDetailOverlay product={selectedProduct} store={selectedProduct.store || null} onClose={() => setSelectedProduct(null)} />
      )}
      {showShoppingList && (
        <RecipeShoppingListOverlay recipeId={recipeId} defaultServings={recipe?.servings || 1} onClose={() => setShowShoppingList(false)} />
      )}
    </div>
  );
}
