import React from 'react';
import { motion } from 'framer-motion';
import { Star, Plus, ShoppingBag, Heart } from 'lucide-react';

function ProductCard({ product, viewMode = 'grid', index = 0 }) {
  const isList = viewMode === 'list';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`group cursor-pointer ${
        isList ? 'flex gap-4 bg-white p-4 rounded-xl' : 'bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow'
      }`}
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${isList ? 'w-24 h-24 rounded-lg' : 'aspect-square'}`}>
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.badge && (
          <div className="absolute top-2 left-2 bg-[#E6A532] text-white text-xs font-bold px-2 py-1 rounded-full">
            {product.badge}
          </div>
        )}
        {!isList && (
          <button className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">
            <Heart className="w-4 h-4 text-[#1A1A1A]" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${!isList && 'p-3'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[#1A1A1A] text-sm line-clamp-2">
              {product.name}
            </h3>
            {product.category && (
              <p className="text-xs text-[#6B7280] mt-0.5">{product.category}</p>
            )}
          </div>
          {isList && (
            <button className="p-2 hover:bg-[#F5F1E8] rounded-full transition-colors">
              <Heart className="w-4 h-4 text-[#6B7280]" />
            </button>
          )}
        </div>

        <div className="flex items-end justify-between mt-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-[#1A1A1A]">
                €{product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-[#6B7280] line-through">
                  €{product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <span className="text-xs text-[#6B7280]">{product.unit}</span>
          </div>

          <button className="flex items-center gap-1 bg-[#2D5A3D] text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-[#234a31] transition-colors">
            <Plus className="w-4 h-4" />
            {!isList && <span>Añadir</span>}
          </button>
        </div>

        {product.rating && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-3.5 h-3.5 fill-[#E6A532] text-[#E6A532]" />
            <span className="text-xs font-medium">{product.rating}</span>
            <span className="text-xs text-[#6B7280]">({product.reviews})</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ProductCard;
