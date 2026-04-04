// @ts-nocheck
import React from 'react';
import { ShoppingBag, Search, Tag, X } from 'lucide-react';
import i18n from '../../locales/i18n';

interface StoryProductToolProps {
  productQuery: string;
  productResults: any[];
  productSearching: boolean;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  onSelectProduct: (product: any) => void;
}

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

export default function StoryProductTool({
  productQuery,
  productResults,
  productSearching,
  onQueryChange,
  onClear,
  onSelectProduct,
}: StoryProductToolProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl p-4 rounded-t-hs-xl z-20 flex flex-col gap-3 max-h-[55vh]">
      <div className="flex items-center gap-2">
        <ShoppingBag size={16} className="text-white/60 shrink-0" />
        <span className="text-sm font-semibold text-white">
          Etiquetar producto
        </span>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
        <Search size={16} className="text-white/40 shrink-0" />
        <input
          value={productQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar producto..."
          autoFocus
          aria-label={i18n.t(
            'create_story.buscarProductoParaEtiquetarEnLaHis',
            'Buscar producto para etiquetar en la historia',
          )}
          className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
        />
        {productQuery && (
          <button
            onClick={onClear}
            className="bg-transparent border-none cursor-pointer p-0"
            aria-label={i18n.t(
              'search.limpiarBusqueda',
              'Limpiar búsqueda',
            )}
          >
            <X size={14} className="text-white/40" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {productSearching && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!productSearching &&
          productQuery &&
          productResults.length === 0 && (
            <p className="text-center text-white/40 text-sm py-4">
              Sin resultados
            </p>
          )}

        {productResults.map((product, idx) => {
          const name = product.name || product.title;
          const img =
            product.image || product.thumbnail || product.image_url;
          const price = product.price;
          return (
            <button
              key={product.id || product._id || idx}
              onClick={() => onSelectProduct(product)}
              className="flex items-center gap-3 w-full px-2 py-2.5 bg-transparent border-none cursor-pointer rounded-2xl hover:bg-white/10 transition-colors text-left"
            >
              {img ? (
                <img
                  src={img}
                  alt={name || 'Producto'}
                  className="w-10 h-10 rounded-2xl object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <ShoppingBag size={16} className="text-white/30" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white font-medium block truncate">
                  {name}
                </span>
                {price != null && (
                  <span className="text-xs text-white/60 font-semibold">
                    {priceFormatter.format(price)}
                  </span>
                )}
              </div>
              <Tag size={14} className="text-white/30 shrink-0" />
            </button>
          );
        })}

        {!productQuery && (
          <p className="text-center text-white/30 text-xs py-4">
            Busca un producto de tu catálogo para añadirlo como sticker
            interactivo
          </p>
        )}
      </div>
    </div>
  );
}
