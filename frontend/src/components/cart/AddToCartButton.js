import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Check, Loader2, Plus, Minus, Zap } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useHaptics } from '../../hooks/useHaptics';
import { useTranslation } from 'react-i18next';
const getProductId = product => product?.product_id || product?.id || null;
const AddToCartButton = ({
  product,
  variant = 'default',
  // 'default', 'small', 'quick', 'buy-now'
  showQuantity = false,
  onAdd,
  className = ''
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    addToCart,
    cartItems
  } = useCart();
  const {
    trigger
  } = useHaptics();
  const [state, setState] = useState('idle'); // idle, loading, success
  const [quantity, setQuantity] = useState(1);
  const mountedRef = useRef(true);
  const addingRef = useRef(false); // Debounce guard against double-adds
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);
  const productId = getProductId(product);

  // Check if product is already in cart (match by product + variant + pack)
  const variantId = product?.selectedVariantId || product?.variant_id || null;
  const packId = product?.selectedPackId || product?.pack_id || null;
  const existingItem = cartItems.find(item => {
    if (String(item.product_id) !== String(productId)) return false;
    const itemVariant = item.variant_id != null && item.variant_id !== '' ? String(item.variant_id) : null;
    const itemPack = item.pack_id != null && item.pack_id !== '' ? String(item.pack_id) : null;
    const targetVariant = variantId != null && variantId !== '' ? String(variantId) : null;
    const targetPack = packId != null && packId !== '' ? String(packId) : null;
    if (itemVariant !== targetVariant) return false;
    if (itemPack !== targetPack) return false;
    return true;
  });
  const inCartQuantity = existingItem?.quantity || 0;
  const handleAdd = async () => {
    if (state === 'loading' || addingRef.current || !productId) return false;
    addingRef.current = true;
    setState('loading');
    try {
      const result = await addToCart(productId, quantity, variantId, packId, {
        productName: product?.name || product?.product_name || '',
        productImage: product?.image || product?.product_image || product?.images?.[0] || '',
        unitPriceCents: Math.max(0, product?.price_cents || product?.unit_price_cents || (product?.price ? Math.round(product.price * 100) : 0)),
        sellerId: product?.seller_id || product?.producer_id || '',
        sellerName: product?.seller_name || product?.producer_name || product?.producer?.name || ''
      });
      if (result === false || result === 'redirect') {
        if (mountedRef.current) setState('idle');
        addingRef.current = false;
        if (result === 'redirect') {
          navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
        }
        return false;
      }
      trigger('success');
      setState('success');
      window.dispatchEvent(new CustomEvent('cart-added'));
      if (onAdd) onAdd(product);
      const totalInCart = inCartQuantity + quantity;
      toast.success(`✓ Añadido · ${totalInCart} en carrito`, {
        action: {
          label: 'Ver carrito',
          onClick: () => navigate('/cart')
        },
        duration: 3000
      });
      setTimeout(() => {
        if (mountedRef.current) {
          setState('idle');
          setQuantity(1);
        }
        addingRef.current = false;
      }, 2000);
      return true;
    } catch (error) {
      if (mountedRef.current) setState('idle');
      addingRef.current = false;
      toast.error(t('add_to_cart_button.errorAlAnadirElProductoAlCarrito', 'Error al añadir el producto al carrito'));
      return false;
    }
  };
  const handleBuyNow = async () => {
    const success = await handleAdd();
    if (success === true) navigate('/cart');
  };
  const variants = {
    'default': {
      button: 'flex-1 py-3 px-4 bg-stone-950 text-white rounded-2xl font-medium',
      icon: 'w-5 h-5',
      text: inCartQuantity > 0 ? `Actualizar (${inCartQuantity + quantity})` : t('add_to_cart_button.anadirAlCarrito', 'Añadir al carrito')
    },
    'small': {
      button: 'p-2 bg-stone-950 text-white rounded-2xl',
      icon: 'w-4 h-4',
      text: ''
    },
    'quick': {
      button: 'w-full py-2 bg-stone-950 text-white rounded-2xl text-sm font-medium',
      icon: 'w-4 h-4',
      text: inCartQuantity > 0 ? `Actualizar (${inCartQuantity + quantity})` : t('common.add', 'Añadir')
    },
    'buy-now': {
      button: 'w-full py-3 bg-stone-950 text-white rounded-2xl font-semibold hover:bg-stone-800',
      icon: 'w-5 h-5',
      text: 'Comprar ahora'
    }
  };
  const style = variants[variant];

  // Buy Now variant
  if (variant === 'buy-now') {
    return <motion.button onClick={handleBuyNow} disabled={state === 'loading' || !productId} aria-label="Comprar ahora" className={`${style.button} flex items-center justify-center gap-2 transition-all disabled:opacity-50`} whileTap={{
      scale: 0.95
    }}>
        <Zap className={style.icon} />
        <span>Comprar ahora</span>
      </motion.button>;
  }
  return <div className={`flex items-center gap-2 ${className}`}>
      {showQuantity && <div className="flex items-center bg-stone-100 rounded-2xl">
          <motion.button whileTap={{
        scale: 0.88
      }} onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-stone-200 rounded-l-2xl transition-colors" disabled={state === 'loading'} aria-label="Disminuir cantidad">
            <Minus className="w-4 h-4 text-stone-950" />
          </motion.button>
          <span className="w-10 text-center font-medium text-stone-950" aria-live="polite">{quantity}</span>
          <motion.button whileTap={{
        scale: 0.88
      }} onClick={() => setQuantity(q => Math.min(q + 1, product?.stock || 99))} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-stone-200 rounded-r-2xl transition-colors" disabled={state === 'loading'} aria-label="Aumentar cantidad">
            <Plus className="w-4 h-4 text-stone-950" />
          </motion.button>
        </div>}
      
      <motion.button onClick={handleAdd} disabled={state === 'loading' || !productId} aria-label={state === 'success' ? t('add_to_cart_button.productoAnadido', 'Producto añadido') : state === 'loading' ? 'Añadiendo al carrito' : 'Añadir al carrito'} className={`${style.button} flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${state === 'success' ? '!bg-stone-950 !text-white' : ''} ${inCartQuantity > 0 && state === 'idle' ? 'bg-stone-700' : ''}`} animate={state === 'success' ? {
      scale: [1, 1.15, 1]
    } : {}} transition={state === 'success' ? {
      duration: 0.35,
      ease: 'easeOut'
    } : {}} whileTap={{
      scale: 0.95
    }}>
        <AnimatePresence mode="wait">
          {state === 'loading' ? <motion.div key="loading" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }}>
              <Loader2 className={`${style.icon} animate-spin`} />
            </motion.div> : state === 'success' ? <motion.div key="success" initial={{
          opacity: 0,
          scale: 0.5,
          rotate: -10
        }} animate={{
          opacity: 1,
          scale: 1,
          rotate: 0
        }} exit={{
          opacity: 0,
          scale: 0.5
        }} transition={{
          type: 'spring',
          stiffness: 400,
          damping: 20
        }}>
              <Check className={style.icon} />
            </motion.div> : <motion.div key="idle" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }}>
              <ShoppingBag className={style.icon} />
            </motion.div>}
        </AnimatePresence>
        
        {style.text && <span>
            {state === 'loading' ? t('productDetail.addingToCart', 'Añadiendo...') : state === 'success' ? t('add_to_cart_button.anadido', '¡Añadido!') : style.text}
          </span>}
      </motion.button>
    </div>;
};
export default AddToCartButton;