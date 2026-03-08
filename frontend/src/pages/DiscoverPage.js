import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  MapPin,
  Store,
  Package,
  ChefHat,
  Grid3X3,
  Flame,
  ArrowRight,
  Star,
  X,
  Droplets,
  Cookie,
  Beef,
  Croissant,
  CupSoda,
  Baby,
  Dog,
  Cherry,
  Leaf,
  WheatOff,
  Gift,
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useStores } from '../hooks/useStores';
import { api } from '../lib/api';

const MAIN_SECTIONS = [
  { id: 'todo', label: 'Todo', icon: Grid3X3 },
  { id: 'tiendas', label: 'Tiendas', icon: Store },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'recetas', label: 'Recetas', icon: ChefHat },
];

const CATEGORIES_MINI = [
  { id: 'aceites', label: 'Aceites', icon: Droplets, color: '#2D5A3D' },
  { id: 'quesos', label: 'Quesos', icon: Cookie, color: '#E6A532' },
  { id: 'embutidos', label: 'Embutidos', icon: Beef, color: '#DC2626' },
  { id: 'panaderia', label: 'Panaderia', icon: Croissant, color: '#D97706' },
  { id: 'bebidas', label: 'Bebidas', icon: CupSoda, color: '#0891B2' },
  { id: 'bebes', label: 'Bebes', icon: Baby, color: '#EC4899' },
  { id: 'mascotas', label: 'Mascotas', icon: Dog, color: '#7C3AED' },
  { id: 'snacks', label: 'Snacks', icon: Cherry, color: '#EA580C' },
  { id: 'organico', label: 'Organico', icon: Leaf, color: '#16A34A' },
  { id: 'singluten', label: 'Sin gluten', icon: WheatOff, color: '#65A30D' },
  { id: 'packs', label: 'Packs', icon: Gift, color: '#0891B2' },
  { id: 'trending', label: 'Trending', icon: Flame, color: '#DC2626' },
];

const fallbackTrending = [
  { tag: 'AOVE', count: 12500, growth: 45 },
  { tag: 'QuesoArtesano', count: 8900, growth: 23 },
  { tag: 'SinGluten', count: 6700, growth: 67 },
];

const fallbackRecipes = [
  {
    id: 1,
    name: 'Tarta de queso',
    author: 'Maria L.',
    time: '45 min',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=300',
  },
  {
    id: 2,
    name: 'Gazpacho andaluz',
    author: 'Cortijo A.',
    time: '15 min',
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=300',
  },
  {
    id: 3,
    name: 'Croquetas caseras',
    author: 'La Antigua',
    time: '60 min',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300',
  },
];

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('todo');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  const { products, isLoading: loadingProducts } = useProducts({ limit: '4' });
  const { stores, isLoading: loadingStores } = useStores({});

  useEffect(() => {
    const fetchTrendingAndRecipes = async () => {
      try {
        try {
          const trending = await api.getTrendingHashtags();
          setTrendingHashtags(trending?.hashtags?.slice(0, 5) || fallbackTrending);
        } catch {
          setTrendingHashtags(fallbackTrending);
        }

        try {
          const recipesData = await api.request('/recipes?limit=3');
          setRecipes(recipesData?.recipes || fallbackRecipes);
        } catch {
          setRecipes(fallbackRecipes);
        }
      } finally {
        setLoadingRecipes(false);
      }
    };

    fetchTrendingAndRecipes();
  }, []);

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  const handleCategoryClick = (categoryId) => {
    const nextCategory = categoryId === selectedCategory ? null : categoryId;
    setSelectedCategory(nextCategory);
    navigate(`/category/${categoryId}`);
  };

  const handleSectionClick = (sectionId) => {
    if (sectionId === 'tiendas') {
      navigate('/stores');
      return;
    }

    if (sectionId === 'productos') {
      navigate('/products');
      return;
    }

    if (sectionId === 'recetas') {
      navigate('/recipes');
      return;
    }

    setActiveTab(sectionId);
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-28 md:pb-32">
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Que buscas?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              className="w-full pl-12 pr-12 py-3 text-base bg-gray-100 rounded-full text-[#1A1A1A] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
            />
            <button
              onClick={() => setShowFilters(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
              aria-label="Abrir filtros"
            >
              <SlidersHorizontal className="w-5 h-5 text-[#6B7280]" />
            </button>
          </div>
        </div>

        <div className="border-t border-stone-100">
          <div className="flex overflow-x-auto px-4 py-2 gap-2 scrollbar-hide snap-x snap-mandatory">
            {MAIN_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeTab === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`shrink-0 snap-start flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full whitespace-nowrap transition-all ${
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

        <div className="border-t border-stone-100 bg-white/50 backdrop-blur">
          <div className="flex overflow-x-auto px-4 py-2 gap-2 scrollbar-hide snap-x snap-mandatory">
            {CATEGORIES_MINI.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`shrink-0 snap-start flex items-center gap-1.5 px-3 py-2 rounded-full border whitespace-nowrap transition-all ${
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

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#2D5A3D]" />
            <h2 className="text-lg font-bold text-[#1A1A1A]">Tendencias</h2>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {trendingHashtags.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(`/products?hashtag=${item.tag}`)}
                className="shrink-0 px-4 py-2 bg-white rounded-full border border-stone-200 hover:border-[#2D5A3D] transition-colors"
              >
                <span className="text-sm font-medium text-[#1A1A1A]">#{item.tag}</span>
                <span className="text-xs text-[#6B7280] ml-2">{item.count.toLocaleString()}</span>
                {item.growth > 0 && (
                  <span className="text-xs text-green-600 ml-1">+{item.growth}%</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {(activeTab === 'todo' || activeTab === 'productos') && (
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Productos destacados</h2>
              <button
                onClick={() => navigate('/products')}
                className="shrink-0 text-sm text-[#2D5A3D] font-medium flex items-center gap-1"
              >
                Ver todo <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                    <div className="w-full h-32 sm:h-40 bg-stone-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-stone-200 rounded w-3/4" />
                      <div className="h-3 bg-stone-200 rounded w-1/2" />
                      <div className="h-4 bg-stone-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {products.slice(0, 4).map((product) => (
                  <motion.button
                    key={product.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/products/${product.id}`)}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm text-left"
                  >
                    <img
                      src={product.image_url || product.images?.[0] || '/placeholder-product.png'}
                      alt={product.name}
                      className="w-full h-32 sm:h-40 object-cover"
                    />
                    <div className="p-3">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{product.name}</p>
                      <p className="text-xs text-[#6B7280] truncate">{product.producer_name || product.producer_id}</p>
                      <p className="text-sm font-bold text-[#2D5A3D] mt-1">EUR {product.price?.toFixed(2)}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </section>
        )}

        {(activeTab === 'todo' || activeTab === 'tiendas') && (
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Tiendas destacadas</h2>
              <button
                onClick={() => navigate('/stores')}
                className="shrink-0 text-sm text-[#2D5A3D] font-medium flex items-center gap-1"
              >
                Ver todo <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {loadingStores ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-3 flex gap-3 animate-pulse">
                    <div className="w-16 h-16 rounded-xl bg-stone-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-stone-200 rounded w-1/2" />
                      <div className="h-3 bg-stone-200 rounded w-1/3" />
                      <div className="h-3 bg-stone-200 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <Store className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay tiendas disponibles</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {stores.slice(0, 3).map((store) => (
                  <motion.button
                    key={store.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/store/${store.slug}`)}
                    className="w-full bg-white rounded-2xl p-3 flex gap-3 shadow-sm text-left"
                  >
                    <img
                      src={store.logo || store.hero_image || '/placeholder-store.png'}
                      alt={store.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="font-medium text-[#1A1A1A] truncate">{store.name}</h3>
                      <p className="text-xs text-[#6B7280] flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {store.location || 'Espana'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-0.5 text-xs text-[#6B7280]">
                          <Star className="w-3 h-3 fill-[#E6A532] text-[#E6A532]" />
                          {store.rating || '4.5'}
                        </span>
                        <span className="text-xs text-[#6B7280]">
                          {store.product_count || 0} productos
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </section>
        )}

        {(activeTab === 'todo' || activeTab === 'recetas') && (
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Recetas populares</h2>
              <button
                onClick={() => navigate('/recipes')}
                className="shrink-0 text-sm text-[#2D5A3D] font-medium flex items-center gap-1"
              >
                Ver todo <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {loadingRecipes ? (
              <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[152px] sm:w-40 md:w-full bg-white rounded-xl overflow-hidden animate-pulse">
                    <div className="w-full h-24 sm:h-28 bg-stone-200" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-stone-200 rounded w-3/4" />
                      <div className="h-2 bg-stone-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible">
                {recipes.map((recipe) => (
                  <motion.button
                    key={recipe.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/recipes/${recipe.id}`)}
                    className="flex-shrink-0 w-[152px] sm:w-40 md:w-full bg-white rounded-xl overflow-hidden shadow-sm text-left"
                  >
                    <img
                      src={recipe.image || '/placeholder-recipe.png'}
                      alt={recipe.name}
                      className="w-full h-24 sm:h-28 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{recipe.name}</p>
                      <p className="text-xs text-[#6B7280] truncate">Por {recipe.author}</p>
                      <p className="text-xs text-[#2D5A3D]">{recipe.time}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Filtrar</h3>
              <button onClick={() => setShowFilters(false)} aria-label="Cerrar filtros">
                <X className="w-6 h-6 text-[#1A1A1A]" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Rango de precio</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['EUR 0-10', 'EUR 10-25', 'EUR 25-50', 'EUR 50+'].map((range) => (
                    <button
                      key={range}
                      className="py-2 border border-gray-200 rounded-lg text-sm text-[#1A1A1A] hover:border-[#2D5A3D] hover:bg-[#2D5A3D]/5 transition-colors"
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-[#1A1A1A] mb-3">Caracteristicas</h4>
                <div className="space-y-3">
                  {['Envio gratis', 'Producto BIO', 'De mi zona', 'Con descuento', 'Novedad'].map((feature) => (
                    <label key={feature} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-[#2D5A3D] focus:ring-[#2D5A3D]"
                      />
                      <span className="text-[#1A1A1A]">{feature}</span>
                    </label>
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
}
