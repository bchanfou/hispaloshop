import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
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
  Vegan,
  WheatOff,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
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
      <div>
        <h2 className="font-body text-lg font-semibold text-stone-950">{title}</h2>
      </div>
      {actionLabel && onAction ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction}
          className="h-9 rounded-full px-3 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
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
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  const { products, isLoading: loadingProducts } = useProducts({ limit: '4' });
  const { stores, isLoading: loadingStores } = useStores({});

  useEffect(() => {
    const fetchTrendingAndRecipes = async () => {
      try {
        try {
          const trending = await api.getTrendingHashtags();
          setTrendingHashtags(trending?.hashtags?.slice(0, 5) || []);
        } catch {
          setTrendingHashtags([]);
        }

        try {
          const recipesData = await api.request('/recipes?limit=3');
          setRecipes(recipesData?.recipes || []);
        } catch {
          setRecipes([]);
        }

        try {
          const discoveredData = await api.request('/intelligence/discovered-products?limit=4');
          setDiscoveredProducts(discoveredData?.items || []);
        } catch {
          setDiscoveredProducts([]);
        }
      } finally {
        setLoadingRecipes(false);
      }
    };

    fetchTrendingAndRecipes();
  }, []);

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
    <div className="min-h-screen bg-stone-50 pb-28 md:pb-32">
      <div className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Explorar
              </p>
              <h1 className="font-body text-2xl font-semibold tracking-tight text-stone-950">
                Productores honestos, productos claros
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                Encuentra alimentos reales, tiendas con identidad y recetas para usarlos bien.
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="¿Qué buscas hoy?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              className="h-12 w-full rounded-full border border-stone-200 bg-stone-50 pl-12 pr-14 text-[15px] text-stone-950 placeholder:text-stone-500 focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10"
            />
            <button
              onClick={() => setShowFilters(true)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-950"
              aria-label="Abrir filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-t border-stone-100">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
            {MAIN_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeTab === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-stone-950 bg-stone-950 text-white'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:text-stone-950'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-stone-100 bg-stone-50">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
            {CATEGORIES_MINI.map((category) => {
              const Icon = category.icon;

              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-stone-700 ring-1 ring-stone-200 transition-colors hover:bg-stone-100 hover:text-stone-950"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <Card className="mb-6 overflow-hidden rounded-[28px] border-stone-200 bg-white shadow-[0_10px_30px_rgba(15,15,15,0.06)]">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Selección editorial
                </p>
                <h2 className="font-body text-xl font-semibold text-stone-950">
                  Una selección clara para comprar mejor hoy
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                  Productos con buena trazabilidad, productores pequeños y categorías útiles para el día a día.
                </p>
              </div>
              <Button
                onClick={() => navigate('/products')}
                className="h-11 rounded-full bg-stone-950 px-6 text-sm font-medium text-white hover:bg-stone-800"
              >
                Ver catálogo
              </Button>
            </div>
          </CardContent>
        </Card>

        {trendingHashtags.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-stone-950" />
              <h2 className="font-body text-lg font-semibold text-stone-950">Tendencias</h2>
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
              <Card className="rounded-[24px] border-dashed border-stone-300 bg-white">
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <Package className="h-10 w-10 text-stone-300" />
                  <div>
                    <p className="text-base font-medium text-stone-950">Todavía no hay productos visibles</p>
                    <p className="text-sm text-stone-600">Vuelve dentro de poco. En cuanto entren nuevos productos aparecerán aquí.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {products.slice(0, 4).map((product) => (
                  <motion.button
                    key={product.id}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(`/products/${product.id}`)}
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
              <Card className="rounded-[24px] border-dashed border-stone-300 bg-white">
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <Store className="h-10 w-10 text-stone-300" />
                  <div>
                    <p className="text-base font-medium text-stone-950">Todavía no hay tiendas destacadas</p>
                    <p className="text-sm text-stone-600">Cuando entren nuevos productores activos los verás aquí.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {stores.slice(0, 3).map((store) => (
                  <motion.button
                    key={store.id}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(`/store/${store.slug}`)}
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
                ))}
              </div>
            )}
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
              <Card className="rounded-[24px] border-dashed border-stone-300 bg-white">
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <Package className="h-10 w-10 text-stone-300" />
                  <div>
                    <p className="text-base font-medium text-stone-950">Todavía no hay recetas disponibles</p>
                    <p className="text-sm text-stone-600">Vuelve dentro de poco. Las recetas aparecerán aquí en cuanto estén listas.</p>
                  </div>
                </CardContent>
              </Card>
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
            <SheetTitle className="font-body text-xl font-semibold text-stone-950">
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

            <Button
              disabled
              className="h-12 w-full rounded-full bg-stone-200 text-stone-500 hover:bg-stone-200"
            >
              Filtros próximamente
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
