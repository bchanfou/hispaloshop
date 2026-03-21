// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, FileText, Search, MapPin, ChevronRight, Tag, Loader2, MessageSquare, Check, ChevronDown } from 'lucide-react';
import { useB2BCatalog, useB2BProducers } from '../../features/b2b/queries';
import QuoteBuilder from '../../components/b2b/QuoteBuilder';
import { useLocale } from '../../context/LocaleContext';

const TABS = [
  { id: 'catalog', label: 'Catálogo', icon: Package },
  { id: 'producers', label: 'Productores', icon: Users },
  { id: 'rfq', label: 'Solicitar oferta', icon: FileText },
];

const CATEGORIES = [
  'Todos', 'Aceites', 'Quesos', 'Vinos', 'Embutidos', 'Conservas', 'Miel', 'Especias',
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price_asc', label: 'Precio más bajo' },
  { value: 'most_products', label: 'Más productos' },
  { value: 'newest', label: 'Más reciente' },
];

const PAGE_SIZE = 20;

function ProductCard({ product, convertAndFormatPrice }) {
  const navigate = useNavigate();
  const lowestPrice = product.b2b_prices?.[0];
  return (
    <div
      onClick={() => navigate(`/products/${product.id || product.product_id}`)}
      className="bg-white rounded-2xl border border-stone-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      {product.image_url ? (
        <img loading="lazy" src={product.image_url} alt={product.name || 'Producto'} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-stone-100 flex items-center justify-center">
          <Package className="w-8 h-8 text-stone-300" />
        </div>
      )}
      <div className="p-4">
        <p className="font-semibold text-stone-950 text-sm line-clamp-2">{product.name || 'Producto'}</p>
        {product.moq && (
          <p className="text-xs text-stone-500 mt-1">MOQ: {product.moq} uds</p>
        )}
        {lowestPrice && (
          <p className="text-stone-950 font-bold text-sm mt-2">
            desde {convertAndFormatPrice((Number(lowestPrice?.unit_price_cents) || 0) / 100, 'EUR')}/ud
          </p>
        )}
        {(product.b2b_prices?.length || 0) > 1 && (
          <p className="text-xs text-stone-400 mt-0.5">{product.b2b_prices.length} tramos de precio</p>
        )}
      </div>
    </div>
  );
}

function ProducerCard({ producer, onContact, onChat }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-start gap-3">
        {producer.profile_image ? (
          <img loading="lazy" src={producer.profile_image} alt={producer.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
            <span className="text-stone-950 font-bold text-lg">{(producer.full_name || producer.company_name || 'P')[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-stone-950 truncate">{producer.company_name || producer.full_name}</p>
            {producer.is_verified && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-stone-950 text-white rounded-full text-[10px] font-semibold shrink-0">
                <Check className="w-2.5 h-2.5" />
                Verificado
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">{producer.product_count || 0} productos</p>
          {producer.country && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-stone-400" />
              <span className="text-xs text-stone-500">{producer.country}</span>
            </div>
          )}
          {producer.main_categories?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {producer.main_categories.slice(0, 3).map((cat) => (
                <span key={cat} className="px-2 py-0.5 bg-stone-100 rounded-full text-xs text-stone-600">{cat}</span>
              ))}
            </div>
          )}
          {producer.certifications?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {producer.certifications.slice(0, 3).map((cert) => (
                <span key={cert} className="px-2 py-0.5 bg-stone-100 rounded-full text-[10px] text-stone-600">{cert}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onContact(producer.user_id || producer.id)}
          className="flex-1 py-2 bg-stone-950 text-white rounded-2xl text-sm font-medium flex items-center justify-center gap-1"
        >
          Cotizar <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onChat(producer.user_id || producer.id)}
          className="flex-1 py-2 border border-stone-200 text-stone-600 rounded-2xl text-sm font-medium flex items-center justify-center gap-1"
        >
          Chat <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function getLowestPrice(product) {
  const p = product.b2b_prices?.[0];
  return p ? (Number(p.unit_price_cents) || 0) : Infinity;
}

function sortItems(items, sortBy, tab) {
  if (sortBy === 'relevance') return items;
  const sorted = [...items];
  if (tab === 'catalog') {
    if (sortBy === 'price_asc') sorted.sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
    if (sortBy === 'newest') sorted.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  }
  if (tab === 'producers') {
    if (sortBy === 'most_products') sorted.sort((a, b) => (b.product_count || 0) - (a.product_count || 0));
    if (sortBy === 'newest') sorted.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  }
  return sorted;
}

export default function B2BMarketplacePage() {
  const navigate = useNavigate();
  const { convertAndFormatPrice } = useLocale();
  const [activeTab, setActiveTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [rfqProducerId, setRfqProducerId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortBy, setSortBy] = useState('relevance');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const catalogQuery = useB2BCatalog();
  const producersQuery = useB2BProducers();

  const catalogProducts = catalogQuery.data?.data?.products || catalogQuery.data?.products || [];
  const producers = producersQuery.data?.data?.producers || producersQuery.data?.producers || [];

  /* Reset visible count when filters change */
  const resetPagination = () => setVisibleCount(PAGE_SIZE);

  const filteredProducts = useMemo(() => {
    let items = catalogProducts;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((p) => (p.name || '').toLowerCase().includes(q));
    }
    if (selectedCategory !== 'Todos') {
      const cat = selectedCategory.toLowerCase();
      items = items.filter((p) =>
        (p.category || '').toLowerCase().includes(cat) ||
        (p.categories || []).some((c) => (c || '').toLowerCase().includes(cat)) ||
        (p.name || '').toLowerCase().includes(cat)
      );
    }
    return sortItems(items, sortBy, 'catalog');
  }, [catalogProducts, search, selectedCategory, sortBy]);

  const filteredProducers = useMemo(() => {
    let items = producers;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          (p.full_name || '').toLowerCase().includes(q) ||
          (p.company_name || '').toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== 'Todos') {
      const cat = selectedCategory.toLowerCase();
      items = items.filter((p) =>
        (p.main_categories || []).some((c) => (c || '').toLowerCase().includes(cat))
      );
    }
    return sortItems(items, sortBy, 'producers');
  }, [producers, search, selectedCategory, sortBy]);

  const currentItems = activeTab === 'catalog' ? filteredProducts : filteredProducers;
  const totalItems = currentItems.length;
  const paginatedProducts = filteredProducts.slice(0, visibleCount);
  const paginatedProducers = filteredProducers.slice(0, visibleCount);
  const hasMore = activeTab === 'catalog'
    ? visibleCount < filteredProducts.length
    : visibleCount < filteredProducers.length;

  const handleContactProducer = (producerId) => {
    setRfqProducerId(producerId);
    setActiveTab('rfq');
  };

  const handleChat = (producerId) => {
    navigate(`/b2b/chat?producer=${producerId}`);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    resetPagination();
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    resetPagination();
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200 px-4 pt-6 pb-0 max-w-[1100px] mx-auto">
        <h1 className="text-2xl font-bold text-stone-950 mb-4">Marketplace B2B</h1>

        {activeTab !== 'rfq' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPagination(); }}
              placeholder={activeTab === 'catalog' ? 'Buscar productos...' : 'Buscar productores...'}
              className="w-full pl-9 pr-4 py-2.5 bg-stone-100 rounded-2xl text-sm focus:outline-none focus:border-stone-950"
            />
          </div>
        )}

        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-stone-950 text-stone-950'
                    : 'border-transparent text-stone-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category pills + Sort selector */}
      {activeTab !== 'rfq' && (
        <div className="max-w-[1100px] mx-auto px-4 pt-3 pb-1 flex flex-col gap-2.5">
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-stone-950 text-white'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              {totalItems} resultado{totalItems !== 1 ? 's' : ''}
            </p>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); resetPagination(); }}
                className="appearance-none rounded-xl border border-stone-200 bg-white text-sm text-stone-950 pl-3 pr-8 py-1.5 outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      <div className="p-4 max-w-[1100px] mx-auto">
        {activeTab === 'catalog' && (
          <>
            {catalogQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0,1,2,3].map(i => <div key={i} className="h-60 rounded-2xl bg-stone-100 animate-pulse" />)}
              </div>
            ) : catalogQuery.isError ? (
              <div className="text-center py-16 text-stone-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p className="font-medium">Sin acceso al catálogo B2B</p>
                <p className="text-sm mt-1">Completa tu perfil de importador para acceder</p>
                <button
                  onClick={() => catalogQuery.refetch()}
                  className="mt-3 px-5 py-2 bg-stone-950 text-white text-sm font-medium rounded-2xl hover:bg-stone-800 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="text-center py-16 text-stone-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p>No hay productos disponibles</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.id || product.product_id} product={product} convertAndFormatPrice={convertAndFormatPrice} />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="px-6 py-2.5 bg-white border border-stone-200 rounded-2xl text-sm font-medium text-stone-950 hover:bg-stone-50 transition-colors"
                    >
                      Cargar más ({filteredProducts.length - visibleCount} restantes)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'producers' && (
          <>
            {producersQuery.isLoading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => <div key={i} className="h-32 rounded-2xl bg-stone-100 animate-pulse" />)}
              </div>
            ) : producersQuery.isError ? (
              <div className="text-center py-16 text-stone-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p className="font-medium">Sin acceso al directorio de productores</p>
                <button
                  onClick={() => producersQuery.refetch()}
                  className="mt-3 px-5 py-2 bg-stone-950 text-white text-sm font-medium rounded-2xl hover:bg-stone-800 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : paginatedProducers.length === 0 ? (
              <div className="text-center py-16 text-stone-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <p>No hay productores disponibles</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paginatedProducers.map((producer) => (
                    <ProducerCard
                      key={producer.user_id || producer.id}
                      producer={producer}
                      onContact={handleContactProducer}
                      onChat={handleChat}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="px-6 py-2.5 bg-white border border-stone-200 rounded-2xl text-sm font-medium text-stone-950 hover:bg-stone-50 transition-colors"
                    >
                      Cargar más ({filteredProducers.length - visibleCount} restantes)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'rfq' && (
          <div className="space-y-4">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-stone-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-950 text-sm">Cómo funciona</p>
                  <p className="text-xs text-stone-600 mt-1">
                    Indica el productor, los productos y la cantidad. El productor recibirá tu solicitud y podrá responderte con una oferta personalizada.
                  </p>
                </div>
              </div>
            </div>
            <QuoteBuilder initialProducerId={rfqProducerId} />
          </div>
        )}
      </div>
    </div>
  );
}
