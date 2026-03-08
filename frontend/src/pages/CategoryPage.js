import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Search, SlidersHorizontal, Grid3X3, List, 
  X, ChevronDown, Star, MapPin, Heart, ShoppingBag, Loader2
} from 'lucide-react';
import { CATEGORIES } from '../components/feed/CategoryPills';
import { useProducts } from '../hooks/useProducts';
import { useLocale } from '../context/LocaleContext';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { convertAndFormatPrice } = useLocale();
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  const category = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
  const Icon = category.icon;

  // Fetch real products from API
  const { products, isLoading, error } = useProducts({ 
    category: categoryId,
    sort: sortBy,
  });

  const removeFilter = (filter) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar productos</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#2D5A3D] text-white rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

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
            <p className="text-sm text-[#6B7280]">
              {isLoading ? 'Cargando...' : `${products.length} productos encontrados`}
            </p>
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
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-24 h-24 mb-6">
              <Search className="w-full h-full text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
              No encontramos productos
            </h3>
            <p className="text-[#6B7280] text-center mb-6">
              Prueba con otra categoría o ajusta tus filtros
            </p>
            <button 
              onClick={() => setActiveFilters([])}
              className="px-6 py-3 bg-[#2D5A3D] text-white rounded-full font-medium"
            >
              Quitar filtros
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, index) => (
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
                    src={product.image_url || product.images?.[0] || '/placeholder-product.png'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {product.discount > 0 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      -{product.discount}%
                    </span>
                  )}
                  {product.is_new && (
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
                  <p className="text-xs text-[#6B7280] mb-2">{product.producer_name}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3.5 h-3.5 fill-[#E6A532] text-[#E6A532]" />
                    <span className="text-xs font-medium">{product.rating || '4.5'}</span>
                    <span className="text-xs text-[#6B7280]">({product.reviews_count || 0})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#2D5A3D]">
                      {convertAndFormatPrice(product.price)}
                    </span>
                    {product.original_price && (
                      <span className="text-sm text-[#6B7280] line-through">
                        {convertAndFormatPrice(product.original_price)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => (
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
                    src={product.image_url || product.images?.[0] || '/placeholder-product.png'}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {product.discount > 0 && (
                    <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      -{product.discount}%
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[#1A1A1A] line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#6B7280] mb-1">{product.producer_name}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3.5 h-3.5 fill-[#E6A532] text-[#E6A532]" />
                    <span className="text-xs font-medium">{product.rating || '4.5'}</span>
                    <span className="text-xs text-[#6B7280]">({product.reviews_count || 0})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[#2D5A3D]">
                      {convertAndFormatPrice(product.price)}
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
