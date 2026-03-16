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

const DIFFICULTY_COLORS = {
  easy: { bg: 'rgba(22,163,74,0.1)', color: '#16a34a', label: 'Fácil' },
  medium: { bg: 'rgba(217,119,6,0.1)', color: '#d97706', label: 'Media' },
  hard: { bg: 'rgba(220,38,38,0.1)', color: '#dc2626', label: 'Difícil' },
};

function normalizeStep(step) {
  if (typeof step === 'string') return { text: step, image_url: '' };
  return { text: step?.text || step?.description || '', image_url: step?.image_url || '' };
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

  const font = { fontFamily: 'var(--font-sans)' };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 40, background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        }}>
          <button onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <ArrowLeft size={22} color="var(--color-black)" />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>Receta</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={28} color="var(--color-stone)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 40, background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        }}>
          <button onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <ArrowLeft size={22} color="var(--color-black)" />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>Receta</span>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 16px',
        }}>
          <ChefHat size={56} color="var(--color-stone)" strokeWidth={1} />
          <p style={{ fontSize: 15, color: 'var(--color-stone)' }}>Receta no encontrada</p>
          <Link to="/recipes" style={{
            padding: '10px 24px', background: 'var(--color-black)', color: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            Ver recetas
          </Link>
        </div>
      </div>
    );
  }

  const diff = DIFFICULTY_COLORS[recipe.difficulty] || DIFFICULTY_COLORS.easy;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      {/* ── Topbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40, background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver">
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{
          fontSize: 17, fontWeight: 700, color: 'var(--color-black)', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {recipe.title}
        </span>
        <button
          onClick={() => setSaved(!saved)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Guardar"
        >
          <Bookmark size={22} color="var(--color-black)" fill={saved ? 'var(--color-black)' : 'none'} />
        </button>
      </div>

      {/* ── Hero Image (edge-to-edge) ── */}
      <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden', background: 'var(--color-surface)', position: 'relative' }}>
        {recipe.image_url ? (
          <img src={resolveUserImage(recipe.image_url)} alt={recipe.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChefHat size={48} color="var(--color-stone)" />
          </div>
        )}
        {/* Gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
        }} />
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 100px' }}>
        {/* ── Title + Meta ── */}
        <div style={{ padding: '16px 0' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-black)', margin: '0 0 10px', lineHeight: 1.3 }}>
            {recipe.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '4px 10px',
              borderRadius: 'var(--radius-full, 999px)', background: diff.bg, color: diff.color,
            }}>
              {diff.label}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock3 size={13} /> {recipe.time_minutes || 0} min
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={13} /> {recipe.servings || 1} porciones
            </span>
          </div>

          {/* Author */}
          {recipe.author_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {recipe.author_avatar ? (
                  <img src={recipe.author_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={16} color="var(--color-stone)" />
                )}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>
                  {recipe.author_name}
                </p>
              </div>
            </div>
          )}

          {recipe.description && (
            <p style={{ fontSize: 14, color: 'var(--color-stone)', lineHeight: 1.6, margin: '12px 0 0' }}>
              {recipe.description}
            </p>
          )}
        </div>

        {/* ── Portion Selector ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 14, background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', marginBottom: 16,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)' }}>Porciones</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setPortions(p => Math.max(1, p - 1))}
              disabled={portions <= 1}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--color-border)',
                background: 'var(--color-white)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: portions <= 1 ? 'default' : 'pointer',
                opacity: portions <= 1 ? 0.4 : 1,
              }}
            >
              <Minus size={16} color="var(--color-black)" />
            </button>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-black)', minWidth: 24, textAlign: 'center' }}>
              {portions}
            </span>
            <button
              onClick={() => setPortions(p => p + 1)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--color-border)',
                background: 'var(--color-white)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} color="var(--color-black)" />
            </button>
          </div>
        </div>

        {/* ── Ingredients ── */}
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', margin: '0 0 10px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            Ingredientes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(recipe.ingredients || []).map((ing, i) => {
              const hasProduct = ing.product || ing.product_id;
              const quantity = ing.quantity ? (parseFloat(ing.quantity) * ratio).toFixed(ing.quantity % 1 === 0 && ratio === Math.round(ratio) ? 0 : 1) : '';
              const displayQty = [quantity, ing.unit, ing.name].filter(Boolean).join(' ');

              return (
                <div key={i} style={{
                  padding: 12,
                  background: hasProduct ? 'rgba(22,163,74,0.04)' : 'var(--color-white)',
                  border: `1px solid ${hasProduct ? 'rgba(22,163,74,0.15)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-xl)',
                }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-black)', margin: 0 }}>
                    {displayQty}
                  </p>

                  {ing.product && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
                      padding: 8, background: 'var(--color-white)',
                      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface)', overflow: 'hidden', flexShrink: 0,
                        cursor: 'pointer',
                      }}
                        onClick={() => setSelectedProduct(ing.product)}
                      >
                        {ing.product.images?.[0] && (
                          <img src={resolveUserImage(ing.product.images[0])} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 500, color: 'var(--color-black)', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {ing.product.name}
                        </p>
                        {ing.product.price && (
                          <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: '2px 0 0' }}>
                            {Number(ing.product.price).toFixed(2)}€
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddSingle(ing)}
                        style={{
                          padding: '6px 12px', borderRadius: 'var(--radius-full, 999px)',
                          background: 'var(--color-black)', color: 'var(--color-white)',
                          fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                        }}
                      >
                        <ShoppingCart size={11} /> Añadir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add all to cart */}
          {taggedIngredients.length >= 2 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddAllToCart}
              disabled={addingAll}
              style={{
                width: '100%', padding: 14, marginTop: 12,
                background: 'var(--color-black)', color: 'var(--color-white)',
                borderRadius: 'var(--radius-xl)', border: 'none',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: addingAll ? 0.6 : 1,
                ...font,
              }}
            >
              <ShoppingCart size={18} />
              {addingAll ? 'Añadiendo...' : `Añadir todos al carrito (${taggedIngredients.length})`}
            </motion.button>
          )}
        </section>

        {/* ── Steps ── */}
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', margin: '0 0 10px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            Preparación
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Step number circle */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--color-black)', color: 'var(--color-white)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {step.text && (
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-black)', margin: 0 }}>
                        {step.text}
                      </p>
                    )}
                    {step.image_url && (
                      <div style={{ marginTop: 10, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <img
                          src={resolveUserImage(step.image_url)}
                          alt={`Paso ${i + 1}`}
                          loading="lazy"
                          style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Chef Tips ── */}
        {recipe.tips && (
          <section style={{ marginBottom: 20 }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ChefHat size={18} color="var(--color-black)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-black)' }}>Consejos del chef</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-stone)', margin: 0 }}>
                {recipe.tips}
              </p>
            </div>
          </section>
        )}

        {/* ── Tags ── */}
        {recipe.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {recipe.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 12, padding: '4px 12px',
                borderRadius: 'var(--radius-full, 999px)',
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-stone)',
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductDetailOverlay
          product={selectedProduct}
          store={selectedProduct.store || null}
          onClose={() => setSelectedProduct(null)}
        />
      )}
      {showShoppingList && (
        <RecipeShoppingListOverlay
          recipeId={recipeId}
          defaultServings={recipe?.servings || 1}
          onClose={() => setShowShoppingList(false)}
        />
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
