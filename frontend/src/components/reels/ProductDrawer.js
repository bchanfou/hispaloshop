import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ShoppingBag, MessageCircle, Store, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';

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
    navigate(`/products/${product.id}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-white">
              <div className="w-10 h-1 bg-stone-300 rounded-full" />
            </div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
            
            {/* Product Image */}
            <div className="relative h-64 bg-stone-100">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Product Info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-stone-950">{product.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-accent">
                      €{product.price.toFixed(2)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-text-muted line-through text-sm">
                        €{product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-state-amber fill-state-amber" />
                  <span className="font-semibold text-sm">{product.rating || '4.8'}</span>
                </div>
                <span className="text-text-muted text-sm">
                  ({product.reviews || '124'} valoraciones)
                </span>
              </div>
              
              {/* Seller */}
              <div 
                onClick={handleViewStore}
                className="flex items-center gap-3 mt-4 p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                  {product.seller?.[0] || 'V'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{product.seller || 'Vendedor'}</p>
                  <p className="text-xs text-text-muted">Ver tienda completa</p>
                </div>
                <Store className="w-5 h-5 text-text-muted" />
              </div>
              
              {/* Description */}
              <div className="mt-4">
                <h3 className="font-semibold text-sm mb-2">Descripción</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {product.description || 'Producto artesanal de alta calidad elaborado con ingredientes seleccionados. Envío en 24-48h.'}
                </p>
              </div>
              
              {/* Features */}
              <div className="flex flex-wrap gap-2 mt-4">
                {['Envío gratis', 'Garantía', 'Devolución 14d'].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-stone-100 space-y-3">
              <button
                onClick={handleAddToCart}
                className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                  addedToCart
                    ? 'bg-green-500 text-white'
                    : 'bg-accent text-white hover:bg-accent/90'
                }`}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-5 h-5" />
                    Añadido
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    Añadir al carrito
                  </>
                )}
              </button>
              
              <button
                onClick={() => toast.info('Chat con vendedor próximamente')}
                className="w-full py-3.5 rounded-xl font-semibold border-2 border-accent text-accent flex items-center justify-center gap-2 hover:bg-accent/5"
              >
                <MessageCircle className="w-5 h-5" />
                Consultar al vendedor
              </button>
              
              <button
                onClick={handleViewProduct}
                className="w-full py-3 text-text-muted text-sm font-medium"
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
