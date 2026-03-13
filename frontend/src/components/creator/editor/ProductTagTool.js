import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Package, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import apiClient from '../../../services/api/client';

function ProductTagTool({ tags, onAdd, onRemove }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showProductList) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiClient.get(`/products/intelligence-search`, {
          params: { q: searchQuery, limit: 8 },
          signal: controller.signal,
        });
        setResults(data?.items || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery, showProductList]);

  const handleSelectProduct = (product) => {
    onAdd(product, 150, 150);
    setShowProductList(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
          <ShoppingBag className="h-4 w-4 text-stone-950" />
          Productos etiquetados
        </h3>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
          {tags.length}/5
        </span>
      </div>

      {tags.length < 5 ? (
        <button
          type="button"
          onClick={() => setShowProductList(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-medium text-stone-700 transition-colors hover:border-stone-950 hover:bg-white hover:text-stone-950"
        >
          <Plus className="h-5 w-5" />
          Agregar producto
        </button>
      ) : null}

      {tags.length > 0 ? (
        <div className="space-y-2">
          <AnimatePresence>
            {tags.map((tag) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-stone-200">
                  {tag.productImage ? (
                    <img src={tag.productImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-stone-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-950">{tag.productName}</p>
                  <p className="text-xs font-medium text-stone-500">EUR {tag.productPrice}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(tag.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-500 ring-1 ring-stone-200 transition-colors hover:text-stone-950"
                  aria-label="Eliminar etiqueta de producto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}

      <p className="text-center text-xs text-stone-500">
        Arrastra las etiquetas sobre la imagen para colocarlas.
      </p>

      <AnimatePresence>
        {showProductList ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center"
            onClick={() => setShowProductList(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-100 p-4">
                <h3 className="text-lg font-semibold text-stone-950">Buscar producto</h3>
                <button
                  type="button"
                  onClick={() => setShowProductList(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-700 transition-colors hover:bg-stone-200"
                  aria-label="Cerrar busqueda de productos"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b border-stone-100 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar producto..."
                    className="h-12 w-full rounded-2xl bg-stone-50 pl-10 pr-4 text-sm text-stone-950 outline-none ring-1 ring-transparent transition-colors placeholder:text-stone-400 focus:ring-stone-950"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8 text-stone-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : null}

                  {!loading ? results.map((product) => (
                    <button
                      key={product.product_id || product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 text-left transition-colors hover:border-stone-100 hover:bg-stone-50"
                    >
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-stone-100">
                        {product.image ? (
                          <img src={product.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-7 w-7 text-stone-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-950">{product.name}</p>
                        <p className="text-xs text-stone-500">{product.producer_name || 'Hispaloshop'}</p>
                        <p className="mt-0.5 text-sm font-medium text-stone-700">EUR {product.price}</p>
                      </div>
                      <Plus className="h-5 w-5 text-stone-400" />
                    </button>
                  )) : null}

                  {!loading && results.length === 0 ? (
                    <div className="py-8 text-center text-stone-400">
                      <Package className="mx-auto mb-2 h-12 w-12 opacity-50" />
                      <p className="text-sm">No se encontraron productos</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default ProductTagTool;
