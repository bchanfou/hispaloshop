import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ShoppingBag, MessageCircle, Store, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const getProductId = (product) => product?.product_id || product?.id || null;

function ProductDrawer({ isOpen, onClose, product }) {
  const navigate = useNavigate();
  const [addedToCart, setAddedToCart] = useState(false);

  if (!product) return null;

  const handleAddToCart = () => {
    setAddedToCart(true);
    toast.success('Añadido al carrito');
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleViewStore = () => {
    onClose();
    navigate(`/store/${product.sellerId || 'seller'}`);
  };

  const handleViewProduct = () => {
    onClose();
    const productId = getProductId(product);
    if (!productId) return;
    navigate(`/products/${productId}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white"
          >
            <div className="sticky top-0 flex justify-center bg-white pb-2 pt-3">
              <div className="h-1 w-10 rounded-full bg-stone-300" />
            </div>

            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-white/80 p-2 backdrop-blur-sm"
              aria-label="Cerrar producto"
            >
              <X className="h-5 w-5 text-text-muted" />
            </button>

            <div className="relative h-64 bg-stone-100">
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-stone-950">{product.name}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-2xl font-bold text-accent">
                      €{product.price.toFixed(2)}
                    </span>
                    {product.originalPrice ? (
                      <span className="text-sm text-text-muted line-through">
                        €{product.originalPrice.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-state-amber text-state-amber" />
                  <span className="text-sm font-semibold">{product.rating || '4.8'}</span>
                </div>
                <span className="text-sm text-text-muted">
                  ({product.reviews || '124'} valoraciones)
                </span>
              </div>

              <div
                onClick={handleViewStore}
                className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-stone-50 p-3 transition-colors hover:bg-stone-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-bold text-white">
                  {product.seller?.[0] || 'V'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{product.seller || 'Vendedor'}</p>
                  <p className="text-xs text-text-muted">Ver tienda completa</p>
                </div>
                <Store className="h-5 w-5 text-text-muted" />
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold">Descripción</h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  {product.description || 'Producto artesanal de alta calidad elaborado con ingredientes seleccionados. Envío en 24-48 h.'}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {['Envío gratis', 'Garantía', 'Devolución 14 d'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-stone-100 p-4">
              <button
                onClick={handleAddToCart}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-colors ${
                  addedToCart ? 'bg-green-500 text-white' : 'bg-accent text-white hover:bg-accent/90'
                }`}
              >
                {addedToCart ? (
                  <>
                    <Check className="h-5 w-5" />
                    Añadido
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" />
                    Añadir al carrito
                  </>
                )}
              </button>

              <button
                onClick={() => toast.info('Chat con vendedor próximamente')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-accent py-3.5 font-semibold text-accent hover:bg-accent/5"
              >
                <MessageCircle className="h-5 w-5" />
                Consultar al vendedor
              </button>

              <button
                onClick={handleViewProduct}
                className="w-full py-3 text-sm font-medium text-text-muted"
              >
                Ver ficha completa del producto
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ProductDrawer;
