import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, SlidersHorizontal, Sparkles, TrendingUp, MapPin, 
  Store, Package, ChefHat, FileCheck, Grid3X3, Flame,
  ArrowRight, Star, X, Droplets, Cookie, Beef, Croissant, 
  CupSoda, Baby, Dog, Cherry, Leaf, WheatOff, Gift
} from 'lucide-react';

// Navigation tabs for main sections
const MAIN_SECTIONS = [
  { id: 'todo', label: 'Todo', icon: Grid3X3 },
  { id: 'tiendas', label: 'Tiendas', icon: Store },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'recetas', label: 'Recetas', icon: ChefHat },
  { id: 'certificados', label: 'Certificados', icon: FileCheck },
];

// Minimalist categories - horizontal scroll
const CATEGORIES_MINI = [
  { id: 'aceites', label: 'Aceites', icon: Droplets, color: '#2D5A3D', count: 234 },
  { id: 'quesos', label: 'Quesos', icon: Cookie, color: '#E6A532', count: 189 },
  { id: 'embutidos', label: 'Embutidos', icon: Beef, color: '#DC2626', count: 156 },
  { id: 'panaderia', label: 'Panadería', icon: Croissant, color: '#D97706', count: 98 },
  { id: 'bebidas', label: 'Bebidas', icon: CupSoda, color: '#0891B2', count: 145 },
  { id: 'bebes', label: 'Bebés', icon: Baby, color: '#EC4899', count: 67 },
  { id: 'mascotas', label: 'Mascotas', icon: Dog, color: '#7C3AED', count: 89 },
  { id: 'snacks', label: 'Snacks', icon: Cherry, color: '#EA580C', count: 112 },
  { id: 'organico', label: 'Orgánico', icon: Leaf, color: '#16A34A', count: 78 },
  { id: 'singluten', label: 'Sin gluten', icon: WheatOff, color: '#65A30D', count: 45 },
  { id: 'packs', label: 'Packs', icon: Gift, color: '#0891B2', count: 34 },
  { id: 'trending', label: 'Trending', icon: Flame, color: '#DC2626', count: 56 },
];

// Mock data
const TRENDING_HASHTAGS = [
  { tag: 'AOVE', count: 12500, growth: 45 },
  { tag: 'QuesoArtesano', count: 8900, growth: 23 },
  { tag: 'SinGluten', count: 6700, growth: 67 },
  { tag: 'DesayunoSaludable', count: 5400, growth: 12 },
  { tag: 'Mediterraneo', count: 4300, growth: 34 },
];

const FEATURED_PRODUCERS = [
  { id: 1, name: 'Cortijo Andaluz', location: 'Córdoba', rating: 4.9, image: 'https://images.unsplash.com/photo-1548685913-fe6678babe8d?w=200', products: 23 },
  { id: 2, name: 'Quesería La Antigua', location: 'Valladolid', rating: 4.8, image: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=200', products: 15 },
  { id: 3, name: 'Miel del Sur', location: 'Granada', rating: 4.9, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200', products: 12 },
];

const RECENT_PRODUCTS = [
  { id: 1, name: 'Aceite EVOO Premium', producer: 'Cortijo Andaluz', price: 24.90, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300' },
  { id: 2, name: 'Queso Curado DOP', producer: 'Quesería La Antigua', price: 18.50, image: 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=300' },
  { id: 3, name: 'Miel Ecológica', producer: 'Miel del Sur', price: 12.90, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300' },
  { id: 4, name: 'Pack Desayuno', producer: 'Varios', price: 32.00, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300' },
];

const RECIPES = [
  { id: 1, name: 'Tarta de queso', author: 'María L.', time: '45 min', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=300' },
  { id: 2, name: 'Gazpacho andaluz', author: 'Cortijo A.', time: '15 min', image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=300' },
  { id: 3, name: 'Croquetas caseras', author: 'La Antigua', time: '60 min', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300' },
];

const CERTIFICATES = [
  { id: 1, name: 'DOP Queso Manchego', count: 45 },
  { id: 2, name: 'Ecológico Europeo', count: 123 },
  { id: 3, name: 'IGP Aceite Baena', count: 67 },
  { id: 4, name: 'Artesano Alimentario', count: 89 },
];

const DiscoverPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('todo');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    navigate(`/category/${categoryId}`);
  };

  const handleSectionClick = (sectionId) => {
    if (sectionId === 'tiendas') navigate('/stores');
    else if (sectionId === 'productos') navigate('/products');
    else if (sectionId === 'recetas') navigate('/recipes');
    else if (sectionId === 'certificados') navigate('/certificates');
    else setActiveTab(sectionId);
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      {/* Sticky Header with Search */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
            <input
              type="text"
              placeholder="¿Qué buscas?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              className="w-full pl-12 pr-12 py-3 bg-gray-100 rounded-full text-[#1A1A1A] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
            />
            <button 
              onClick={() => setShowFilters(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <SlidersHorizontal className="w-5 h-5 text-[#6B7280]" />
            </button>
          </div>
        </div>

        {/* Main Sections Tabs - Horizontal Scroll */}
        <div className="border-t border-stone-100">
          <div className="flex overflow-x-auto px-4 py-2 gap-2 scrollbar-hide">
            {MAIN_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeTab === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-[#2D5A3D] text-white' 
                      : 'bg-stone-100 text-[#1A1A1A] hover:bg-stone-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Mini Pills - Horizontal Scroll */}
        <div className="border-t border-stone-100 bg-white/50 backdrop-blur">
          <div className="flex overflow-x-auto px-4 py-2 gap-2 scrollbar-hide">
            {CATEGORIES_MINI.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border whitespace-nowrap transition-all ${
                    isSelected 
                      ? 'border-[#2D5A3D] bg-[#2D5A3D] text-white' 
                      : 'border-stone-200 bg-white text-[#1A1A1A] hover:border-[#2D5A3D]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? 'white' : cat.color }} />
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        
        {/* TODO Tab - Show everything */}
        {(activeTab === 'todo' || activeTab === 'productos') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Productos destacados</h2>
              <button 
                onClick={() => navigate('/products')}
                className="text-sm text-[#2D5A3D] font-medium flex items-center gap-1"
              >
                Ver todo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {RECENT_PRODUCTS.map((product) => (
                <motion.button
                  key={product.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{product.name}</p>
                    <p className="text-xs text-[#6B7280] truncate">{product.producer}</p>
                    <p className="text-base font-bold text-[#2D5A3D] mt-1">€{product.price.toFixed(2)}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* Trending Topics */}
        {(activeTab === 'todo') && (
          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Tendencias</h2>
            <div className="flex flex-wrap gap-2">
              {TRENDING_HASHTAGS.map((hashtag, index) => (
                <motion.button
                  key={index}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSearch(hashtag.tag)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-sm text-[#1A1A1A] hover:border-[#2D5A3D] hover:text-[#2D5A3D] transition-colors"
                >
                  #{hashtag.tag}
                  {hashtag.growth > 50 && (
                    <Flame className="w-3.5 h-3.5 text-[#DC2626]" />
                  )}
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* TIENDAS Tab */}
        {(activeTab === 'todo' || activeTab === 'tiendas') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Tiendas destacadas</h2>
              <button 
                onClick={() => navigate('/stores')}
                className="text-sm text-[#2D5A3D] font-medium flex items-center gap-1"
              >
                Ver mapa <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {FEATURED_PRODUCERS.map((producer) => (
                <motion.button
                  key={producer.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/store/${producer.id}`)}
                  className="flex-shrink-0 w-40 bg-white rounded-2xl p-3 shadow-sm text-center"
                >
                  <img
                    src={producer.image}
                    alt={producer.name}
                    className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                  />
                  <p className="text-sm font-semibold text-[#1A1A1A] truncate">{producer.name}</p>
                  <div className="flex items-center justify-center gap-1 text-xs text-[#6B7280]">
                    <MapPin className="w-3 h-3" />
                    {producer.location}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs mt-1">
                    <Star className="w-3 h-3 fill-[#E6A532] text-[#E6A532]" />
                    <span className="font-medium">{producer.rating}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* RECETAS Tab */}
        {(activeTab === 'todo' || activeTab === 'recetas') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Recetas populares</h2>
              <button 
                onClick={() => navigate('/recipes')}
                className="text-sm text-[#2D5A3D] font-medium flex items-center gap-1"
              >
                Ver todas <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {RECIPES.map((recipe) => (
                <motion.button
                  key={recipe.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
                  className="w-full flex items-center gap-4 bg-white rounded-2xl p-3 shadow-sm"
                >
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-[#1A1A1A]">{recipe.name}</p>
                    <p className="text-sm text-[#6B7280]">Por {recipe.author}</p>
                    <p className="text-xs text-[#2D5A3D] mt-1">⏱ {recipe.time}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICADOS Tab */}
        {(activeTab === 'todo' || activeTab === 'certificados') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Certificados oficiales</h2>
              <button 
                onClick={() => navigate('/certificates')}
                className="text-sm text-[#2D5A3D] font-medium flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CERTIFICATES.map((cert) => (
                <motion.button
                  key={cert.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/certificates')}
                  className="bg-white rounded-xl p-4 text-left shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center mb-2">
                    <FileCheck className="w-5 h-5 text-[#2D5A3D]" />
                  </div>
                  <p className="text-sm font-medium text-[#1A1A1A]">{cert.name}</p>
                  <p className="text-xs text-[#6B7280]">{cert.count} productos</p>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* HI AI Section */}
        {activeTab === 'todo' && (
          <section className="bg-gradient-to-r from-[#2D5A3D]/5 to-[#E6A532]/5 rounded-2xl p-5 border border-[#2D5A3D]/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[#1A1A1A]">¿Necesitas ayuda?</h2>
                <p className="text-xs text-[#6B7280]">Pregunta a nuestra IA</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/chat')}
              className="w-full py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
            >
              🤖 Hablar con HI
            </button>
          </section>
        )}
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

            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Categorías</h4>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES_MINI.map(cat => (
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

              <button 
                onClick={() => setShowFilters(false)}
                className="w-full py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234a31] transition-colors"
              >
                Aplicar filtros
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DiscoverPage;
