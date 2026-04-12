// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ShoppingCart, Check, Trash2, Plus, Loader2, StickyNote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

const BASE = '/internal-chat/conversations';

export default function SharedListPanel({ isOpen, onClose, conversationId }) {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  // Freetext
  const [freetext, setFreetext] = useState('');

  // Swipe state
  const [swipedItemId, setSwipedItemId] = useState(null);

  const fetchList = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`${BASE}/${conversationId}/list`);
      setList(res?.data || res);
    } catch (err) {
      if (err?.status === 404 || err?.response?.status === 404) {
        // No list yet — create one
        try {
          const res = await apiClient.post(`${BASE}/${conversationId}/list`);
          setList(res?.data || res);
        } catch { setList({ items: [] }); }
      } else {
        setList({ items: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isOpen && conversationId) fetchList();
  }, [isOpen, conversationId, fetchList]);

  // Product search debounce
  const handleProductSearch = (val) => {
    setProductSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await apiClient.get('/discovery/search', { params: { q: val.trim(), limit: 5 } });
        const data = res?.data || res;
        setSearchResults(data?.products || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
  };

  const addProduct = async (product) => {
    setProductSearch('');
    setSearchResults([]);
    try {
      await apiClient.post(`${BASE}/${conversationId}/list/items`, {
        type: 'product',
        product_id: product.product_id,
      });
      fetchList();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    }
  };

  const addFreetext = async () => {
    if (!freetext.trim()) return;
    try {
      await apiClient.post(`${BASE}/${conversationId}/list/items`, {
        type: 'freetext',
        freetext: freetext.trim(),
      });
      setFreetext('');
      fetchList();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    }
  };

  const togglePurchased = async (item) => {
    try {
      await apiClient.patch(`${BASE}/${conversationId}/list/items/${item.item_id}`, {
        purchased: !item.purchased,
      });
      fetchList();
    } catch { toast.error('Error'); }
  };

  const removeItem = async (itemId) => {
    setSwipedItemId(null);
    try {
      await apiClient.delete(`${BASE}/${conversationId}/list/items/${itemId}`);
      fetchList();
    } catch { toast.error('Error'); }
  };

  const addAllToCart = async () => {
    try {
      const res = await apiClient.post(`${BASE}/${conversationId}/list/add-all-to-cart`);
      const data = res?.data || res;
      if (data.added_count > 0) {
        toast.success(t('chat.shoppingList.addedToCart', '{{n}} productos añadidos al carrito').replace('{{n}}', data.added_count));
      }
      if (data.failed?.length > 0) {
        toast.error(t('chat.shoppingList.someFailed', '{{n}} productos no disponibles').replace('{{n}}', data.failed.length));
      }
      fetchList();
    } catch { toast.error('Error'); }
  };

  const items = list?.items || [];
  const pendingItems = items.filter(i => !i.purchased);
  const purchasedItems = items.filter(i => i.purchased);
  const productItemsForCart = items.filter(i => i.type === 'product' && !i.purchased && !i.in_cart);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="sl-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm lg:absolute"
        onClick={onClose}
      />
      <motion.div
        key="sl-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => { if (info.offset.x > 100) onClose(); }}
        className="fixed right-0 top-0 bottom-0 z-[61] flex w-full max-w-[360px] flex-col bg-white shadow-xl lg:absolute"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-stone-100 px-4">
          <div>
            <h2 className="text-[15px] font-semibold text-stone-950">{t('chat.shoppingList', 'Lista de compras')}</h2>
            <p className="text-[11px] text-stone-400">
              {pendingItems.length} {t('chat.shoppingList.pending', 'pendientes')} · {purchasedItems.length} {t('chat.shoppingList.purchased', 'comprados')}
            </p>
          </div>
          <button onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-600 active:bg-stone-100">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-stone-300" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Add inputs */}
            <div className="shrink-0 space-y-2 border-b border-stone-100 px-4 py-3">
              {/* Product search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  placeholder={t('chat.shoppingList.searchProduct', 'Buscar producto...')}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm text-stone-950 outline-none focus:border-stone-400 placeholder:text-stone-400"
                />
                {/* Search dropdown */}
                {productSearch.trim() && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-stone-100 bg-white shadow-lg">
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((p) => (
                        <button
                          key={p.product_id}
                          onClick={() => addProduct(p)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-stone-50"
                        >
                          {(p.images?.[0] || p.image) && (
                            <img src={p.images?.[0] || p.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-stone-950">{p.name}</p>
                            <p className="text-xs text-stone-500">{p.display_price || p.price} {p.display_currency || p.currency || 'EUR'}</p>
                          </div>
                          <Plus size={16} className="shrink-0 text-stone-400" />
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-xs text-stone-400">
                        {t('chat.shoppingList.notFound', 'No encontrado. Añadelo como texto libre.')}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Freetext input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={freetext}
                  onChange={(e) => setFreetext(e.target.value.slice(0, 200))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addFreetext(); }}
                  placeholder={t('chat.shoppingList.freetextPlaceholder', 'Ej: Pan del horno, leche...')}
                  className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-950 outline-none focus:border-stone-400 placeholder:text-stone-400"
                />
                <button
                  onClick={addFreetext}
                  disabled={!freetext.trim()}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-stone-950 text-white disabled:opacity-40"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
                  <ShoppingCart size={32} className="text-stone-200" />
                  <p className="text-sm text-stone-400">{t('chat.shoppingList.empty', 'La lista esta vacia.')}</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-50">
                  {/* Pending items */}
                  {pendingItems.map((item) => (
                    <ListItem
                      key={item.item_id}
                      item={item}
                      swiped={swipedItemId === item.item_id}
                      onSwipe={() => setSwipedItemId(swipedItemId === item.item_id ? null : item.item_id)}
                      onToggle={() => togglePurchased(item)}
                      onRemove={() => removeItem(item.item_id)}
                      onAddToCart={item.type === 'product' && !item.in_cart ? async () => {
                        try {
                          await apiClient.patch(`${BASE}/${conversationId}/list/items/${item.item_id}`, { in_cart: true });
                          // Also add to user cart
                          await apiClient.post('/cart/items', { product_id: item.product_id, quantity: 1 });
                          toast.success(t('chat.shoppingList.inCart', 'En el carrito'));
                          fetchList();
                        } catch { toast.error('Error'); }
                      } : null}
                      t={t}
                    />
                  ))}
                  {/* Purchased items */}
                  {purchasedItems.length > 0 && (
                    <>
                      <div className="bg-stone-50 px-4 py-1.5">
                        <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wide">{t('chat.shoppingList.purchased', 'Comprados')} ({purchasedItems.length})</span>
                      </div>
                      {purchasedItems.map((item) => (
                        <ListItem
                          key={item.item_id}
                          item={item}
                          swiped={swipedItemId === item.item_id}
                          onSwipe={() => setSwipedItemId(swipedItemId === item.item_id ? null : item.item_id)}
                          onToggle={() => togglePurchased(item)}
                          onRemove={() => removeItem(item.item_id)}
                          t={t}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Add all to cart button */}
            {productItemsForCart.length > 0 && (
              <div className="shrink-0 border-t border-stone-100 p-3">
                <button
                  onClick={addAllToCart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 py-3.5 text-sm font-semibold text-white active:bg-stone-800 min-h-[44px]"
                >
                  <ShoppingCart size={16} />
                  {t('chat.shoppingList.addAllToCart', 'Añadir todo al carrito')}
                </button>
                <p className="mt-1 text-center text-[11px] text-stone-400">
                  {t('chat.shoppingList.productsCount', '({{n}} productos HispaloShop)').replace('{{n}}', productItemsForCart.length)}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ListItem({ item, swiped, onSwipe, onToggle, onRemove, onAddToCart, t = (k, d) => d }) {
  const isPurchased = item.purchased;
  const displayName = item.product_name || item.freetext || '';

  return (
    <div className="relative overflow-hidden">
      {/* Swipe-reveal delete */}
      {swiped && (
        <button
          onClick={onRemove}
          className="absolute right-0 top-0 bottom-0 flex w-16 items-center justify-center bg-stone-200 text-stone-600"
        >
          <Trash2 size={16} />
        </button>
      )}
      <div
        className={`flex items-start gap-3 px-4 py-3 transition-transform ${swiped ? '-translate-x-16' : ''} ${isPurchased ? 'bg-stone-50' : 'bg-white'}`}
        onClick={onSwipe}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors min-w-[20px] ${
            isPurchased ? 'bg-stone-950 border-stone-950' : 'border-stone-300'
          }`}
        >
          {isPurchased && <Check size={14} className="text-white" strokeWidth={3} />}
        </button>

        {/* Thumbnail (products only) */}
        {item.type === 'product' && item.product_image && (
          <img src={item.product_image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${isPurchased ? 'text-stone-400 line-through' : 'text-stone-950'}`}>
            {displayName}
          </p>
          {item.type === 'product' && item.product_price != null && (
            <p className={`text-xs ${isPurchased ? 'text-stone-300' : 'text-stone-500'}`}>
              {item.product_price} {item.product_currency || 'EUR'}
            </p>
          )}
          {item.notes && (
            <p className="mt-0.5 text-xs text-stone-400 flex items-center gap-1">
              <StickyNote size={10} /> {item.notes}
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-stone-300">
            {isPurchased && item.purchased_by
              ? `${t('chat.shoppingList.purchasedBy', 'Comprado por')} ${item.purchased_by_name || item.purchased_by}`
              : `${t('chat.shoppingList.addedBy', 'Añadido por')} ${item.added_by_name || item.added_by}`}
          </p>
          {item.in_cart && !isPurchased && (
            <span className="mt-1 inline-block rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
              {t('chat.shoppingList.inCart', 'En el carrito')}
            </span>
          )}
        </div>

        {/* Individual add-to-cart button */}
        {onAddToCart && !isPurchased && !item.in_cart && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200"
            title={t('chat.shoppingList.addAllToCart', 'Al carrito')}
          >
            <ShoppingCart size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
