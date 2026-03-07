import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Search, SlidersHorizontal, Grid3X3, List, 
  X, ChevronDown, Star, MapPin, Heart, ShoppingBag 
} from 'lucide-react';
import { CATEGORIES } from '../components/feed/CategoryPills';

// Mock products data
const MOCK_PRODUCTS = [
  { id: 1, name: 'Aceite de Oliva Virgen Extra Premium', producer: 'Cortijo Andaluz', price: 24.90, originalPrice: 29.90, rating: 4.9, reviews: 128, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', discount: 15, isNew: false },
  { id: 2, name: 'Aceite EVOO DOP Sierra de Cazorla', producer: 'Olivar de la Sierra', price: 32.50, rating: 4.8, reviews: 89, image: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=400', isNew: true },
  { id: 3, name: 'Aceite de Oliva Arbequina 5L', producer: 'Masía Catalana', price: 45.00, rating: 4.7, reviews: 234, image: 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=400', isNew: false },
  { id: 4, name: 'Pack Aceites del Sur (3x500ml)', producer: 'Selección Andaluza', price: 38.90, rating: 4.9, reviews: 67, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', isNew: true },
  { id: 5, name: 'Aceite Infusado con Limón', producer: 'Citrus Oils', price: 18.50, rating: 4.6, reviews: 45, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', isNew: false },
  { id: 6, name: 'Aceite Ecológico Cold Press', producer: 'BioOlivar', price: 28.00, rating: 4.8, reviews: 156, image: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=400', isNew: false },
];

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  const category = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
  const Icon = category.icon;

  const removeFilter = (filter) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#1A1A1A]" />
            </button>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: category.bgColor }}
              >
                <Icon className="w-4 h-4" style={{ color: category.color }} />
              </div>
              <h1 className="text-lg font-bold text-[#1A1A1A]">{category.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/discover')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Search className="w-5 h-5 text-[#1A1A1A]" />
            </button>
            <button 
              onClick={() => setShowFilters(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5 text-[#1A1A1A]" />
            </button>
          </div>
        </div>

        {/* Results count and controls */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B7280]">156 productos encontrados</p>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Grid3X3 className="w-4 h-4 text-[#1A1A1A]" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                >
                  <List className="w-4 h-4 text-[#1A1A1A]" />
                </button>
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-gray-100 text-sm text-[#1A1A1A] pl-3 pr-8 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value="relevance">Relevancia</option>
                  <option value="price_asc">Precio: menor a mayor</option>
                  <option value="price_desc">Precio: mayor a menor</option>
                  <option value="bestsellers">Más vendidos</option>
                  <option value="rated">Mejor valorados</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeFilters.map((filter, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#2D5A3D]/10 text-[#2D5A3D] text-xs rounded-full"
                >
                  {filter}
                  <button onClick={() => removeFilter(filter)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button 
                onClick={() => setActiveFilters([])}
                className="text-xs text-[#6B7280] hover:text-[#1A1A1A]"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="p-4">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {MOCK_PRODUCTS.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/products/${product.id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="relative aspect-square">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {product.discount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      -{product.discount}%
                    </span>
                  )}
                  {product.isNew && (
                    <span className="absolute top-2 right-2 bg-[#2D5A3D] text-white text-xs font-bold px-2 py-1 rounded-full">
                      Nuevo
                    </span>
                  )}
                  <button className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                    <Heart className="w-4 h-4 text-[#1A1A1A]" />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-[#1A1A1A] line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#6B7280] mb-2">{product.producer}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3.5 h-3.5 fill-[#E6A532] text-[#E6A532]" />
                    <span className="text-xs font-medium">{product.rating}</span>
                    <span className="text-xs text-[#6B7280]">({product.reviews})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#2D5A3D]">
                      €{product.price.toFixed(2)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-[#6B7280] line-through">
                        €{product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {MOCK_PRODUCTS.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/products/${product.id}`)}
                className="flex gap-3 bg-white rounded-2xl p-3 shadow-sm"
              >
                <div className="relative w-24 h-24 flex-shrink-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {product.discount && (
                    <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      -{product.discount}%
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[#1A1A1A] line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#6B7280] mb-1">{product.producer}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3.5 h-3.5 fill-[#E6A532] text-[#E6A532]" />
                    <span className="text-xs font-medium">{product.rating}</span>
                    <span className="text-xs text-[#6B7280]">({product.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[#2D5A3D]">
                      €{product.price.toFixed(2)}
                    </span>
                    <button className="p-2 bg-[#2D5A3D] text-white rounded-full">
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State (example) */}
      {false && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 mb-6">
            <Search className="w-full h-full text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
            No encontramos productos con esos filtros
          </h3>
          <p className="text-[#6B7280] text-center mb-6">
            Prueba ajustando tus filtros o busca algo diferente
          </p>
          <button 
            onClick={() => setActiveFilters([])}
            className="px-6 py-3 bg-[#2D5A3D] text-white rounded-full font-medium"
          >
            Quitar filtros
          </button>
        </div>
      )}

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Filtrar</h3>
              <button onClick={() => setShowFilters(false)}>
                <X className="w-6 h-6 text-[#1A1A1A]" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Price Range */}
              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Rango de precio</h4>
                <div className="flex gap-2">
                  {['€0-10', '€10-25', '€25-50', '€50+'].map(range => (
                    <button
                      key={range}
                      onClick={() => setActiveFilters([...activeFilters, range])}
                      className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-[#1A1A1A] hover:border-[#2D5A3D] hover:bg-[#2D5A3D]/5 transition-colors"
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Características</h4>
                <div className="space-y-3">
                  {['Envío gratis', 'Producto BIO', 'De mi zona', 'Con descuento', 'Novedad'].map(feature => (
                    <label key={feature} className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActiveFilters([...activeFilters, feature]);
                          } else {
                            removeFilter(feature);
                          }
                        }}
                      />
                      <span className="text-[#1A1A1A]">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Producer Location */}
              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Ubicación del productor</h4>
                <div className="flex flex-wrap gap-2">
                  {['Andalucía', 'Cataluña', 'Castilla', 'Madrid', 'Otras'].map(location => (
                    <button
                      key={location}
                      onClick={() => setActiveFilters([...activeFilters, location])}
                      className="px-3 py-1.5 border border-gray-200 rounded-full text-sm text-[#1A1A1A] hover:border-[#2D5A3D] hover:text-[#2D5A3D] transition-colors"
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowFilters(false)}
              className="w-full mt-6 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
            >
              Aplicar filtros
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
