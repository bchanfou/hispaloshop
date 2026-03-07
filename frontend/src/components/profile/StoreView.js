import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Grid3X3, List } from 'lucide-react';
import ProductCard from './ProductCard';

const CATEGORIES = ['Todos', 'Aceites', 'Conservas', 'Quesos', 'Embutidos', 'Panadería'];

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Aceite de Oliva Virgen Extra Premium',
    category: 'Aceites',
    price: 24.90,
    originalPrice: 29.90,
    unit: '500ml',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400',
    rating: 4.9,
    reviews: 128,
    badge: '-17%'
  },
  {
    id: 2,
    name: 'Crema de Queso Curado Artesanal',
    category: 'Quesos',
    price: 8.50,
    unit: '250g',
    image: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400',
    rating: 4.8,
    reviews: 86
  },
  {
    id: 3,
    name: 'Jamón Ibérico de Bellota',
    category: 'Embutidos',
    price: 89.00,
    unit: '1kg',
    image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
    rating: 5.0,
    reviews: 234
  },
  {
    id: 4,
    name: 'Miel de Romero Natural',
    category: 'Conservas',
    price: 12.90,
    unit: '500g',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
    rating: 4.7,
    reviews: 52
  },
  {
    id: 5,
    name: 'Pan de Molde Artesanal con Nueces',
    category: 'Panadería',
    price: 5.90,
    unit: '500g',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    rating: 4.6,
    reviews: 41
  },
  {
    id: 6,
    name: 'Pack Degustación Aceites',
    category: 'Aceites',
    price: 45.00,
    unit: '3x250ml',
    image: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=400',
    rating: 4.9,
    reviews: 167,
    badge: 'Pack'
  }
];

function StoreView() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = MOCK_PRODUCTS.filter(p => 
    (activeCategory === 'Todos' || p.category === activeCategory) &&
    (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="px-4 pt-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F5F1E8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
            />
          </div>
          <button className="p-2.5 bg-[#F5F1E8] rounded-xl hover:bg-[#EBE6D5] transition-colors">
            <SlidersHorizontal className="w-5 h-5 text-[#1A1A1A]" />
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-[#2D5A3D] text-white'
                  : 'bg-[#F5F1E8] text-[#1A1A1A] hover:bg-[#EBE6D5]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Toggle & Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#6B7280]">
            {filteredProducts.length} productos
          </span>
          <div className="flex bg-[#F5F1E8] rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Grid3X3 className="w-4 h-4 text-[#1A1A1A]" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <List className="w-4 h-4 text-[#1A1A1A]" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className={`px-4 pb-4 ${
        viewMode === 'grid' 
          ? 'grid grid-cols-2 gap-3' 
          : 'flex flex-col gap-3'
      }`}>
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#6B7280]">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
}

export default StoreView;
