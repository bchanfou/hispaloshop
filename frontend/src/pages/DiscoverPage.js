import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, SlidersHorizontal, Sparkles, TrendingUp, MapPin, 
  Droplets, Milk, Beef, Croissant, CupSoda, Baby, Dog, 
  Cherry, Leaf, WheatOff, Gift, Flame, ChevronRight, 
  Mic, X, Filter, ArrowRight, Store, Star
} from 'lucide-react';
import { CATEGORIES } from '../components/feed/CategoryPills';

// Mock data
const TRENDING_HASHTAGS = [
  { tag: 'AOVE', count: 12500, growth: 45 },
  { tag: 'QuesoArtesano', count: 8900, growth: 23 },
  { tag: 'SinGluten', count: 6700, growth: 67 },
  { tag: 'DesayunoSaludable', count: 5400, growth: 12 },
  { tag: 'Mediterraneo', count: 4300, growth: 34 },
  { tag: 'ParaRegalar', count: 3200, growth: 89 },
  { tag: 'EcoFriendly', count: 2800, growth: 56 },
  { tag: 'Keto', count: 2100, growth: 78 },
];

const HI_RECOMMENDATIONS = [
  { id: 1, name: 'Queso Curado DOP', producer: 'Quesería La Antigua', price: 18.50, image: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=300', reason: 'Marida con el vino que viste ayer' },
  { id: 2, name: 'Aceite Premium EVOO', producer: 'Cortijo Andaluz', price: 24.90, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300', reason: 'Basado en tu historial de compras' },
  { id: 3, name: 'Pack Desayuno', producer: 'Miel del Sur', price: 32.00, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300', reason: 'Para tu cena de hoy' },
];

const FEATURED_PRODUCERS = [
  { id: 1, name: 'Cortijo Andaluz', location: 'Córdoba', rating: 4.9, image: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=200', products: 23 },
  { id: 2, name: 'Quesería La Antigua', location: 'Valladolid', rating: 4.8, image: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=200', products: 15 },
  { id: 3, name: 'Miel del Sur', location: 'Granada', rating: 4.9, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200', products: 12 },
  { id: 4, name: 'Embutidos Selectos', location: 'Salamanca', rating: 4.7, image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=200', products: 18 },
];

const RECENT_SEARCHES = [
  'Miel ecológica',
  'Queso curado',
  'Aceite para regalar',
];

const POPULAR_SEARCHES = [
  'Aceite de oliva virgen extra',
  'Queso para lacto-intolerantes',
  'Pack regalo Navidad',
  'Productores cerca de Madrid',
];

const DiscoverPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const scrollRef = useRef(null);

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/category/${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
            <input
              type="text"
              placeholder="¿Qué buscas?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              className="w-full pl-12 pr-12 py-3 bg-gray-100 rounded-full text-[#1A1A1A] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
            />
            <button 
              onClick={() => setShowFilters(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <SlidersHorizontal className="w-5 h-5 text-[#6B7280]" />
            </button>
            
            {/* Search Suggestions Dropdown */}
            {isSearchFocused && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl overflow-hidden"
              >
                {searchQuery ? (
                  <div className="p-4">
                    <p className="text-sm text-[#6B7280] mb-2">Sugerencias</p>
                    {POPULAR_SEARCHES.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSearch(suggestion)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left"
                      >
                        <Search className="w-4 h-4 text-[#6B7280]" />
                        <span className="text-[#1A1A1A]">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="text-sm text-[#6B7280] mb-2">Búsquedas recientes</p>
                    {RECENT_SEARCHES.map((search, i) => (
                      <button
                        key={i}
                        onClick={() => handleSearch(search)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Search className="w-4 h-4 text-[#6B7280]" />
                          <span className="text-[#1A1A1A]">{search}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#6B7280]" />
                      </button>
                    ))}
                    <hr className="my-3" />
                    <p className="text-sm text-[#6B7280] mb-2">Búsquedas populares</p>
                    {POPULAR_SEARCHES.map((search, i) => (
                      <button
                        key={i}
                        onClick={() => handleSearch(search)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left"
                      >
                        <TrendingUp className="w-4 h-4 text-[#E6A532]" />
                        <span className="text-[#1A1A1A]">{search}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Category Grid */}
        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Explorar categorías</h2>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.filter(c => c.id !== 'para-ti').map((category, index) => {
              const Icon = category.icon;
              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleCategoryClick(category.id)}
                  className="relative aspect-square rounded-2xl overflow-hidden group"
                  style={{ backgroundColor: category.bgColor }}
                >
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <Icon className="w-full h-full" style={{ color: category.color }} />
                  </div>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: category.color }} />
                    </div>
                    <span className="text-xs font-medium text-[#1A1A1A] text-center leading-tight">
                      {category.label}
                    </span>
                  </div>

                  {/* Product count badge */}
                  <span className="absolute bottom-2 right-2 text-[10px] font-medium text-[#6B7280] bg-white/80 px-1.5 py-0.5 rounded-full">
                    {Math.floor(Math.random() * 200) + 50}
                  </span>

                  {category.badge && (
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      category.badge === 'Hot' ? 'bg-red-500 text-white' : 'bg-[#2D5A3D] text-white'
                    }`}>
                      {category.badge}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Trending Topics */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Tendencias</h2>
            <button className="text-sm text-[#2D5A3D] font-medium">Ver todas</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TRENDING_HASHTAGS.map((hashtag, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSearch(hashtag.tag)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5A3D] text-white rounded-full text-sm font-medium hover:bg-[#234a31] transition-colors"
              >
                #{hashtag.tag}
                {hashtag.growth > 50 && (
                  <Flame className="w-3.5 h-3.5 text-[#E6A532]" />
                )}
              </motion.button>
            ))}
          </div>
        </section>

        {/* HI AI Recommendations */}
        <section className="bg-gradient-to-r from-[#2D5A3D]/5 to-[#E6A532]/5 rounded-2xl p-4 border border-[#2D5A3D]/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#2D5A3D] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#1A1A1A]">Recomendado para ti</h2>
              <p className="text-xs text-[#6B7280]">Basado en tu historial</p>
            </div>
          </div>
          
          <p className="text-sm text-[#1A1A1A] mb-4 italic">
            "Maridan con el vino que viste ayer"
          </p>

          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {HI_RECOMMENDATIONS.map((product) => (
              <motion.button
                key={product.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/products/${product.id}`)}
                className="flex-shrink-0 w-32 bg-white rounded-xl overflow-hidden shadow-sm"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-24 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs font-medium text-[#1A1A1A] truncate">{product.name}</p>
                  <p className="text-xs text-[#6B7280] truncate">{product.producer}</p>
                  <p className="text-sm font-bold text-[#2D5A3D]">€{product.price.toFixed(2)}</p>
                </div>
              </motion.button>
            ))}
          </div>

          <button 
            onClick={() => navigate('/chat')}
            className="w-full mt-3 py-2 bg-[#2D5A3D] text-white rounded-lg text-sm font-medium hover:bg-[#234a31] transition-colors"
          >
            🤖 Preguntar a HI
          </button>
        </section>

        {/* Featured Producers */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Productores del mes</h2>
            <button 
              onClick={() => navigate('/stores')}
              className="text-sm text-[#2D5A3D] font-medium"
            >
              Ver mapa
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {FEATURED_PRODUCERS.map((producer) => (
              <motion.button
                key={producer.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/store/${producer.id}`)}
                className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 shadow-sm text-center"
              >
                <img
                  src={producer.image}
                  alt={producer.name}
                  className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                />
                <p className="text-sm font-semibold text-[#1A1A1A] truncate">{producer.name}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-[#6B7280] mb-1">
                  <MapPin className="w-3 h-3" />
                  {producer.location}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs">
                  <Star className="w-3 h-3 fill-[#E6A532] text-[#E6A532]" />
                  <span className="font-medium text-[#1A1A1A]">{producer.rating}</span>
                  <span className="text-[#6B7280]">• {producer.products} prod.</span>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => navigate('/products')}
            className="p-4 bg-white rounded-2xl text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <Store className="w-6 h-6 text-[#2D5A3D] mb-2" />
            <p className="font-medium text-[#1A1A1A]">Ver todo el catálogo</p>
            <p className="text-xs text-[#6B7280]">1,234 productos</p>
          </button>
          <button 
            onClick={() => navigate('/discover?filter=nearby')}
            className="p-4 bg-white rounded-2xl text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <MapPin className="w-6 h-6 text-[#16A34A] mb-2" />
            <p className="font-medium text-[#1A1A1A]">Productores cerca</p>
            <p className="text-xs text-[#6B7280]">23 en tu zona</p>
          </button>
        </section>
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Filtrar resultados</h3>
              <button onClick={() => setShowFilters(false)}>
                <X className="w-6 h-6 text-[#1A1A1A]" />
              </button>
            </div>

            {/* Filter sections */}
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Categorías</h4>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(c => c.id !== 'para-ti').map(cat => (
                    <button
                      key={cat.id}
                      className="px-3 py-1.5 border border-gray-200 rounded-full text-sm text-[#1A1A1A] hover:border-[#2D5A3D] hover:text-[#2D5A3D] transition-colors"
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Precio</h4>
                <div className="flex gap-2">
                  {['€0-10', '€10-25', '€25-50', '€50+'].map(range => (
                    <button
                      key={range}
                      className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-[#1A1A1A] hover:border-[#2D5A3D] hover:bg-[#2D5A3D]/5 transition-colors"
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Características</h4>
                <div className="space-y-2">
                  {['Envío gratis', 'Producto BIO', 'De mi zona', 'Con descuento'].map(feature => (
                    <label key={feature} className="flex items-center gap-3">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]" />
                      <span className="text-[#1A1A1A]">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Ordenar por</h4>
                <div className="space-y-2">
                  {['Relevancia', 'Precio: menor a mayor', 'Precio: mayor a menor', 'Más vendidos', 'Mejor valorados'].map((sort, i) => (
                    <label key={sort} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="sort" 
                        defaultChecked={i === 0}
                        className="w-5 h-5 text-[#2D5A3D] focus:ring-[#2D5A3D]" 
                      />
                      <span className="text-[#1A1A1A]">{sort}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowFilters(false)}
              className="w-full mt-6 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
            >
              Ver 234 resultados
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
