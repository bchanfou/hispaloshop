import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Grid3X3, List } from 'lucide-react';
import ProductCard from './ProductCard';

const getProductId = (product) => product?.product_id || product?.id || null;

const CATEGORIES = ['Todos', 'Aceites', 'Conservas', 'Quesos', 'Embutidos', 'Panadería'];

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Aceite de Oliva Virgen Extra Premium',
    category: 'Aceites',
    price: 24.9,
    originalPrice: 29.9,
    unit: '500 ml',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400',
    rating: 4.9,
    reviews: 128,
    badge: '-17%',
  },
  {
    id: 2,
    name: 'Crema de Queso Curado Artesanal',
    category: 'Quesos',
    price: 8.5,
    unit: '250 g',
    image: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400',
    rating: 4.8,
    reviews: 86,
  },
  {
    id: 3,
    name: 'Jamón Ibérico de Bellota',
    category: 'Embutidos',
    price: 89,
    unit: '1 kg',
    image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
    rating: 5,
    reviews: 234,
  },
  {
    id: 4,
    name: 'Miel de Romero Natural',
    category: 'Conservas',
    price: 12.9,
    unit: '500 g',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
    rating: 4.7,
    reviews: 52,
  },
  {
    id: 5,
    name: 'Pan de Molde Artesanal con Nueces',
    category: 'Panadería',
    price: 5.9,
    unit: '500 g',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    rating: 4.6,
    reviews: 41,
  },
  {
    id: 6,
    name: 'Pack Degustación Aceites',
    category: 'Aceites',
    price: 45,
    unit: '3x250 ml',
    image: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=400',
    rating: 4.9,
    reviews: 167,
    badge: 'Pack',
  },
];

function StoreView() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = MOCK_PRODUCTS.filter(
    (product) =>
      (activeCategory === 'Todos' || product.category === activeCategory) &&
      (searchQuery === '' || product.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3 px-4 pt-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl bg-background-subtle py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button className="rounded-xl bg-background-subtle p-2.5 transition-colors hover:bg-[#EBE6D5]" aria-label="Filtrar productos">
            <SlidersHorizontal className="h-5 w-5 text-gray-900" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === category
                  ? 'bg-accent text-white'
                  : 'bg-background-subtle text-gray-900 hover:bg-[#EBE6D5]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">{filteredProducts.length} productos</span>
          <div className="flex rounded-lg bg-background-subtle p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              aria-label="Vista en cuadrícula"
            >
              <Grid3X3 className="h-4 w-4 text-gray-900" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded p-1.5 transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              aria-label="Vista en lista"
            >
              <List className="h-4 w-4 text-gray-900" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`px-4 pb-4 ${
          viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'
        }`}
      >
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={getProductId(product) || `${product.name}-${index}`}
              product={product}
              viewMode={viewMode}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-text-muted">No se encontraron productos</p>
        </div>
      ) : null}
    </div>
  );
}

export default StoreView;
