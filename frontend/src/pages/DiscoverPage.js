import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Baby,
  ChefHat,
  Compass,
  Cookie,
  Dog,
  Droplets,
  Dumbbell,
  Flame,
  Globe2,
  Grid3X3,
  Leaf,
  MapPin,
  Package,
  Search,
  SlidersHorizontal,
  Sprout,
  Star,
  Store,
  TrendingUp,
  UserRound,
  Vegan,
  WheatOff,
  Zap,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import { toast } from 'sonner';
import { useProducts } from '../hooks/useProducts';
import { useStores } from '../hooks/useStores';
import apiClient from '../services/api/client';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullIndicator from '../components/ui/PullIndicator';

const MAIN_SECTIONS = [
  { id: 'todo', label: 'Todo', icon: Grid3X3 },
  { id: 'tiendas', label: 'Tiendas', icon: Store },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'recetas', label: 'Recetas', icon: ChefHat },
];

const CATEGORIES_MINI = [
  { id: 'snacks-frutos-secos', label: 'Snacks', icon: Cookie },
  { id: 'bebidas-naturales', label: 'Bebidas naturales', icon: Droplets },
  { id: 'orgánico-eco', label: 'Ecológico', icon: Sprout },
  { id: 'proteina-fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'alimentacion-infantil', label: 'Infantil', icon: Baby },
  { id: 'mascotas', label: 'Mascotas', icon: Dog },
  { id: 'sin-gluten', label: 'Sin gluten', icon: WheatOff },
  { id: 'sin-azucar', label: 'Sin azúcar', icon: Leaf },
  { id: 'vegano', label: 'Vegano', icon: Vegan },
  { id: 'superfoods', label: 'Superfoods', icon: Zap },
  { id: 'especias-condimentos', label: 'Mediterráneo', icon: Flame },
  { id: 'importados-premium', label: 'Gourmet', icon: Globe2 },
];

const FILTER_FEATURES = [
  'Envío rápido',
  'Producto ecológico',
  'De temporada',
  'Pequeños productores',
  'Listo para regalar',
];

const PRICE_RANGES = ['0-10 EUR', '10-25 EUR', '25-50 EUR', '50+ EUR'];


const formatPrice = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return 'Consultar precio';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatCount = (value) => new Intl.NumberFormat('es-ES').format(Number(value) || 0);

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-[15px] font-semibold text-stone-950">{title}</h2>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-950 active:opacity-60"
        >
          {actionLabel}
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('todo');
  const [showFilters, setShowFilters] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [discoveredProducts, setDiscoveredProducts] = useState([]);
  const [suggestedCreators, setSuggestedCreators] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  const { products, isLoading: loadingProducts } = useProducts({ limit: '4' });
  const { stores, isLoading: loadingStores } = useStores({});

  useEffect(() => {
    const fetchTrendingAndRecipes = async () => {
      try {
        try {
          const trending = await apiClient.get('/feed/trending-hashtags');
          setTrendingHashtags(trending?.hashtags?.slice(0, 5) || []);
        } catch {
          setTrendingHashtags([]);
        }

        try {
          const recipesData = await apiClient.get('/recipes', { params: { limit: 3 } });
          setRecipes(recipesData?.recipes || []);
        } catch {
          setRecipes([]);
        }

        try {
          const discoveredData = await apiClient.get('/intelligence/discovered-products', { params: { limit: 4 } });
          setDiscoveredProducts(discoveredData?.items || []);
        } catch {
          setDiscoveredProducts([]);
        }

        try {
          const exploreData = await apiClient.get('/discovery/explore');
          setSuggestedCreators(exploreData?.suggested_creators || []);
        } catch {
          setSuggestedCreators([]);
        }
      } finally {
        setLoadingRecipes(false);
      }
    };

    fetchTrendingAndRecipes();
  }, []);

  const refreshExplore = useCallback(async () => {
    setLoadingRecipes(true);
    try {
      const [trending, recipesData, discoveredData, exploreData] = await Promise.allSettled([
        apiClient.get('/feed/trending-hashtags'),
        apiClient.get('/recipes', { params: { limit: 3 } }),
        apiClient.get('/intelligence/discovered-products', { params: { limit: 4 } }),
        apiClient.get('/discovery/explore'),
      ]);
      setTrendingHashtags(trending.status === 'fulfilled' ? trending.value?.hashtags?.slice(0, 5) || [] : []);
      setRecipes(recipesData.status === 'fulfilled' ? recipesData.value?.recipes || [] : []);
      setDiscoveredProducts(discoveredData.status === 'fulfilled' ? discoveredData.value?.items || [] : []);
      setSuggestedCreators(exploreData.status === 'fulfilled' ? exploreData.value?.suggested_creators || [] : []);
    } finally {
      setLoadingRecipes(false);
    }
  }, []);

  const { refreshing, progress, handlers } = usePullToRefresh(refreshExplore);

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/products?category=${encodeURIComponent(categoryId)}`);
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
    <div
      className="min-h-screen bg-stone-50 pb-28 md:pb-32"
      style={{ position: 'relative', overscrollBehavior: 'none' }}
      {...handlers}
    >
      <PullIndicator progress={progress} isRefreshing={refreshing} />
      <div className="sticky top-0 z-40 border-b border-stone-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 pt-3 pb-2">

          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Productores, recetas, tiendas…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              className="h-11 w-full rounded-2xl border-0 bg-stone-100 pl-11 pr-12 text-[15px] text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-950/10"
            />
            <button
              onClick={() => setShowFilters(true)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-950"
              aria-label="Abrir filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Section pills */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 scrollbar-hide">
          {MAIN_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeTab === section.id;
            return (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-950'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-5">

        {/* ── Categorías — grid 4 columnas, siempre visible ── */}
        <section className="mb-7">
          <div className="grid grid-cols-4 gap-2.5">
            {CATEGORIES_MINI.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-100 bg-white py-3 px-1 transition-colors active:bg-stone-50 hover:border-stone-200"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100">
                    <Icon className="h-[18px] w-[18px] text-stone-700" />
                  </div>
                  <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-stone-600">
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {trendingHashtags.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-stone-950" />
              <h2 className="text-lg font-semibold text-stone-950">Tendencias</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {trendingHashtags.map((item, index) => (
                <button
                  key={`${item.tag}-${index}`}
                  onClick={() => navigate(`/products?hashtag=${item.tag}`)}
                  className="min-w-[168px] shrink-0 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white">
                      #{item.tag}
                    </span>
                    <Compass className="h-4 w-4 text-stone-400" />
                  </div>
                  <p className="text-sm font-semibold text-stone-950">{formatCount(item.count)} vistas</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {item.growth > 0 ? `+${item.growth}% esta semana` : 'Movimiento estable'}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {discoveredProducts.length > 0 && (
          <section className="mb-8">
            <SectionHeader
              title="Productos descubiertos en contenido"
              actionLabel="Ver todo"
              onAction={() => navigate('/products')}
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {discoveredProducts.slice(0, 4).map((product) => (
                <motion.button
                  key={product.product_id}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate(`/products/${product.product_id}`)}
                  className="overflow-hidden rounded-[24px] border border-stone-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <img
                    src={product.images?.[0] || '/placeholder-product.png'}
                    alt={product.name}
                    loading="lazy"
                    className="h-36 w-full object-cover sm:h-44"
                  />
                  <div className="p-4">
                    <p className="mb-1 line-clamp-2 text-sm font-semibold text-stone-950">{product.name}</p>
                    <p className="text-xs text-stone-500">{product.content_mentions || 0} menciones</p>
                    <p className="mt-3 text-sm font-semibold text-stone-950">{formatPrice(product.price)}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {(activeTab === 'todo' || activeTab === 'productos') && (
          <section className="mb-8">
            <SectionHeader
              title="Productos destacados"
              actionLabel="Ver todo"
              onAction={() => navigate('/products')}
            />

            {loadingProducts ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-[24px] border border-stone-200 bg-white animate-pulse"
                  >
                    <div className="h-36 w-full bg-stone-200 sm:h-44" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-3/4 rounded bg-stone-200" />
                      <div className="h-3 w-1/2 rounded bg-stone-200" />
                      <div className="h-4 w-1/3 rounded bg-stone-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-stone-300 bg-white">
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <Package className="h-10 w-10 text-stone-300" />
                  <div>
                    <p className="text-base font-medium text-stone-950">Todavía no hay productos visibles</p>
                    <p className="text-sm text-stone-600">Vuelve dentro de poco. En cuanto entren nuevos productos aparecerán aquí.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {products.slice(0, 4).map((product) => (
                  <motion.button
                    key={product.product_id || product.id}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(`/products/${product.product_id || product.id}`)}
                    className="overflow-hidden rounded-[24px] border border-stone-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
                  >
                    <img
                      src={product.image_url || product.images?.[0] || '/placeholder-product.png'}
                      alt={product.name}
                      loading="lazy"
                      className="h-36 w-full object-cover sm:h-44"
                    />
                    <div className="p-4">
                      <p className="mb-1 text-sm font-semibold text-stone-950 line-clamp-2">{product.name}</p>
                      <p className="text-xs text-stone-500 truncate">
                        {product.producer_name || 'Productor'}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-stone-950">{formatPrice(product.price)}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </section>
        )}

        {(activeTab === 'todo' || activeTab === 'tiendas') && (
          <section className="mb-8">
            <SectionHeader
              title="Tiendas destacadas"
              actionLabel="Ver todo"
              onAction={() => navigate('/stores')}
            />

            {loadingStores ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="flex gap-3 rounded-[24px] border border-stone-200 bg-white p-4 animate-pulse"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-stone-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 rounded bg-stone-200" />
                      <div className="h-3 w-1/3 rounded bg-stone-200" />
                      <div className="h-3 w-1/4 rounded bg-stone-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stores.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-stone-300 bg-white">
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <Store className="h-10 w-10 text-stone-300" />
                  <div>
                    <p className="text-base font-medium text-stone-950">Todavía no hay tiendas destacadas</p>
                    <p className="text-sm text-stone-600">Cuando entren nuevos productores activos los verás aquí.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {stores.slice(0, 3).map((store) => (
                  (() => {
                    const storeSlug = store.slug || store.store_slug;
                    return (
                  <motion.button
                    key={store.id || store.store_id || storeSlug}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      if (!storeSlug) {
                        toast.error('Esta tienda no está disponible ahora');
                        return;
                      }
                      navigate(`/store/${storeSlug}`);
                    }}
                    className="flex w-full gap-3 rounded-[24px] border border-stone-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                  >
                    <img
                      src={store.logo || store.hero_image || '/placeholder-store.png'}
                      alt={store.name}
                      loading="lazy"
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-stone-950">{store.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{store.location || 'España'}</span>
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
                        {store.rating ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3 fill-stone-950 text-stone-950" />
                            {store.rating}
                          </span>
                        ) : null}
                        <span>{store.product_count || 0} productos</span>
                      </div>
                    </div>
                  </motion.button>
                    );
                  })()
                ))}
              </div>
            )}
          </section>
        )}

        {suggestedCreators.length > 0 && (activeTab === 'todo') && (
          <section className="mb-8">
            <SectionHeader
              title="Creadores que te pueden gustar"
              actionLabel="Ver perfiles"
              onAction={() => navigate('/stores')}
            />
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {suggestedCreators.map((creator) => (
                <motion.button
                  key={creator.user_id || creator.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/user/${creator.user_id || creator.id}`)}
                  className="flex min-w-[140px] shrink-0 flex-col items-center gap-2 rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  {creator.avatar ? (
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
                      <UserRound className="h-7 w-7 text-stone-400" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="line-clamp-1 text-sm font-semibold text-stone-950">
                      {creator.name || creator.username || 'Creador'}
                    </p>
                    <p className="text-xs text-stone-500 capitalize">
                      {creator.role === 'influencer' ? 'Influencer' : 'Productor'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {(activeTab === 'todo' || activeTab === 'recetas') && (
          <section>
            <SectionHeader
              title="Recetas populares"
              actionLabel="Ver todo"
              onAction={() => navigate('/recipes')}
            />

            {loadingRecipes ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="w-[172px] shrink-0 overflow-hidden rounded-[24px] border border-stone-200 bg-white animate-pulse md:w-full"
                  >
                    <div className="h-28 w-full bg-stone-200" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-3/4 rounded bg-stone-200" />
                      <div className="h-3 w-1/2 rounded bg-stone-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recipes.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-stone-300 bg-white">
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <Package className="h-10 w-10 text-stone-300" />
                  <div>
                    <p className="text-base font-medium text-stone-950">Todavía no hay recetas disponibles</p>
                    <p className="text-sm text-stone-600">Vuelve dentro de poco. Las recetas aparecerán aquí en cuanto estén listas.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible">
                {recipes.map((recipe) => (
                  <motion.button
                    key={recipe.id}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(`/recipes/${recipe.id}`)}
                    className="w-[172px] shrink-0 overflow-hidden rounded-[24px] border border-stone-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md md:w-full"
                  >
                    <img
                      src={recipe.image || '/placeholder-recipe.png'}
                      alt={recipe.name}
                      loading="lazy"
                      className="h-28 w-full object-cover"
                    />
                    <div className="p-4">
                      <p className="text-sm font-semibold text-stone-950">{recipe.name}</p>
                      <p className="mt-1 text-xs text-stone-500">Por {recipe.author}</p>
                      <p className="mt-2 text-xs font-medium text-stone-700">{recipe.time}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="bottom" className="rounded-t-[28px] border-stone-200 bg-white px-0 pb-8">
          <SheetHeader className="px-6 text-left">
            <SheetTitle className="text-xl font-semibold text-stone-950">
              Ajusta tu exploración
            </SheetTitle>
            <SheetDescription className="text-sm text-stone-600">
              Los filtros avanzados llegarán en la próxima mejora de esta pantalla.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-6">
            <div>
              <p className="mb-3 text-sm font-medium text-stone-950">Rango de precio</p>
              <div className="grid grid-cols-2 gap-2">
                {PRICE_RANGES.map((range) => (
                  <button
                    key={range}
                    disabled
                    className="rounded-2xl bg-stone-100 px-4 py-3 text-sm font-medium text-stone-400"
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-stone-950">Lo que más te importa</p>
              <div className="flex flex-wrap gap-2">
                {FILTER_FEATURES.map((feature) => (
                  <button
                    key={feature}
                    disabled
                    className="rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-400"
                  >
                    {feature}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled
              className="h-12 w-full cursor-not-allowed rounded-full bg-stone-100 text-[14px] font-medium text-stone-400"
            >
              Filtros próximamente
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
