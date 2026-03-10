import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, Plus, Trash2, ShoppingBag, X } from 'lucide-react';
import { MOCK_PRODUCTS } from '../types/editor.types';

function ProductTagTool({ tags, onAdd, onUpdate, onRemove }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredProducts = MOCK_PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.seller.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    // Añadir tag en posición central por defecto
    onAdd(product, 150, 150);
    setShowProductList(false);
    setSearchQuery('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header con contador */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-stone-700 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-accent" />
          Productos etiquetados
        </h3>
        <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full">
          {tags.length}/5
        </span>
      </div>

      {/* Botón añadir */}
      {tags.length < 5 && (
        <button
          onClick={() => setShowProductList(true)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-accent text-accent hover:bg-accent/5 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Etiquetar producto</span>
        </button>
      )}

      {/* Lista de productos etiquetados */}
      {tags.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {tags.map((tag) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl"
              >
                <div className="w-12 h-12 rounded-lg bg-stone-200 flex items-center justify-center overflow-hidden">
                  {tag.productImage ? (
                    <img src={tag.productImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{tag.productName}</p>
                  <p className="text-xs text-accent font-semibold">€{tag.productPrice}</p>
                </div>
                <button
                  onClick={() => onRemove(tag.id)}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-stone-400 text-center">
        Arrastra las etiquetas en la imagen para posicionarlas sobre el producto
      </p>

      {/* Modal de selección de productos */}
      <AnimatePresence>
        {showProductList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
            onClick={() => setShowProductList(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-2xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-stone-100">
                <h3 className="font-semibold text-lg">Buscar producto</h3>
                <button
                  onClick={() => setShowProductList(false)}
                  className="p-2 hover:bg-stone-100 rounded-full"
                >
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-stone-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent"
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista de productos */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors text-left"
                    >
                      <div className="w-14 h-14 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-7 h-7 text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{product.name}</p>
                        <p className="text-xs text-stone-500">{product.seller}</p>
                        <p className="text-sm font-semibold text-accent mt-0.5">€{product.price}</p>
                      </div>
                      <Plus className="w-5 h-5 text-accent" />
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-8 text-stone-400">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No se encontraron productos</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProductTagTool;
